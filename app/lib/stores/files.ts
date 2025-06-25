import { Buffer } from 'node:buffer';
import * as nodePath from 'node:path';
import type { PathWatcherEvent, WebContainer } from '@webcontainer/api';
import { getEncoding } from 'istextorbinary';
import { map, type MapStore } from 'nanostores';
import { bufferWatchEvents } from '~/utils/buffer';
import { computeFileModifications } from '~/utils/diff';
import { createScopedLogger } from '~/utils/logger';
import { unreachable } from '~/utils/unreachable';

const logger = createScopedLogger('FilesStore');

const utf8TextDecoder = new TextDecoder('utf8', { fatal: true });

export interface File {
  type: 'file';
  content: string;
  isBinary: boolean;
}

export interface Folder {
  type: 'folder';
}

type Dirent = File | Folder;

export type FileMap = Record<string, Dirent | undefined>;

export class FilesStore {
  #webcontainer: Promise<WebContainer>;

  /**
   * Tracks the number of files without folders.
   */
  #size = 0;

  /**
   * @note Keeps track all modified files with their original content since the last user message.
   * Needs to be reset when the user sends another message and all changes have to be submitted
   * for the model to be aware of the changes.
   */
  #modifiedFiles: Map<string, string> = import.meta.hot?.data.modifiedFiles ?? new Map();

  /**
   * Map of files that matches the state of WebContainer.
   */
  files: MapStore<FileMap> = import.meta.hot?.data.files ?? map({});

  get filesCount() {
    return this.#size;
  }

  constructor(webcontainerPromise: Promise<WebContainer>) {
    this.#webcontainer = webcontainerPromise;

    if (import.meta.hot) {
      import.meta.hot.data.files = this.files;
      import.meta.hot.data.modifiedFiles = this.#modifiedFiles;
    }

    // Only start initialization if not in SSR context
    if (!import.meta.env.SSR) {
      this.#init();
    }
  }

  // Method to manually start initialization (useful for client-side mounting)
  startWatching() {
    if (!import.meta.env.SSR) {
      // Add a small delay to ensure the webcontainer is ready
      setTimeout(() => this.#init(), 500);
    }
  }

  // Method to check if file watching is active
  isWatching() {
    return this.#watchingActive;
  }

  #watchingActive = false;

  getFile(filePath: string) {
    const dirent = this.files.get()[filePath];

    if (dirent?.type !== 'file') {
      return undefined;
    }

    return dirent;
  }

  getFileModifications() {
    return computeFileModifications(this.files.get(), this.#modifiedFiles);
  }

  resetFileModifications() {
    this.#modifiedFiles.clear();
  }

  async saveFile(filePath: string, content: string) {
    const webcontainer = await this.#webcontainer;

    try {
      const relativePath = nodePath.relative(webcontainer.workdir, filePath);

      if (!relativePath) {
        throw new Error(`EINVAL: invalid file path, write '${relativePath}'`);
      }

      const oldContent = this.getFile(filePath)?.content;

      if (!oldContent) {
        unreachable('Expected content to be defined');
      }

      await webcontainer.fs.writeFile(relativePath, content);

      if (!this.#modifiedFiles.has(filePath)) {
        this.#modifiedFiles.set(filePath, oldContent);
      }

      // we immediately update the file and don't rely on the `change` event coming from the watcher
      this.files.setKey(filePath, { type: 'file', content, isBinary: false });

      logger.info('File updated');
    } catch (error) {
      logger.error('Failed to update file content\n\n', error);

      throw error;
    }
  }

  async #init() {
    try {
      const webcontainer = await this.#webcontainer;

      // Validate webcontainer and workdir
      if (!webcontainer || !webcontainer.workdir) {
        logger.warn('WebContainer or workdir not available, will retry file watching later');
        setTimeout(() => this.#init(), 1000);

        return;
      }

      // Use webcontainer.workdir instead of WORK_DIR to ensure we're watching the correct directory
      const watchDir = `${webcontainer.workdir}/**`;

      // Check if the work directory exists before setting up file watching
      try {
        // Check the actual workdir that will be watched, not just current directory
        await webcontainer.fs.readdir(webcontainer.workdir);
      } catch (dirError) {
        logger.info('Work directory not yet available, will retry file watching later');
        logger.debug('Directory check error:', dirError);

        // Retry after a short delay
        setTimeout(() => this.#init(), 1000);

        return;
      }

      logger.info('Setting up file watcher for:', watchDir);

      try {
        webcontainer.internal.watchPaths(
          { include: [watchDir], exclude: ['**/node_modules', '.git'], includeContent: true },
          bufferWatchEvents(100, this.#processEventBuffer.bind(this)),
        );
        this.#watchingActive = true;
        logger.info('File watcher initialized successfully');
      } catch (watchError) {
        logger.error('Failed to setup file watcher:', watchError);
        this.#watchingActive = false;

        // Check if it's a directory not found error and retry sooner
        const isDirectoryError =
          watchError instanceof Error &&
          (watchError.message.includes('ENOENT') || watchError.message.includes('no such file or directory'));

        if (isDirectoryError) {
          logger.info('Directory not found during watch setup, will retry soon');
          setTimeout(() => this.#init(), 1000);
        } else {
          // Don't retry immediately if watchPaths fails with other errors - it might be a permanent issue
          setTimeout(() => this.#init(), 5000);
        }
      }
    } catch (error) {
      logger.error('Failed to initialize file watching:', error);
      this.#watchingActive = false;

      // Retry after a delay if initialization fails
      setTimeout(() => this.#init(), 2000);
    }
  }

  #processEventBuffer(events: Array<[events: PathWatcherEvent[]]>) {
    try {
      const watchEvents = events.flat(2);

      for (const { type, path, buffer } of watchEvents) {
        try {
          // remove any trailing slashes
          const sanitizedPath = path.replace(/\/+$/g, '');

          switch (type) {
            case 'add_dir': {
              // we intentionally add a trailing slash so we can distinguish files from folders in the file tree
              this.files.setKey(sanitizedPath, { type: 'folder' });
              break;
            }
            case 'remove_dir': {
              this.files.setKey(sanitizedPath, undefined);

              for (const [direntPath] of Object.entries(this.files)) {
                if (direntPath.startsWith(sanitizedPath)) {
                  this.files.setKey(direntPath, undefined);
                }
              }

              break;
            }
            case 'add_file':
            case 'change': {
              if (type === 'add_file') {
                this.#size++;
              }

              let content = '';

              /**
               * @note This check is purely for the editor. The way we detect this is not
               * bullet-proof and it's a best guess so there might be false-positives.
               * The reason we do this is because we don't want to display binary files
               * in the editor nor allow to edit them.
               */
              const isBinary = isBinaryFile(buffer);

              if (!isBinary) {
                content = this.#decodeFileContent(buffer);
              }

              this.files.setKey(sanitizedPath, { type: 'file', content, isBinary });

              break;
            }
            case 'remove_file': {
              this.#size--;
              this.files.setKey(sanitizedPath, undefined);
              break;
            }
            case 'update_directory': {
              // we don't care about these events
              break;
            }
          }
        } catch (error) {
          logger.error(`Error processing file event for path ${path}:`, error);

          // Continue processing other events even if one fails
        }
      }
    } catch (error) {
      logger.error('Error processing file event buffer:', error);
    }
  }

  #decodeFileContent(buffer?: Uint8Array) {
    if (!buffer || buffer.byteLength === 0) {
      return '';
    }

    try {
      return utf8TextDecoder.decode(buffer);
    } catch (error) {
      console.log(error);
      return '';
    }
  }
}

function isBinaryFile(buffer: Uint8Array | undefined) {
  if (buffer === undefined) {
    return false;
  }

  return getEncoding(convertToBuffer(buffer), { chunkLength: 100 }) === 'binary';
}

/**
 * Converts a `Uint8Array` into a Node.js `Buffer` by copying the prototype.
 * The goal is to  avoid expensive copies. It does create a new typed array
 * but that's generally cheap as long as it uses the same underlying
 * array buffer.
 */
function convertToBuffer(view: Uint8Array): Buffer {
  return Buffer.from(view.buffer, view.byteOffset, view.byteLength);
}
