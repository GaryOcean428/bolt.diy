import { type LanguageModelV1 } from 'ai';
import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';

export class DefaultProvider extends BaseProvider {
  name = 'Default';
  getApiKeyLink = '';

  config = {
    apiTokenKey: '',
  };

  staticModels: ModelInfo[] = [
    {
      name: 'default',
      label: 'Default',
      provider: 'Default',
      maxTokens: 4000,
      maxTokenAllowed: 4000,
      type: 'text-generation',
      capabilities: ['text-generation'],
    },
  ];

  getModelInstance(): LanguageModelV1 {
    return {
      chat: async ({ messages }: { messages: Array<{ role: string; content: string }> }) => ({
        role: 'assistant',
        content: messages[messages.length - 1].content,
      }),
    } as unknown as LanguageModelV1;
  }
}
