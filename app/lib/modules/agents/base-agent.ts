import type { Agent, AgentConfig, AgentResult, TaskComplexity } from './types';

/**
 * Base implementation of the Agent interface
 */
export abstract class BaseAgent implements Agent {
  protected _initialized = false;

  constructor(protected readonly _config: AgentConfig) {}

  get config(): AgentConfig {
    return this._config;
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    await this._initializeImpl();
    this._initialized = true;
  }

  /**
   * Execute a task
   */
  async execute<T>(task: string, context?: unknown): Promise<AgentResult<T>> {
    if (!this._initialized) {
      throw new Error('Agent must be initialized before executing tasks');
    }

    const startTime = performance.now();
    let tokensUsed = 0;

    try {
      // Execute the task implementation
      const result = await this._executeImpl<T>(task, context);
      tokensUsed = this._calculateTokens(task, result.data);

      return {
        ...result,
        metrics: {
          tokensUsed,
          executionTime: performance.now() - startTime,
          cost: tokensUsed * this._config.costPerToken,
        },
      };
    } catch (error) {
      return {
        success: false,
        data: null as T,
        error: error instanceof Error ? error : new Error(String(error)),
        metrics: {
          tokensUsed,
          executionTime: performance.now() - startTime,
          cost: tokensUsed * this._config.costPerToken,
        },
      };
    }
  }

  /**
   * Check if agent can handle a task
   */
  async canHandle(task: string, complexity: TaskComplexity): Promise<boolean> {
    // Check token limit
    const estimatedTokens = this._estimateTokens(task);

    if (estimatedTokens > this._config.maxTokens) {
      return false;
    }

    return this._canHandleImpl(task, complexity);
  }

  /**
   * Estimate task cost
   */
  async estimateCost(task: string, complexity: TaskComplexity): Promise<number> {
    const estimatedTokens = this._estimateTokens(task);
    const baseTokenCost = estimatedTokens * this._config.costPerToken;

    // Apply complexity multipliers
    let costMultiplier = 1.0;

    if (complexity.specializedKnowledge) {
      costMultiplier *= 1.2; // 20% increase for specialized tasks
    }

    if (complexity.securitySensitive) {
      costMultiplier *= 1.5; // 50% increase for security-critical tasks
    }

    // Add time-based cost
    const timeBasedCost = complexity.expectedDuration * 0.1; // $0.10 per minute

    return baseTokenCost * costMultiplier + timeBasedCost;
  }

  /**
   * Clean up agent resources
   */
  async dispose(): Promise<void> {
    if (!this._initialized) {
      return;
    }

    await this._disposeImpl();
    this._initialized = false;
  }

  /**
   * Implementation specific initialization
   */
  protected abstract _initializeImpl(): Promise<void>;

  /**
   * Implementation specific task execution
   */
  protected abstract _executeImpl<T>(task: string, context?: unknown): Promise<AgentResult<T>>;

  /**
   * Implementation specific capability check
   */
  protected abstract _canHandleImpl(task: string, complexity: TaskComplexity): Promise<boolean>;

  /**
   * Implementation specific cleanup
   */
  protected abstract _disposeImpl(): Promise<void>;

  /**
   * Estimate tokens for a task
   */
  protected _estimateTokens(text: string): number {
    // Simple estimation: ~4 chars per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate actual tokens used
   */
  protected _calculateTokens(input: string, output: unknown): number {
    const outputText = typeof output === 'string' ? output : JSON.stringify(output);
    return this._estimateTokens(input) + this._estimateTokens(outputText);
  }

  protected async _getSystemPrompt(): Promise<string> {
    if (!this.config.specializations?.length) {
      return '';
    }

    const { SYSTEM_PROMPTS } = await import('./prompts/system-prompts');

    return SYSTEM_PROMPTS[this.config.specializations[0]] || '';
  }

  protected async _buildPrompt(task: string, context?: unknown): Promise<string> {
    const systemPrompt = await this._getSystemPrompt();
    const contextStr = context ? `\nContext:\n${JSON.stringify(context, null, 2)}` : '';

    return `${systemPrompt}\n\nTask:\n${task}${contextStr}`;
  }
}
