// Code Generation Tests
import { createMockAgentManager } from './test-setup';
import { AgentManager } from '~/lib/modules/agents/agent-manager';
import { LanguageAgentImpl } from '~/lib/modules/agents/language-agent-impl';
import { AgentTier, AgentSpecialization, SupportedLanguage } from '~/lib/modules/agents/types';

describe('Code Generation', () => {
  let agentManager: AgentManager;

  beforeEach(() => {
    agentManager = createMockAgentManager();

    const languageAgent = new LanguageAgentImpl(
      {
        name: 'code-generation',
        description: 'Code generation agent',
        tier: AgentTier.Standard,
        specializations: [AgentSpecialization.CodeGeneration],
        supportedLanguages: [SupportedLanguage.English],
        maxTokens: 1000,
        costPerToken: 0.001,
      },
      SupportedLanguage.English,
    );

    (agentManager as any)._agents.set('language', languageAgent);
  });

  it('should generate a React component', async () => {
    const task = {
      type: 'code',
      input: 'Generate a React component that displays a list of items',
      complexity: {
        tokenCount: 50,
        specializedKnowledge: true,
        securitySensitive: false,
        languageSpecific: true,
        expectedDuration: 2,
      },
    };

    const result = await agentManager.executeTask(task.input, {
      tokenCount: 100,
      specializedKnowledge: false,
      securitySensitive: false,
      languageSpecific: false,
      expectedDuration: 60,
    });
    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect((result.data as any).type).toBe('code');
    expect((result.data as any).content).toContain('React');
  });
});
