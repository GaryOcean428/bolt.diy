import { useStore } from '@nanostores/react';
import type { LinksFunction } from '@remix-run/node';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError, isRouteErrorResponse } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';
import { useEffect } from 'react';
import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url';
import { createHead } from 'remix-island';
import { ErrorBoundary as ReactErrorBoundary } from './components/ErrorBoundary';
import { logStore } from './lib/stores/logs';
import { themeStore } from './lib/stores/theme';
import globalStyles from './styles/index.scss?url';
import { stripIndents } from './utils/stripIndent';

import 'virtual:uno.css';

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg+xml',
  },
  { rel: 'stylesheet', href: reactToastifyStyles },
  { rel: 'stylesheet', href: tailwindReset },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'stylesheet', href: xtermStyles },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    crossOrigin: 'anonymous',
  },
];

const inlineThemeCode = stripIndents`
  setTutorialKitTheme();

  function setTutorialKitTheme() {
    let theme = localStorage.getItem('bolt_theme');

    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.querySelector('html')?.setAttribute('data-theme', theme);
  }
`;

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Meta />
    <Links />
    <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
  </>
));

// Export Layout as required by Remix v2
export function Layout({ children }: { children: React.ReactNode }) {
  const theme = useStore(themeStore);

  useEffect(() => {
    if (!import.meta.env.SSR && typeof document !== 'undefined') {
      const htmlElement = document.querySelector('html');

      if (htmlElement) {
        htmlElement.setAttribute('data-theme', theme);
      }
    }
  }, [theme]);

  return (
    <>
      {children}
      <ScrollRestoration />
      <Scripts />
    </>
  );
}

// Error throttling to prevent infinite loops
const errorThrottleMap = new Map<string, number>();
const ERROR_THROTTLE_DURATION = 5000; // 5 seconds

function shouldThrottleError(errorKey: string): boolean {
  const now = Date.now();
  const lastErrorTime = errorThrottleMap.get(errorKey);

  if (!lastErrorTime || now - lastErrorTime > ERROR_THROTTLE_DURATION) {
    errorThrottleMap.set(errorKey, now);
    return false;
  }

  return true;
}

export function ErrorBoundary() {
  const error = useRouteError();

  // Determine theme without hooks that might fail in error state
  const getThemeSafely = (): string => {
    // First try to get theme from DOM
    try {
      if (typeof document !== 'undefined') {
        const htmlTheme = document.querySelector('html')?.getAttribute('data-theme');

        if (htmlTheme && (htmlTheme === 'dark' || htmlTheme === 'light')) {
          return htmlTheme;
        }
      }
    } catch {
      // Ignore DOM errors
    }

    // Then try localStorage
    try {
      if (typeof localStorage !== 'undefined') {
        const storedTheme = localStorage.getItem('bolt_theme');

        if (storedTheme && (storedTheme === 'dark' || storedTheme === 'light')) {
          return storedTheme;
        }
      }
    } catch {
      // Ignore localStorage errors
    }

    // Finally try media query
    try {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
    } catch {
      // Ignore media query errors
    }

    // Ultimate fallback
    return 'light';
  };

  const resolvedTheme = getThemeSafely();

  // Apply theme to document in a safe way
  useEffect(() => {
    try {
      if (!import.meta.env.SSR && typeof document !== 'undefined') {
        const htmlElement = document.querySelector('html');

        if (htmlElement) {
          htmlElement.setAttribute('data-theme', resolvedTheme);
        }
      }
    } catch (e) {
      // Silently handle any DOM errors to prevent cascading failures
      console.warn('ErrorBoundary: Failed to set theme attribute:', e);
    }
  }, [resolvedTheme]);

  let errorMessage = 'Something went wrong';
  let errorDetails = 'An unexpected error occurred';
  let errorKey = 'unknown';

  if (isRouteErrorResponse(error)) {
    errorMessage = `${error.status} ${error.statusText}`;
    errorDetails = error.data?.message || `Error ${error.status}`;
    errorKey = `route-${error.status}`;
  } else if (error instanceof Error) {
    errorMessage = 'Application Error';
    errorDetails = error.message;
    errorKey = `error-${error.name}-${error.message.substring(0, 50)}`;

    // Only log if not throttled to prevent spam
    if (!shouldThrottleError(errorKey)) {
      // Log the full error for debugging but don't expose it to users in production
      if (import.meta.env.DEV) {
        console.error('Root Error Boundary (DEV):', error);
      } else {
        // In production, log only basic info
        console.error('Root Error Boundary:', errorMessage);
      }
    }
  } else {
    // Handle unexpected error types
    errorKey = `unknown-${typeof error}`;

    if (!shouldThrottleError(errorKey)) {
      console.error('Root Error Boundary: Unknown error type', error);
    }
  }

  const handleReload = () => {
    try {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (e) {
      console.error('Failed to reload page:', e);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4" dangerouslySetInnerHTML={{ __html: '&#9889;' }}></div>
        <h1 className="text-2xl font-bold mb-2">{errorMessage}</h1>
        <p className="text-bolt-elements-textSecondary mb-6">{errorDetails}</p>
        <button
          onClick={handleReload}
          className="bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text px-4 py-2 rounded"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const theme = useStore(themeStore);

  useEffect(() => {
    if (!import.meta.env.SSR && typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      // Set up global error handlers to prevent uncaught errors from breaking hydration
      const handleError = (event: ErrorEvent) => {
        console.error('Global error caught:', event.error);

        // Prevent the error from bubbling up and breaking React
        event.preventDefault();
      };

      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        console.error('Unhandled promise rejection:', event.reason);

        // Prevent the error from bubbling up and breaking React
        event.preventDefault();
      };

      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      logStore.logSystem('Application initialized', {
        theme,
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });

      /*
       * Initialize file watching after the app is loaded on the client
       * Use a longer delay and better error handling to prevent issues
       */
      const initializeFileWatching = async () => {
        let retryCount = 0;
        const maxRetries = 3;
        
        const attemptInitialization = async () => {
          try {
            // Wait for the DOM to be fully loaded
            await new Promise((resolve) => {
              if (document.readyState === 'complete') {
                resolve(true);
              } else {
                window.addEventListener('load', resolve, { once: true });
              }
            });

            // Additional delay to ensure webcontainer has time to initialize
            // Use exponential backoff for retries
            const baseDelay = 2000;
            const delay = baseDelay * Math.pow(2, retryCount);
            await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 10000)));

            // First, check if WebContainer is available
            if (typeof window !== 'undefined' && !window.crossOriginIsolated) {
              console.warn('WebContainer requires Cross-Origin Isolation, file watching may not work properly');
              return;
            }

            const { workbenchStore } = await import('~/lib/stores/workbench');

            if (workbenchStore?.filesStore?.startWatching) {
              workbenchStore.filesStore.startWatching();
              console.log('File watching initialized successfully');
            } else {
              console.warn('File watching not available in workbench store');
            }
          } catch (error) {
            console.warn(`Failed to initialize file watching (attempt ${retryCount + 1}/${maxRetries}):`, error);
            
            // Retry with exponential backoff
            if (retryCount < maxRetries) {
              retryCount++;
              setTimeout(attemptInitialization, 1000 * Math.pow(2, retryCount));
            } else {
              console.error('File watching initialization failed after all retries');
            }
          }
        };

        // Start the initialization attempt
        attemptInitialization();
      };

      initializeFileWatching();

      // Cleanup event listeners on unmount
      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }

    // Return undefined if SSR or window/navigator not available
    return undefined;
  }, []);

  return (
    <ReactErrorBoundary
      id="app-root"
      maxRetries={3}
      onError={(error, errorInfo, errorId) => {
        // Custom error reporting - could integrate with external services
        logStore.logError('App-level error boundary triggered', error, {
          errorId,
          errorInfo: errorInfo.componentStack,
          context: 'App root',
        });
      }}
      onRetry={() => {
        // Custom retry logic - could clear caches, reset state, etc.
        logStore.logUserAction('App-level error boundary retry', {
          context: 'App root',
          timestamp: new Date().toISOString(),
        });
      }}
    >
      <Outlet />
    </ReactErrorBoundary>
  );
}
