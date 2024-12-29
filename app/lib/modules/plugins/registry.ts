import type { Plugin, PluginConfig, PluginConstructor, PluginRegistry } from './types';

/**
 * Central registry for managing plugins in the system.
 * Handles plugin lifecycle, validation, and selection.
 */
export class PluginRegistryImpl implements PluginRegistry {
  private _plugins: Map<string, Plugin> = new Map();
  private static _instance: PluginRegistryImpl;

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): PluginRegistryImpl {
    if (!PluginRegistryImpl._instance) {
      PluginRegistryImpl._instance = new PluginRegistryImpl();
    }

    return PluginRegistryImpl._instance;
  }

  /**
   * Register a new plugin with the system
   * @param pluginConstructor The plugin class constructor
   * @param config Plugin configuration
   */
  async register<T extends PluginConfig>(pluginConstructor: PluginConstructor<T>, config: T): Promise<void> {
    try {
      // Instantiate the plugin
      const plugin = new pluginConstructor(config);

      // Validate plugin metadata
      this._validatePluginMetadata(plugin);

      // Check for duplicate plugins
      if (this._plugins.has(plugin.metadata.name)) {
        throw new Error(`Plugin ${plugin.metadata.name} is already registered`);
      }

      // Initialize the plugin
      await plugin.initialize();

      // Store the plugin
      this._plugins.set(plugin.metadata.name, plugin);

      console.log(`Plugin ${plugin.metadata.name} registered successfully`);
    } catch (error) {
      console.error(`Failed to register plugin: ${error}`);
      throw error;
    }
  }

  /**
   * Unregister a plugin from the system
   * @param pluginName Name of the plugin to unregister
   */
  async unregister(pluginName: string): Promise<void> {
    const plugin = this._plugins.get(pluginName);

    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    try {
      // Cleanup plugin resources
      await plugin.cleanup();

      // Remove from registry
      this._plugins.delete(pluginName);

      console.log(`Plugin ${pluginName} unregistered successfully`);
    } catch (error) {
      console.error(`Failed to unregister plugin ${pluginName}: ${error}`);
      throw error;
    }
  }

  /**
   * Get a plugin by name
   * @param name Name of the plugin to retrieve
   * @returns The plugin instance or undefined if not found
   */
  getPlugin<T extends Plugin>(name: string): T | undefined {
    return this._plugins.get(name) as T | undefined;
  }

  /**
   * Get all registered plugins
   * @returns Array of all plugin instances
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this._plugins.values());
  }

  /**
   * Get plugins by tag
   * @param tag Tag to filter plugins by
   * @returns Array of plugins with the specified tag
   */
  getPluginsByTag(tag: string): Plugin[] {
    return Array.from(this._plugins.values()).filter((plugin) => plugin.metadata.tags?.includes(tag));
  }

  /**
   * Select plugins based on context
   * @param context Context object containing selection criteria
   * @returns Array of plugins matching the context
   */
  selectPluginsByContext(context: Record<string, unknown>): Plugin[] {
    /**
     * TODO: Implement more sophisticated context matching
     * This is a basic implementation that matches based on tags
     */
    if (typeof context.tags === 'string') {
      return this.getPluginsByTag(context.tags);
    }

    if (Array.isArray(context.tags)) {
      return context.tags.flatMap((tag) => this.getPluginsByTag(tag));
    }

    return this.getAllPlugins();
  }

  /**
   * Validate plugin metadata
   * @param plugin Plugin instance to validate
   * @throws Error if metadata is invalid
   */
  private _validatePluginMetadata(plugin: Plugin): void {
    const { metadata } = plugin;

    if (!metadata.name || typeof metadata.name !== 'string') {
      throw new Error('Plugin metadata must include a valid name string');
    }

    if (!metadata.version || typeof metadata.version !== 'string') {
      throw new Error('Plugin metadata must include a valid version string');
    }

    if (!metadata.description || typeof metadata.description !== 'string') {
      throw new Error('Plugin metadata must include a valid description string');
    }

    if (metadata.author && typeof metadata.author !== 'string') {
      throw new Error('Plugin author must be a string if provided');
    }

    if (metadata.tags && !Array.isArray(metadata.tags)) {
      throw new Error('Plugin tags must be an array if provided');
    }
  }
}

// Export singleton instance
export const pluginRegistry = PluginRegistryImpl.getInstance();
