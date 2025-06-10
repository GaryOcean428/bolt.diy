export interface ModelInfo {
  name: string;
  label?: string;
  provider: string;
  maxTokens: number;
  maxTokenAllowed?: number;
  type: 'text-generation';
  capabilities: readonly string[];
  parameters?: string;
  contextWindow?: string;
  maxOutput?: string;
}

export type ProviderModelInfo = Omit<ModelInfo, 'maxTokens' | 'type' | 'capabilities'> & {
  maxTokenAllowed: number;
};

export interface ProviderConfig {
  baseUrlKey?: string;
  apiTokenKey?: string;
  [key: string]: any;
}

export interface ProviderInfo {
  name: string;
  staticModels: readonly ModelInfo[];
  getApiKeyLink?: string;
  labelForGetApiKey?: string;
  icon?: string;
  config?: ProviderConfig;
}
