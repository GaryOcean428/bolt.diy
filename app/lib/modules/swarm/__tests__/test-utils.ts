import { type AgentOutput, AgentOutputType } from '~/lib/modules/swarm/AgentOutput';
import type { OutputMetadata, AgentOutputMetadata } from '~/types/swarm';

export function createMockOutput(
  type: AgentOutputType = AgentOutputType.Message,
  content: string = 'test content',
  metadata?: OutputMetadata & AgentOutputMetadata,
  error?: Error,
): AgentOutput {
  if (error) {
    return {
      type: AgentOutputType.Error,
      content,
      metadata: metadata || {},
      error,
    };
  }

  const baseOutput = {
    type,
    content,
    metadata: metadata || {},
  };

  switch (type) {
    case AgentOutputType.Command:
      return {
        ...baseOutput,
        type: AgentOutputType.Command,
        metadata: {
          ...baseOutput.metadata,
          command: 'test-command',
          args: ['test-arg'],
        },
      };

    case AgentOutputType.CodeBlock:
      return {
        ...baseOutput,
        type: AgentOutputType.CodeBlock,
        metadata: {
          ...baseOutput.metadata,
          language: metadata?.language || 'typescript',
          path: metadata?.path || '/test/path',
        },
      };

    case AgentOutputType.Error:
      return {
        ...baseOutput,
        type: AgentOutputType.Error,
        error: new Error('test error'),
      };

    default:
      return {
        ...baseOutput,
        type: type as Exclude<
          AgentOutputType,
          AgentOutputType.Command | AgentOutputType.CodeBlock | AgentOutputType.Error
        >,
      };
  }
}

export function createMockCodeBlock(content: string, language: string = 'typescript'): AgentOutput {
  return createMockOutput(AgentOutputType.CodeBlock, content, { language });
}

export function createMockError(
  message: string = 'test error',
  error: Error = new Error('test error details'),
): AgentOutput {
  return createMockOutput(AgentOutputType.Error, message, undefined, error);
}
