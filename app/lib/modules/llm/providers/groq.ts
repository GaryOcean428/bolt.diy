import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModelV1 } from 'ai';
import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';

export default class GroqProvider extends BaseProvider {
  name = 'Groq';
  getApiKeyLink = 'https://console.groq.com/keys';

  config = {
    apiTokenKey: 'GROQ_API_KEY',
  };

  staticModels: ModelInfo[] = [
    {
      name: 'mixtral-8x7b-32768',
      label: 'Mixtral 8x7B-32K',
      provider: 'Groq',
      maxTokens: 32768,
      maxTokenAllowed: 32768,
      type: 'text-generation',
      capabilities: ['text-generation'],
    },
    {
      name: 'llama2-70b-4096',
      label: 'Llama2 70B',
      provider: 'Groq',
      maxTokens: 4096,
      maxTokenAllowed: 4096,
      type: 'text-generation',
      capabilities: ['text-generation'],
    },
    {
      name: 'gemma-7b-it',
      label: 'Gemma 7B-IT',
      provider: 'Groq',
      maxTokens: 8192,
      maxTokenAllowed: 8192,
      type: 'text-generation',
      capabilities: ['text-generation'],
    },
    {
      name: 'mixtral-8x7b',
      label: 'Mixtral 8x7B',
      provider: 'Groq',
      maxTokens: 32768,
      maxTokenAllowed: 32768,
      type: 'text-generation',
      capabilities: ['text-generation'],
    },
    {
      name: 'llama2-70b',
      label: 'Llama2 70B',
      provider: 'Groq',
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
      defaultApiTokenKey: 'GROQ_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const openai = createOpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey,
    });

    return openai(model);
  }
}
