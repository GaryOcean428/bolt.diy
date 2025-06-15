import type { AgentOutput } from './AgentOutput';
import { ModelProvider } from './ModelProvider';
import { ModelSwarm } from './ModelSwarm';
import { SwarmWebSocket } from './SwarmWebSocket';
import { swarmLogger, LogLevel } from '~/lib/modules/logging/SwarmLogger';
import type { ModelRequest } from '~/types/providers';

/**
 * ChatAPI Error Handling Design
 * =============================
 *
 * This module implements comprehensive error handling for async chat operations:
 *
 * 1. **Timeout Protection**: All async operations have explicit timeouts to prevent hanging
 *    - sendMessage: 30s timeout for standard requests
 *    - streamMessage: 30s timeout for streaming operations
 *
 * 2. **Graceful Degradation**: Instead of throwing errors that could crash calling code,
 *    methods return error outputs that preserve the expected interface
 *
 * 3. **Resource Cleanup**: All timeout handlers are properly cleaned up in finally blocks
 *    to prevent memory leaks
 *
 * 4. **Streaming Reliability**: streamMessage properly handles both streaming and fallback
 *    responses, with safe callback error boundaries
 *
 * 5. **Error Boundary Pattern**: onUpdate callbacks are wrapped in try-catch to prevent
 *    client callback errors from failing the entire stream
 *
 * Future maintainers should preserve these patterns when modifying async handlers.
 */

type MessageRole = 'user' | 'assistant' | 'system';

interface ChatContext {
  previousMessages: { role: MessageRole; content: string }[];
  specialization?: string[];
  uploadedFiles?: File[];
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export class ChatAPI {
  private static _instance: ChatAPI | null = null;
  private _modelSwarm: ModelSwarm;

  private constructor() {
    this._modelSwarm = new ModelSwarm(ModelProvider.getInstance(), SwarmWebSocket.getInstance());
  }

  static getInstance(): ChatAPI {
    if (!ChatAPI._instance) {
      ChatAPI._instance = new ChatAPI();
    }

    return ChatAPI._instance;
  }

  async sendMessage(message: string, context: ChatContext = { previousMessages: [] }): Promise<AgentOutput> {
    const REQUEST_TIMEOUT_MS = 30000; // 30 seconds timeout
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const messages: ChatMessage[] = [...context.previousMessages, { role: 'user', content: message }];

      const request: ModelRequest = {
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      };

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Request timeout - no response received within expected time'));
        }, REQUEST_TIMEOUT_MS);
      });

      // Race the request against timeout
      const response = await Promise.race([
        this._modelSwarm.sendRequest(request, context.specialization),
        timeoutPromise,
      ]);

      if (!response) {
        throw new Error('No response received from model swarm');
      }

      if (!response.output || typeof response.output !== 'string') {
        throw new Error('Invalid response format - missing or invalid output');
      }

      return {
        type: 'text',
        content: response.output,
      } as AgentOutput;
    } catch (error) {
      swarmLogger.log(LogLevel.ERROR, 'ChatAPI', 'Failed to send message', {
        error,
        message,
        context,
      });

      // Return error output instead of throwing to prevent hanging
      return {
        type: 'error',
        content: error instanceof Error ? error.message : 'Message processing failed',
        error: error instanceof Error ? error : new Error('Unknown error in sendMessage'),
      } as AgentOutput;
    } finally {
      // Clean up timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  async *streamMessage(
    message: string,
    onUpdate: (content: string) => void,
    context: ChatContext = { previousMessages: [] },
  ): AsyncGenerator<AgentOutput> {
    let timeoutId: NodeJS.Timeout | null = null;
    let isComplete = false;

    try {
      const messages: ChatMessage[] = [...context.previousMessages, { role: 'user', content: message }];

      const request: ModelRequest = {
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: true,
      };

      // Set up timeout for streaming operations (30 seconds default)
      const STREAM_TIMEOUT_MS = 30000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Stream timeout - no response received within expected time'));
        }, STREAM_TIMEOUT_MS);
      });

      try {
        // Race the stream request against timeout
        const response = await Promise.race([
          this._modelSwarm.sendRequest(request, context.specialization),
          timeoutPromise,
        ]);

        if (!response) {
          throw new Error('No response received from model swarm');
        }

        // Handle streaming response properly
        if (response.stream && typeof response.stream[Symbol.asyncIterator] === 'function') {
          // Handle actual streaming response
          for await (const chunk of response.stream) {
            if (isComplete) {
              break;
            }

            if (chunk && chunk.content) {
              // Safely call onUpdate with error boundary
              try {
                onUpdate(chunk.content);
              } catch (updateError) {
                swarmLogger.log(LogLevel.WARN, 'ChatAPI', 'Error in onUpdate callback', {
                  error: updateError,
                  chunk: chunk.content,
                });

                // Don't fail the entire stream for callback errors
              }

              yield {
                type: 'text',
                content: chunk.content,
              } as AgentOutput;
            }
          }
        } else if (response.output && typeof response.output === 'string') {
          // Handle non-streaming response as fallback
          try {
            onUpdate(response.output);
          } catch (updateError) {
            swarmLogger.log(LogLevel.WARN, 'ChatAPI', 'Error in onUpdate callback', {
              error: updateError,
              output: response.output,
            });
          }

          yield {
            type: 'text',
            content: response.output,
          } as AgentOutput;
        } else {
          throw new Error('Invalid response format - no output or stream available');
        }
      } finally {
        // Clean up timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    } catch (error) {
      swarmLogger.log(LogLevel.ERROR, 'ChatAPI', 'Failed to stream message', {
        error,
        message,
        context,
      });

      // Yield error output to ensure generator doesn't hang
      yield {
        type: 'error',
        content: error instanceof Error ? error.message : 'Stream processing failed',
        error: error instanceof Error ? error : new Error('Unknown streaming error'),
      } as AgentOutput;
    } finally {
      isComplete = true;

      // Final cleanup
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
}

export const chatAPI = ChatAPI.getInstance();
