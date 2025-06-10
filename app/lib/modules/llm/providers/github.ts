import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModelV1 } from 'ai';
import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';

export default class GithubProvider extends BaseProvider {
  name = 'Github';
  getApiKeyLink = 'https://github.com/settings/personal-access-tokens';

  config = {
    apiTokenKey: 'GITHUB_API_KEY',
  };

  // find more in https://github.com/marketplace?type=models
  staticModels: ModelInfo[] = [
    { name: 'gpt-4o', label: 'GPT-4o', provider: 'Github', maxTokenAllowed: 128000, maxTokens: 128000, type: 'text-generation', capabilities: ['text-generation', 'code-generation'] },
    { name: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'Github', maxTokenAllowed: 128000, maxTokens: 128000, type: 'text-generation', capabilities: ['text-generation', 'code-generation'] },
    { name: 'o1', label: 'o1', provider: 'Github', maxTokenAllowed: 200000, maxTokens: 200000, type: 'text-generation', capabilities: ['text-generation', 'code-generation'] },
    { name: 'o1-mini', label: 'o1-mini', provider: 'Github', maxTokenAllowed: 128000, maxTokens: 128000, type: 'text-generation', capabilities: ['text-generation', 'code-generation'] },
    { name: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', provider: 'Anthropic', maxTokenAllowed: 200000, maxTokens: 200000, type: 'text-generation', capabilities: ['text-generation', 'code-generation'] },
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
      defaultApiTokenKey: 'GITHUB_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const openai = createOpenAI({
      baseURL: 'https://models.inference.ai.azure.com',
      apiKey,
    });

    return openai(model);
  }
}
