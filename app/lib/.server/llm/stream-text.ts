import { convertToCoreMessages, streamText as _streamText } from 'ai';
import ignore from 'ignore';
import { MAX_TOKENS } from './constants';
import { PromptLibrary } from '~/lib/common/prompt-library';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';
import type { IProviderSetting } from '~/types/model';
import {
  DEFAULT_MODEL,
  DEFAULT_PROVIDER_NAME,
  PROVIDER_LIST,
  MODEL_REGEX,
  MODIFICATIONS_TAG_NAME,
  WORK_DIR,
  PROVIDER_REGEX,
} from '~/utils/constants';
import { allowedHTMLElements } from '~/utils/markdown';

interface ToolResult<Name extends string, Args, Result> {
  toolCallId: string;
  toolName: Name;
  args: Args;
  result: Result;
}

interface Message {
  role: 'user' | 'assistant';
  content: string | { type: string; text?: string }[];
  toolInvocations?: ToolResult<string, unknown, unknown>[];
  model?: string;
}

export type Messages = Message[];

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], 'model'>;

export interface File {
  type: 'file';
  content: string;
  isBinary: boolean;
}

export interface Folder {
  type: 'folder';
}

type Dirent = File | Folder;

export type FileMap = Record<string, Dirent | undefined>;

export async function getModelList({
  _apiKeys,
  _providerSettings,
}: {
  _apiKeys?: Record<string, string>;
  _providerSettings?: Record<string, any>;
}) {
  // Implementation
  return PROVIDER_LIST;
}

// Common patterns to ignore, similar to .gitignore
const IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  'dist/**',
  'build/**',
  '.next/**',
  'coverage/**',
  '.cache/**',
  '.vscode/**',
  '.idea/**',
  '**/*.log',
  '**/.DS_Store',
  '**/npm-debug.log*',
  '**/yarn-debug.log*',
  '**/yarn-error.log*',
  '**/*lock.json',
  '**/*lock.yml',
];
const ig = ignore().add(IGNORE_PATTERNS);

function createFilesContext(files: FileMap) {
  let filePaths = Object.keys(files);
  filePaths = filePaths.filter((x) => {
    const relPath = x.replace('/home/project/', '');
    return !ig.ignores(relPath);
  });

  const fileContexts = filePaths
    .filter((x) => files[x] && files[x]?.type === 'file')
    .map((path) => {
      const dirent = files[path];

      if (!dirent || dirent.type === 'folder') {
        return '';
      }

      const codeWithLinesNumbers = dirent.content
        .split('\n')
        .map((v, i) => `${i + 1}|${v}`)
        .join('\n');

      return `<file path="${path}">\n${codeWithLinesNumbers}\n</file>`;
    });

  return `Below are the code files present in the webcontainer:\ncode format:\n<line number>|<line content>\n <codebase>${fileContexts.join('\n\n')}\n\n</codebase>`;
}

function parseModelAndProvider(message: Message) {
  const textContent = Array.isArray(message.content)
    ? message.content.find((item) => item.type === 'text')?.text || ''
    : message.content;

  const modelMatch = textContent.match(MODEL_REGEX);
  const providerMatch = textContent.match(PROVIDER_REGEX);

  const model = modelMatch ? modelMatch[1] : null;
  const provider = providerMatch ? providerMatch[1] : null;

  const cleanedContent = Array.isArray(message.content)
    ? message.content.map((item) => {
        if (item.type === 'text') {
          return {
            type: 'text',
            text: item.text?.replace(MODEL_REGEX, '').replace(PROVIDER_REGEX, ''),
          };
        }

        return item; // Preserve image_url and other types as is
      })
    : textContent.replace(MODEL_REGEX, '').replace(PROVIDER_REGEX, '');

  return { model, provider, content: cleanedContent };
}

export async function streamText(props: {
  messages: Messages;
  env: Env;
  options?: StreamingOptions;
  apiKeys?: Record<string, string>;
  files?: FileMap;
  providerSettings?: Record<string, IProviderSetting>;
  promptId?: string;
}) {
  const { messages, env: serverEnv, options, apiKeys, files, providerSettings, promptId } = props;

  let currentModel = DEFAULT_MODEL;
  let currentProvider = DEFAULT_PROVIDER_NAME;

  const MODEL_LIST = await getModelList({
    _apiKeys: apiKeys,
    _providerSettings: providerSettings,
  });

  const modelArray = Object.values(MODEL_LIST).flatMap((provider) => provider.staticModels || []);

  const processedMessages = messages.map((message) => {
    if (message.role === 'user') {
      return message;
    }

    const { model, provider, content } = parseModelAndProvider(message);

    if (model && modelArray.find((m) => m.name === model)) {
      currentModel = model;
    }

    if (provider) {
      currentProvider = provider;
    }

    return {
      ...message,
      content,
    };
  });

  // Get provider instance from LLMManager
  const manager = await import('~/lib/modules/llm/manager').then((m) =>
    m.LLMManager.getInstance(serverEnv as unknown as Record<string, string>),
  );
  const provider = manager.getProvider(currentProvider) || manager.getDefaultProvider();

  // Get dynamic max tokens based on the model
  const modelInfo = modelArray.find((m) => m.name === currentModel);
  const dynamicMaxTokens = modelInfo?.maxTokenAllowed || MAX_TOKENS;

  let systemPrompt = promptId
    ? ((await PromptLibrary.getPropmtFromLibrary(promptId, {
        cwd: WORK_DIR,
        allowedHtmlElements: allowedHTMLElements,
        modificationTagName: MODIFICATIONS_TAG_NAME,
      })) ?? getSystemPrompt())
    : getSystemPrompt();

  let codeContext = '';

  if (files) {
    codeContext = createFilesContext(files);
    systemPrompt = `${systemPrompt}\n\n ${codeContext}`;
  }

  return _streamText({
    model: provider.getModelInstance({
      model: currentModel,
      serverEnv: serverEnv as unknown as Record<string, string>,
      apiKeys,
      providerSettings,
    }),
    system: systemPrompt,
    maxTokens: dynamicMaxTokens,
    messages: convertToCoreMessages(processedMessages as any),
    ...options,
  });
}
