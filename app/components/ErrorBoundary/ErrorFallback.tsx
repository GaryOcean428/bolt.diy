import React from 'react';
import type { ErrorBoundaryFallbackProps } from './types';

/**
 * Props for the default error fallback component
 */
interface DefaultErrorFallbackProps extends ErrorBoundaryFallbackProps {
  showErrorDetails?: boolean;
  boundaryId: string;
}

/**
 * Default fallback UI component displayed when an error occurs in the ErrorBoundary
 *
 * Design Decisions:
 * 1. User-friendly messaging: Avoids technical jargon for production users
 * 2. Actionable buttons: Provides clear next steps (retry, reload)
 * 3. Conditional details: Shows technical information only in development
 * 4. Accessible design: Uses semantic HTML and ARIA attributes
 * 5. Theme-aware: Uses CSS custom properties that integrate with the app's theme system
 */
export const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  retryCount,
  canRetry,
  errorId,
  showErrorDetails = false,
  boundaryId,
}) => {
  const handleReload = () => {
    try {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (reloadError) {
      console.error('Failed to reload page:', reloadError);
    }
  };

  const handleCopyError = () => {
    const errorDetails = {
      errorId,
      boundaryId,
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    };

    const errorText = JSON.stringify(errorDetails, null, 2);

    if (navigator.clipboard) {
      navigator.clipboard.writeText(errorText).catch((clipboardError) => {
        console.error('Failed to copy to clipboard:', clipboardError);

        // Fallback: log to console for manual copying
        console.log('Error details for manual copying:', errorText);
      });
    } else {
      // Fallback for browsers without clipboard API
      console.log('Error details for manual copying:', errorText);
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-96 p-6 bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary border border-bolt-elements-borderColor rounded-lg"
      role="alert"
      aria-labelledby="error-title"
      aria-describedby="error-description"
    >
      <div className="text-center max-w-lg">
        {/* Error Icon */}
        <div className="text-6xl mb-4 text-bolt-elements-textSecondary" aria-hidden="true">
          ⚠️
        </div>

        {/* Error Title */}
        <h1 id="error-title" className="text-2xl font-semibold mb-3 text-bolt-elements-textPrimary">
          Something went wrong
        </h1>

        {/* Error Description */}
        <div id="error-description" className="mb-6">
          <p className="text-bolt-elements-textSecondary mb-2">
            We encountered an unexpected error. Please try one of the options below to continue.
          </p>

          {retryCount > 0 && <p className="text-sm text-bolt-elements-textTertiary">Retry attempts: {retryCount}</p>}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          {canRetry && (
            <button
              onClick={resetError}
              className="bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text px-6 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus focus:ring-offset-2"
              aria-describedby="retry-description"
            >
              Try Again
            </button>
          )}

          <button
            onClick={handleReload}
            className="bg-bolt-elements-button-secondary-background hover:bg-bolt-elements-button-secondary-backgroundHover text-bolt-elements-button-secondary-text px-6 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus focus:ring-offset-2"
            aria-describedby="reload-description"
          >
            Reload Page
          </button>
        </div>

        {/* Hidden descriptions for screen readers */}
        <div className="sr-only">
          <div id="retry-description">Retry the last operation that caused the error</div>
          <div id="reload-description">Reload the entire page to start fresh</div>
        </div>

        {/* Error Details (Development Only) */}
        {showErrorDetails && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm font-medium text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary mb-2">
              Error Details (Development)
            </summary>

            <div className="bg-bolt-elements-background-depth-2 p-4 rounded border text-xs font-mono">
              <div className="mb-3">
                <strong className="text-bolt-elements-textPrimary">Error ID:</strong>
                <span className="ml-2 text-bolt-elements-textSecondary">{errorId}</span>
              </div>

              <div className="mb-3">
                <strong className="text-bolt-elements-textPrimary">Boundary ID:</strong>
                <span className="ml-2 text-bolt-elements-textSecondary">{boundaryId}</span>
              </div>

              <div className="mb-3">
                <strong className="text-bolt-elements-textPrimary">Error Message:</strong>
                <pre className="mt-1 whitespace-pre-wrap text-red-400">{error.message}</pre>
              </div>

              {error.stack && (
                <div className="mb-3">
                  <strong className="text-bolt-elements-textPrimary">Stack Trace:</strong>
                  <pre className="mt-1 whitespace-pre-wrap text-bolt-elements-textTertiary text-xs overflow-x-auto">
                    {error.stack}
                  </pre>
                </div>
              )}

              {errorInfo.componentStack && (
                <div className="mb-3">
                  <strong className="text-bolt-elements-textPrimary">Component Stack:</strong>
                  <pre className="mt-1 whitespace-pre-wrap text-bolt-elements-textTertiary text-xs overflow-x-auto">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}

              <button
                onClick={handleCopyError}
                className="mt-2 text-xs bg-bolt-elements-button-secondary-background hover:bg-bolt-elements-button-secondary-backgroundHover text-bolt-elements-button-secondary-text px-3 py-1 rounded"
              >
                Copy Error Details
              </button>
            </div>
          </details>
        )}

        {/* Error ID for Support */}
        <div className="mt-4 text-xs text-bolt-elements-textTertiary">
          <span>Error ID: </span>
          <code className="bg-bolt-elements-background-depth-2 px-1 py-0.5 rounded">{errorId}</code>
        </div>

        {!canRetry && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Maximum retry attempts reached. Please reload the page to continue.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
