import { WebContainer } from '@webcontainer/api';
import { WORK_DIR_NAME } from '~/utils/constants';
import { cleanStackTrace } from '~/utils/stacktrace';

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
        return WebContainer.boot({
          coep: 'credentialless',
          workdirName: WORK_DIR_NAME,
          forwardPreviewErrors: true, // Enable error forwarding from iframes
        });
      })
      .then(async (webcontainer) => {
        webcontainerContext.loaded = true;

        // Ensure the work directory exists
        try {
          await webcontainer.fs.mkdir(WORK_DIR_NAME, { recursive: true });
          console.log('Work directory created/verified:', webcontainer.workdir);
        } catch (error) {
          // Directory might already exist, that's fine
          console.log('Work directory setup:', error instanceof Error ? error.message : 'Unknown error');
          console.log('WebContainer workdir:', webcontainer.workdir);
        }

        // Validate workdir is properly set
        if (!webcontainer.workdir) {
          console.warn('WebContainer workdir is not set, this may cause file watching issues');
        } else {
          console.log('WebContainer initialized with workdir:', webcontainer.workdir);
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

        // Re-throw to maintain promise rejection behavior
        throw error;
      });

  if (import.meta.hot) {
    import.meta.hot.data.webcontainer = webcontainer;
  }
}
