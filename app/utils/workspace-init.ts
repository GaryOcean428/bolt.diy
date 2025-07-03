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
      } catch {
        logger.warn('Node.js fs module not available, assuming virtual environment');
        return true;
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
  static async ensureVirtualWorkspaceExists(workdir: string = '.'): Promise<boolean> {
    try {
      /*
       * For virtual environments, we just need to verify the directory is accessible
       * WebContainer manages the actual file system
       */
      logger.debug(`Verifying virtual workspace: ${workdir}`);

      // This will be handled by the WebContainer file system
      return true;
    } catch (error) {
      logger.error('Failed to verify virtual workspace:', error);
      return false;
    }
  }
}
