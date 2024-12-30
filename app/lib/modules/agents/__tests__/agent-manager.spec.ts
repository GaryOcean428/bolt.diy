// Agent Manager Tests
import { AgentManager } from '~/lib/modules/agents/agent-manager';
import type { TaskComplexity } from '~/lib/modules/agents/types';

describe('AgentManager', () => {
  let agentManager: AgentManager;

  beforeEach(() => {
    agentManager = new AgentManager();
  });

  it('should register default agents on initialization', () => {
    const agents = agentManager.getAgents();
    expect(agents.length).toBeGreaterThan(0);
    expect(agents.some((a) => a.config.name === 'english-language')).toBe(true);
    expect(agents.some((a) => a.config.name === 'code-generation')).toBe(true);
    expect(agents.some((a) => a.config.name === 'testing')).toBe(true);
  });

  it('should route language tasks to language agent', async () => {
    const task = 'Translate this code comment';
    const complexity: TaskComplexity = {
      tokenCount: task.length,
      specializedKnowledge: false,
      securitySensitive: false,
      languageSpecific: true,
      expectedDuration: 1,
    };

    const result = await agentManager.executeTask(task, complexity);
    expect(result.success).toBe(true);
  });

  it('should route code tasks to code generation agent', async () => {
    const task = 'Generate a React component';
    const complexity: TaskComplexity = {
      tokenCount: task.length,
      specializedKnowledge: true,
      securitySensitive: false,
      languageSpecific: true,
      expectedDuration: 1,
    };

    const result = await agentManager.executeTask(task, complexity);
    expect(result.success).toBe(true);
  });

  it('should handle agent deactivation and reactivation', async () => {
    const agents = agentManager.getAgents();
    const agent = agents[0];

    await agentManager.deactivateAgent(agent.config.name);
    expect(agentManager.getAgents().length).toBeLessThan(agents.length);

    await agentManager.reactivateAgent(agent.config.name);
    expect(agentManager.getAgents().length).toBe(agents.length);
  });

  it('should select agent based on task complexity', async () => {
    const task = 'Review this code for security issues';
    const complexity: TaskComplexity = {
      tokenCount: task.length,
      specializedKnowledge: true,
      securitySensitive: true,
      languageSpecific: true,
      expectedDuration: 2,
    };

    const result = await agentManager.executeTask(task, complexity);
    expect(result.success).toBe(true);
    expect(result.metrics).toBeDefined();
  });
});
