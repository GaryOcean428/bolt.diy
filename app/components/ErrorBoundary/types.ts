import type { ErrorInfo as ReactErrorInfo } from 'react';

/**
 * Error information provided by React when a component throws an error
 */
export interface ErrorInfo extends ReactErrorInfo {
  componentStack: string;
}

/**
 * State interface for the ErrorBoundary component
 */
export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

/**
 * Callback function type for error reporting
 */
export type ErrorReportCallback = (error: Error, errorInfo: ErrorInfo, errorId: string) => void;

/**
 * Callback function type for retry attempts
 */
export type RetryCallback = () => void;

/**
 * Configuration options for error boundary behavior
 */
export interface ErrorBoundaryConfig {
  /** Maximum number of retry attempts before disabling retry */
  maxRetries?: number;

  /** Whether to show detailed error information in development */
  showErrorDetails?: boolean;

  /** Custom error reporting callback */
  onError?: ErrorReportCallback;

  /** Custom retry callback */
  onRetry?: RetryCallback;

  /** Fallback component or element to render on error */
  fallback?: React.ComponentType<ErrorBoundaryFallbackProps> | React.ReactElement;
}

/**
 * Props for the fallback component rendered when an error occurs
 */
export interface ErrorBoundaryFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  resetError: () => void;
  retryCount: number;
  canRetry: boolean;
  errorId: string;
}
