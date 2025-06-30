import { executeApi, ApiError, get, post, put, patch, del } from '../executeApi';
import { logStore } from '~/lib/stores/logs';

// Mock the logger and logStore
jest.mock('~/utils/logger', () => ({
  createScopedLogger: () => ({
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }),
}));

jest.mock('~/lib/stores/logs', () => ({
  logStore: {
    logError: jest.fn(),
    logSystem: jest.fn(),
  },
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock performance.now for consistent timing
const mockPerformanceNow = jest.fn();
global.performance = { now: mockPerformanceNow } as any;

describe('executeApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);
  });

  describe('successful requests', () => {
    it('should handle successful GET request with JSON response', async () => {
      const mockData = { id: '1', name: 'Test User' };
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockData),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const response = await executeApi<typeof mockData>('/api/users/1');

      expect(response).toEqual({
        data: mockData,
        status: 200,
        headers: mockResponse.headers,
        success: true,
        metadata: {
          url: '/api/users/1',
          method: 'GET',
          duration: 0,
          timestamp: expect.any(String),
          requestId: expect.any(String),
        },
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/users/1', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': expect.any(String),
        },
        credentials: 'same-origin',
        signal: expect.any(AbortSignal),
      });
    });

    it('should handle successful POST request with body', async () => {
      const requestData = { name: 'New User', email: 'user@example.com' };
      const responseData = { id: '123', ...requestData };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(responseData),
      });

      const response = await executeApi<typeof responseData>('/api/users', {
        method: 'POST',
        body: requestData,
      });

      expect(response.data).toEqual(responseData);
      expect(response.status).toBe(201);

      expect(mockFetch).toHaveBeenCalledWith('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': expect.any(String),
        },
        credentials: 'same-origin',
        signal: expect.any(AbortSignal),
        body: JSON.stringify(requestData),
      });
    });

    it('should handle text responses', async () => {
      const textResponse = 'Plain text response';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: () => Promise.resolve(textResponse),
      });

      const response = await executeApi<string>('/api/text');

      expect(response.data).toBe(textResponse);
    });

    it('should log successful requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      });

      await executeApi('/api/test');

      expect(logStore.logSystem).toHaveBeenCalledWith('API request started', {
        requestId: expect.any(String),
        method: 'GET',
        url: '/api/test',
        hasBody: false,
      });

      expect(logStore.logSystem).toHaveBeenCalledWith('API request completed', {
        requestId: expect.any(String),
        status: 200,
        duration: 0,
        success: true,
        attempt: 1,
      });
    });
  });

  describe('error handling', () => {
    it('should throw ApiError for HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
      });

      await expect(executeApi('/api/nonexistent')).rejects.toThrow(ApiError);
      
      try {
        await executeApi('/api/nonexistent');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(404);
        expect((error as ApiError).getUserMessage()).toBe('The requested resource was not found.');
      }
    });

    it('should throw ApiError for network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network error'));

      await expect(executeApi('/api/test')).rejects.toThrow(ApiError);
      
      try {
        await executeApi('/api/test');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(0);
        expect((error as ApiError).isNetworkError()).toBe(true);
        expect((error as ApiError).getUserMessage()).toBe(
          'Network connection failed. Please check your internet connection and try again.'
        );
      }
    });

    it('should throw ApiError for invalid JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.reject(new SyntaxError('Invalid JSON')),
      });

      await expect(executeApi('/api/test')).rejects.toThrow(ApiError);
    });

    it('should log errors appropriately', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      try {
        await executeApi('/api/test');
      } catch (error) {
        // Error should be logged
        expect(logStore.logError).toHaveBeenCalledWith(
          'API request failed',
          expect.any(ApiError),
          {
            requestId: expect.any(String),
            url: '/api/test',
            method: 'GET',
            attempt: 1,
            duration: 0,
          }
        );
      }
    });
  });

  describe('retry logic', () => {
    it('should retry on network errors', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ success: true }),
        });

      const response = await executeApi('/api/test', { retries: 2, retryDelay: 0 });

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(response.success).toBe(true);
    });

    it('should retry on server errors (5xx)', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ success: true }),
        });

      const response = await executeApi('/api/test', { retries: 1, retryDelay: 0 });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(response.success).toBe(true);
    });

    it('should retry on rate limit errors (429)', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ success: true }),
        });

      const response = await executeApi('/api/test', { retries: 1, retryDelay: 0 });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(response.success).toBe(true);
    });

    it('should not retry on client errors (4xx except 429)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers(),
      });

      await expect(executeApi('/api/test', { retries: 2 })).rejects.toThrow(ApiError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should respect retry limits', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(executeApi('/api/test', { retries: 1, retryDelay: 0 })).rejects.toThrow(ApiError);

      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe('timeout handling', () => {
    it('should handle request timeouts', async () => {
      jest.useFakeTimers();
      
      // Mock a fetch that never resolves
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const requestPromise = executeApi('/api/test', { timeout: 1000 });

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(1000);

      await expect(requestPromise).rejects.toThrow('Request timeout after 1000ms');

      jest.useRealTimers();
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ success: true }),
      });
    });

    it('should handle GET requests', async () => {
      await get('/api/test');
      
      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        method: 'GET',
      }));
    });

    it('should handle POST requests', async () => {
      const body = { data: 'test' };
      await post('/api/test', body);
      
      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
      }));
    });

    it('should handle PUT requests', async () => {
      const body = { data: 'test' };
      await put('/api/test', body);
      
      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(body),
      }));
    });

    it('should handle PATCH requests', async () => {
      const body = { data: 'test' };
      await patch('/api/test', body);
      
      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(body),
      }));
    });

    it('should handle DELETE requests', async () => {
      await del('/api/test');
      
      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        method: 'DELETE',
      }));
    });
  });

  describe('ApiError class', () => {
    it('should provide user-friendly messages for common errors', () => {
      const networkError = new ApiError('Network error', 0, null, 'req-1', '/api/test', 'GET');
      expect(networkError.getUserMessage()).toBe(
        'Network connection failed. Please check your internet connection and try again.'
      );

      const notFoundError = new ApiError('Not found', 404, null, 'req-2', '/api/test', 'GET');
      expect(notFoundError.getUserMessage()).toBe('The requested resource was not found.');

      const unauthorizedError = new ApiError('Unauthorized', 401, null, 'req-3', '/api/test', 'GET');
      expect(unauthorizedError.getUserMessage()).toBe('Authentication required. Please log in and try again.');

      const forbiddenError = new ApiError('Forbidden', 403, null, 'req-4', '/api/test', 'GET');
      expect(forbiddenError.getUserMessage()).toBe('You do not have permission to perform this action.');

      const rateLimitError = new ApiError('Rate limited', 429, null, 'req-5', '/api/test', 'GET');
      expect(rateLimitError.getUserMessage()).toBe('Too many requests. Please wait a moment and try again.');

      const serverError = new ApiError('Server error', 500, null, 'req-6', '/api/test', 'GET');
      expect(serverError.getUserMessage()).toBe('Server error occurred. Please try again later.');
    });

    it('should correctly identify error types', () => {
      const networkError = new ApiError('Network error', 0, null, 'req-1', '/api/test', 'GET');
      expect(networkError.isNetworkError()).toBe(true);
      expect(networkError.isClientError()).toBe(false);
      expect(networkError.isServerError()).toBe(false);

      const clientError = new ApiError('Bad request', 400, null, 'req-2', '/api/test', 'GET');
      expect(clientError.isNetworkError()).toBe(false);
      expect(clientError.isClientError()).toBe(true);
      expect(clientError.isServerError()).toBe(false);

      const serverError = new ApiError('Server error', 500, null, 'req-3', '/api/test', 'GET');
      expect(serverError.isNetworkError()).toBe(false);
      expect(serverError.isClientError()).toBe(false);
      expect(serverError.isServerError()).toBe(true);
    });
  });

  describe('configuration options', () => {
    it('should use custom headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      });

      await executeApi('/api/test', {
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value',
        },
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': expect.any(String),
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value',
        },
      }));
    });

    it('should use custom error prefix', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
      });

      await expect(executeApi('/api/test', { 
        errorPrefix: 'Custom Operation',
        retries: 0 
      })).rejects.toThrow('Custom Operation failed: 500 Internal Server Error');
    });

    it('should handle custom credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      });

      await executeApi('/api/test', { credentials: 'include' });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        credentials: 'include',
      }));
    });
  });
});