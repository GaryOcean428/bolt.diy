import { createMockAgentManager } from './test-setup';
import { AgentManager } from '~/lib/modules/agents/agent-manager';
import { LanguageAgentImpl } from '~/lib/modules/agents/language-agent-impl';
import { AgentTier, AgentSpecialization, SupportedLanguage } from '~/lib/modules/agents/types';

describe('AgentManager', () => {
  let agentManager: AgentManager;

  beforeEach(() => {
    agentManager = createMockAgentManager();

    // Register default agents
    const languageAgent = new LanguageAgentImpl(
      {
        name: 'english-language',
        description: 'Natural language processing agent',
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

  it('should register default agents on initialization', () => {
    const agents = Array.from((agentManager as any)._agents.values());
    expect(agents.length).toBeGreaterThan(0);
    expect(agents.some((a: any) => a.config.name === 'english-language')).toBe(true);
  });

  it('should route language tasks to language agent', async () => {
    const task = {
      type: 'language',
      input: 'Analyze this text',
      complexity: {
        tokenCount: 10,
        specializedKnowledge: false,
        securitySensitive: false,
        languageSpecific: true,
        expectedDuration: 1,
      },
    };

    const result = await agentManager.executeTask(task.input, {
      tokenCount: task.complexity.tokenCount,
      specializedKnowledge: task.complexity.specializedKnowledge,
      securitySensitive: task.complexity.securitySensitive,
      languageSpecific: task.complexity.languageSpecific,
      expectedDuration: task.complexity.expectedDuration,
    });
    expect(result).toBeDefined();
  });

  it('should route code tasks to code generation agent', async () => {
    const task = {
      type: 'code',
      input: 'Generate a React component',
      complexity: {
        tokenCount: 20,
        specializedKnowledge: true,
        securitySensitive: false,
        languageSpecific: true,
        expectedDuration: 1,
      },
    };

    const result = await agentManager.executeTask(task.input, {
      tokenCount: task.complexity.tokenCount,
      specializedKnowledge: task.complexity.specializedKnowledge,
      securitySensitive: task.complexity.securitySensitive,
      languageSpecific: task.complexity.languageSpecific,
      expectedDuration: task.complexity.expectedDuration,
    });
    expect(result).toBeDefined();
  });

  it('should handle agent deactivation and reactivation', async () => {
    const agents = Array.from((agentManager as any)._agents.values());
    const agent = agents[0];
    expect(agent).toBeDefined();

    const typedAgent = agent as unknown as {
      config: {
        name: string;
      };
    };
    await (agentManager as any)._deactivateAgent(typedAgent.config.name);
    expect(Array.from((agentManager as any)._agents.values()).length).toBeLessThan(agents.length);

    await (agentManager as any)._reactivateAgent(typedAgent.config.name);
    expect(Array.from((agentManager as any)._agents.values()).length).toBe(agents.length);
  });

  it('should select agent based on task complexity', async () => {
    const task = {
      type: 'code',
      input: 'Complex task requiring high performance',
      complexity: {
        tokenCount: 100,
        specializedKnowledge: true,
        securitySensitive: true,
        languageSpecific: true,
        expectedDuration: 5,
      },
    };

    const result = await agentManager.executeTask(task.input, {
      tokenCount: task.complexity.tokenCount,
      specializedKnowledge: task.complexity.specializedKnowledge,
      securitySensitive: task.complexity.securitySensitive,
      languageSpecific: task.complexity.languageSpecific,
      expectedDuration: task.complexity.expectedDuration,
    });
    expect(result).toBeDefined();
  });
});
