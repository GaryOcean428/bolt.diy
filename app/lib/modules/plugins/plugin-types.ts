import { z } from 'zod';
import type { Agent } from '~/lib/modules/agents/types';

/**
 * Plugin capability level
 */
export enum PluginCapabilityLevel {
  Basic = 'basic', // Read-only operations
  Standard = 'standard', // Basic mutations
  Advanced = 'advanced', // Complex operations
  System = 'system', // System-level operations
}

/**
 * Plugin lifecycle hooks
 */
export interface PluginLifecycle {
  onLoad?: () => Promise<void>;
  onUnload?: () => Promise<void>;
  onAgentInitialize?: (agent: Agent) => Promise<void>;
  onAgentDispose?: (agent: Agent) => Promise<void>;
  onBeforeTask?: (task: string, agent: Agent) => Promise<void>;
  onAfterTask?: (task: string, agent: Agent, result: any) => Promise<void>;
}

/**
 * Plugin manifest schema
 */
export const pluginManifestSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.string(),
  license: z.string(),
  capabilities: z.array(z.nativeEnum(PluginCapabilityLevel)),
  dependencies: z
    .array(
      z.object({
        name: z.string(),
        version: z.string(),
      }),
    )
    .optional(),
  configSchema: z.record(z.any()).optional(),
  entrypoint: z.string(),
});

export type PluginManifest = z.infer<typeof pluginManifestSchema>;

/**
 * Plugin interface
 */
export interface Plugin extends PluginLifecycle {
  readonly manifest: PluginManifest;
  readonly isLoaded: boolean;
  readonly config: Record<string, any>;

  initialize(config?: Record<string, any>): Promise<void>;
  validate(): Promise<boolean>;
  getCapabilities(): PluginCapabilityLevel[];
  hasCapability(capability: PluginCapabilityLevel): boolean;
}
