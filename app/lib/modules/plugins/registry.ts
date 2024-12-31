import type { Plugin, PluginConfig, PluginRegistry, PluginCapabilityLevel } from './types';

export class PluginRegistryImpl implements PluginRegistry {
  private readonly _plugins = new Map<string, Plugin>();

  async register<T extends PluginConfig>(plugin: Plugin<T>): Promise<void> {
    if (this._plugins.has(plugin.metadata.name)) {
      throw new Error(`Plugin ${plugin.metadata.name} is already registered`);
    }

    await plugin.initialize();
    this._plugins.set(plugin.metadata.name, plugin);
  }

  async unregister(pluginName: string): Promise<void> {
    const plugin = this._plugins.get(pluginName);

    if (plugin) {
      await plugin.cleanup();
      this._plugins.delete(pluginName);
    }
  }

  getPlugin<T extends Plugin>(name: string): T | undefined {
    return this._plugins.get(name) as T | undefined;
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this._plugins.values());
  }

  async validatePlugin(plugin: Plugin): Promise<boolean> {
    return plugin.validate();
  }

  getDependencies(pluginName: string): Promise<Plugin[]> {
    const plugin = this._plugins.get(pluginName);

    if (!plugin) {
      return Promise.resolve([]);
    }

    const dependencies = plugin.metadata.dependencies || [];

    return Promise.all(dependencies.map((dep) => this.getPlugin(dep.name)).filter((p): p is Plugin => !!p));
  }

  hasCapability(pluginName: string, capability: PluginCapabilityLevel): boolean {
    const plugin = this._plugins.get(pluginName);
    return plugin?.metadata.capabilities.includes(capability) || false;
  }
}
