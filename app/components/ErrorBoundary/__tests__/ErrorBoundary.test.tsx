import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../ErrorBoundary';
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
    logUserAction: jest.fn(),
    logSystem: jest.fn(),
  },
}));

// Component that throws an error for testing
const ErrorThrowingComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error occurred</div>;
};

// Component that works correctly
const WorkingComponent: React.FC = () => <div>Working component</div>;

describe('ErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance;
  
  beforeEach(() => {
    // Suppress console.error during tests to avoid cluttering output
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('when no error occurs', () => {
    it('should render children normally', () => {
      render(
        <ErrorBoundary>
          <WorkingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Working component')).toBeInTheDocument();
    });
  });

  describe('when an error occurs', () => {
    it('should catch the error and display fallback UI', () => {
      render(
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    });

    it('should log the error to the logging system', () => {
      render(
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      expect(logStore.logError).toHaveBeenCalledWith(
        'React Error Boundary caught an error',
        expect.objectContaining({
          message: 'Test error message',
        }),
        expect.objectContaining({
          errorId: expect.any(String),
          boundaryId: expect.any(String),
          componentStack: expect.any(String),
        })
      );
    });

    it('should display error ID for support', () => {
      render(
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
    });
  });

  describe('retry functionality', () => {
    it('should allow retry when within retry limit', async () => {
      const user = userEvent.setup();
      
      render(
        <ErrorBoundary maxRetries={2}>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();

      await user.click(retryButton);

      expect(logStore.logUserAction).toHaveBeenCalledWith(
        'Error boundary retry attempted',
        expect.objectContaining({
          retryCount: 1,
          maxRetries: 2,
        })
      );
    });

    it('should disable retry after max attempts', async () => {
      const user = userEvent.setup();
      
      render(
        <ErrorBoundary maxRetries={1}>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      // First retry
      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      // After max retries, the button should not be available
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
      expect(screen.getByText(/Maximum retry attempts reached/)).toBeInTheDocument();
    });
  });

  describe('custom configuration', () => {
    it('should call custom error handler when provided', () => {
      const onError = jest.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Test error message' }),
        expect.objectContaining({ componentStack: expect.any(String) }),
        expect.any(String)
      );
    });

    it('should call custom retry handler when provided', async () => {
      const onRetry = jest.fn();
      const user = userEvent.setup();
      
      render(
        <ErrorBoundary onRetry={onRetry}>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      expect(onRetry).toHaveBeenCalled();
    });

    it('should use custom boundary ID when provided', () => {
      const customId = 'custom-boundary-id';
      
      render(
        <ErrorBoundary id={customId}>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      expect(logStore.logError).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          boundaryId: customId,
        })
      );
    });
  });

  describe('development vs production behavior', () => {
    it('should show error details in development mode', () => {
      // Mock DEV environment
      const originalEnv = import.meta.env.DEV;
      (import.meta.env as any).DEV = true;

      render(
        <ErrorBoundary showErrorDetails={true}>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();

      // Restore original environment
      (import.meta.env as any).DEV = originalEnv;
    });

    it('should hide error details in production mode by default', () => {
      render(
        <ErrorBoundary showErrorDetails={false}>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      const errorContainer = screen.getByRole('alert');
      expect(errorContainer).toHaveAttribute('aria-labelledby', 'error-title');
      expect(errorContainer).toHaveAttribute('aria-describedby', 'error-description');

      expect(screen.getByText('Something went wrong')).toHaveAttribute('id', 'error-title');
    });

    it('should have proper button descriptions for screen readers', () => {
      render(
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      const reloadButton = screen.getByRole('button', { name: /reload page/i });

      expect(retryButton).toHaveAttribute('aria-describedby', 'retry-description');
      expect(reloadButton).toHaveAttribute('aria-describedby', 'reload-description');
    });
  });

  describe('error handling resilience', () => {
    it('should handle errors in error logging gracefully', () => {
      // Mock logStore.logError to throw an error
      (logStore.logError as jest.Mock).mockImplementation(() => {
        throw new Error('Logging failed');
      });

      render(
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      // Should still render the error UI despite logging failure
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should handle errors in custom error handler gracefully', () => {
      const onError = jest.fn().mockImplementation(() => {
        throw new Error('Custom handler failed');
      });

      render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      // Should still render the error UI despite custom handler failure
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });
});