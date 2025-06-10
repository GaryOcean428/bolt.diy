import { type Message } from 'ai';

export enum AgentOutputType {
  CodeBlock = 'code_block',
  Command = 'command',
  Error = 'error',
  Text = 'text',
  Message = 'message',
  Suggestion = 'suggestion',
}

export interface BaseOutput {
  type: AgentOutputType;
  content: string;
  metadata?: Record<string, any>;
  error?: Error;
}

export interface MessageOutput extends BaseOutput {
  type: AgentOutputType.Message | AgentOutputType.Text | AgentOutputType.Suggestion;
}

export interface CodeBlockOutput extends BaseOutput {
  type: AgentOutputType.CodeBlock;
  metadata: {
    path?: string;
    language?: string;
    confidence?: number;
    requires_review?: boolean;
    suggested_next_steps?: string[];
    tokens?: number;
  };
}

export interface CommandOutput extends BaseOutput {
  type: AgentOutputType.Command;
  metadata: {
    command: string;
    args: string[];
  };
}

export interface ErrorOutput extends BaseOutput {
  type: AgentOutputType.Error;
  error: Error;
}

export type AgentOutput = MessageOutput | CodeBlockOutput | CommandOutput | ErrorOutput;

export class AgentOutputProcessor {
  static async process(output: AgentOutput): Promise<AgentOutput> {
    switch (output.type) {
      case AgentOutputType.CodeBlock:
        return this._processCodeBlock(output);

      case AgentOutputType.Command:
        return this._processCommand(output);

      case AgentOutputType.Error:
        return this._processError(output);

      case AgentOutputType.Suggestion:
      case AgentOutputType.Text:
      case AgentOutputType.Message:
        return output;

      default:
        return output;
    }
  }

  private static async _processCodeBlock(output: AgentOutput): Promise<AgentOutput> {
    return output;
  }

  private static async _processCommand(output: AgentOutput): Promise<AgentOutput> {
    return output;
  }

  private static async _processError(output: AgentOutput): Promise<AgentOutput> {
    return output;
  }

  static async applyCodeBlock(output: AgentOutput): Promise<void> {
    if (output.type !== AgentOutputType.CodeBlock) {
      throw new Error('Cannot apply non-code block output');
    }
  }

  static createMessage(content: string, metadata?: Record<string, any>): AgentOutput {
    return {
      type: AgentOutputType.Message,
      content,
      metadata,
    };
  }

  static createCodeBlock(content: string, path?: string, language?: string): AgentOutput {
    return {
      type: AgentOutputType.CodeBlock,
      content,
      metadata: { path, language },
    };
  }

  static createCommand(command: string, args: string[]): AgentOutput {
    return {
      type: AgentOutputType.Command,
      content: `${command}(${args.join(', ')})`,
      metadata: { command, args },
    };
  }

  static createError(message: string, error?: Error): AgentOutput {
    return {
      type: AgentOutputType.Error,
      content: message,
      error: error || new Error(message),
    };
  }

  static parseOutput(text: string): AgentOutput {
    try {
      const codeMatch = text.match(/```(\w+)?\n([\s\S]*?)```/);

      if (codeMatch) {
        return this.createCodeBlock(codeMatch[2].trim(), undefined, codeMatch[1]);
      }

      const functionMatch = text.match(/(\w+)\((.*)\)/);

      if (functionMatch) {
        return this.createCommand(functionMatch[1], [functionMatch[2]]);
      }

      const dataTypeMatch = text.match(/\[(\w+)\]([\s\S]*)/);

      if (dataTypeMatch) {
        const [, dataType, content] = dataTypeMatch;
        return this.createMessage(content.trim(), { type: dataType });
      }

      return this.createMessage(text);
    } catch (error) {
      return this.createError('Failed to parse output', error instanceof Error ? error : new Error(String(error)));
    }
  }

  static validateOutput(output: AgentOutput): AgentOutput {
    if (!output || !output.type || !output.content) {
      throw new Error('Invalid output format');
    }

    return output;
  }

  static formatOutput(output: AgentOutput): string {
    let language: string;

    switch (output.type) {
      case AgentOutputType.CodeBlock:
        language = output.metadata?.language || '';
        return `\`\`\`${language}\n${output.content}\n\`\`\``;

      case AgentOutputType.Command:
        return `${output.metadata.command}(${output.metadata.args.join(', ')})`;

      case AgentOutputType.Error:
        return `Error: ${output.content}\n${output.error?.message || ''}`;

      default:
        return output.content;
    }
  }
}

export function convertToMessage(output: AgentOutput): Message {
  return {
    id: Date.now().toString(),
    role: 'assistant',
    content: AgentOutputProcessor.formatOutput(output),
  };
}
