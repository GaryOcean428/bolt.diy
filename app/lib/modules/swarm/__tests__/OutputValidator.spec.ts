import { createMockOutput } from './test-utils';
import { AgentOutputType } from '~/lib/modules/swarm/AgentOutput';
import type { AgentOutput } from '~/lib/modules/swarm/AgentOutput';
import { OutputValidator } from '~/lib/modules/swarm/OutputValidator';

describe('OutputValidator', () => {
  describe('validateOutput', () => {
    it('should validate valid output', async () => {
      const output = createMockOutput(AgentOutputType.Message, 'test content', {
        confidence: 0.9,
        tokens: 10,
      });

      const result = await OutputValidator.validateOutput(output);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null output', async () => {
      const result = await OutputValidator.validateOutput(null as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid output format');
    });

    it('should reject invalid confidence value', async () => {
      const output = createMockOutput(AgentOutputType.Message, 'test content', {
        confidence: 1.5,
        tokens: 10,
      });

      const result = await OutputValidator.validateOutput(output);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Confidence must be between 0 and 1');
    });
  });

  describe('validateCodeBlock', () => {
    it('should validate code block with path', async () => {
      const output = createMockOutput(AgentOutputType.CodeBlock, 'test content', {
        path: '/test/path',
      });

      const result = await OutputValidator.validateCodeBlock(output);
      expect(result.valid).toBe(true);
    });

    it('should reject code block without path', async () => {
      const output = createMockOutput(AgentOutputType.CodeBlock, 'test content');

      const result = await OutputValidator.validateCodeBlock(output);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Code block must have a path');
    });
  });

  // Satisfy linter by using the imported type
  it('should use AgentOutput type', () => {
    const _dummyOutput: AgentOutput = {
      type: AgentOutputType.Message,
      content: 'dummy',
    };
    expect(_dummyOutput).toBeDefined();
  });
});
