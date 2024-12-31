import type { LanguageModelV1 } from 'ai';
import { BaseProvider, getOpenAILikeModel } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';

export class DefaultProvider extends BaseProvider {
  readonly name = 'default';

  constructor() {
    super(
      {
        name: 'default',
        version: '1.0.0',
        description: 'Default provider implementation',
        enabled: true,
        capabilities: [],
        entrypoint: 'default',
      },
      {
        baseUrlKey: '',
        apiTokenKey: '',
      },
    );
  }

  get staticModels(): ModelInfo[] {
    return [
      {
        name: 'default-model',
        label: 'Default Model',
        provider: 'default',
        maxTokenAllowed: 4096,
      },
    ];
  }

  async initialize(): Promise<void> {
    // No initialization needed
  }

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model } = options;

    // Since this is a default provider, we use a mock base URL and no API key
    return getOpenAILikeModel('http://localhost:3000', undefined, model);
  }
}
