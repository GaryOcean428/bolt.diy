import { createScopedLogger } from '~/utils/logger';
import { ServerConnection } from '~/utils/server-connection';

const logger = createScopedLogger('RailwayClient');

/**
 * Example integration of ServerConnection for Railway server communication
 */
export class RailwayClient {
  private _connection: ServerConnection;

  constructor(railwayUrl: string) {
    this._connection = new ServerConnection({
      url: railwayUrl,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 10000, // 10 second timeout for Railway
    });
  }

  /**
   * Test Railway server connectivity
   */
  async testConnectivity(): Promise<boolean> {
    try {
      const result = await this._connection.testConnection();

      if (result.success) {
        logger.info(`Railway server accessible (${result.responseTime}ms)`);
        return true;
      } else {
        logger.warn(`Railway server connectivity test failed: ${result.error}`);
        return false;
      }
    } catch (error) {
      logger.error('Railway connectivity test error:', error);
      return false;
    }
  }

  /**
   * Execute a command on Railway server with retry logic
   */
  async executeCommand(command: string, payload?: any): Promise<any> {
    try {
      const response = await this._connection.fetchWithRetry('/api/execute', {
        method: 'POST',
        body: JSON.stringify({
          command,
          payload,
        }),
      });

      if (!response.ok) {
        throw new Error(`Railway command failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logger.debug(`Railway command executed successfully: ${command}`);

      return result;
    } catch (error) {
      logger.error(`Railway command failed: ${command}`, error);
      throw error;
    }
  }

  /**
   * Check Railway server health
   */
  async checkHealth(): Promise<boolean> {
    return await this._connection.healthCheck();
  }
}

// Example usage in environment where Railway URL is available
export function createRailwayClient(): RailwayClient | null {
  const railwayUrl = process.env.RAILWAY_URL || 'https://execute.up.railway.app';

  if (!railwayUrl) {
    logger.warn('Railway URL not configured');
    return null;
  }

  logger.info(`Initializing Railway client for: ${railwayUrl}`);

  return new RailwayClient(railwayUrl);
}
