import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModelV1 } from 'ai';
import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';

export default class HuggingFaceProvider extends BaseProvider {
  name = 'HuggingFace';
  getApiKeyLink = 'https://huggingface.co/settings/tokens';

  config = {
    apiTokenKey: 'HuggingFace_API_KEY',
  };

  staticModels: ModelInfo[] = [
    {
      name: 'meta-llama/Llama-2-70b-chat-hf',
      label: 'Llama 2 70B',
      provider: 'HuggingFace',
      maxTokens: 4096,
      maxTokenAllowed: 4096,
      type: 'text-generation',
      capabilities: ['text-generation', 'code-generation'],
    },
    {
      name: 'tiiuae/falcon-180B-chat',
      label: 'Falcon 180B',
      provider: 'HuggingFace',
      maxTokens: 4096,
      maxTokenAllowed: 4096,
      type: 'text-generation',
      capabilities: ['text-generation'],
    },
    {
      name: 'codellama/CodeLlama-70b-Instruct-hf',
      label: 'CodeLlama 70B',
      provider: 'HuggingFace',
      maxTokens: 4096,
      maxTokenAllowed: 4096,
      type: 'text-generation',
      capabilities: ['text-generation', 'code-generation'],
    },
    {
      name: 'google/gemma-7b-it',
      label: 'Gemma 7B',
      provider: 'HuggingFace',
      maxTokens: 8192,
      maxTokenAllowed: 8192,
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
      defaultApiTokenKey: 'HuggingFace_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const openai = createOpenAI({
      baseURL: 'https://api-inference.huggingface.co/v1/',
      apiKey,
    });

    return openai(model);
  }
}
