// Test Setup
import { AgentManager } from '~/lib/modules/agents/agent-manager';
import { LanguageAgentImpl } from '~/lib/modules/agents/language-agent-impl';
import { AgentTier, SupportedLanguage, AgentSpecialization } from '~/lib/modules/agents/types';

export function createMockAgentManager(): AgentManager {
  return new AgentManager();
}

export function createMockLanguageAgent(): LanguageAgentImpl {
  return new LanguageAgentImpl(
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
}

export const mockFunctions = {
  initialize: async () => Promise.resolve(),
  dispose: async () => Promise.resolve(),
};
