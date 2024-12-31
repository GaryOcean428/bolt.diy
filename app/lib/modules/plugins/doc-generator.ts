import type { PluginRegistry } from './types';
import type { Plugin } from './types';

export class PluginDocGenerator {
  private readonly _registry: PluginRegistry;

  constructor(registry: PluginRegistry) {
    this._registry = registry;
  }

  generateDocs(_plugin: Plugin): string {
    // TODO: Implement plugin documentation generation
    return '';
  }
}
