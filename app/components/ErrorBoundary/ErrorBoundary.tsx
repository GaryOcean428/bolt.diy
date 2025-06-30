import React, { Component, type ReactNode } from 'react';
import { logStore } from '~/lib/stores/logs';
import { createScopedLogger } from '~/utils/logger';
import { DefaultErrorFallback } from './ErrorFallback';
import type { 
  ErrorBoundaryState, 
  ErrorInfo, 
  ErrorBoundaryConfig,
  ErrorBoundaryFallbackProps 
} from './types';

const logger = createScopedLogger('ErrorBoundary');

/**
 * Props for the ErrorBoundary component
 */
export interface ErrorBoundaryProps extends ErrorBoundaryConfig {
  children: ReactNode;
  /** Unique identifier for this error boundary instance */
  id?: string;
}

/**
 * A robust React Error Boundary component that catches JavaScript errors anywhere in the child
 * component tree, logs those errors, and displays a fallback UI instead of the component tree that crashed.
 * 
 * Design Decisions:
 * 1. Class-based component: Required by React for error boundaries
 * 2. Retry mechanism: Allows users to attempt recovery from transient errors
 * 3. Error throttling: Prevents infinite error loops by limiting retry attempts
 * 4. Comprehensive logging: Integrates with the app's existing logging system
 * 5. Graceful degradation: Falls back to a simple error display if everything else fails
 * 6. Development vs Production: Shows detailed errors in development, user-friendly messages in production
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private readonly maxRetries: number;
  private readonly boundaryId: string;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.maxRetries = props.maxRetries ?? 3;
    this.boundaryId = props.id ?? `boundary-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    };
  }

  /**
   * Static method called when an error is thrown during rendering
   * This is used to update state so the next render will show the fallback UI
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate a unique error ID for tracking
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  /**
   * Called when an error has been thrown by a descendant component
   * Used for logging and error reporting
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError } = this.props;
    const { errorId } = this.state;

    // Enhanced error information
    const enhancedError = {
      ...error,
      boundaryId: this.boundaryId,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    };

    // Update state with error information
    this.setState({ errorInfo });

    // Log to application logging system
    try {
      logStore.logError('React Error Boundary caught an error', enhancedError, {
        errorId,
        boundaryId: this.boundaryId,
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
      });
    } catch (loggingError) {
      // Fallback logging if the logging system fails
      console.error('Error Boundary: Failed to log to logStore:', loggingError);
      console.error('Error Boundary: Original error:', error);
      console.error('Error Boundary: Error info:', errorInfo);
    }

    // Development logging for detailed debugging
    if (import.meta.env.DEV) {
      logger.error('Error caught by ErrorBoundary:', {
        error: enhancedError,
        errorInfo,
        errorId,
        boundaryId: this.boundaryId,
      });
    }

    // Call custom error handler if provided
    if (onError && errorId) {
      try {
        onError(error, errorInfo, errorId);
      } catch (callbackError) {
        logger.error('Error in custom error handler:', callbackError);
      }
    }
  }

  /**
   * Reset the error boundary state and attempt to recover
   */
  private resetError = (): void => {
    const { onRetry } = this.props;
    const newRetryCount = this.state.retryCount + 1;

    // Clear any existing retry timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    // Log the retry attempt
    logStore.logUserAction('Error boundary retry attempted', {
      boundaryId: this.boundaryId,
      retryCount: newRetryCount,
      maxRetries: this.maxRetries,
      errorId: this.state.errorId,
    });

    // Reset state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: newRetryCount,
    });

    // Call custom retry handler if provided
    if (onRetry) {
      try {
        onRetry();
      } catch (retryError) {
        logger.error('Error in custom retry handler:', retryError);
      }
    }
  };

  /**
   * Check if retry is allowed based on retry count
   */
  private canRetry(): boolean {
    return this.state.retryCount < this.maxRetries;
  }

  /**
   * Component cleanup
   */
  componentWillUnmount(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render(): ReactNode {
    const { hasError, error, errorInfo, errorId } = this.state;
    const { fallback, children, showErrorDetails = import.meta.env.DEV } = this.props;

    if (hasError && error && errorId) {
      const fallbackProps: ErrorBoundaryFallbackProps = {
        error,
        errorInfo: errorInfo!,
        resetError: this.resetError,
        retryCount: this.state.retryCount,
        canRetry: this.canRetry(),
        errorId,
      };

      // Render custom fallback component if provided
      if (fallback) {
        try {
          if (React.isValidElement(fallback)) {
            return fallback;
          }
          
          if (typeof fallback === 'function') {
            const FallbackComponent = fallback;
            return <FallbackComponent {...fallbackProps} />;
          }
        } catch (fallbackError) {
          // If the fallback component itself throws an error, fall back to default
          logger.error('Error in fallback component:', fallbackError);
        }
      }

      // Render default fallback UI
      return (
        <DefaultErrorFallback 
          {...fallbackProps}
          showErrorDetails={showErrorDetails}
          boundaryId={this.boundaryId}
        />
      );
    }

    return children;
  }
}