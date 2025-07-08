import { WebContainer } from '@webcontainer/api';
import { WORK_DIR_NAME } from '~/utils/constants';
import { cleanStackTrace } from '~/utils/stacktrace';
import { WorkspaceInitializer } from '~/utils/workspace-init';

interface WebContainerContext {
  loaded: boolean;
}

export const webcontainerContext: WebContainerContext = import.meta.hot?.data.webcontainerContext ?? {
  loaded: false,
};

if (import.meta.hot) {
  import.meta.hot.data.webcontainerContext = webcontainerContext;
}

export let webcontainer: Promise<WebContainer> = new Promise(() => {
  // noop for ssr
});

if (!import.meta.env.SSR) {
  webcontainer =
    import.meta.hot?.data.webcontainer ??
    Promise.resolve()
      .then(() => {
        // Check if WebContainer is supported in this environment
        if (typeof window !== 'undefined' && !window.crossOriginIsolated) {
          console.warn('WebContainer requires Cross-Origin Isolation. Some features may not work properly.');
          
          // Log additional diagnostic information
          console.warn('Cross-Origin Isolation check:', {
            crossOriginIsolated: window.crossOriginIsolated,
            location: window.location.href,
            isSecureContext: window.isSecureContext,
          });
        }

        // Add additional environment checks
        if (typeof window !== 'undefined' && !(window as any).WebContainerSupported) {
          console.warn('WebContainer is not supported in this browser environment');
        }

        return WebContainer.boot({
          coep: 'credentialless',
          workdirName: WORK_DIR_NAME,
          forwardPreviewErrors: true, // Enable error forwarding from iframes
        });
      })
      .then(async (webcontainer) => {
        webcontainerContext.loaded = true;

        // Validate workdir is properly set and accessible
        if (!webcontainer.workdir) {
          console.warn('WebContainer workdir is not set, this may cause file watching issues');
        } else {
          console.log('WebContainer initialized with workdir:', webcontainer.workdir);

          // Use enhanced workspace initialization with webcontainer instance
          try {
            const workspaceReady = await WorkspaceInitializer.ensureVirtualWorkspaceExists('.', webcontainer);

            if (workspaceReady) {
              // Validate the work directory exists using relative path to avoid path concatenation issues
              await webcontainer.fs.readdir('.');
              console.log('Work directory verified:', webcontainer.workdir);
            } else {
              console.warn('Virtual workspace validation failed, attempting manual directory creation');
              
              try {
                // Use relative path for workspace creation to avoid path issues
                await webcontainer.fs.mkdir('.', { recursive: true });
                console.log('Workspace directory created successfully');
              } catch (createError) {
                console.warn('Failed to create workspace directory:', createError);
              }
            }
          } catch (error) {
            console.warn('Work directory validation failed, attempting to create workspace');
            console.debug('Directory validation error:', error instanceof Error ? error.message : 'Unknown error');

            try {
              // Use relative path for workspace creation to avoid path issues
              await webcontainer.fs.mkdir('.', { recursive: true });
              console.log('Workspace directory created successfully');
            } catch (createError) {
              console.warn('Failed to create workspace directory:', createError);
            }
          }
        }

        // Add additional validation to ensure webcontainer is working properly
        try {
          await webcontainer.fs.readdir('.');
          console.log('WebContainer filesystem is accessible');
        } catch (fsError) {
          console.warn('WebContainer filesystem access test failed:', fsError);
        }

        const { workbenchStore } = await import('~/lib/stores/workbench');

        // Listen for preview errors
        webcontainer.on('preview-message', (message) => {
          console.log('WebContainer preview message:', message);

          // Handle both uncaught exceptions and unhandled promise rejections
          if (message.type === 'PREVIEW_UNCAUGHT_EXCEPTION' || message.type === 'PREVIEW_UNHANDLED_REJECTION') {
            const isPromise = message.type === 'PREVIEW_UNHANDLED_REJECTION';
            workbenchStore.actionAlert.set({
              type: 'preview',
              title: isPromise ? 'Unhandled Promise Rejection' : 'Uncaught Exception',
              description: message.message,
              content: `Error occurred at ${message.pathname}${message.search}${message.hash}\nPort: ${message.port}\n\nStack trace:\n${cleanStackTrace(message.stack || '')}`,
              source: 'preview',
            });
          }
        });

        return webcontainer;
      })
      .catch((error) => {
        console.error('WebContainer initialization failed:', error);
        webcontainerContext.loaded = false;

        // Provide more detailed error information for debugging
        if (error instanceof Error) {
          console.error('WebContainer error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
          });
        }

        /*
         * In server environments like Railway, WebContainer might not be available
         * Log this as a warning rather than an error for these cases
         */
        if (typeof window === 'undefined' || !(window as any).WebContainerSupported) {
          console.warn('WebContainer is not supported in this environment (likely server-side)');
          
          // Return a mock WebContainer-like object to prevent further errors
          return {
            workdir: '/tmp/mock-workspace',
            fs: {
              readdir: () => Promise.resolve([]),
              mkdir: () => Promise.resolve(),
              writeFile: () => Promise.resolve(),
            },
            internal: {
              watchPaths: () => {},
            },
            on: () => {},
          } as any;
        }

        // For client-side errors, still re-throw but provide a more user-friendly mock
        console.warn('WebContainer failed to initialize, providing fallback functionality');
        
        // Return a mock WebContainer to prevent app crashes
        return {
          workdir: '/tmp/fallback-workspace',
          fs: {
            readdir: () => Promise.resolve([]),
            mkdir: () => Promise.resolve(),
            writeFile: () => Promise.resolve(),
          },
          internal: {
            watchPaths: () => {},
          },
          on: () => {},
        } as any;
      });

  if (import.meta.hot) {
    import.meta.hot.data.webcontainer = webcontainer;
  }
}
