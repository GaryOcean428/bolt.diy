import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('WorkspaceInitializer');

export class WorkspaceInitializer {
  /**
   * For browser environments - just validates virtual workspace readiness
   */
  static async ensureWorkspaceExists(workdir = '/home/workspace'): Promise<boolean> {
    try {
      if (typeof window !== 'undefined') {
        // Browser environment - just log and return true
        logger.debug(`Virtual workspace validation for: ${workdir}`);
        return true;
      }

      // Server environment - try to use fs
      try {
        const { existsSync, mkdirSync } = await import('node:fs');
        const { promises: fs } = await import('node:fs');
        const { join } = await import('node:path');

        // Check if directory exists
        if (!existsSync(workdir)) {
          // Create directory recursively
          mkdirSync(workdir, { recursive: true });
          logger.info(`Created workspace directory: ${workdir}`);
        }

        // Verify access by creating and removing a test file
        const testFile = join(workdir, '.workspace-test');

        try {
          await fs.writeFile(testFile, '');
          await fs.unlink(testFile);
          logger.debug(`Workspace verified as writable: ${workdir}`);

          return true;
        } catch (error) {
          logger.error('Workspace not writable:', error);
          return false;
        }
      } catch (importError) {
        // Check if it's a legitimate module import error vs virtual environment
        if (
          importError instanceof Error &&
          (importError.message.includes('Cannot resolve module') || importError.message.includes('MODULE_NOT_FOUND'))
        ) {
          logger.warn('Node.js fs module not available, assuming virtual environment');
          return true;
        } else {
          // Re-throw legitimate import errors
          logger.error('Failed to import Node.js fs module:', importError);
          throw importError;
        }
      }
    } catch (error) {
      logger.error('Failed to initialize workspace:', error);
      throw error;
    }
  }

  /**
   * Initialize workspace for WebContainer environments
   * This is a lighter version that works with virtual file systems
   */
  static async ensureVirtualWorkspaceExists(workdir: string = '.', webcontainer?: any): Promise<boolean> {
    try {
      /*
       * For virtual environments, we need to ensure the directory exists
       * in the WebContainer file system before file watching can work
       */
      logger.debug(`Verifying virtual workspace: ${workdir}`);

      // If webcontainer is provided, use it to ensure the directory exists
      if (webcontainer && webcontainer.fs) {
        try {
          // Check if directory exists
          await webcontainer.fs.readdir(workdir);
          logger.debug(`Virtual workspace directory exists: ${workdir}`);
        } catch (error) {
          // Directory doesn't exist, try to create it
          if (error instanceof Error && error.message.includes('ENOENT')) {
            try {
              await webcontainer.fs.mkdir(workdir, { recursive: true });
              logger.info(`Created virtual workspace directory: ${workdir}`);
            } catch (createError) {
              logger.warn(`Failed to create virtual workspace directory: ${workdir}`, createError);
              return false;
            }
          } else {
            logger.warn(`Virtual workspace directory check failed: ${workdir}`, error);
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      logger.error('Failed to verify virtual workspace:', error);
      return false;
    }
  }
}
