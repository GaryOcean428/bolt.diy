import type { AgentOutput } from './AgentOutput';
import { AgentOutputType } from './AgentOutput';

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class OutputValidator {
  static async validateOutput(output: AgentOutput): Promise<ValidationResult> {
    if (!output || !output.type || !output.content) {
      return {
        valid: false,
        errors: ['Invalid output format'],
      };
    }

    const metadata = output.metadata as Record<string, any>;
    const confidence = metadata?.confidence ?? 1.0;
    const tokens = metadata?.tokens ?? 0;
    const requiresReview = metadata?.requires_review ?? false;
    const suggestedNextSteps = metadata?.suggested_next_steps ?? [];

    // Basic validation checks
    if (confidence < 0 || confidence > 1) {
      return {
        valid: false,
        errors: ['Confidence must be between 0 and 1'],
      };
    }

    if (tokens < 0) {
      return {
        valid: false,
        errors: ['Token count cannot be negative'],
      };
    }

    // Optional additional validation based on requires_review
    if (requiresReview && suggestedNextSteps.length === 0) {
      return {
        valid: false,
        errors: ['Output requires review but no suggested next steps provided'],
      };
    }

    return {
      valid: true,
      errors: [],
    };
  }

  static async validateCodeBlock(output: AgentOutput): Promise<ValidationResult> {
    if (output.type !== AgentOutputType.CodeBlock) {
      return {
        valid: false,
        errors: ['Not a code block output'],
      };
    }

    const metadata = output.metadata as Record<string, any>;

    if (!metadata?.path) {
      return {
        valid: false,
        errors: ['Code block must have a path'],
      };
    }

    return {
      valid: true,
      errors: [],
    };
  }

  private _parseResponse(_response: unknown): {
    output: unknown;
    type: unknown;
    _requiresReview: unknown;
    _suggestedNextSteps: unknown;
  } {
    // implementation of parseResponse method
    return {
      output: '',
      type: '',
      _requiresReview: false,
      _suggestedNextSteps: [],
    };
  }

  private _validateResponse(response: unknown): AgentOutput {
    const { output, type } = this._parseResponse(response) as {
      output: string;
      type: AgentOutputType;
    };

    if (!output || !type) {
      throw new Error('Invalid response format: missing required fields');
    }

    return {
      type: type as AgentOutputType.Message | AgentOutputType.Text | AgentOutputType.Suggestion,
      content: output,
    };
  }
}
