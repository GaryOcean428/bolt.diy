import { PluginCapabilityLevel } from './types';
import type { Plugin, PluginConfig, PluginMetadata } from './types';
import type { Agent } from '~/lib/modules/agents/types';

export abstract class BasePlugin<T extends PluginConfig = PluginConfig> implements Plugin<T> {
  readonly metadata: PluginMetadata;
  readonly config: T;
  private _isLoaded: boolean = false;

  constructor(metadata: PluginMetadata, config: T) {
    this.metadata = {
      ...metadata,
      enabled: metadata.enabled ?? true,
      capabilities: metadata.capabilities || [PluginCapabilityLevel.Basic],
      dependencies: metadata.dependencies || [],
    };
    this.config = config;
  }

  get isLoaded(): boolean {
    return this._isLoaded;
  }

  async initialize(config?: T): Promise<void> {
    if (config) {
      Object.assign(this.config, config);
    }

    // Run validation before initialization
    const isValid = await this.validate();

    if (!isValid) {
      throw new Error(`Plugin ${this.metadata.name} failed validation`);
    }

    // Call lifecycle hook
    await this.onLoad?.();
    this._isLoaded = true;
  }

  async validate(): Promise<boolean> {
    try {
      // Check if all required fields are present
      if (!this.metadata.name || !this.metadata.version || !this.metadata.description) {
        return false;
      }

      // Check if entrypoint exists
      if (!this.metadata.entrypoint) {
        return false;
      }

      // Validate config against schema if provided
      if (this.metadata.configSchema) {
        // TODO: Implement config validation against schema
      }

      return true;
    } catch (error) {
      console.error(`Plugin validation failed: ${error}`);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    if (!this._isLoaded) {
      return;
    }

    // Call lifecycle hook
    await this.onUnload?.();
    this._isLoaded = false;
  }

  getCapabilities(): PluginCapabilityLevel[] {
    return this.metadata.capabilities;
  }

  hasCapability(capability: PluginCapabilityLevel): boolean {
    return this.metadata.capabilities.includes(capability);
  }

  // Optional lifecycle hooks with default implementations
  protected async onLoad(): Promise<void> {
    // Override in subclass if needed
  }

  protected async onUnload(): Promise<void> {
    // Override in subclass if needed
  }

  protected async onAgentInitialize(_agent: Agent): Promise<void> {
    // Override in subclass if needed
  }

  protected async onAgentDispose(_agent: Agent): Promise<void> {
    // Override in subclass if needed
  }

  protected async onBeforeTask(_task: string, _agent: Agent): Promise<void> {
    // Override in subclass if needed
  }

  protected async onAfterTask(_task: string, _agent: Agent, _result: any): Promise<void> {
    // Override in subclass if needed
  }
}
