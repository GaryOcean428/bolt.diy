import { PluginRegistryImpl } from './registry';
import type { Plugin, PluginConstructor } from './types';
import { PluginSchemaValidator } from './validation';

export class PluginDiscovery {
  private readonly _registry: PluginRegistryImpl;
  private readonly _validator: PluginSchemaValidator;
  private _watcher: any | null = null;

  constructor(
    private readonly _config: {
      pluginDir: string;
      watchForChanges?: boolean;
      filePattern?: string;
    },
  ) {
    this._registry = new PluginRegistryImpl();
    this._validator = new PluginSchemaValidator();
  }

  async start(): Promise<{
    loadedPlugins: Plugin[];
    errors: Array<{ pluginName: string; error: Error }>;
  }> {
    const result = {
      loadedPlugins: [] as Plugin[],
      errors: [] as Array<{ pluginName: string; error: Error }>,
    };

    try {
      const plugins = await this._loadAllPlugins();
      result.loadedPlugins = plugins.filter((p): p is Plugin => p !== null);
    } catch (error) {
      result.errors.push({
        pluginName: 'unknown',
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }

    if (this._config.watchForChanges) {
      await this._setupWatcher();
    }

    return result;
  }

  private async _loadAllPlugins(): Promise<(Plugin | null)[]> {
    // Implementation for loading all plugins
    return [];
  }

  private async _setupWatcher(): Promise<void> {
    // Implementation for setting up file watcher
  }

  async stop(): Promise<void> {
    if (this._watcher) {
      await this._watcher.close();
      this._watcher = null;
    }
  }

  private async _loadPlugin(pluginPath: string): Promise<Plugin | null> {
    try {
      const pluginModule = await import(pluginPath);
      const pluginConstructor = this._getPluginConstructor(pluginModule);

      if (!pluginConstructor) {
        return null;
      }

      const config = {}; // Default empty config
      const pluginInstance = new pluginConstructor(config);
      await this._registry.register(pluginInstance);

      return pluginInstance;
    } catch (error) {
      console.error(`Failed to load plugin from ${pluginPath}:`, error);
      return null;
    }
  }

  private _getPluginConstructor(module: any): PluginConstructor | null {
    for (const exportKey of Object.keys(module)) {
      const exported = module[exportKey];

      if (this._isPluginConstructor(exported)) {
        return exported;
      }
    }
    return null;
  }

  private _isPluginConstructor(value: any): value is PluginConstructor {
    return typeof value === 'function' && value.prototype && 'initialize' in value.prototype;
  }
}
