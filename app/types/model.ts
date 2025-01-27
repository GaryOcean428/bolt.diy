export interface IProviderConfig {
  name: string;
  baseUrl?: string;
  apiKey?: string;
  settings?: Record<string, any>;
}

export interface IProviderSetting {
  name: string;
  baseUrl?: string;
  apiKey?: string;
  [key: string]: any;
}

export interface ProviderStatus {
  name: string;
  enabled: boolean;
  isLocal: boolean;
  isRunning: boolean | null;
  error?: string;
  lastChecked: Date;
  responseTime?: number;
  url: string | null;
}

export interface ModelInfo {
  name: string;
  label: string;
  provider: string;
  maxTokens: number;
  maxTokenAllowed?: number;
  type: 'text-generation';
  capabilities: readonly string[];
}

export interface ProviderInfo {
  name: string;
  displayName: string;
  staticModels: readonly ModelInfo[];
  getApiKeyLink?: string;
  labelForGetApiKey?: string;
  icon?: string;
}
