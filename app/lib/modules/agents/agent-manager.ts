import { EventEmitter } from 'events';
import { SupportedLanguage } from './types';
import type { Agent, AgentResult, LanguageAgent, TaskAgent, TaskComplexity } from './types';
import { AgentTier, AgentSpecialization } from './types';

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
  private readonly _languageAgents = new Map<SupportedLanguage, Set<string>>();
  private readonly _specializationAgents = new Map<AgentSpecialization, Set<string>>();

  /**
   * Register a new agent
   */
  constructor() {
    super(); // Call EventEmitter's constructor
    // Register default agents
    this._registerDefaultAgents().catch(console.error);
  }

  private async _registerDefaultAgents(): Promise<void> {
    // Create language agent implementation
    const languageAgent: LanguageAgent = {
      config: {
        name: 'english-language',
        description: 'Handles English language tasks',
        tier: AgentTier.Standard,
        specializations: [],
        supportedLanguages: [SupportedLanguage.English],
        maxTokens: 8000,
        costPerToken: 0.001,
      },
      language: SupportedLanguage.English,
      initialize: async () => {
        await this._initializeLanguageModel();
      },
      execute: async (task: string) => ({
        success: true,
        data: { actions: [] },
        metrics: {
          tokensUsed: Math.ceil(task.length / 4),
          executionTime: 0,
          cost: 0,
        },
      }),
      canHandle: async (task: string, complexity: TaskComplexity) => {
        return complexity.languageSpecific;
      },
      estimateCost: async () => 0,
      dispose: async () => {
        await this._cleanupLanguageModel();
      },
      translate: async (content: string) => content,
      detectLanguage: async () => SupportedLanguage.English,
    };

    // Register language agent
    await this.registerAgent(languageAgent);

    // Register a code generation agent
    await this.registerAgent({
      config: {
        name: 'code-generation',
        description: 'Generates and modifies code',
        tier: AgentTier.Standard,
        specializations: [AgentSpecialization.CodeGeneration],
        supportedLanguages: [SupportedLanguage.English],
        maxTokens: 8000,
        costPerToken: 0.001,
      },
      initialize: async () => {
        await this._initializeCodeGeneration();
      },
      execute: this.executeTask.bind(this),
      canHandle: async (task: string, complexity: TaskComplexity) => {
        return complexity.specializedKnowledge && task.includes('code');
      },
      estimateCost: async () => 0,
      dispose: async () => {
        await this._cleanupCodeGeneration();
      },
    });

    // Register a testing agent
    await this.registerAgent({
      config: {
        name: 'testing',
        description: 'Generates and runs tests',
        tier: AgentTier.Standard,
        specializations: [AgentSpecialization.Testing],
        supportedLanguages: [SupportedLanguage.English],
        maxTokens: 8000,
        costPerToken: 0.001,
      },
      initialize: async () => {
        await this._initializeTestingFramework();
      },
      execute: this.executeTask.bind(this),
      canHandle: async (task: string, complexity: TaskComplexity) => {
        return complexity.specializedKnowledge && task.includes('test');
      },
      estimateCost: async () => 0,
      dispose: async () => {
        await this._cleanupTestingFramework();
      },
    });
  }

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
      const agents = this._languageAgents.get((agent as LanguageAgent).language) || new Set();
      agents.add(agent.config.name);
      this._languageAgents.set((agent as LanguageAgent).language, agents);
    }

    if (this._isTaskAgent(agent)) {
      const agents = this._specializationAgents.get((agent as TaskAgent).specialization) || new Set();
      agents.add(agent.config.name);
      this._specializationAgents.set((agent as TaskAgent).specialization, agents);
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
    return Array.from(this._languageAgents.get(language) || [])
      .map((name) => this._agents.get(name)!.agent)
      .filter(this._isLanguageAgent) as LanguageAgent[];
  }

  /**
   * Get specialized agents
   */
  getSpecializedAgents(specialization: AgentSpecialization): TaskAgent[] {
    return Array.from(this._specializationAgents.get(specialization) || [])
      .map((name) => this._agents.get(name)!.agent)
      .filter(this._isTaskAgent) as TaskAgent[];
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
    // Clean up agent resources and connections
    await Promise.all(Array.from(this._agents.values()).map((reg) => reg.agent.dispose()));
    this.removeAllListeners();
  }

  async initialize(): Promise<void> {
    // Initialize agent resources and connections
    await Promise.all(Array.from(this._agents.values()).map((reg) => reg.agent.initialize()));
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

    // If no active agents, return null
    if (activeAgents.length === 0) {
      return null;
    }

    // Try to find capable agents
    const agentResults = await Promise.all(
      activeAgents.map(async (agent) => ({
        agent,
        canHandle: await agent.canHandle(task, complexity),
        cost: await agent.estimateCost(task, complexity),
      })),
    );

    // First try agents that explicitly say they can handle the task
    const capableAgents = agentResults.filter((result) => result.canHandle);

    // If no capable agents found, fall back to language agent or first available agent
    if (capableAgents.length === 0) {
      // Try to find a language agent first
      const languageAgent = activeAgents.find(
        (agent) => this._isLanguageAgent(agent) && (!language || (agent as LanguageAgent).language === language),
      );

      if (languageAgent) {
        return languageAgent;
      }

      // Fall back to first available agent
      return activeAgents[0];
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
          score += (result.agent as LanguageAgent).language === language ? 0.2 : 0;
        }

        // Specialization matching
        if (complexity.specializedKnowledge && this._isTaskAgent(result.agent)) {
          const expertise = await (result.agent as TaskAgent).getExpertiseLevel(task);
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
      for (const name of agents) {
        const agent = this._agents.get(name)!.agent;

        try {
          return await (agent as LanguageAgent).detectLanguage(task);
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

  private async _initializeLanguageModel(): Promise<void> {
    // Implementation will be added later
  }

  private async _cleanupLanguageModel(): Promise<void> {
    // Implementation will be added later
  }

  private async _initializeCodeGeneration(): Promise<void> {
    // Implementation will be added later
  }

  private async _cleanupCodeGeneration(): Promise<void> {
    // Implementation will be added later
  }

  private async _initializeTestingFramework(): Promise<void> {
    // Implementation will be added later
  }

  private async _cleanupTestingFramework(): Promise<void> {
    // Implementation will be added later
  }
}
