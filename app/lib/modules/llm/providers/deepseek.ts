import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModelV1 } from 'ai';
import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';

export default class DeepseekProvider extends BaseProvider {
  name = 'Deepseek';
  getApiKeyLink = 'https://platform.deepseek.com/apiKeys';

  config = {
    apiTokenKey: 'DEEPSEEK_API_KEY',
  };

  staticModels: ModelInfo[] = [
    {
      name: 'deepseek-coder',
      label: 'Deepseek-Coder',
      provider: 'Deepseek',
      maxTokens: 8000,
      maxTokenAllowed: 8000,
      type: 'text-generation',
      capabilities: ['text-generation', 'code-generation'],
    },
    {
      name: 'deepseek-chat',
      label: 'Deepseek-Chat',
      provider: 'Deepseek',
      maxTokens: 8000,
      maxTokenAllowed: 8000,
      type: 'text-generation',
      capabilities: ['text-generation', 'code-generation'],
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
      defaultApiTokenKey: 'DEEPSEEK_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const openai = createOpenAI({
      baseURL: 'https://api.deepseek.com/beta',
      apiKey,
    });

    return openai(model);
  }
}
