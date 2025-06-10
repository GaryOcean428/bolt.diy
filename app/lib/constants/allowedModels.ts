import type { ModelInfo } from '~/lib/modules/llm/types';

export interface AllowedModel extends ModelInfo {
  apiModelName: string;
  contextWindow: string;
  maxOutput: string;
  releaseDate: string;
  keyStrengths: string[];
  modelCardLink: string;
  docsLink: string;
}

// Default model as specified in models.md
export const DEFAULT_MODEL = 'granite3.1-dense:2b';
export const DEFAULT_PROVIDER = 'IBM/Ollama';

export const ALLOWED_MODELS: AllowedModel[] = [
  {
    name: 'Granite 3.1 Dense 2B',
    apiModelName: DEFAULT_MODEL,
    provider: DEFAULT_PROVIDER,
    parameters: '2.53B',
    contextWindow: '8K',
    maxOutput: '4K',
    releaseDate: '2024-12-18',
    keyStrengths: ['Tool-based tasks', 'RAG', 'Code generation', 'Multilingual support'],
    modelCardLink: 'https://huggingface.co/ibm-granite/granite-3.1-2b-instruct',
    docsLink: 'https://www.ibm.com/granite/docs/',
    capabilities: ['text-generation', 'code-generation', 'tool-use'],
    maxTokens: 8192,
    type: 'text-generation',
  },

  // Add other models from models.md...
];

export function isAllowedModel(modelName: string): boolean {
  return ALLOWED_MODELS.some((m) => m.apiModelName === modelName);
}

export function getModelByName(modelName: string): AllowedModel | undefined {
  return ALLOWED_MODELS.find((m) => m.apiModelName === modelName);
}

export function getDefaultModel(): AllowedModel {
  return ALLOWED_MODELS[0];
}
