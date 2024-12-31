import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { MAX_RESPONSE_SEGMENTS, MAX_TOKENS } from '~/lib/.server/llm/constants';
import { streamText, type Messages, type StreamingOptions } from '~/lib/.server/llm/stream-text';
import SwitchableStream from '~/lib/.server/llm/switchable-stream';
import { CONTINUE_PROMPT } from '~/lib/common/prompts/prompts';
import { AgentManager } from '~/lib/modules/agents/agent-manager';
import type { TaskComplexity } from '~/lib/modules/agents/types';
import type { IProviderSetting } from '~/types/model';

export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  const items = cookieHeader.split(';').map((cookie) => cookie.trim());

  items.forEach((item) => {
    const [name, ...rest] = item.split('=');

    if (name && rest) {
      const decodedName = decodeURIComponent(name.trim());
      const decodedValue = decodeURIComponent(rest.join('=').trim());
      cookies[decodedName] = decodedValue;
    }
  });

  return cookies;
}

async function chatAction({ context, request }: ActionFunctionArgs) {
  const { messages, files, promptId, complexity } = await request.json<{
    messages: Messages;
    files: any;
    promptId?: string;
    complexity?: TaskComplexity;
  }>();

  // Initialize agent manager
  const agentManager = new AgentManager();

  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = JSON.parse(parseCookies(cookieHeader || '').apiKeys || '{}');
  const providerSettings: Record<string, IProviderSetting> = JSON.parse(
    parseCookies(cookieHeader || '').providers || '{}',
  );

  const stream = new SwitchableStream();

  const cumulativeUsage = {
    completionTokens: 0,
    promptTokens: 0,
    totalTokens: 0,
  };

  try {
    // Determine task complexity if not provided
    const taskComplexity = complexity || {
      tokenCount: messages[messages.length - 1].content.length,
      specializedKnowledge: false,
      securitySensitive: false,
      languageSpecific: true,
      expectedDuration: 1, // minutes
    };

    const options: StreamingOptions = {
      toolChoice: 'none',
      onFinish: async ({ text: content, finishReason, usage }) => {
        // Execute task using appropriate agent
        const agentResult = await agentManager.executeTask(content, taskComplexity, {
          messages,
          files,
          env: context.cloudflare.env,
        });

        if (!agentResult.success) {
          throw agentResult.error;
        }

        // If the agent result contains code actions, execute them
        if (agentResult.data && typeof agentResult.data === 'object' && 'actions' in agentResult.data) {
          const actions = agentResult.data.actions as any[];

          for (const action of actions) {
            if (action.type === 'file' || action.type === 'shell') {
              await stream.switchSource(
                new ReadableStream({
                  async start(controller) {
                    const data = new TextEncoder().encode(
                      JSON.stringify({
                        type: 'action',
                        value: JSON.parse(JSON.stringify(action)),
                      }),
                    );
                    controller.enqueue(data);
                    controller.close();
                  },
                }),
              );
            }
          }
        }

        console.log('usage', usage);

        if (usage) {
          cumulativeUsage.completionTokens += usage.completionTokens || 0;
          cumulativeUsage.promptTokens += usage.promptTokens || 0;
          cumulativeUsage.totalTokens += usage.totalTokens || 0;
        }

        if (finishReason !== 'length') {
          return stream
            .switchSource(
              new ReadableStream({
                async start(controller) {
                  const data = new TextEncoder().encode(
                    JSON.stringify({
                      type: 'usage',
                      value: {
                        completionTokens: cumulativeUsage.completionTokens,
                        promptTokens: cumulativeUsage.promptTokens,
                        totalTokens: cumulativeUsage.totalTokens,
                      },
                    }),
                  );
                  controller.enqueue(data);
                  controller.close();
                },
              }),
            )
            .then(() => stream.close());
        }

        if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
          throw Error('Cannot continue message: Maximum segments reached');
        }

        const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;

        console.log(`Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`);

        messages.push({ role: 'assistant', content });
        messages.push({ role: 'user', content: CONTINUE_PROMPT });

        const streamResult = await streamText({
          messages,
          env: context.cloudflare.env,
          options,
          apiKeys,
          files,
          providerSettings,
          promptId,
        });

        return stream.switchSource(streamResult.toDataStream());
      },
    };

    const result = await streamText({
      messages,
      env: context.cloudflare.env,
      options,
      apiKeys,
      files,
      providerSettings,
      promptId,
    });

    stream.switchSource(result.toDataStream());

    return new Response(stream.readable, {
      status: 200,
      headers: {
        contentType: 'text/plain; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error(error);

    if (error.message?.includes('API key')) {
      throw new Response('Invalid or missing API key', {
        status: 401,
        statusText: 'Unauthorized',
      });
    }

    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
