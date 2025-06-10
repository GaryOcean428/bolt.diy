import { swarmLogger, LogLevel } from '~/lib/modules/logging/SwarmLogger';
import { type ModelResponse, type ModelRequest, type ProviderError } from '~/types/providers';

interface ErrorResponse {
  message: string;
  code?: string;
}

export class ModelProvider {
  private static _instance: ModelProvider;
  private readonly _maxRetries = 3;
  private readonly _backoffFactor = 1.5;
  private readonly _defaultTimeout = 30000; // 30 seconds

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  static getInstance(): ModelProvider {
    if (!ModelProvider._instance) {
      ModelProvider._instance = new ModelProvider();
    }

    return ModelProvider._instance;
  }

  async sendRequest(providerId: string, request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
    let attempt = 1;
    let lastError: Error | null = null;

    while (attempt <= this._maxRetries) {
      try {
        const startTime = Date.now();
        const timeoutId = setTimeout(() => {
          throw new Error('Request timed out');
        }, this._defaultTimeout);

        const response = await fetch(`/api/providers/${providerId}/request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
          signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = (await response.json()) as ErrorResponse;
          throw this._createProviderError(error, response.status);
        }

        const result = await response.json();

        if (!this._isValidModelResponse(result)) {
          throw new Error('Invalid response format from provider');
        }

        const duration = Date.now() - startTime;

        swarmLogger.log(LogLevel.INFO, 'ModelProvider', 'Request successful', {
          providerId,
          duration,
        });

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt === this._maxRetries) {
          swarmLogger.log(LogLevel.ERROR, 'ModelProvider', 'Request failed', {
            error: lastError,
            providerId,
            attempt,
          });
          throw lastError;
        }

        const backoffTime = this._calculateBackoff(attempt);
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
        attempt++;
      }
    }

    throw lastError || new Error('Request failed');
  }

  private _calculateBackoff(attempt: number): number {
    return Math.min(1000 * Math.pow(this._backoffFactor, attempt - 1), 10000);
  }

  private _createProviderError(error: ErrorResponse, status?: number): ProviderError {
    const providerError = new Error(error.message) as ProviderError;
    Object.defineProperty(providerError, 'code', {
      value: error.code,
      writable: true,
    });
    Object.defineProperty(providerError, 'status', {
      value: status,
      writable: true,
    });

    return providerError;
  }

  private _isValidModelResponse(response: unknown): response is ModelResponse {
    if (!response || typeof response !== 'object') {
      return false;
    }

    const modelResponse = response as ModelResponse;

    return typeof modelResponse.output === 'string';
  }
}
