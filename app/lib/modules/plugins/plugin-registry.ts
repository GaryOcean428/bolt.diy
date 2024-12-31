import type { Plugin, PluginConfig, PluginRegistry, PluginCapabilityLevel } from './types';

export class DefaultPluginRegistry implements PluginRegistry {
  private readonly _plugins = new Map<string, Plugin>();
  private readonly _dependencyGraph = new Map<string, Set<string>>();

  async register<T extends PluginConfig>(plugin: Plugin<T>): Promise<void> {
    if (this._plugins.has(plugin.metadata.name)) {
      throw new Error(`Plugin ${plugin.metadata.name} already registered`);
    }

    try {
      // Validate the plugin
      const isValid = await this.validatePlugin(plugin);

      if (!isValid) {
        throw new Error(`Plugin ${plugin.metadata.name} failed validation`);
      }

      // Check dependencies
      await this._validateDependencies(plugin);

      // Initialize the plugin
      await plugin.initialize();

      // Add to registry
      this._plugins.set(plugin.metadata.name, plugin);
      this._updateDependencyGraph(plugin);
    } catch (error) {
      console.error(`Failed to register plugin ${plugin.metadata.name}:`, error);
      throw error;
    }
  }

  async unregister(pluginName: string): Promise<void> {
    const plugin = this._plugins.get(pluginName);

    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    // Check if any other plugins depend on this one
    const dependents = this._getDependents(pluginName);

    if (dependents.length > 0) {
      throw new Error(`Cannot unregister plugin ${pluginName}. It is required by: ${dependents.join(', ')}`);
    }

    // Cleanup and remove
    await plugin.cleanup();
    this._plugins.delete(pluginName);
    this._dependencyGraph.delete(pluginName);
  }

  getPlugin<T extends Plugin>(name: string): T | undefined {
    return this._plugins.get(name) as T | undefined;
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this._plugins.values());
  }

  async validatePlugin(plugin: Plugin): Promise<boolean> {
    try {
      // Basic validation
      if (!plugin.metadata.name || !plugin.metadata.version) {
        return false;
      }

      // Check for duplicate plugins
      if (this._plugins.has(plugin.metadata.name)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Plugin validation failed:', error);
      return false;
    }
  }

  async getDependencies(pluginName: string): Promise<Plugin[]> {
    const plugin = this._plugins.get(pluginName);

    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    const dependencies: Plugin[] = [];
    const dependencyNames = plugin.metadata.dependencies?.map((d) => d.name) || [];

    for (const name of dependencyNames) {
      const dep = this._plugins.get(name);

      if (dep) {
        dependencies.push(dep);
      }
    }

    return dependencies;
  }

  hasCapability(pluginName: string, capability: PluginCapabilityLevel): boolean {
    const plugin = this._plugins.get(pluginName);
    return plugin ? plugin.metadata.capabilities.includes(capability) : false;
  }

  private async _validateDependencies(plugin: Plugin): Promise<void> {
    const dependencies = plugin.metadata.dependencies || [];

    for (const dep of dependencies) {
      const dependency = this._plugins.get(dep.name);

      if (!dependency) {
        throw new Error(`Missing required dependency: ${dep.name}`);
      }

      // Version compatibility check could be added here
    }
  }

  private _updateDependencyGraph(plugin: Plugin): void {
    const dependencies = plugin.metadata.dependencies || [];
    const dependencySet = new Set(dependencies.map((d) => d.name));
    this._dependencyGraph.set(plugin.metadata.name, dependencySet);
  }

  private _getDependents(pluginName: string): string[] {
    const dependents: string[] = [];

    for (const [name, dependencies] of this._dependencyGraph.entries()) {
      if (dependencies.has(pluginName)) {
        dependents.push(name);
      }
    }

    return dependents;
  }
}
