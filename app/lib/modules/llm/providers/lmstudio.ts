import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModelV1 } from 'ai';
import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';

export default class LMStudioProvider extends BaseProvider {
  name = 'LMStudio';
  getApiKeyLink = 'https://lmstudio.ai/';
  labelForGetApiKey = 'Get LMStudio';
  icon = 'i-ph:cloud-arrow-down';

  config = {
    baseUrlKey: 'LMSTUDIO_API_BASE_URL',
  };

  staticModels: ModelInfo[] = [];

  async getDynamicModels(): Promise<ModelInfo[]> {
    return [
      {
        name: 'local-model',
        label: 'Local Model',
        provider: 'LMStudio',
        maxTokens: 4096,
        maxTokenAllowed: 4096,
        type: 'text-generation',
        capabilities: ['text-generation'],
      },
    ];
  }
  getModelInstance: (options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }) => LanguageModelV1 = (options) => {
    const { apiKeys, providerSettings, serverEnv, model } = options;
    const providerSetting = providerSettings?.LMStudio || {
      name: 'LMStudio',
      baseUrl: undefined,
      apiKey: undefined,
    };
    const { baseUrl } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSetting,
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: 'OLLAMA_API_BASE_URL',
      defaultApiTokenKey: '',
    });
    const lmstudio = createOpenAI({
      baseURL: `${baseUrl}/v1`,
      apiKey: '',
    });

    return lmstudio(model);
  };
}
