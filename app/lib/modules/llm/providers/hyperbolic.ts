import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModelV1 } from 'ai';
import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';

export default class HyperbolicProvider extends BaseProvider {
  name = 'Hyperbolic';
  getApiKeyLink = 'https://app.hyperbolic.xyz/settings';

  config = {
    apiTokenKey: 'HYPERBOLIC_API_KEY',
  };

  staticModels: ModelInfo[] = [
    {
      name: 'Qwen/Qwen2.5-Coder-32B-Instruct',
      label: 'Qwen 2.5 Coder 32B Instruct',
      provider: 'Hyperbolic',
      maxTokenAllowed: 8192,
      maxTokens: 8192,
      type: 'text-generation',
      capabilities: ['text-generation', 'code-generation'],
    },
    {
      name: 'Qwen/Qwen2.5-72B-Instruct',
      label: 'Qwen2.5-72B-Instruct',
      provider: 'Hyperbolic',
      maxTokenAllowed: 8192,
      maxTokens: 8192,
      type: 'text-generation',
      capabilities: ['text-generation', 'code-generation'],
    },
    {
      name: 'deepseek-ai/DeepSeek-V2.5',
      label: 'DeepSeek-V2.5',
      provider: 'Hyperbolic',
      maxTokenAllowed: 8192,
      maxTokens: 8192,
      type: 'text-generation',
      capabilities: ['text-generation', 'code-generation'],
    },
    {
      name: 'Qwen/QwQ-32B-Preview',
      label: 'QwQ-32B-Preview',
      provider: 'Hyperbolic',
      maxTokenAllowed: 8192,
      maxTokens: 8192,
      type: 'text-generation',
      capabilities: ['text-generation', 'code-generation'],
    },
    {
      name: 'Qwen/Qwen2-VL-72B-Instruct',
      label: 'Qwen2-VL-72B-Instruct',
      provider: 'Hyperbolic',
      maxTokenAllowed: 8192,
      maxTokens: 8192,
      type: 'text-generation',
      capabilities: ['text-generation', 'code-generation'],
    },
  ];

  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv: Record<string, string> = {},
  ): Promise<ModelInfo[]> {
    const { baseUrl: fetchBaseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'HYPERBOLIC_API_KEY',
    });
    const baseUrl = fetchBaseUrl || 'https://api.hyperbolic.xyz/v1';

    if (!apiKey) {
      // Return empty array instead of throwing error when API key is missing
      return [];
    }

    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const res = (await response.json()) as any;

    const data = res.data.filter((model: any) => model.object === 'model' && model.supports_chat);

    return data.map((m: any) => ({
      name: m.id,
      label: `${m.id} - context ${m.context_length ? Math.floor(m.context_length / 1000) + 'k' : 'N/A'}`,
      provider: this.name,
      maxTokenAllowed: m.context_length || 8000,
      maxTokens: m.context_length || 8000,
      type: 'text-generation' as const,
      capabilities: ['text-generation', 'code-generation'] as const,
    }));
  }

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
      defaultApiTokenKey: 'HYPERBOLIC_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider. Please add HYPERBOLIC_API_KEY to use this provider.`);
    }

    const openai = createOpenAI({
      baseURL: 'https://api.hyperbolic.xyz/v1/',
      apiKey,
    });

    return openai(model);
  }
}
