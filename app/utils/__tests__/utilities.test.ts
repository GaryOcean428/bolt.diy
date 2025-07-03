import { FileWatcher } from '~/utils/file-watcher';
import { ServerConnection } from '~/utils/server-connection';
import { WorkspaceInitializer } from '~/utils/workspace-init';

describe('Utility Classes', () => {
  describe('WorkspaceInitializer', () => {
    test('should handle virtual workspace initialization', async () => {
      const result = await WorkspaceInitializer.ensureVirtualWorkspaceExists('.');
      expect(result).toBe(true);
    });

    test('should handle browser environment gracefully', async () => {
      // Mock window object to simulate browser environment
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true,
      });

      const result = await WorkspaceInitializer.ensureWorkspaceExists('/test');
      expect(result).toBe(true);

      // Clean up
      delete (global as any).window;
    });
  });

  describe('FileWatcher', () => {
    test('should handle browser environment gracefully', async () => {
      // Mock window object to simulate browser environment
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true,
      });

      const watcher = new FileWatcher('/test');
      const result = await watcher.initialize();
      expect(result).toBeNull();

      // Clean up
      delete (global as any).window;
    });

    test('should track watching state correctly', () => {
      const watcher = new FileWatcher('/test');
      expect(watcher.isWatching).toBe(false);
    });
  });

  describe('ServerConnection', () => {
    test('should create instance with default config', () => {
      const connection = new ServerConnection({ url: 'http://test.com' });
      expect(connection).toBeInstanceOf(ServerConnection);
    });

    test('should handle fetch errors gracefully', async () => {
      const connection = new ServerConnection({
        url: 'http://nonexistent.example.com',
        retryAttempts: 1,
        retryDelay: 100,
      });

      const result = await connection.testConnection();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
