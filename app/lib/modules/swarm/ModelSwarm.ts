import { type ModelProvider } from './ModelProvider';
import { type SwarmWebSocket } from './SwarmWebSocket';
import { swarmLogger, LogLevel } from '~/lib/modules/logging/SwarmLogger';
import { type ModelResponse, type ModelRequest } from '~/types/providers';

interface SwarmMessage {
  type: 'status' | 'error' | 'metrics';
  agentId: string;
  data: Record<string, unknown>;
}

export interface AgentState {
  id: string;
  provider: {
    id: string;
    name: string;
  };
  specialization: string[];
  isHealthy: boolean;
  lastHealthCheck: number;
  performance: {
    responseTime: number;
    tokenUsage: number;
    errorRate: number;
    successRate: number;
    costPerRequest: number;
  };
  cooldownUntil?: number;
}

export interface SwarmMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalTokenUsage: number;
  totalCost: number;
  agentStates: AgentState[];
}

export interface SwarmOptions {
  cooldownDuration?: number;
  maxRetries?: number;
  healthCheckInterval?: number;
  performanceWindow?: number;
}

export class ModelSwarm {
  private static _instance: ModelSwarm;
  private _agents: Map<string, AgentState> = new Map();
  private readonly _cooldownDuration: number;
  private readonly _maxRetries: number;
  private readonly _healthCheckInterval: number;
  private readonly _performanceWindow: number;
  private readonly _modelProvider: ModelProvider;
  private readonly _swarmWs: SwarmWebSocket;
  private _totalRequests = 0;
  private _errorMetrics = {
    totalErrors: 0,
    errorsByType: new Map<string, number>(),
    lastError: null as Error | null,
    errorRate: 0,
  };

  constructor(modelProvider: ModelProvider, swarmWs: SwarmWebSocket, options: SwarmOptions = {}) {
    this._modelProvider = modelProvider;
    this._swarmWs = swarmWs;
    this._cooldownDuration = options.cooldownDuration || 60000;
    this._maxRetries = options.maxRetries || 3;
    this._healthCheckInterval = options.healthCheckInterval || 30000;
    this._performanceWindow = options.performanceWindow || 3600000;
  }

  private async _initializeAgents(): Promise<void> {
    try {
      const response = await fetch('/api/swarm/agents');

      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }

      const agents = (await response.json()) as AgentState[];
      agents.forEach((agent) => {
        this._agents.set(agent.id, {
          ...agent,
          isHealthy: true,
          lastHealthCheck: Date.now(),
          performance: {
            responseTime: 0,
            tokenUsage: 0,
            errorRate: 0,
            successRate: 0,
            costPerRequest: 0,
          },
        });
      });

      this._startHealthCheck();
    } catch (error) {
      swarmLogger.log(LogLevel.ERROR, 'ModelSwarm', 'Failed to initialize agents', { error });
      throw error;
    }
  }

  private _startHealthCheck(): void {
    setInterval(async () => {
      const now = Date.now();
      const healthCheckPromises = Array.from(this._agents.values()).map(async (agent) => {
        try {
          const response = await fetch(`/api/swarm/health/${agent.id}`);
          const isHealthy = response.ok;

          this._agents.set(agent.id, {
            ...agent,
            isHealthy,
            lastHealthCheck: now,
          });

          swarmLogger.log(
            isHealthy ? LogLevel.INFO : LogLevel.WARN,
            'ModelSwarm',
            `Health check ${isHealthy ? 'passed' : 'failed'} for agent ${agent.id}`,
          );

          this._sendMessage({
            type: 'status',
            agentId: agent.id,
            data: {
              isHealthy,
              lastCheck: now,
            },
          });
        } catch (error) {
          swarmLogger.log(LogLevel.ERROR, 'ModelSwarm', 'Health check failed', {
            error,
            agentId: agent.id,
          });
        }
      });

      await Promise.allSettled(healthCheckPromises);
    }, this._healthCheckInterval);
  }

  private _selectAgent(specialization?: string[]): AgentState {
    const now = Date.now();
    const availableAgents = Array.from(this._agents.values()).filter(
      (agent) => agent.isHealthy && (!agent.cooldownUntil || agent.cooldownUntil < now),
    );

    if (availableAgents.length === 0) {
      throw new Error('No healthy agents available');
    }

    let candidates = availableAgents;

    // Filter by specialization if specified
    if (specialization && specialization.length > 0) {
      candidates = candidates.filter((agent) => specialization.some((s) => agent.specialization.includes(s)));

      if (candidates.length === 0) {
        candidates = availableAgents;
      }
    }

    // Sort by performance metrics
    candidates.sort((a, b) => {
      const aScore =
        (1 - a.performance.errorRate) * 0.4 +
        (1 - a.performance.responseTime / 5000) * 0.3 +
        (1 - a.performance.costPerRequest / 0.01) * 0.3;

      const bScore =
        (1 - b.performance.errorRate) * 0.4 +
        (1 - b.performance.responseTime / 5000) * 0.3 +
        (1 - b.performance.costPerRequest / 0.01) * 0.3;

      return bScore - aScore;
    });

    return candidates[0];
  }

  async sendRequest(request: ModelRequest, specialization?: string[]): Promise<ModelResponse> {
    let lastError: Error | null = null;
    let attempts = 0;

    while (attempts < this._maxRetries) {
      try {
        const agent = this._selectAgent(specialization);
        const startTime = Date.now();

        const response = await this._modelProvider.sendRequest(agent.provider.id, request);
        const duration = Date.now() - startTime;

        this._processModelResponse(agent, response, duration);
        this._totalRequests++;

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        attempts++;

        if (attempts < this._maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempts - 1) * 1000));
        }
      }
    }

    this._handleError(lastError);
    throw lastError;
  }

  private _handleError(error: Error | null, context?: Record<string, unknown>): void {
    if (!error) {
      return;
    }

    const errorContext = {
      ...context,
      timestamp: Date.now(),
      errorType: error.name,
      errorStack: error.stack,
    };

    swarmLogger.log(LogLevel.ERROR, 'ModelSwarm', 'Request failed', {
      error,
      context: errorContext,
    });

    // Track error metrics
    this._updateErrorMetrics(error);

    // Update agent metrics if it's a provider error
    if (error.name === 'ProviderError' && (error as any).agentId) {
      const agent = this._agents.get((error as any).agentId);

      if (agent) {
        const updatedAgent = {
          ...agent,
          performance: {
            ...agent.performance,
            errorRate:
              (agent.performance.errorRate * agent.performance.tokenUsage + 1) / (agent.performance.tokenUsage + 1),
          },
          cooldownUntil: Date.now() + this._cooldownDuration,
        };

        this._agents.set(agent.id, updatedAgent);

        this._sendMessage({
          type: 'error',
          agentId: agent.id,
          data: {
            error: error.message,
            cooldownUntil: updatedAgent.cooldownUntil,
          },
        });
      }
    }
  }

  private _updateErrorMetrics(error: Error): void {
    this._errorMetrics.totalErrors++;
    this._errorMetrics.lastError = error;
    this._errorMetrics.errorRate = this._errorMetrics.totalErrors / this._totalRequests;

    const errorType = error.constructor.name;
    const currentCount = this._errorMetrics.errorsByType.get(errorType) || 0;
    this._errorMetrics.errorsByType.set(errorType, currentCount + 1);
  }

  private _processModelResponse(agent: AgentState, response: ModelResponse, duration: number): void {
    const { usage } = response;
    const costPerToken = (usage as any)?.costPerToken || 0; // TODO: Update usage type to include costPerToken
    const tokenCount = usage?.totalTokens || 0;

    // Update agent performance metrics
    agent.performance.responseTime = duration;
    agent.performance.tokenUsage = tokenCount;
    agent.performance.costPerRequest = costPerToken * tokenCount;
    agent.performance.successRate = agent.performance.successRate * 0.9 + 1 * 0.1;
    agent.lastHealthCheck = Date.now();
    agent.isHealthy = true;

    this._agents.set(agent.id, agent);

    // Send metrics update via WebSocket
    this._sendMessage({
      type: 'metrics',
      agentId: agent.id,
      data: {
        performance: agent.performance,
        timestamp: Date.now(),
      },
    });

    // Log metrics
    swarmLogger.log(LogLevel.INFO, 'ModelSwarm', 'Request completed', {
      agentId: agent.id,
      duration,
      tokenUsage: tokenCount,
      cost: costPerToken * tokenCount,
    });
  }

  private _sendMessage(message: SwarmMessage): void {
    try {
      this._swarmWs.sendMessage(JSON.stringify(message));
    } catch (error) {
      swarmLogger.log(LogLevel.ERROR, 'ModelSwarm', 'Failed to send WebSocket message', {
        error,
        message,
      });
    }
  }
}
