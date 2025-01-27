import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModelV1 } from 'ai';
import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';

export default class PerplexityProvider extends BaseProvider {
  name = 'Perplexity';
  getApiKeyLink = 'https://www.perplexity.ai/settings/api';

  config = {
    apiTokenKey: 'PERPLEXITY_API_KEY',
  };

  staticModels: ModelInfo[] = [
    {
      name: 'pplx-70b-online',
      label: 'PPLX 70B Online',
      provider: 'Perplexity',
      maxTokens: 4096,
      maxTokenAllowed: 4096,
      type: 'text-generation',
      capabilities: ['text-generation'],
    },
    {
      name: 'pplx-7b-online',
      label: 'PPLX 7B Online',
      provider: 'Perplexity',
      maxTokens: 4096,
      maxTokenAllowed: 4096,
      type: 'text-generation',
      capabilities: ['text-generation'],
    },
    {
      name: 'pplx-70b-chat',
      label: 'PPLX 70B Chat',
      provider: 'Perplexity',
      maxTokens: 4096,
      maxTokenAllowed: 4096,
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
      defaultApiTokenKey: 'PERPLEXITY_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const perplexity = createOpenAI({
      baseURL: 'https://api.perplexity.ai/',
      apiKey,
    });

    return perplexity(model);
  }
}
