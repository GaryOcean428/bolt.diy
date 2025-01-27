import { createAnthropic } from '@ai-sdk/anthropic';
import type { LanguageModelV1 } from 'ai';
import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';

export default class AnthropicProvider extends BaseProvider {
  name = 'Anthropic';
  getApiKeyLink = 'https://console.anthropic.com/settings/keys';

  config = {
    apiTokenKey: 'ANTHROPIC_API_KEY',
  };

  staticModels: ModelInfo[] = [
    {
      name: 'claude-3-5-sonnet-latest',
      label: 'Claude 3.5 Sonnet (new)',
      provider: 'Anthropic',
      maxTokens: 8000,
      maxTokenAllowed: 8000,
      type: 'text-generation',
      capabilities: ['text-generation', 'code-generation'],
    },
    {
      name: 'claude-3-5-sonnet-20240620',
      label: 'Claude 3.5 Sonnet (old)',
      provider: 'Anthropic',
      maxTokens: 8000,
      maxTokenAllowed: 8000,
      type: 'text-generation',
      capabilities: ['text-generation', 'code-generation'],
    },
    {
      name: 'claude-3-5-haiku-latest',
      label: 'Claude 3.5 Haiku (new)',
      provider: 'Anthropic',
      maxTokens: 8000,
      maxTokenAllowed: 8000,
      type: 'text-generation',
      capabilities: ['text-generation', 'code-generation'],
    },
    {
      name: 'claude-3-opus-latest',
      label: 'Claude 3 Opus',
      provider: 'Anthropic',
      maxTokens: 8000,
      maxTokenAllowed: 8000,
      type: 'text-generation',
      capabilities: ['text-generation', 'code-generation'],
    },
    {
      name: 'claude-3-sonnet-20240229',
      label: 'Claude 3 Sonnet',
      provider: 'Anthropic',
      maxTokens: 8000,
      maxTokenAllowed: 8000,
      type: 'text-generation',
      capabilities: ['text-generation', 'code-generation'],
    },
    {
      name: 'claude-3-haiku-20240307',
      label: 'Claude 3 Haiku',
      provider: 'Anthropic',
      maxTokens: 8000,
      maxTokenAllowed: 8000,
      type: 'text-generation',
      capabilities: ['text-generation', 'code-generation'],
    },
  ];

  getModelInstance: (options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }) => LanguageModelV1 = (options) => {
    const { apiKeys, providerSettings, serverEnv, model } = options;
    const providerSetting = providerSettings?.Anthropic || {
      name: 'Anthropic',
      baseUrl: undefined,
      apiKey: undefined,
      enabled: true,
    };
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSetting,
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'ANTHROPIC_API_KEY',
    });
    const anthropic = createAnthropic({
      apiKey,
    });

    return anthropic(model);
  };
}
