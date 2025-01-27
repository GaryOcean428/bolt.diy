import type { AgentOutput } from '~/lib/modules/swarm/AgentOutput';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ChatContext {
  previousMessages?: ChatMessage[];
  specialization?: string[];
}

export interface ChatResponse {
  message: ChatMessage;
  output?: AgentOutput[];
  agent?: string;
}

export type AgentResponse = ChatResponse;
