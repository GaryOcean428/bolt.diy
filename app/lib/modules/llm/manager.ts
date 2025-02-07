import { BaseProvider } from './base-provider';
import * as providers from './registry';
import type { ModelInfo } from './types';
import type { IProviderSetting } from '~/types/model';

export class LLMManager {
  private static _instance: LLMManager;
  private _providers: Map<string, BaseProvider> = new Map();
  private _modelList: ModelInfo[] = [];
  private readonly _env: Record<string, string> = {};

  private constructor(_env: Record<string, string>) {
    this._registerProvidersFromDirectory();
    this._env = _env;
  }

  static getInstance(env: Record<string, string> = {}): LLMManager {
    if (!LLMManager._instance) {
      LLMManager._instance = new LLMManager(env);
    }

    return LLMManager._instance;
  }

  get env() {
    return this._env;
  }

  private async _registerProvidersFromDirectory() {
    try {
      // Register default provider first
      const defaultProvider = new providers.DefaultProvider(
        {
          name: 'default',
          version: '1.0.0',
          description: 'Default LLM Provider',
          enabled: true,
          capabilities: [],
          entrypoint: 'default.ts',
        },
        {},
      );
      this.registerProvider(defaultProvider);

      // Look for exported classes that extend BaseProvider
      for (const [name, providerClass] of Object.entries(providers)) {
        if (name === 'DefaultProvider') {
          continue;
        } // Skip default provider as it's already registered

        if (typeof providerClass === 'function' && providerClass.prototype instanceof BaseProvider) {
          const provider = new providerClass(
            {
              name: name.replace('Provider', '').toLowerCase(),
              version: '1.0.0',
              description: `${name.replace('Provider', '')} LLM Provider`,
              enabled: true,
              capabilities: [],
              entrypoint: `${name.toLowerCase()}.ts`,
            },
            {},
          );

          try {
            this.registerProvider(provider as BaseProvider);
          } catch (error: unknown) {
            console.log(
              'Failed To Register Provider: ',
              provider.name,
              'error:',
              error instanceof Error ? error.message : String(error),
            );
          }
        }
      }
    } catch (error) {
      console.error('Error registering providers:', error);
    }
  }

  registerProvider(provider: BaseProvider) {
    if (this._providers.has(provider.name)) {
      console.warn(`Provider ${provider.name} is already registered. Skipping.`);
      return;
    }

    console.log('Registering Provider: ', provider.name);
    this._providers.set(provider.name, provider);
    this._modelList = [...this._modelList, ...provider.staticModels];
  }

  getProvider(name: string): BaseProvider | undefined {
    return this._providers.get(name);
  }

  getAllProviders(): BaseProvider[] {
    return Array.from(this._providers.values());
  }

  getModelList(): ModelInfo[] {
    // Filter model list to only include unique models
    return this._modelList.filter((model, index, self) => self.findIndex((m) => m.name === model.name) === index);
  }

  private _validateModel(modelName: string) {
    if (!this._modelList.some((m) => m.name === modelName)) {
      throw new Error(`Model ${modelName} is not allowed. Please select an allowed model.`);
    }
  }

  async updateModelList(options: {
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
    serverEnv?: Record<string, string>;
  }): Promise<ModelInfo[]> {
    const { apiKeys, providerSettings, serverEnv } = options;

    // Get dynamic models from all providers that support them
    const dynamicModels = await Promise.all(
      Array.from(this._providers.values())
        .filter(
          (
            provider,
          ): provider is BaseProvider & {
            getDynamicModels: (
              apiKeys?: Record<string, string>,
              providerSettings?: IProviderSetting,
              serverEnv?: Record<string, string>,
            ) => Promise<ModelInfo[]>;
          } => typeof provider.getDynamicModels === 'function',
        )
        .map((provider) =>
          provider.getDynamicModels(apiKeys, providerSettings?.[provider.name], serverEnv).catch((err) => {
            console.error(`Error getting dynamic models ${provider.name} :`, err);
            return [];
          }),
        ),
    );

    // Combine static and dynamic models
    const modelList = [
      ...dynamicModels.flat(),
      ...Array.from(this._providers.values()).flatMap((p) => p.staticModels || []),
    ];
    this._modelList = modelList;

    // Filter to only unique models
    const uniqueModelList: ModelInfo[] = modelList.filter(
      (model, index, self) => self.findIndex((m) => m.name === model.name) === index,
    );

    this._modelList = uniqueModelList;

    return uniqueModelList;
  }

  getDefaultProvider(): BaseProvider {
    const firstProvider = this._providers.values().next().value;

    if (!firstProvider) {
      throw new Error('No providers registered');
    }

    return firstProvider;
  }
}
