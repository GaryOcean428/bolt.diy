import { useStore } from '@nanostores/react';
import type { LinksFunction } from '@remix-run/node';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError, isRouteErrorResponse } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';
import { useEffect } from 'react';
import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url';
import { createHead } from 'remix-island';
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

export function ErrorBoundary() {
  const error = useRouteError();
  const theme = useStore(themeStore);

  useEffect(() => {
    if (!import.meta.env.SSR && typeof document !== 'undefined') {
      const htmlElement = document.querySelector('html');

      if (htmlElement) {
        htmlElement.setAttribute('data-theme', theme);
      }
    }
  }, [theme]);

  let errorMessage = 'Something went wrong';
  let errorDetails = 'An unexpected error occurred';

  if (isRouteErrorResponse(error)) {
    errorMessage = `${error.status} ${error.statusText}`;
    errorDetails = error.data?.message || `Error ${error.status}`;
  } else if (error instanceof Error) {
    errorMessage = 'Application Error';
    errorDetails = error.message;

    // Log the full error for debugging but don't expose it to users in production
    if (import.meta.env.DEV) {
      console.error('Root Error Boundary (DEV):', error);
    } else {
      // In production, log only basic info
      console.error('Root Error Boundary:', errorMessage);
    }
  } else {
    // Handle unexpected error types
    console.error('Root Error Boundary: Unknown error type', error);
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
    <html data-theme={theme}>
      <head>
        <title>Oops! - Bolt.diy</title>
        <Meta />
        <Links />
      </head>
      <body className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary">
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚡</div>
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
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const theme = useStore(themeStore);

  useEffect(() => {
    if (!import.meta.env.SSR && typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      logStore.logSystem('Application initialized', {
        theme,
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  return <Outlet />;
}
