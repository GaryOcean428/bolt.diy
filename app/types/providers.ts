export interface ModelRequest {
  messages: Array<{
    role: string;
    content: string;
  }>;
  stream?: boolean;
}

export interface ModelResponse {
  output: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    costPerToken?: number;
  };
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly agentId?: string,
    readonly code?: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
