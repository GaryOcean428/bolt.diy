import type { AgentOutput } from './AgentOutput';
import { ModelProvider } from './ModelProvider';
import { ModelSwarm } from './ModelSwarm';
import { SwarmWebSocket } from './SwarmWebSocket';
import { swarmLogger, LogLevel } from '~/lib/modules/logging/SwarmLogger';
import type { ModelRequest } from '~/types/providers';

type MessageRole = 'user' | 'assistant' | 'system';

interface ChatContext {
  previousMessages: { role: MessageRole; content: string }[];
  specialization?: string[];
  uploadedFiles?: File[];
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export class ChatAPI {
  private static _instance: ChatAPI | null = null;
  private _modelSwarm: ModelSwarm;

  private constructor() {
    this._modelSwarm = new ModelSwarm(ModelProvider.getInstance(), SwarmWebSocket.getInstance());
  }

  static getInstance(): ChatAPI {
    if (!ChatAPI._instance) {
      ChatAPI._instance = new ChatAPI();
    }

    return ChatAPI._instance;
  }

  async sendMessage(message: string, context: ChatContext = { previousMessages: [] }): Promise<AgentOutput> {
    try {
      const messages: ChatMessage[] = [...context.previousMessages, { role: 'user', content: message }];

      const request: ModelRequest = {
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      };

      const response = await this._modelSwarm.sendRequest(request, context.specialization);

      if (!response || !response.output || typeof response.output !== 'string') {
        throw new Error('Invalid response format');
      }

      return {
        type: 'text',
        content: response.output,
      } as AgentOutput;
    } catch (error) {
      swarmLogger.log(LogLevel.ERROR, 'ChatAPI', 'Failed to send message', {
        error,
        message,
        context,
      });
      throw error;
    }
  }

  async *streamMessage(
    message: string,
    onUpdate: (content: string) => void,
    context: ChatContext = { previousMessages: [] },
  ): AsyncGenerator<AgentOutput> {
    try {
      const messages: ChatMessage[] = [...context.previousMessages, { role: 'user', content: message }];

      const request: ModelRequest = {
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: true,
      };

      const response = await this._modelSwarm.sendRequest(request, context.specialization);

      if (!response || !response.output || typeof response.output !== 'string') {
        throw new Error('Invalid response format');
      }

      yield {
        type: 'text',
        content: response.output,
      } as AgentOutput;
    } catch (error) {
      swarmLogger.log(LogLevel.ERROR, 'ChatAPI', 'Failed to stream message', {
        error,
        message,
        context,
      });
      throw error;
    }
  }
}

export const chatAPI = ChatAPI.getInstance();
