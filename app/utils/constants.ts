import type { ModelInfo } from '~/types/model';
import type { ProviderInfo } from '~/types/model';

// Environment variables
export const ENV = {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_URL: process.env.VERCEL_URL,
};

// Model configuration
export const MODEL_CONFIG = {
  DEFAULT_MODEL: 'gpt-3.5-turbo',
  DEFAULT_PROVIDER: 'openai',
  SUPPORTED_MODELS: ['gpt-3.5-turbo', 'gpt-4'],
};

// API configuration
export const API_CONFIG = {
  TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
  BACKOFF_FACTOR: 1.5,
};

// Default settings
export const DEFAULT_SETTINGS = {
  apiKeys: {},
  providerSettings: {},
  theme: 'system',
  fontSize: 14,
  fontFamily: 'monospace',
  lineHeight: 1.5,
  showLineNumbers: true,
  wordWrap: true,
  showMinimap: false,
  showBreadcrumbs: true,
  showIndentGuides: true,
  showRuler: true,
  showWhitespace: 'none',
  tabSize: 2,
  insertSpaces: true,
  trimTrailingWhitespace: true,
  insertFinalNewline: true,
  formatOnSave: true,
  formatOnPaste: true,
  formatOnType: true,
};

export const WORK_DIR = '/workspace';
export const WORK_DIR_NAME = 'workspace';
export const MODIFICATIONS_TAG_NAME = 'MODIFICATIONS';
export const MODEL_REGEX = /^model:\s*([^\s]+)/i;
export const PROVIDER_REGEX = /^provider:\s*([^\s]+)/i;
export const PROMPT_COOKIE_KEY = 'bolt-prompt';
export const STARTER_TEMPLATES = [
  {
    name: 'React',
    description: 'Create a new React application',
    template: 'react',
  },

  // ... other templates
];

export const DEFAULT_MODEL = 'claude-3-5-sonnet-latest';
export const DEFAULT_PROVIDER = 'Anthropic';

function createModelInfo(name: string, label: string, provider: string, maxTokens: number): ModelInfo {
  return {
    name,
    label,
    provider,
    maxTokens,
    type: 'text-generation',
    capabilities: ['chat', 'text-generation', 'code-generation'],
  };
}

const BASE_MODELS = [
  {
    name: 'claude-3-5-sonnet-latest',
    label: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    maxTokens: 200000,
    type: 'text-generation' as const,
    capabilities: ['text-generation'],
  },

  // ... other models
] as const;

export const MODEL_LIST = BASE_MODELS;

export const providerBaseUrlEnvKeys = {
  Anthropic: 'ANTHROPIC_API_BASE',
  OpenAI: 'OPENAI_API_BASE',

  // ... other providers
};

export const PROVIDER_LIST: ProviderInfo[] = [
  {
    name: 'Anthropic',
    displayName: 'Anthropic',
    staticModels: [
      createModelInfo('claude-3-5-sonnet-latest', 'Claude 3.5 Sonnet', 'Anthropic', 200000),
      createModelInfo('claude-3-5-haiku-latest', 'Claude 3.5 Haiku', 'Anthropic', 200000),
    ],
    getApiKeyLink: 'https://console.anthropic.com/settings/keys',
  },

  // Add other providers...
] as const;

export const LOCAL_PROVIDERS_LIST = ['Anthropic', 'OpenAI'];
export const URL_CONFIGURABLE_PROVIDERS = ['Anthropic', 'OpenAI'];
export const DEFAULT_PROVIDER_NAME = 'Anthropic';

export function getModelList({
  _apiKeys,
  _providerSettings,
}: {
  _apiKeys?: Record<string, string>;
  _providerSettings?: Record<string, any>;
}): ModelInfo[] {
  return BASE_MODELS.map((model) => ({
    ...model,
    maxTokens: model.maxTokens,
    type: 'text-generation',
    capabilities: ['text-generation'],
  }));
}
