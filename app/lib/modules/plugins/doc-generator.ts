import type { Plugin } from './types';
import { pluginRegistry } from './registry';

interface MethodParameter {
  name: string;
  type: string;
  description: string;
}

interface MethodDocumentation {
  name: string;
  description: string;
  parameters: MethodParameter[];
  returnType: string;
}

interface ConfigProperty {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

interface PluginDocumentation {
  name: string;
  description: string;
  author: string | undefined;
  version: string;
  tags: string[];
  config: {
    properties: ConfigProperty[];
  };
  methods: MethodDocumentation[];
}

interface ConfigSchema {
  type: string;
  description?: string;
  required?: boolean;
}

/**
 * Generates documentation for plugins
 */
export class PluginDocGenerator {
  /**
   * Generate documentation for all registered plugins
   */
  static async generateAll(): Promise<PluginDocumentation[]> {
    const plugins = pluginRegistry.getAllPlugins();
    return plugins.map((plugin) => this.generateForPlugin(plugin));
  }

  /**
   * Generate documentation for a specific plugin
   */
  static generateForPlugin(plugin: Plugin): PluginDocumentation {
    const metadata = plugin.metadata;
    const prototype = Object.getPrototypeOf(plugin);
    const methods = this._getPluginMethods(prototype);
    const config = this._getPluginConfig(plugin);

    return {
      name: metadata.name,
      description: metadata.description,
      author: metadata.author,
      version: metadata.version,
      tags: metadata.tags || [],
      config,
      methods,
    };
  }

  /**
   * Generate markdown documentation for all plugins
   */
  static async generateMarkdown(): Promise<string> {
    const docs = await this.generateAll();
    let markdown = '# Bolt Plugins Documentation\n\n';

    for (const doc of docs) {
      markdown += `## ${doc.name}\n\n`;
      markdown += `${doc.description}\n\n`;
      markdown += `- Author: ${doc.author || 'Unknown'}\n`;
      markdown += `- Version: ${doc.version}\n`;
      markdown += `- Tags: ${doc.tags.join(', ')}\n\n`;

      if (doc.config.properties.length > 0) {
        markdown += '### Configuration\n\n';
        markdown += '| Property | Type | Required | Description |\n';
        markdown += '|----------|------|----------|-------------|\n';

        for (const prop of doc.config.properties) {
          markdown += `| ${prop.name} | ${prop.type} | ${prop.required} | ${prop.description} |\n`;
        }

        markdown += '\n';
      }

      if (doc.methods.length > 0) {
        markdown += '### Methods\n\n';

        for (const method of doc.methods) {
          markdown += `#### ${method.name}\n\n`;
          markdown += `${method.description}\n\n`;

          if (method.parameters.length > 0) {
            markdown += 'Parameters:\n';

            for (const param of method.parameters) {
              markdown += `- ${param.name} (${param.type}): ${param.description}\n`;
            }
            markdown += '\n';
          }

          markdown += `Returns: ${method.returnType}\n\n`;
        }
      }

      markdown += '---\n\n';
    }

    return markdown;
  }

  /**
   * Extract plugin method information using reflection
   */
  private static _getPluginMethods(prototype: object): MethodDocumentation[] {
    const methods: MethodDocumentation[] = [];
    const methodNames = Object.getOwnPropertyNames(prototype).filter((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
      return descriptor && typeof descriptor.value === 'function' && name !== 'constructor';
    });

    for (const name of methodNames) {
      const method = (prototype as Record<string, (...args: unknown[]) => unknown>)[name];
      const params = this._getMethodParameters(method);

      methods.push({
        name,
        description: this._getMethodDescription(method),
        parameters: params,
        returnType: this._getMethodReturnType(method),
      });
    }

    return methods;
  }

  /**
   * Extract plugin configuration information
   */
  private static _getPluginConfig(plugin: Plugin): { properties: ConfigProperty[] } {
    const properties: ConfigProperty[] = [];
    const config = plugin.config as Record<string, ConfigSchema>;

    for (const [name, schema] of Object.entries(config)) {
      properties.push({
        name,
        type: schema.type,
        description: schema.description || '',
        required: schema.required || false,
      });
    }

    return { properties };
  }

  /**
   * Extract method parameter information from JSDoc comments
   */
  private static _getMethodParameters(method: (...args: unknown[]) => unknown): MethodParameter[] {
    const params: MethodParameter[] = [];
    const comments = method.toString().match(/\/\*\*\s*\n([^*]|\*[^/])*\*\//g) || [];

    for (const comment of comments) {
      const paramMatches = comment.match(/@param\s+{([^}]+)}\s+(\w+)\s+([^\n]+)/g) || [];

      for (const match of paramMatches) {
        const [, type, name, description] = match.match(/@param\s+{([^}]+)}\s+(\w+)\s+([^\n]+)/) || [];

        if (type && name && description) {
          params.push({ type, name, description: description.trim() });
        }
      }
    }

    return params;
  }

  /**
   * Extract method return type from JSDoc comments
   */
  private static _getMethodReturnType(method: (...args: unknown[]) => unknown): string {
    const comments = method.toString().match(/\/\*\*\s*\n([^*]|\*[^/])*\*\//g) || [];

    for (const comment of comments) {
      const returnMatch = comment.match(/@returns?\s+{([^}]+)}/) || [];

      if (returnMatch[1]) {
        return returnMatch[1];
      }
    }

    return 'void';
  }

  /**
   * Extract method description from JSDoc comments
   */
  private static _getMethodDescription(method: (...args: unknown[]) => unknown): string {
    const comments = method.toString().match(/\/\*\*\s*\n([^*]|\*[^/])*\*\//g) || [];

    for (const comment of comments) {
      const description = comment
        .replace(/\/\*\*\s*\n/, '')
        .replace(/\s*\*\//, '')
        .replace(/^\s*\*\s*/gm, '')
        .split('\n')
        .filter((line) => !line.trim().startsWith('@'))
        .join('\n')
        .trim();

      if (description) {
        return description;
      }
    }

    return '';
  }
}
