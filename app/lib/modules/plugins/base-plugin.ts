import type { Plugin, PluginConfig, PluginMetadata } from './types';

export abstract class BasePlugin<T extends PluginConfig = PluginConfig> implements Plugin<T> {
  readonly metadata: PluginMetadata;
  readonly config: T;

  constructor(metadata: PluginMetadata, config: T) {
    this.metadata = {
      ...metadata,
      enabled: metadata.enabled ?? true,
    };
    this.config = config;
  }

  // Default implementations that can be overridden
  async initialize(): Promise<void> {
    // Base initialization - can be overridden by plugins
    return Promise.resolve();
  }

  async cleanup(): Promise<void> {
    // Base cleanup - can be overridden by plugins
    return Promise.resolve();
  }
}
