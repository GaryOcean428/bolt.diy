import React, { useState } from 'react';
import { ErrorBoundary } from '~/components/ErrorBoundary';
import { executeApi, ApiError } from '~/utils/api';

/**
 * Example component demonstrating ErrorBoundary usage
 * This component intentionally includes error scenarios for testing
 */

// Component that throws an error when triggered
const ProblemComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Intentional error for demonstration');
  }

  return <div className="p-4 bg-green-100 text-green-800 rounded">Component working correctly!</div>;
};

// Component that makes API calls with our executeApi utility
const ApiExampleComponent: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const makeApiCall = async (url: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await executeApi<{ message: string; timestamp: string }>(url, {
        timeout: 5000,
        retries: 2,
      });

      setData(response.data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.getUserMessage());
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">API Example</h3>

      <div className="space-x-2">
        <button
          onClick={() => makeApiCall('/api/status')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Test Valid API'}
        </button>

        <button
          onClick={() => makeApiCall('/api/nonexistent')}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Test 404 Error'}
        </button>

        <button
          onClick={() => makeApiCall('/api/slow-endpoint')}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Test Timeout'}
        </button>
      </div>

      {data && (
        <div className="p-3 bg-green-100 text-green-800 rounded">
          <strong>Success:</strong> {JSON.stringify(data, null, 2)}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-100 text-red-800 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
};

// Main example component
export const ErrorBoundaryExample: React.FC = () => {
  const [throwError, setThrowError] = useState(false);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">ErrorBoundary & API Utilities Demo</h1>
        <p className="text-gray-600">
          This demonstrates the robust error handling components implemented for the application.
        </p>
      </div>

      <div className="space-y-6">
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">ErrorBoundary Demo</h2>
          <p className="text-gray-600 mb-4">
            The ErrorBoundary catches JavaScript errors in the component tree and displays a user-friendly fallback UI.
          </p>

          <div className="space-y-4">
            <div>
              <button
                onClick={() => setThrowError(!throwError)}
                className={`px-4 py-2 rounded ${
                  throwError ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {throwError ? 'Fix Component' : 'Break Component'}
              </button>
            </div>

            {/* Wrapped with ErrorBoundary */}
            <ErrorBoundary
              id="demo-boundary"
              maxRetries={2}
              onError={(error, errorInfo, errorId) => {
                console.log('Custom error handler called:', { error, errorInfo, errorId });
              }}
              onRetry={() => {
                console.log('Custom retry handler called');
                setThrowError(false); // Fix the component on retry
              }}
            >
              <ProblemComponent shouldThrow={throwError} />
            </ErrorBoundary>
          </div>
        </section>

        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">API Utilities Demo</h2>
          <p className="text-gray-600 mb-4">
            The executeApi utility provides robust HTTP request handling with automatic retries, error categorization,
            and comprehensive logging.
          </p>

          <ErrorBoundary
            id="api-demo-boundary"
            maxRetries={1}
            onError={(error, errorInfo, errorId) => {
              console.log('API demo error boundary triggered:', { error, errorInfo, errorId });
            }}
          >
            <ApiExampleComponent />
          </ErrorBoundary>
        </section>

        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Features Demonstrated</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-green-600 mb-2">ErrorBoundary Features</h3>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Catches JavaScript errors in component trees</li>
                <li>• Configurable retry mechanism with limits</li>
                <li>• User-friendly fallback UI</li>
                <li>• Comprehensive error logging</li>
                <li>• Accessibility-compliant design</li>
                <li>• Development vs production error display</li>
                <li>• Custom error and retry handlers</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-blue-600 mb-2">API Utilities Features</h3>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Automatic retry logic with exponential backoff</li>
                <li>• Request/response logging with unique IDs</li>
                <li>• User-friendly error messages</li>
                <li>• Timeout handling and request cancellation</li>
                <li>• TypeScript support with generic types</li>
                <li>• Error categorization (network, client, server)</li>
                <li>• Integration with existing logging system</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="border rounded-lg p-6 bg-gray-50">
          <h2 className="text-xl font-semibold mb-4">Implementation Notes</h2>
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              <strong>Design Decision:</strong> The ErrorBoundary uses a class-based component (required by React) but
              maintains modern patterns with comprehensive TypeScript support and hooks integration.
            </p>
            <p>
              <strong>Logging Integration:</strong> Both components integrate with the existing logStore system for
              consistent error tracking and debugging capabilities.
            </p>
            <p>
              <strong>Accessibility:</strong> The fallback UI includes proper ARIA attributes, semantic HTML, and screen
              reader support for inclusive design.
            </p>
            <p>
              <strong>Performance:</strong> Error boundaries are strategically placed to isolate failures and prevent
              cascading errors from breaking the entire application.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
