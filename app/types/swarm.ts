export interface OutputMetadata {
  confidence?: number;
  reasoning?: string;
  source?: string;
  context?: string;
  type?: string;
  language?: string;
  tokens?: number;
  path?: string;
  command?: string;
  args?: string[];
  requires_review?: boolean;
  suggested_next_steps?: string[];
}

export interface AgentOutputMetadata {
  timestamp?: number;
  source?: string;
  context?: Record<string, unknown>;
  agent?: string;
}
