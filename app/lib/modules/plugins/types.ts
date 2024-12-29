export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  tags?: string[];
  enabled: boolean;
}

export interface PluginConfig {
  // Plugin-specific configuration options
  [key: string]: unknown;
}

export interface Plugin<T extends PluginConfig = PluginConfig> {
  metadata: PluginMetadata;
  config: T;
  
  // Core plugin lifecycle methods
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

export type PluginConstructor<T extends PluginConfig = PluginConfig> = new (
  config: T
) => Plugin<T>;

export interface PluginRegistry {
  register<T extends PluginConfig>(
    pluginConstructor: PluginConstructor<T>,
    config: T
  ): Promise<void>;
  
  unregister(pluginName: string): Promise<void>;
  
  getPlugin<T extends Plugin>(name: string): T | undefined;
  
  getAllPlugins(): Plugin[];
}
