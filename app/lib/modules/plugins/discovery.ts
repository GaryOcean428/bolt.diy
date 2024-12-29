import type { Plugin, PluginConstructor } from './types';
import { pluginRegistry } from './registry';
import { PluginSchemaValidator } from './validation';

/**
 * Plugin discovery configuration
 */
interface PluginDiscoveryConfig {
  /**
   * Directory to scan for plugins
   */
  pluginDir: string;

  /**
   * Whether to watch for plugin changes
   */
  watchForChanges?: boolean;

  /**
   * Plugin file pattern to match
   */
  filePattern?: string;
}

/**
 * Plugin discovery error details
 */
interface PluginDiscoveryError {
  pluginName: string;
  error: Error;
}

/**
 * Plugin discovery result
 */
interface PluginDiscoveryResult {
  loadedPlugins: Plugin[];
  errors: PluginDiscoveryError[];
}

/**
 * Handles plugin discovery and loading
 */
export class PluginDiscovery {
  private readonly _config: PluginDiscoveryConfig;
  private _watcher: any | null = null;

  constructor(config: PluginDiscoveryConfig) {
    this._config = {
      filePattern: '**/*.plugin.{js,ts}',
      watchForChanges: false,
      ...config,
    };
  }

  /**
   * Start plugin discovery
   */
  async start(): Promise<PluginDiscoveryResult> {
    const result = await this._loadPlugins();

    if (this._config.watchForChanges) {
      await this._startWatching();
    }

    return result;
  }

  /**
   * Stop plugin discovery and cleanup
   */
  async stop(): Promise<void> {
    if (this._watcher) {
      await this._watcher.close();
      this._watcher = null;
    }
  }

  /**
   * Load plugins from the configured directory
   */
  private async _loadPlugins(): Promise<PluginDiscoveryResult> {
    const result: PluginDiscoveryResult = {
      loadedPlugins: [],
      errors: [],
    };

    try {
      const { readdir, stat } = await import('node:fs/promises');
      const { join, relative, extname } = await import('node:path');

      const pluginModules = new Map<string, any>();
      const validExtensions = ['.js', '.ts'];
      const isPluginFile = (filename: string) => {
        const ext = extname(filename);
        return validExtensions.includes(ext) && filename.endsWith('.plugin' + ext);
      };

      // Recursive function to scan directory
      const scanDir = async (dir: string) => {
        const entries = await readdir(dir);

        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const stats = await stat(fullPath);

          if (stats.isDirectory()) {
            await scanDir(fullPath);
          } else if (stats.isFile() && isPluginFile(entry)) {
            try {
              const relativePath = relative(this._config.pluginDir, fullPath);
              const module = await import(fullPath);
              pluginModules.set(relativePath, module);
            } catch (error) {
              console.warn(`Failed to import plugin at ${fullPath}:`, error);
            }
          }
        }
      };

      // Start scanning from the configured plugin directory
      await scanDir(this._config.pluginDir);

      // Process discovered plugins
      for (const [path, module] of pluginModules.entries()) {
        try {
          const plugin = await this._loadPlugin(path, module);

          if (plugin) {
            result.loadedPlugins.push(plugin);
          }
        } catch (error) {
          result.errors.push({
            pluginName: path,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      }
    } catch (error) {
      console.error('Error during plugin discovery:', error);
    }

    return result;
  }

  /**
   * Load and validate a single plugin
   */
  private async _loadPlugin(path: string, module: any): Promise<Plugin | null> {
    // Get the plugin constructor
    const pluginConstructor = this._getPluginConstructor(module);

    if (!pluginConstructor) {
      console.warn(`No valid plugin constructor found in ${path}`);
      return null;
    }

    try {
      // Create plugin instance
      const plugin = new pluginConstructor({});

      // Validate plugin metadata
      PluginSchemaValidator.validateMetadata(plugin.metadata);

      // Register with the plugin registry
      await pluginRegistry.register(pluginConstructor, {});

      return plugin;
    } catch (error) {
      throw new Error(`Failed to load plugin from ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the plugin constructor from a module
   */
  private _getPluginConstructor(module: any): PluginConstructor | null {
    // Look for exported class that extends Plugin
    const exportedItems = Object.values(module);

    for (const item of exportedItems) {
      if (typeof item === 'function' && item.prototype && this._isPluginConstructor(item)) {
        return item as PluginConstructor;
      }
    }

    return null;
  }

  /**
   * Check if a constructor is a valid plugin constructor
   */
  private _isPluginConstructor(constructor: any): boolean {
    try {
      // Check if it has the required plugin interface
      const instance = new constructor({});
      return (
        typeof instance.metadata === 'object' &&
        typeof instance.initialize === 'function' &&
        typeof instance.cleanup === 'function'
      );
    } catch {
      return false;
    }
  }

  /**
   * Start watching for plugin changes
   */
  private async _startWatching(): Promise<void> {
    const { watch } = await import('node:fs/promises');
    const { join, relative, extname } = await import('node:path');

    const validExtensions = ['.js', '.ts'];
    const isPluginFile = (filename: string) => {
      const ext = extname(filename);
      return validExtensions.includes(ext) && filename.endsWith('.plugin' + ext);
    };

    try {
      const watcher = watch(this._config.pluginDir, { recursive: true });
      this._watcher = watcher;

      for await (const event of watcher) {
        if (!event.filename) {
          continue;
        }

        // Only process .js and .ts plugin files
        if (!isPluginFile(event.filename)) {
          continue;
        }

        const fullPath = join(this._config.pluginDir, event.filename);
        const relativePath = relative(this._config.pluginDir, fullPath);

        try {
          // Clear the module cache to ensure we get fresh imports
          delete require.cache[require.resolve(fullPath)];

          // Import the updated module
          const module = await import(fullPath);
          const plugin = await this._loadPlugin(relativePath, module);

          if (plugin) {
            console.log(`Plugin ${relativePath} updated successfully`);
          }
        } catch (error) {
          console.error(`Error reloading plugin ${relativePath}:`, error);
        }
      }
    } catch (error) {
      console.error('Error setting up plugin watcher:', error);
    }
  }
}
