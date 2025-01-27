export enum AgentTier {
  Basic = 'basic',
  Standard = 'standard',
  Advanced = 'advanced',
  Expert = 'expert',
}

export enum SupportedLanguage {
  English = 'en',
  Spanish = 'es',
  French = 'fr',
  German = 'de',
  Chinese = 'zh',
  Japanese = 'ja',
}

export enum AgentSpecialization {
  Architecture = 'architecture',
  CodeGeneration = 'code-generation',
  CodeReview = 'code-review',
  Testing = 'testing',
  Documentation = 'documentation',
  Security = 'security',
  Performance = 'performance',
  UIDesign = 'ui-design',
  Research = 'research',
  Memory = 'memory',
  Language = 'language',
  Review = 'review',
}

export interface AgentConfig {
  name: string;
  description: string;
  tier: AgentTier;
  specializations: AgentSpecialization[];
  supportedLanguages: SupportedLanguage[];
  maxTokens: number;
  costPerToken: number;
}

export interface TaskComplexity {
  tokenCount: number;
  specializedKnowledge: boolean;
  securitySensitive: boolean;
  languageSpecific: boolean;
  expectedDuration: number;
}

export interface TaskContext {
  previousTasks?: string[];
  requirements?: {
    specialization?: string[];
  };
  metadata?: Record<string, unknown>;
  data?: Record<string, unknown>;
  env?: Record<string, unknown>;
}

export interface CodeAction {
  type: 'file' | 'shell';
  content: string;
  filePath?: string;
}

export interface AgentResult<T = unknown> {
  success: boolean;
  data: T | { actions: CodeAction[] };
  error?: Error;
  metrics: {
    tokensUsed: number;
    executionTime: number;
    cost: number;
  };
}

export interface Agent {
  readonly config: AgentConfig;
  initialize(): Promise<void>;
  execute<T>(task: string, context?: unknown): Promise<AgentResult<T>>;
  canHandle(task: string, complexity: TaskComplexity): Promise<boolean>;
  estimateCost(task: string, complexity: TaskComplexity): Promise<number>;
  dispose(): Promise<void>;
}

export interface LanguageAgent extends Agent {
  readonly language: SupportedLanguage;
  translate(content: string, sourceLanguage: SupportedLanguage): Promise<string>;
  detectLanguage(content: string): Promise<SupportedLanguage>;
}
