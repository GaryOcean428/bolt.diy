import { EventEmitter } from 'node:events';
import type { Agent, AgentResult, TaskComplexity, TaskContext } from './types';
import { AgentSpecialization } from './types';
import { swarmLogger, LogLevel } from '~/lib/modules/logging/SwarmLogger';

export class AgentManager extends EventEmitter {
  private readonly _agents = new Map<string, Agent>();

  // Optional: Add a method that uses swarmLogger if needed
  private _logTaskExecution(task: string, agent: Agent) {
    swarmLogger.log(LogLevel.INFO, 'agent-execution', `Executing task with agent: ${agent.config.name}`, { task });
  }

  async executeTask(task: string, complexity: TaskComplexity, context?: TaskContext): Promise<AgentResult> {
    if (this._agents.size === 0) {
      throw new Error('No agents are registered. Please ensure agents are properly initialized.');
    }

    const agents = Array.from(this._agents.values());
    const suitableAgents = await Promise.all(
      agents.map(async (agent) => ({
        agent,
        canHandle: await agent.canHandle(task, complexity),
        cost: await agent.estimateCost(task, complexity),
      })),
    );

    // Find the most suitable agent
    const filteredAgents = suitableAgents.filter((a) => a.canHandle);
    const sortedAgents = filteredAgents.sort((a, b) => a.cost - b.cost);
    let selectedAgent = sortedAgents[0]?.agent;

    // Fallback logic
    if (!selectedAgent) {
      // Try to find a language agent as fallback
      const foundAgent = agents.find((agent) => {
        const specs = agent.config.specializations || [];
        return specs.includes(AgentSpecialization.CodeGeneration);
      });

      if (foundAgent) {
        selectedAgent = foundAgent;
      } else {
        // Last resort: use the first available agent
        selectedAgent = agents[0];
      }
    }

    if (!selectedAgent) {
      throw new Error('No agents are available to handle the task');
    }

    // Optional logging
    this._logTaskExecution(task, selectedAgent);

    return selectedAgent.execute(task, context);
  }

  // ... rest of the class implementation
}
