import { EventEmitter } from 'events';
import { SupportedLanguage } from './types';
import type {
  Agent,
  AgentResult,
  AgentSpecialization,
  AgentTier,
  LanguageAgent,
  TaskAgent,
  TaskComplexity,
} from './types';

interface AgentRegistration {
  agent: Agent;
  active: boolean;
  lastUsed: Date;
  totalTasks: number;
  successRate: number;
}

/**
 * Manages agent lifecycle and task routing
 */
export class AgentManager extends EventEmitter {
  private readonly _agents = new Map<string, AgentRegistration>();
  private readonly _languageAgents = new Map<SupportedLanguage, LanguageAgent[]>();
  private readonly _specializationAgents = new Map<AgentSpecialization, TaskAgent[]>();

  /**
   * Register a new agent
   */
  async registerAgent(agent: Agent): Promise<void> {
    if (this._agents.has(agent.config.name)) {
      throw new Error(`Agent ${agent.config.name} is already registered`);
    }

    // Initialize the agent
    await agent.initialize();

    // Create registration
    const registration: AgentRegistration = {
      agent,
      active: true,
      lastUsed: new Date(),
      totalTasks: 0,
      successRate: 1.0,
    };

    // Store in main registry
    this._agents.set(agent.config.name, registration);

    // Index by capabilities
    if (this._isLanguageAgent(agent)) {
      const agents = this._languageAgents.get(agent.language) || [];
      agents.push(agent);
      this._languageAgents.set(agent.language, agents);
    }

    if (this._isTaskAgent(agent)) {
      const agents = this._specializationAgents.get(agent.specialization) || [];
      agents.push(agent);
      this._specializationAgents.set(agent.specialization, agents);
    }

    this.emit('agent:registered', agent.config);
  }

  /**
   * Execute a task using the most appropriate agent
   */
  async executeTask<T>(task: string, complexity: TaskComplexity, context?: unknown): Promise<AgentResult<T>> {
    // Detect task language if language-specific
    let taskLanguage: SupportedLanguage | undefined;

    if (complexity.languageSpecific) {
      taskLanguage = await this._detectTaskLanguage(task);
    }

    // Find best agent for task
    const agent = await this._selectAgent(task, complexity, taskLanguage);

    if (!agent) {
      throw new Error('No suitable agent found for task');
    }

    // Update agent stats
    const registration = this._agents.get(agent.config.name)!;
    registration.lastUsed = new Date();
    registration.totalTasks++;

    try {
      // Execute task
      const result = await agent.execute<T>(task, context);

      // Update success rate
      registration.successRate =
        (registration.successRate * (registration.totalTasks - 1) + (result.success ? 1 : 0)) / registration.totalTasks;

      return result;
    } catch (error) {
      // Update success rate on error
      registration.successRate = (registration.successRate * (registration.totalTasks - 1)) / registration.totalTasks;

      throw error;
    }
  }

  /**
   * Get all registered agents
   */
  getAgents(): Agent[] {
    return Array.from(this._agents.values()).map((reg) => reg.agent);
  }

  /**
   * Get agents by tier
   */
  getAgentsByTier(tier: AgentTier): Agent[] {
    return this.getAgents().filter((agent) => agent.config.tier === tier);
  }

  /**
   * Get language-specific agents
   */
  getLanguageAgents(language: SupportedLanguage): LanguageAgent[] {
    return this._languageAgents.get(language) || [];
  }

  /**
   * Get specialized agents
   */
  getSpecializedAgents(specialization: AgentSpecialization): TaskAgent[] {
    return this._specializationAgents.get(specialization) || [];
  }

  /**
   * Deactivate an agent
   */
  async deactivateAgent(name: string): Promise<void> {
    const registration = this._agents.get(name);

    if (registration) {
      registration.active = false;
      this.emit('agent:deactivated', registration.agent.config);
    }
  }

  /**
   * Reactivate an agent
   */
  async reactivateAgent(name: string): Promise<void> {
    const registration = this._agents.get(name);

    if (registration) {
      registration.active = true;
      this.emit('agent:reactivated', registration.agent.config);
    }
  }

  /**
   * Clean up all agents
   */
  async dispose(): Promise<void> {
    const disposals = Array.from(this._agents.values()).map((reg) => reg.agent.dispose());
    await Promise.all(disposals);

    this._agents.clear();
    this._languageAgents.clear();
    this._specializationAgents.clear();

    this.removeAllListeners();
  }

  /**
   * Select the most appropriate agent for a task
   */
  private async _selectAgent(
    task: string,
    complexity: TaskComplexity,
    language?: SupportedLanguage,
  ): Promise<Agent | null> {
    // Get all active agents
    const activeAgents = Array.from(this._agents.values())
      .filter((reg) => reg.active)
      .map((reg) => reg.agent);

    // Filter agents that can handle the task
    const capableAgents = (
      await Promise.all(
        activeAgents.map(async (agent) => ({
          agent,
          canHandle: await agent.canHandle(task, complexity),
          cost: await agent.estimateCost(task, complexity),
        })),
      )
    ).filter((result) => result.canHandle);

    if (capableAgents.length === 0) {
      return null;
    }

    // Score agents based on various factors
    const scoredAgents = await Promise.all(
      capableAgents.map(async (result) => {
        const registration = this._agents.get(result.agent.config.name)!;
        let score = 0;

        // Base score from success rate
        score += registration.successRate * 0.3;

        // Language matching
        if (language && this._isLanguageAgent(result.agent)) {
          score += result.agent.language === language ? 0.2 : 0;
        }

        // Specialization matching
        if (complexity.specializedKnowledge && this._isTaskAgent(result.agent)) {
          const expertise = await result.agent.getExpertiseLevel(task);
          score += expertise * 0.3;
        }

        // Cost efficiency
        const maxCost = Math.max(...capableAgents.map((a) => a.cost));
        const normalizedCost = result.cost / maxCost;
        score += (1 - normalizedCost) * 0.2;

        return {
          agent: result.agent,
          score,
        };
      }),
    );

    // Select agent with highest score
    scoredAgents.sort((a, b) => b.score - a.score);

    return scoredAgents[0].agent;
  }

  /**
   * Detect the language of a task
   */
  private async _detectTaskLanguage(task: string): Promise<SupportedLanguage> {
    // Try each language agent until we get a confident detection
    for (const agents of this._languageAgents.values()) {
      for (const agent of agents) {
        try {
          return await agent.detectLanguage(task);
        } catch {
          continue;
        }
      }
    }

    // Default to English if no detection successful
    return SupportedLanguage.English;
  }

  /**
   * Type guard for LanguageAgent
   */
  private _isLanguageAgent(agent: Agent): agent is LanguageAgent {
    return 'language' in agent && 'translate' in agent && 'detectLanguage' in agent;
  }

  /**
   * Type guard for TaskAgent
   */
  private _isTaskAgent(agent: Agent): agent is TaskAgent {
    return 'specialization' in agent && 'getExpertiseLevel' in agent && 'validateOutput' in agent;
  }
}
