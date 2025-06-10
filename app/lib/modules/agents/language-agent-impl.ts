import { BaseAgent } from './base-agent';
import { SupportedLanguage } from './types';
import type { AgentConfig, AgentResult, LanguageAgent, TaskComplexity, CodeAction } from './types';

/**
 * Language-specific agent implementation
 */
export class LanguageAgentImpl extends BaseAgent implements LanguageAgent {
  private readonly _language: SupportedLanguage;
  private _languageModel: any; // Replace with actual language model type

  constructor(config: AgentConfig, language: SupportedLanguage) {
    super(config);
    this._language = language;
    this._languageModel = null;
  }

  private _extractCodeActions(result: any): CodeAction[] {
    const actions: CodeAction[] = [];

    /*
     * Extract code blocks and file paths from the result
     * This is a basic implementation - enhance based on your LLM's output format
     */
    if (typeof result === 'string') {
      const fileMatches = result.match(/```[\s\S]*?```/g) || [];

      for (const match of fileMatches) {
        const filePath = match.match(/```\w+\s+([^\n]+)/)?.[1];

        if (filePath) {
          actions.push({
            type: 'file',
            filePath,
            content: match.replace(/```\w+\s+[^\n]+\n([\s\S]*?)```/, '$1').trim(),
          });
        }
      }
    }

    return actions;
  }

  get language(): SupportedLanguage {
    return this._language;
  }

  /**
   * Translate content to agent's language
   */
  async translate(content: string, sourceLanguage: SupportedLanguage): Promise<string> {
    if (!this._initialized) {
      throw new Error('Agent must be initialized before translating');
    }

    // Skip translation if languages match
    if (sourceLanguage === this._language) {
      return content;
    }

    try {
      // Use language model to translate
      const prompt = `Translate the following text from ${sourceLanguage} to ${this._language}:\n\n${content}`;
      const result = await this._languageModel.complete(prompt);

      return result.text;
    } catch (error) {
      throw new Error(`Translation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Detect content language
   */
  async detectLanguage(content: string): Promise<SupportedLanguage> {
    if (!this._initialized) {
      throw new Error('Agent must be initialized before detecting language');
    }

    try {
      // Use language model to detect language
      const prompt = `Detect the language of the following text and respond with the language code (e.g., 'en', 'es', 'fr'):\n\n${content}`;
      const result = await this._languageModel.complete(prompt);
      const detectedCode = result.text.trim().toLowerCase();

      // Validate detected language code
      if (this._isValidLanguageCode(detectedCode)) {
        return detectedCode as SupportedLanguage;
      }

      throw new Error(`Invalid language code detected: ${detectedCode}`);
    } catch (error) {
      throw new Error(`Language detection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Implementation specific initialization
   */
  protected async _initializeImpl(): Promise<void> {
    try {
      // Initialize language model
      this._languageModel = await this._createLanguageModel();
    } catch (error) {
      throw new Error(`Failed to initialize language model: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Implementation specific task execution
   */
  protected async _executeImpl<T>(_task: string, _context?: unknown): Promise<AgentResult<T>> {
    if (!this._languageModel) {
      throw new Error('Language model not initialized');
    }

    try {
      const prompt = await this._buildPrompt(_task);
      const startTime = Date.now();

      const result = await this._languageModel.complete(prompt);
      const executionTime = Date.now() - startTime;

      const actions = this._extractCodeActions(result.text);
      const tokensUsed = this._calculateTokens(prompt, result.text);
      const cost = tokensUsed * this.config.costPerToken;

      return {
        success: true,
        data: { actions } as T,
        metrics: {
          tokensUsed,
          executionTime,
          cost,
        },
      };
    } catch (error) {
      console.error('Error executing task:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        data: { actions: [] } as T,
        metrics: {
          tokensUsed: 0,
          executionTime: 0,
          cost: 0,
        },
      };
    }
  }

  /**
   * Implementation specific capability check
   */
  protected async _canHandleImpl(task: string, complexity: TaskComplexity): Promise<boolean> {
    // Check if task language matches agent's language

    if (complexity.languageSpecific) {
      try {
        const taskLanguage = await this.detectLanguage(task);

        if (taskLanguage !== this._language) {
          return false;
        }
      } catch {
        return false;
      }
    }

    return true;
  }

  /**
   * Implementation specific cleanup
   */
  protected async _disposeImpl(): Promise<void> {
    if (this._languageModel) {
      await this._languageModel.dispose();
      this._languageModel = null;
    }
  }

  /**
   * Create language model instance
   */
  private async _createLanguageModel(): Promise<any> {
    /**
     * Initialize appropriate language model for the agent's language
     * This would be replaced with actual language model initialization
     */
    return {
      complete: async (prompt: string) => ({ text: prompt }),
      dispose: async () => {
        // Cleanup will be implemented when actual language model is used
      },
    };
  }

  /**
   * Create prompt for language model
   */
  protected async _createPrompt(_task: string, _context?: unknown): Promise<string> {
    const prompt = await this._buildPrompt(_task);
    return prompt;
  }

  /**
   * Build prompt for language model
   */
  protected async _buildPrompt(_task: string): Promise<string> {
    return _task;
  }

  /**
   * Validate language code
   */
  private _isValidLanguageCode(code: string): code is SupportedLanguage {
    return Object.values(SupportedLanguage).includes(code as SupportedLanguage);
  }

  protected async executeTask(_task: string, context?: unknown): Promise<AgentResult> {
    try {
      const result = await this._executeImpl(_task, context);
      return result;
    } catch (error) {
      if (typeof error === 'string') {
        throw new Error(error);
      }

      throw error;
    }
  }
}
