import { createMistral } from '@ai-sdk/mistral';
import type { LanguageModelV1 } from 'ai';
import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';

export default class MistralProvider extends BaseProvider {
  name = 'Mistral';
  getApiKeyLink = 'https://console.mistral.ai/api-keys/';

  config = {
    apiTokenKey: 'MISTRAL_API_KEY',
  };

  staticModels: ModelInfo[] = [
    {
      name: 'open-mistral-7b',
      label: 'Mistral 7B',
      provider: 'Mistral',
      maxTokens: 8000,
      maxTokenAllowed: 8000,
      type: 'text-generation',
      capabilities: ['text-generation'],
    },
    {
      name: 'open-mixtral-8x7b',
      label: 'Mistral 8x7B',
      provider: 'Mistral',
      maxTokens: 8000,
      maxTokenAllowed: 8000,
      type: 'text-generation',
      capabilities: ['text-generation'],
    },
    {
      name: 'open-mixtral-8x22b',
      label: 'Mistral 8x22B',
      provider: 'Mistral',
      maxTokens: 8000,
      maxTokenAllowed: 8000,
      type: 'text-generation',
      capabilities: ['text-generation'],
    },
    {
      name: 'open-codestral-mamba',
      label: 'Codestral Mamba',
      provider: 'Mistral',
      maxTokens: 8000,
      maxTokenAllowed: 8000,
      type: 'text-generation',
      capabilities: ['text-generation', 'code-generation'],
    },
    {
      name: 'open-mistral-nemo',
      label: 'Mistral Nemo',
      provider: 'Mistral',
      maxTokens: 8000,
      maxTokenAllowed: 8000,
      type: 'text-generation',
      capabilities: ['text-generation'],
    },
    {
      name: 'ministral-8b-latest',
      label: 'Mistral 8B',
      provider: 'Mistral',
      maxTokens: 8000,
      maxTokenAllowed: 8000,
      type: 'text-generation',
      capabilities: ['text-generation'],
    },
    {
      name: 'mistral-small-latest',
      label: 'Mistral Small',
      provider: 'Mistral',
      maxTokens: 8000,
      maxTokenAllowed: 8000,
      type: 'text-generation',
      capabilities: ['text-generation'],
    },
    {
      name: 'codestral-latest',
      label: 'Codestral',
      provider: 'Mistral',
      maxTokens: 8000,
      maxTokenAllowed: 8000,
      type: 'text-generation',
      capabilities: ['text-generation', 'code-generation'],
    },
    {
      name: 'mistral-large-latest',
      label: 'Mistral Large Latest',
      provider: 'Mistral',
      maxTokens: 8000,
      maxTokenAllowed: 8000,
      type: 'text-generation',
      capabilities: ['text-generation'],
    },
  ];

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'MISTRAL_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const mistral = createMistral({
      apiKey,
    });

    return mistral(model);
  }
}
