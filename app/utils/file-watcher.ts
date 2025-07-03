import { WorkspaceInitializer } from './workspace-init';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('FileWatcher');

export class FileWatcher {
  private _workdir: string;
  private _watcher: any | null = null;
  private _isInitialized = false;

  constructor(workdir = '/home/workspace') {
    this._workdir = workdir;
  }

  async initialize(): Promise<any | null> {
    try {
      // Only initialize in server environments
      if (typeof window !== 'undefined') {
        logger.debug('FileWatcher not available in browser environment');
        return null;
      }

      // Ensure workspace exists before watching
      const workspaceExists = await WorkspaceInitializer.ensureWorkspaceExists(this._workdir);

      if (!workspaceExists) {
        logger.warn('Workspace not available, skipping file watcher initialization');
        return null;
      }

      // Dynamically import chokidar
      const chokidar = await import('chokidar');

      // Initialize watcher with error handling
      this._watcher = chokidar.watch(this._workdir, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100,
        },

        // Ignore common problematic patterns
        ignored: [
          /(^|[\/\\])\../, // dot files
          /node_modules/,
          /\.git/,
          /build/,
          /dist/,
        ],
      });

      // Set up event handlers
      this._watcher
        .on('add', (path: string) => {
          logger.debug(`File added: ${path}`);
          this._handleFileChange('add', path);
        })
        .on('change', (path: string) => {
          logger.debug(`File changed: ${path}`);
          this._handleFileChange('change', path);
        })
        .on('unlink', (path: string) => {
          logger.debug(`File removed: ${path}`);
          this._handleFileChange('unlink', path);
        })
        .on('error', (error: Error) => {
          logger.error(`Watcher error: ${error}`);
          this._handleWatcherError(error);
        })
        .on('ready', () => {
          logger.info('File watcher ready');
          this._isInitialized = true;
        });

      return this._watcher;
    } catch (error) {
      logger.error('Failed to initialize file watcher:', error);
      return null;
    }
  }

  private _handleFileChange(type: 'add' | 'change' | 'unlink', path: string): void {
    /*
     * This can be extended to emit events or call callbacks
     * For now, just log the changes
     */
    logger.debug(`File ${type}: ${path}`);
  }

  private _handleWatcherError(error: Error): void {
    logger.error('File watcher encountered an error:', error);

    // Attempt to recover if the error is recoverable
    if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
      logger.info('Attempting to recover from file not found error');
      this._restart();
    }
  }

  private async _restart(): Promise<void> {
    logger.info('Restarting file watcher...');
    await this.close();

    // Wait a bit before restarting
    setTimeout(async () => {
      try {
        await this.initialize();
      } catch (error) {
        logger.error('Failed to restart file watcher:', error);
      }
    }, 2000);
  }

  async close(): Promise<void> {
    if (this._watcher) {
      await this._watcher.close();
      this._watcher = null;
      this._isInitialized = false;
      logger.info('File watcher closed');
    }
  }

  get isWatching(): boolean {
    return this._isInitialized && this._watcher !== null;
  }
}
