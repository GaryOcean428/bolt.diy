import type { z } from 'zod';

export enum PluginCapabilityLevel {
  Basic = 'basic',
  Advanced = 'advanced',
  Expert = 'expert',
}

export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  author?: string;
  tags?: string[];
  capabilities: PluginCapabilityLevel[];
  dependencies?: Array<{
    name: string;
    version: string;
  }>;
  entrypoint: string;
  configSchema?: z.ZodSchema;
}

export interface PluginConfig {
  [key: string]: unknown;
}

export interface Plugin<T extends PluginConfig = PluginConfig> {
  metadata: PluginMetadata;
  config: T;
  initialize(): Promise<void>;
  validate(): Promise<boolean>;
  cleanup(): Promise<void>;
}

export interface PluginRegistry {
  register<T extends PluginConfig>(plugin: Plugin<T>): Promise<void>;
  unregister(pluginName: string): Promise<void>;
  getPlugin<T extends Plugin>(name: string): T | undefined;
  getAllPlugins(): Plugin[];
  validatePlugin(plugin: Plugin): Promise<boolean>;
  getDependencies(pluginName: string): Promise<Plugin[]>;
  hasCapability(pluginName: string, capability: PluginCapabilityLevel): boolean;
}

export type PluginConstructor<T extends PluginConfig = PluginConfig> = new (config: T) => Plugin<T>;
