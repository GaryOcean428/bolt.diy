import { logStore } from '~/lib/stores/logs';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('API');

/**
 * HTTP methods supported by the API client
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Configuration options for API requests
 */
export interface ApiRequestConfig {
  /** HTTP method to use */
  method?: HttpMethod;

  /** Request headers */
  headers?: Record<string, string>;

  /** Request body (will be JSON.stringify'd if not a string) */
  body?: unknown;

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Number of retry attempts for failed requests (default: 2) */
  retries?: number;

  /** Delay between retry attempts in milliseconds (default: 1000) */
  retryDelay?: number;

  /** Whether to include credentials in the request (default: 'same-origin') */
  credentials?: RequestCredentials;

  /** Signal to abort the request */
  signal?: AbortSignal;

  /** Custom error message prefix */
  errorPrefix?: string;
}

/**
 * Standardized API response structure
 */
export interface ApiResponse<TData = unknown> {
  /** Response data */
  data: TData;

  /** HTTP status code */
  status: number;

  /** Response headers */
  headers: Headers;

  /** Whether the request was successful */
  success: boolean;

  /** Error message if the request failed */
  error?: string;

  /** Request metadata */
  metadata: {
    url: string;
    method: string;
    duration: number;
    timestamp: string;
    requestId: string;
  };
}

/**
 * API error class with enhanced error information
 */
export class ApiError extends Error {
  readonly status: number;
  readonly response: Response | null;
  readonly requestId: string;
  readonly url: string;
  readonly method: string;

  constructor(
    message: string,
    status: number,
    response: Response | null = null,
    requestId: string,
    url: string,
    method: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
    this.requestId = requestId;
    this.url = url;
    this.method = method;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * Check if this is a network error (no response received)
   */
  isNetworkError(): boolean {
    return this.response === null;
  }

  /**
   * Check if this is a client error (4xx status code)
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Check if this is a server error (5xx status code)
   */
  isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage(): string {
    if (this.isNetworkError()) {
      return 'Network connection failed. Please check your internet connection and try again.';
    }

    if (this.status === 401) {
      return 'Authentication required. Please log in and try again.';
    }

    if (this.status === 403) {
      return 'You do not have permission to perform this action.';
    }

    if (this.status === 404) {
      return 'The requested resource was not found.';
    }

    if (this.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }

    if (this.isServerError()) {
      return 'Server error occurred. Please try again later.';
    }

    return this.message || 'An unexpected error occurred.';
  }
}

/**
 * Generate a unique request ID for tracking
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a timeout promise that rejects after the specified delay
 */
function createTimeoutPromise(timeout: number, requestId: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new ApiError(`Request timeout after ${timeout}ms`, 0, null, requestId, '', ''));
    }, timeout);
  });
}

/**
 * Sleep for the specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    // Don't retry client errors (4xx) except for 429 (rate limit)
    if (error.isClientError() && error.status !== 429) {
      return false;
    }

    // Retry network errors and server errors
    return error.isNetworkError() || error.isServerError() || error.status === 429;
  }

  // Retry other types of errors (network issues, etc.)
  return true;
}

/**
 * Execute an API request with comprehensive error handling, retries, and logging
 *
 * Design Decisions:
 * 1. Comprehensive error handling: Distinguishes between network, client, and server errors
 * 2. Automatic retries: Configurable retry logic with exponential backoff for transient failures
 * 3. Request/response logging: Integrated with the app's logging system for debugging
 * 4. Timeout handling: Prevents hanging requests with configurable timeouts
 * 5. Type safety: Full TypeScript support with generic response types
 * 6. Request tracking: Unique request IDs for correlation across logs
 * 7. User-friendly errors: Provides both technical and user-friendly error messages
 *
 * @param url - The URL to request
 * @param config - Configuration options for the request
 * @returns Promise resolving to the API response
 *
 * @example
 * ```typescript
 * // Simple GET request
 * const response = await executeApi<{ message: string }>('/api/status');
 * console.log(response.data.message);
 *
 * // POST request with error handling
 * try {
 *   const response = await executeApi<{ id: string }>('/api/users', {
 *     method: 'POST',
 *     body: { name: 'John Doe', email: 'john@example.com' },
 *     retries: 3,
 *     timeout: 10000,
 *   });
 *   console.log('User created:', response.data.id);
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.error('API Error:', error.getUserMessage());
 *     console.error('Status:', error.status);
 *   } else {
 *     console.error('Unexpected error:', error);
 *   }
 * }
 * ```
 */
export async function executeApi<TData = unknown>(
  url: string,
  config: ApiRequestConfig = {},
): Promise<ApiResponse<TData>> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 30000,
    retries = 2,
    retryDelay = 1000,
    credentials = 'same-origin',
    signal,
    errorPrefix = 'API Request',
  } = config;

  const requestId = generateRequestId();
  const startTime = performance.now();

  // Prepare request configuration
  const requestConfig: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      ...headers,
    },
    credentials,
    signal,
  };

  // Add body if provided
  if (body !== undefined && method !== 'GET' && method !== 'DELETE') {
    requestConfig.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  // Log request initiation
  logger.debug('API request initiated', {
    requestId,
    method,
    url,
    timeout,
    retries,
  });

  logStore.logSystem('API request started', {
    requestId,
    method,
    url,
    hasBody: body !== undefined,
  });

  let lastError: unknown;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      // Create abort controller for timeout if no signal provided
      const abortController = signal ? undefined : new AbortController();
      const effectiveSignal = signal || abortController?.signal;

      if (abortController) {
        requestConfig.signal = effectiveSignal;
      }

      // Create request promise
      const requestPromise = fetch(url, requestConfig);

      // Create timeout promise if no external signal provided
      const timeoutPromise = abortController ? createTimeoutPromise(timeout, requestId) : Promise.race([]);

      // Race between request and timeout
      const response = abortController ? await Promise.race([requestPromise, timeoutPromise]) : await requestPromise;

      const duration = performance.now() - startTime;

      // Check if the response indicates success
      if (!response.ok) {
        const errorMessage = `${errorPrefix} failed: ${response.status} ${response.statusText}`;

        throw new ApiError(errorMessage, response.status, response, requestId, url, method);
      }

      // Parse response data
      let data: TData;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          throw new ApiError(
            `${errorPrefix} failed: Invalid JSON response`,
            response.status,
            response,
            requestId,
            url,
            method,
          );
        }
      } else if (contentType.includes('text/')) {
        data = (await response.text()) as TData;
      } else {
        // For other content types, return the response itself
        data = response as TData;
      }

      // Create successful response
      const apiResponse: ApiResponse<TData> = {
        data,
        status: response.status,
        headers: response.headers,
        success: true,
        metadata: {
          url,
          method,
          duration,
          timestamp: new Date().toISOString(),
          requestId,
        },
      };

      // Log successful response
      logger.debug('API request completed successfully', {
        requestId,
        status: response.status,
        duration,
        attempt: attempt + 1,
      });

      logStore.logSystem('API request completed', {
        requestId,
        status: response.status,
        duration,
        success: true,
        attempt: attempt + 1,
      });

      return apiResponse;
    } catch (error) {
      lastError = error;

      const duration = performance.now() - startTime;

      // Convert unknown errors to ApiError
      let apiError: ApiError;

      if (error instanceof ApiError) {
        apiError = error;
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network error
        apiError = new ApiError(`${errorPrefix} failed: Network error`, 0, null, requestId, url, method);
      } else {
        // Other errors
        apiError = new ApiError(
          `${errorPrefix} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          0,
          null,
          requestId,
          url,
          method,
        );
      }

      // Log the error
      logger.error('API request failed', {
        requestId,
        error: apiError.message,
        status: apiError.status,
        duration,
        attempt: attempt + 1,
        willRetry: attempt < retries && isRetryableError(apiError),
      });

      logStore.logError('API request failed', apiError, {
        requestId,
        url,
        method,
        attempt: attempt + 1,
        duration,
      });

      // Check if we should retry
      if (attempt < retries && isRetryableError(apiError)) {
        attempt++;

        const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff

        logger.debug('Retrying API request', {
          requestId,
          attempt,
          delay,
          maxRetries: retries,
        });

        await sleep(delay);
        continue;
      }

      // No more retries, throw the error
      throw apiError;
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError;
}

/**
 * Convenience wrapper for GET requests
 */
export function get<TData = unknown>(
  url: string,
  config: Omit<ApiRequestConfig, 'method'> = {},
): Promise<ApiResponse<TData>> {
  return executeApi<TData>(url, { ...config, method: 'GET' });
}

/**
 * Convenience wrapper for POST requests
 */
export function post<TData = unknown>(
  url: string,
  body?: unknown,
  config: Omit<ApiRequestConfig, 'method' | 'body'> = {},
): Promise<ApiResponse<TData>> {
  return executeApi<TData>(url, { ...config, method: 'POST', body });
}

/**
 * Convenience wrapper for PUT requests
 */
export function put<TData = unknown>(
  url: string,
  body?: unknown,
  config: Omit<ApiRequestConfig, 'method' | 'body'> = {},
): Promise<ApiResponse<TData>> {
  return executeApi<TData>(url, { ...config, method: 'PUT', body });
}

/**
 * Convenience wrapper for PATCH requests
 */
export function patch<TData = unknown>(
  url: string,
  body?: unknown,
  config: Omit<ApiRequestConfig, 'method' | 'body'> = {},
): Promise<ApiResponse<TData>> {
  return executeApi<TData>(url, { ...config, method: 'PATCH', body });
}

/**
 * Convenience wrapper for DELETE requests
 */
export function del<TData = unknown>(
  url: string,
  config: Omit<ApiRequestConfig, 'method'> = {},
): Promise<ApiResponse<TData>> {
  return executeApi<TData>(url, { ...config, method: 'DELETE' });
}
