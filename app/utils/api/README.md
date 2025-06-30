# API Utilities (executeApi.ts)

A comprehensive set of utilities for making HTTP requests with robust error handling, automatic retries, and integrated logging.

## Overview

The `executeApi` function and its convenience wrappers provide a standardized way to make HTTP requests throughout the application. It includes comprehensive error handling, automatic retries for transient failures, request/response logging, and full TypeScript support.

## Design Decisions

### 1. Unified Error Handling

- **Custom ApiError class**: Provides structured error information with user-friendly messages
- **Error categorization**: Distinguishes between network, client (4xx), and server (5xx) errors
- **User-friendly messages**: Translates technical errors into actionable user messages

### 2. Automatic Retry Logic

- **Configurable retries**: Default 2 retries, configurable up to any limit
- **Exponential backoff**: Prevents overwhelming servers with immediate retries
- **Intelligent retry conditions**: Only retries transient errors (network, 5xx, 429)
- **No retry for client errors**: Avoids wasting resources on non-transient errors (4xx except 429)

### 3. Request/Response Logging

- **Integrated logging**: Uses the app's existing `logStore` for consistency
- **Request tracking**: Unique request IDs for correlating logs
- **Performance monitoring**: Tracks request duration
- **Debug information**: Comprehensive logging in development mode

### 4. Timeout Handling

- **Configurable timeouts**: Default 30 seconds, adjustable per request
- **AbortController integration**: Clean request cancellation
- **External signal support**: Can be cancelled by parent components

### 5. Type Safety

- **Generic response types**: Full TypeScript support for response data
- **Strict interfaces**: Well-defined types for all configuration options
- **Runtime type checking**: Validates response content types

### 6. Content Type Handling

- **Automatic JSON parsing**: Handles JSON responses automatically
- **Text content support**: Handles text responses
- **Binary data support**: Can handle other content types
- **Error on invalid JSON**: Provides clear errors for malformed JSON

## API Reference

### Core Function

```typescript
executeApi<TData>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<TData>>
```

### Configuration Options

```typescript
interface ApiRequestConfig {
  method?: HttpMethod; // HTTP method (default: 'GET')
  headers?: Record<string, string>; // Request headers
  body?: unknown; // Request body (auto-serialized)
  timeout?: number; // Timeout in ms (default: 30000)
  retries?: number; // Retry attempts (default: 2)
  retryDelay?: number; // Delay between retries (default: 1000)
  credentials?: RequestCredentials; // Include credentials (default: 'same-origin')
  signal?: AbortSignal; // Abort signal
  errorPrefix?: string; // Custom error message prefix
}
```

### Response Structure

```typescript
interface ApiResponse<TData> {
  data: TData; // Response data
  status: number; // HTTP status code
  headers: Headers; // Response headers
  success: boolean; // Success indicator
  error?: string; // Error message if failed
  metadata: {
    // Request metadata
    url: string;
    method: string;
    duration: number;
    timestamp: string;
    requestId: string;
  };
}
```

### Error Types

```typescript
class ApiError extends Error {
  status: number; // HTTP status code
  response: Response | null; // Original response (if any)
  requestId: string; // Unique request ID
  url: string; // Request URL
  method: string; // HTTP method

  // Helper methods
  isNetworkError(): boolean; // No response received
  isClientError(): boolean; // 4xx status code
  isServerError(): boolean; // 5xx status code
  getUserMessage(): string; // User-friendly error message
}
```

## Usage Examples

### Basic GET Request

```typescript
import { executeApi } from '~/utils/api';

interface User {
  id: string;
  name: string;
  email: string;
}

async function getUser(userId: string): Promise<User> {
  try {
    const response = await executeApi<User>(`/api/users/${userId}`);
    return response.data;
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('API Error:', error.getUserMessage());
      throw new Error(error.getUserMessage());
    }
    throw error;
  }
}
```

### POST Request with Error Handling

```typescript
import { executeApi, ApiError } from '~/utils/api';

interface CreateUserRequest {
  name: string;
  email: string;
}

interface CreateUserResponse {
  id: string;
  message: string;
}

async function createUser(userData: CreateUserRequest): Promise<CreateUserResponse> {
  try {
    const response = await executeApi<CreateUserResponse>('/api/users', {
      method: 'POST',
      body: userData,
      retries: 3,
      timeout: 15000,
      errorPrefix: 'User Creation',
    });

    return response.data;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 409) {
        throw new Error('A user with this email already exists');
      } else if (error.status === 422) {
        throw new Error('Please check your input and try again');
      }
      throw new Error(error.getUserMessage());
    }
    throw error;
  }
}
```

### Convenience Methods

```typescript
import { get, post, put, patch, del } from '~/utils/api';

// GET request
const user = await get<User>('/api/users/123');

// POST request
const newUser = await post<CreateUserResponse>('/api/users', userData);

// PUT request
const updatedUser = await put<User>('/api/users/123', userData);

// PATCH request
const patchedUser = await patch<User>('/api/users/123', { name: 'New Name' });

// DELETE request
await del('/api/users/123');
```

### Advanced Configuration

```typescript
import { executeApi } from '~/utils/api';

// Request with custom headers and authentication
const response = await executeApi<ApiData>('/api/protected-resource', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
    'X-Client-Version': '1.0.0',
  },
  timeout: 60000, // 1 minute timeout
  retries: 5, // More retries for important requests
  retryDelay: 2000, // 2 second delay between retries
});

// Request with abort signal for cancellation
const abortController = new AbortController();

// Cancel after 10 seconds
setTimeout(() => abortController.abort(), 10000);

try {
  const response = await executeApi<Data>('/api/long-running-task', {
    signal: abortController.signal,
  });
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request was cancelled');
  }
}
```

### Error Handling Patterns

```typescript
import { executeApi, ApiError } from '~/utils/api';

async function robustApiCall() {
  try {
    const response = await executeApi<Data>('/api/data');
    return response.data;
  } catch (error) {
    if (error instanceof ApiError) {
      // Handle different error types
      if (error.isNetworkError()) {
        throw new Error('Please check your internet connection');
      } else if (error.status === 401) {
        // Redirect to login
        window.location.href = '/login';
        return;
      } else if (error.status === 403) {
        throw new Error('You do not have permission to access this resource');
      } else if (error.status === 429) {
        throw new Error('Too many requests. Please wait and try again');
      } else if (error.isServerError()) {
        throw new Error('Server error. Please try again later');
      } else {
        throw new Error(error.getUserMessage());
      }
    }

    // Handle non-API errors
    console.error('Unexpected error:', error);
    throw new Error('An unexpected error occurred');
  }
}
```

### Integration with React Components

```typescript
import React, { useState, useEffect } from 'react';
import { executeApi, ApiError } from '~/utils/api';

function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        setLoading(true);
        setError(null);

        const response = await executeApi<User>(`/api/users/${userId}`, {
          timeout: 10000,
          retries: 2,
        });

        setUser(response.data);
      } catch (error) {
        if (error instanceof ApiError) {
          setError(error.getUserMessage());
        } else {
          setError('Failed to load user data');
        }
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>User not found</div>;

  return <div>{user.name}</div>;
}
```

## Integration with Existing Systems

### Logging Integration

All requests are automatically logged using the app's existing logging system:

```typescript
// Request start
logStore.logSystem('API request started', {
  requestId,
  method,
  url,
  hasBody: body !== undefined,
});

// Request completion
logStore.logSystem('API request completed', {
  requestId,
  status: response.status,
  duration,
  success: true,
  attempt: attempt + 1,
});

// Request failure
logStore.logError('API request failed', apiError, {
  requestId,
  url,
  method,
  attempt: attempt + 1,
  duration,
});
```

### Error Boundary Integration

```typescript
import { ErrorBoundary } from '~/components/ErrorBoundary';
import { executeApi, ApiError } from '~/utils/api';

function ApiComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    executeApi<Data>('/api/data')
      .then(response => setData(response.data))
      .catch(error => {
        // Let ErrorBoundary handle this
        throw error;
      });
  }, []);

  return <div>{data ? <DataDisplay data={data} /> : 'Loading...'}</div>;
}

// Wrap with ErrorBoundary for complete error handling
function App() {
  return (
    <ErrorBoundary id="api-component">
      <ApiComponent />
    </ErrorBoundary>
  );
}
```

## Best Practices

### 1. Use Type-Safe Interfaces

```typescript
// Define clear interfaces for request/response data
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: User;
  expiresAt: string;
}

const response = await post<LoginResponse>('/api/auth/login', loginData);
```

### 2. Handle Errors Appropriately

```typescript
// Don't just log errors - provide user feedback
try {
  const response = await executeApi<Data>('/api/data');
  return response.data;
} catch (error) {
  if (error instanceof ApiError) {
    // Show user-friendly message
    toast.error(error.getUserMessage());
  } else {
    // Log unexpected errors for debugging
    console.error('Unexpected error:', error);
    toast.error('An unexpected error occurred');
  }
  throw error;
}
```

### 3. Configure Timeouts Appropriately

```typescript
// Short timeout for quick operations
const status = await get<Status>('/api/status', { timeout: 5000 });

// Longer timeout for file uploads
const result = await post<UploadResult>('/api/upload', formData, {
  timeout: 120000, // 2 minutes
});

// Very short timeout for health checks
const health = await get<Health>('/api/health', { timeout: 1000 });
```

### 4. Use Appropriate Retry Logic

```typescript
// Critical operations - more retries
const paymentResult = await post<PaymentResult>('/api/payment', data, {
  retries: 5,
  retryDelay: 2000,
});

// Quick operations - fewer retries
const search = await get<SearchResults>('/api/search', {
  retries: 1,
  timeout: 5000,
});

// Non-critical operations - no retries
const analytics = await post<void>('/api/analytics', data, { retries: 0 });
```

### 5. Handle AbortSignals Properly

```typescript
function useApiData(url: string) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const abortController = new AbortController();

    executeApi(url, { signal: abortController.signal })
      .then((response) => setData(response.data))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('API error:', error);
        }
      });

    return () => abortController.abort();
  }, [url]);

  return data;
}
```

## Performance Considerations

### Memory Management

- Request objects are properly cleaned up after completion
- AbortController signals prevent memory leaks from cancelled requests
- Response data is not unnecessarily cloned

### Network Efficiency

- Automatic retry with exponential backoff prevents server overload
- Configurable timeouts prevent hanging requests
- Request deduplication should be implemented at the application level if needed

### Bundle Size

- Tree-shakeable exports allow importing only needed functions
- Minimal external dependencies
- Efficient error handling without bloating bundle size

## Testing

Example test patterns for API utilities:

```typescript
import { executeApi, ApiError } from '~/utils/api';

// Mock fetch for testing
global.fetch = jest.fn();

describe('executeApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle successful GET request', async () => {
    const mockData = { id: '1', name: 'Test' };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(mockData),
    });

    const response = await executeApi<typeof mockData>('/api/test');

    expect(response.data).toEqual(mockData);
    expect(response.success).toBe(true);
    expect(response.status).toBe(200);
  });

  it('should retry on server errors', async () => {
    (fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ success: true }),
      });

    const response = await executeApi('/api/test', { retries: 2 });

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(response.success).toBe(true);
  });
});
```

## Troubleshooting

### Common Issues

1. **Requests timing out too quickly**

   - Solution: Increase timeout for slow operations
   - Check network conditions

2. **Too many retries on client errors**

   - Solution: Client errors (4xx) are not retried by default
   - Check if you're correctly handling validation errors

3. **Memory leaks with cancelled requests**

   - Solution: Always provide AbortSignal for cancellable operations
   - Clean up in component unmount effects

4. **CORS issues**
   - Solution: Configure `credentials` option appropriately
   - Ensure server CORS configuration is correct

### Debugging

Check browser DevTools for:

- Network tab for actual HTTP requests
- Console for detailed error messages
- Application logs for structured error information

Use the request ID to correlate logs across different parts of the application.

## Contributing

When extending the API utilities:

1. Maintain backward compatibility
2. Add comprehensive tests
3. Update TypeScript types
4. Consider performance impact
5. Update documentation
6. Follow existing error handling patterns
