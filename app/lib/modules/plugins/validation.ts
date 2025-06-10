import type { PluginConfig, PluginMetadata } from './types';

/**
 * JSON Schema type definitions for plugin validation
 */
interface JSONSchemaType {
  type: string;
  properties?: Record<string, JSONSchemaType>;
  required?: string[];
  items?: JSONSchemaType;
  enum?: string[];
  description?: string;
}

/**
 * Validation error details
 */
interface ValidationError {
  path: string;
  message: string;
}

/**
 * Plugin configuration schema validator
 */
export class PluginSchemaValidator {
  private static readonly _metadataSchema: JSONSchemaType = {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Unique identifier for the plugin' },
      version: { type: 'string', description: 'Semantic version of the plugin' },
      description: { type: 'string', description: 'Brief description of the plugin functionality' },
      author: { type: 'string', description: 'Plugin author or organization' },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags for categorizing and discovering plugins',
      },
      enabled: { type: 'boolean', description: 'Whether the plugin is currently enabled' },
    },
    required: ['name', 'version', 'description', 'enabled'],
  };

  /**
   * Validate plugin metadata against the schema
   * @param metadata Plugin metadata to validate
   * @throws Error if validation fails
   */
  static validateMetadata(metadata: PluginMetadata): void {
    const errors = this._validateAgainstSchema(metadata, this._metadataSchema, 'metadata');

    if (errors.length > 0) {
      throw new Error(
        `Plugin metadata validation failed:\n${errors.map((e) => `- ${e.path}: ${e.message}`).join('\n')}`,
      );
    }
  }

  /**
   * Validate plugin configuration against its schema
   * @param config Plugin configuration to validate
   * @param schema JSON Schema for the configuration
   * @throws Error if validation fails
   */
  static validateConfig<T extends PluginConfig>(config: T, schema: JSONSchemaType): void {
    const errors = this._validateAgainstSchema(config, schema, 'config');

    if (errors.length > 0) {
      throw new Error(
        `Plugin configuration validation failed:\n${errors.map((e) => `- ${e.path}: ${e.message}`).join('\n')}`,
      );
    }
  }

  /**
   * Validate an object against a JSON Schema
   * @param obj Object to validate
   * @param schema JSON Schema to validate against
   * @param path Current path in the object (for error reporting)
   * @returns Array of validation errors
   */
  private static _validateAgainstSchema(obj: unknown, schema: JSONSchemaType, path: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Type validation
    if (schema.type === 'object' && typeof obj !== 'object') {
      errors.push({ path, message: `Expected object, got ${typeof obj}` });
      return errors;
    }

    if (schema.type === 'array' && !Array.isArray(obj)) {
      errors.push({ path, message: `Expected array, got ${typeof obj}` });
      return errors;
    }

    if (schema.type !== 'object' && schema.type !== 'array' && typeof obj !== schema.type) {
      errors.push({ path, message: `Expected ${schema.type}, got ${typeof obj}` });
      return errors;
    }

    // Object property validation
    if (schema.type === 'object' && schema.properties && typeof obj === 'object' && obj !== null) {
      // Check required properties
      schema.required?.forEach((prop) => {
        if (!(prop in obj)) {
          errors.push({ path: `${path}.${prop}`, message: 'Required property missing' });
        }
      });

      // Validate each property
      Object.entries(schema.properties).forEach(([prop, propSchema]) => {
        if (prop in obj) {
          const value = (obj as Record<string, unknown>)[prop];
          errors.push(...this._validateAgainstSchema(value, propSchema, `${path}.${prop}`));
        }
      });
    }

    // Array item validation
    if (schema.type === 'array' && schema.items && Array.isArray(obj)) {
      obj.forEach((item, index) => {
        errors.push(...this._validateAgainstSchema(item, schema.items!, `${path}[${index}]`));
      });
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(obj as string)) {
      errors.push({ path, message: `Value must be one of: ${schema.enum.join(', ')}` });
    }

    return errors;
  }
}
