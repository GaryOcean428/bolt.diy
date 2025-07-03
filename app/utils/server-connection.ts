import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('ServerConnection');

interface ServerConfig {
  url: string;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

export class ServerConnection {
  private _config: Required<ServerConfig>;

  constructor(config: ServerConfig) {
    this._config = {
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 5000,
      ...config,
    };
  }

  async fetchWithRetry(endpoint: string, options?: RequestInit): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this._config.retryAttempts; attempt++) {
      try {
        logger.debug(`Attempt ${attempt + 1}/${this._config.retryAttempts} for ${endpoint}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this._config.timeout);

        try {
          const response = await fetch(`${this._config.url}${endpoint}`, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              ...options?.headers,
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorMessage = `Server error: ${response.status} ${response.statusText}`;

            if (response.status === 500) {
              // Server errors are retryable
              throw new Error(errorMessage);
            } else if (response.status >= 400 && response.status < 500) {
              // Client errors are typically not retryable
              logger.error(`Client error (${response.status}), not retrying: ${errorMessage}`);
              throw new Error(errorMessage);
            }
          }

          logger.debug(`Successfully connected to ${endpoint} on attempt ${attempt + 1}`);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Attempt ${attempt + 1} failed:`, error);

        // Don't retry on abort errors (timeouts) if this is the last attempt
        if (attempt === this._config.retryAttempts - 1) {
          break;
        }

        // Exponential backoff with jitter
        const delay = this._config.retryDelay * Math.pow(2, attempt) + Math.random() * 1000;
        logger.debug(`Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    const finalError = lastError || new Error('Failed to connect to server');
    logger.error(`All retry attempts failed for ${endpoint}:`, finalError);
    throw finalError;
  }

  /**
   * Health check endpoint to verify server connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.fetchWithRetry('/health', {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      logger.warn('Health check failed:', error);
      return false;
    }
  }

  /**
   * Test connectivity without throwing errors
   */
  async testConnection(): Promise<{ success: boolean; error?: string; responseTime?: number }> {
    const startTime = Date.now();

    try {
      await this.fetchWithRetry('/', {
        method: 'HEAD',
      });

      const responseTime = Date.now() - startTime;
      logger.info(`Connection test successful (${responseTime}ms)`);

      return { success: true, responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.warn(`Connection test failed after ${responseTime}ms:`, errorMessage);

      return {
        success: false,
        error: errorMessage,
        responseTime,
      };
    }
  }
}
