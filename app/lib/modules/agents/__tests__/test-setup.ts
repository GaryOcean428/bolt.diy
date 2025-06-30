// Test Setup
import { AgentManager } from '~/lib/modules/agents/agent-manager';
import { LanguageAgentImpl } from '~/lib/modules/agents/language-agent-impl';
import {
  AgentTier,
  SupportedLanguage,
  AgentSpecialization,
  type AgentResult,
  type TaskComplexity,
} from '~/lib/modules/agents/types';

// Mock import.meta.env for tests
global.globalThis.import = {
  meta: {
    env: {
      VITE_LOG_LEVEL: 'debug',
      DEV: true,
      SSR: false,
    },
  },
} as any;

export function createMockAgentManager(): AgentManager {
  const manager = new AgentManager();
  const mockLanguageAgent = createMockLanguageAgent();
  (manager as any)._agents.set('mock-language', mockLanguageAgent);

  return manager;
}

export function createMockLanguageAgent(): LanguageAgentImpl {
  const agent = new LanguageAgentImpl(
    {
      name: 'Mock Language Agent',
      description: 'A mock language agent for testing',
      tier: AgentTier.Standard,
      specializations: [AgentSpecialization.CodeGeneration],
      supportedLanguages: [SupportedLanguage.English],
      maxTokens: 1000,
      costPerToken: 0.001,
    },
    SupportedLanguage.English,
  );

  // Mock the executeTask method
  (agent as any)._executeImpl = async (_task: string, _complexity: TaskComplexity): Promise<AgentResult> => {
    return {
      success: true,
      data: {
        type: 'code',
        content: 'Mock code response',
      },
      metrics: {
        tokensUsed: 100,
        executionTime: 50,
        cost: 0.001,
      },
    };
  };

  return agent;
}

export const mockFunctions = {
  initialize: async () => Promise.resolve(),
  dispose: async () => Promise.resolve(),
  executeTask: async (_task: string, _complexity: TaskComplexity): Promise<AgentResult> => {
    return {
      success: true,
      data: {
        type: 'code',
        content: 'Mock code response',
      },
      metrics: {
        tokensUsed: 100,
        executionTime: 50,
        cost: 0.001,
      },
    };
  },
};
