import { EventEmitter } from 'node:events';
import { AgentCommunicationBus } from './communication/agent-protocol';
import { ArchitectAgent, CodeReviewAgent, SecurityAgent } from './specialized-agents';
import { TestingAgent, DocumentationAgent, ResearchAgent, MemoryAgent } from './specialized-agents-extended';
import type { Agent, AgentConfig, AgentResult, TaskComplexity } from './types';
import { AgentTier, AgentSpecialization, SupportedLanguage } from './types';

export type AgentType = 'specialized' | 'extended';
export type SpecializedAgentType = 'architect' | 'code-review' | 'security';
export type ExtendedAgentType = 'testing' | 'documentation' | 'research' | 'memory';

export interface TaskContext {
  messages?: any[];
  files?: any;
  env?: Record<string, any>;
}

export class AgentManager extends EventEmitter {
  private _agents: Map<string, Agent> = new Map();
  private _deactivatedAgents: Map<string, Agent> = new Map();
  private _communicationBus: AgentCommunicationBus;

  constructor() {
    super();
    this._communicationBus = AgentCommunicationBus.getInstance();
    this._setupProtocolHandlers();
    this._initializeDefaultAgents();
  }

  private _setupProtocolHandlers(): void {
    this._communicationBus.on('message', (message) => {
      this.emit('message', message);
    });

    this._communicationBus.on('error', (error: Error) => {
      this.emit('error', error);
    });
  }

  private async _initializeDefaultAgents(): Promise<void> {
    // Initialize language agent
    const languageAgent = this.createAgent(
      'specialized',
      {
        name: 'english-language',
        description: 'Handles language-specific tasks',
        tier: AgentTier.Standard,
        specializations: [AgentSpecialization.CodeGeneration],
        supportedLanguages: [SupportedLanguage.English],
        maxTokens: 4096,
        costPerToken: 0.001,
      },
      'architect',
    );

    // Initialize code generation agent
    const codeGenAgent = this.createAgent(
      'specialized',
      {
        name: 'code-generation',
        description: 'Handles code generation tasks',
        tier: AgentTier.Expert,
        specializations: [AgentSpecialization.CodeGeneration],
        supportedLanguages: [SupportedLanguage.English],
        maxTokens: 8192,
        costPerToken: 0.002,
      },
      'architect',
    );

    // Initialize testing agent
    const testingAgent = this.createAgent(
      'extended',
      {
        name: 'testing',
        description: 'Handles test generation and execution',
        tier: AgentTier.Expert,
        specializations: [AgentSpecialization.Testing],
        supportedLanguages: [SupportedLanguage.English],
        maxTokens: 8192,
        costPerToken: 0.002,
      },
      'testing',
    );

    await Promise.all([languageAgent.initialize(), codeGenAgent.initialize(), testingAgent.initialize()]);
  }

  createAgent(type: AgentType, config: AgentConfig, specializedType?: SpecializedAgentType | ExtendedAgentType): Agent {
    let agent: Agent;

    if (type === 'specialized') {
      if (!specializedType) {
        throw new Error('Specialized agent type must be specified');
      }

      switch (specializedType) {
        case 'architect':
          agent = new ArchitectAgent();
          break;
        case 'code-review':
          agent = new CodeReviewAgent();
          break;
        case 'security':
          agent = new SecurityAgent();
          break;
        default:
          throw new Error(`Unknown specialized agent type: ${specializedType}`);
      }
    } else if (type === 'extended') {
      if (!specializedType) {
        throw new Error('Extended agent type must be specified');
      }

      switch (specializedType) {
        case 'testing':
          agent = new TestingAgent();
          break;
        case 'documentation':
          agent = new DocumentationAgent();
          break;
        case 'research':
          agent = new ResearchAgent();
          break;
        case 'memory':
          agent = new MemoryAgent();
          break;
        default:
          throw new Error(`Unknown extended agent type: ${specializedType}`);
      }
    } else {
      throw new Error(`Unknown agent type: ${type}`);
    }

    this._agents.set(config.name, agent);

    return agent;
  }

  getAgents(): Agent[] {
    return Array.from(this._agents.values());
  }

  getAgent(name: string): Agent | undefined {
    return this._agents.get(name);
  }

  async executeTask(task: string, complexity: TaskComplexity, context?: TaskContext): Promise<AgentResult> {
    const agents = this.getAgents();
    const suitableAgents = await Promise.all(
      agents.map(async (agent) => ({
        agent,
        canHandle: await agent.canHandle(task, complexity),
        cost: await agent.estimateCost(task, complexity),
      })),
    );

    const bestAgent = suitableAgents.filter((a) => a.canHandle).sort((a, b) => a.cost - b.cost)[0]?.agent;

    if (!bestAgent) {
      throw new Error('No suitable agent found for the task');
    }

    return bestAgent.execute(task, context);
  }

  async deactivateAgent(name: string): Promise<void> {
    const agent = this._agents.get(name);

    if (agent) {
      await agent.dispose();
      this._agents.delete(name);
      this._deactivatedAgents.set(name, agent);
    }
  }

  async reactivateAgent(name: string): Promise<void> {
    const agent = this._deactivatedAgents.get(name);

    if (agent) {
      await agent.initialize();
      this._deactivatedAgents.delete(name);
      this._agents.set(name, agent);
    }
  }

  removeAgent(name: string): void {
    const agent = this._agents.get(name);

    if (agent) {
      agent.dispose();
      this._agents.delete(name);
    }
  }

  async cleanup(): Promise<void> {
    for (const agent of this._agents.values()) {
      await agent.dispose();
    }
    this._agents.clear();
    this._deactivatedAgents.clear();
    this.removeAllListeners();
  }
}
