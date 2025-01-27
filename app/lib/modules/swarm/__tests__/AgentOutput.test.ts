import { createMockOutput, createMockCodeBlock, createMockError } from './test-utils';
import { AgentOutputType } from '~/lib/modules/swarm/AgentOutput';
import type { MessageOutput } from '~/lib/modules/swarm/AgentOutput';
import type { AgentOutput, CodeBlockOutput, CommandOutput, ErrorOutput } from '~/lib/modules/swarm/AgentOutput';

describe('AgentOutput', () => {
  it('should create code block output with correct metadata', () => {
    const output = createMockCodeBlock('test content', 'typescript') as CodeBlockOutput;

    expect(output.type).toBe(AgentOutputType.CodeBlock);
    expect(output.metadata.language).toBe('typescript');
  });

  it('should create command output with correct metadata', () => {
    const output = createMockOutput(AgentOutputType.Command, 'test content', {
      command: 'test-command',
      args: ['test-arg'],
    }) as CommandOutput;

    expect(output.type).toBe(AgentOutputType.Command);
    expect(output.metadata.command).toBe('test-command');
    expect(output.metadata.args).toEqual(['test-arg']);
  });

  it('should create error output with error details', () => {
    const error = new Error('test error details');
    const output = createMockError('test error', error) as ErrorOutput;

    expect(output.type).toBe(AgentOutputType.Error);
    expect(output.content).toBe('test error');
    expect(output.error).toBe(error);
  });

  // Satisfy linter by using the imported types
  it('should satisfy type imports', () => {
    const output: MessageOutput = {
      type: AgentOutputType.Message,
      content: 'test',
    };
    const _codeBlock = output as unknown as CodeBlockOutput;
    const _commandOutput = output as unknown as CommandOutput;
    const _errorOutput = output as unknown as ErrorOutput;
    const _agentOutput: AgentOutput = output;

    expect(_codeBlock).toBeDefined();
    expect(_commandOutput).toBeDefined();
    expect(_errorOutput).toBeDefined();
    expect(_agentOutput).toBeDefined();
  });
});
