import type { ModelInfo } from '~/types/model';
import type { ProviderInfo } from '~/types/model';

const createModelInfo = (name: string, label: string, provider: string, maxTokens: number): ModelInfo => ({
  name,
  label,
  provider,
  maxTokens,
  type: 'text-generation',
  capabilities: ['text-generation'],
});

export const ANTHROPIC_PROVIDER: ProviderInfo = {
  name: 'Anthropic',
  displayName: 'Anthropic AI',
  staticModels: [createModelInfo('claude-3-5-sonnet-latest', 'Claude 3.5 Sonnet', 'Anthropic', 200000)],
  getApiKeyLink: 'https://console.anthropic.com/settings/keys',
};

export const OPENAI_PROVIDER: ProviderInfo = {
  name: 'OpenAI',
  displayName: 'OpenAI',
  staticModels: [createModelInfo('gpt-4', 'GPT-4', 'OpenAI', 8192)],
  getApiKeyLink: 'https://platform.openai.com/account/api-keys',
};

export const PROVIDER_LIST: ProviderInfo[] = [ANTHROPIC_PROVIDER, OPENAI_PROVIDER] as const;
