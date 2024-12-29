/**
 * Agent capability level for cost-efficient routing
 */
export enum AgentTier {
  Basic = 'basic', // Simple tasks, lower cost
  Standard = 'standard', // Most common tasks
  Advanced = 'advanced', // Complex tasks requiring expertise
  Expert = 'expert', // Highly specialized tasks
}

/**
 * Supported languages for multi-lingual support
 */
export enum SupportedLanguage {
  English = 'en',
  Spanish = 'es',
  French = 'fr',
  German = 'de',
  Chinese = 'zh',
  Japanese = 'ja',
}

/**
 * Agent specialization areas
 */
export enum AgentSpecialization {
  CodeGeneration = 'code_generation',
  CodeReview = 'code_review',
  Testing = 'testing',
  Documentation = 'documentation',
  Debugging = 'debugging',
  Security = 'security',
  Performance = 'performance',
}

/**
 * Base configuration for all agents
 */
export interface AgentConfig {
  name: string;
  description: string;
  tier: AgentTier;
  specializations: AgentSpecialization[];
  supportedLanguages: SupportedLanguage[];
  maxTokens: number;
  costPerToken: number;
}

/**
 * Task complexity metrics for routing
 */
export interface TaskComplexity {
  tokenCount: number;
  specializedKnowledge: boolean;
  securitySensitive: boolean;
  languageSpecific: boolean;
  expectedDuration: number;
}

/**
 * Agent execution result
 */
export interface AgentResult<T = unknown> {
  success: boolean;
  data: T;
  error?: Error;
  metrics: {
    tokensUsed: number;
    executionTime: number;
    cost: number;
  };
}

/**
 * Base interface for all agents
 */
export interface Agent {
  readonly config: AgentConfig;

  /**
   * Initialize the agent
   */
  initialize(): Promise<void>;

  /**
   * Execute a task
   */
  execute<T>(task: string, context?: unknown): Promise<AgentResult<T>>;

  /**
   * Check if agent can handle a task
   */
  canHandle(task: string, complexity: TaskComplexity): Promise<boolean>;

  /**
   * Estimate task cost
   */
  estimateCost(task: string, complexity: TaskComplexity): Promise<number>;

  /**
   * Clean up agent resources
   */
  dispose(): Promise<void>;
}

/**
 * Language-specific agent interface
 */
export interface LanguageAgent extends Agent {
  readonly language: SupportedLanguage;

  /**
   * Translate content to agent's language
   */
  translate(content: string, sourceLanguage: SupportedLanguage): Promise<string>;

  /**
   * Detect content language
   */
  detectLanguage(content: string): Promise<SupportedLanguage>;
}

/**
 * Specialized task agent interface
 */
export interface TaskAgent extends Agent {
  readonly specialization: AgentSpecialization;

  /**
   * Get agent expertise level for a task
   */
  getExpertiseLevel(task: string): Promise<number>;

  /**
   * Validate task output
   */
  validateOutput<T>(result: T): Promise<boolean>;
}