import { AgentCommunicationBus, MessageType, MessagePriority } from './communication/agent-protocol';
import { SpecializedAgent } from './specialized-agents';
import { AgentTier, AgentSpecialization, SupportedLanguage } from './types';
import type { AgentResult, TaskComplexity } from './types';

/**
 * Specialized Agents Error Handling Design
 * ========================================
 *
 * This module implements comprehensive error handling for specialized agent event handlers:
 *
 * 1. **Event Handler Boundaries**: All async event handlers are wrapped in try-catch blocks
 *    with timeout protection to prevent hanging operations
 *
 * 2. **Operation Timeouts**: Each agent type has appropriate timeouts:
 *    - TestingAgent: 30s for test operations
 *    - DocumentationAgent: 30s for doc updates
 *    - ResearchAgent: 60s for research operations (longer due to complexity)
 *    - MemoryAgent: 30s for memory queries
 *
 * 3. **Error Response Pattern**: Failed operations send ERROR message responses instead
 *    of leaving requesting agents hanging
 *
 * 4. **Resource Cleanup**: Agent disposal properly removes event listeners to prevent
 *    memory leaks and continued processing after disposal
 *
 * 5. **Graceful Degradation**: Event handler errors are logged but don't crash the agent,
 *    allowing continued operation for other events
 *
 * 6. **Response Guarantee**: Every request-type event handler guarantees a response,
 *    either success or error, preventing deadlocks in agent communication
 *
 * The design ensures agents remain responsive and don't block the communication bus
 * even when individual operations fail.
 */

/**
 * Testing Agent - Generates and manages tests
 */
export class TestingAgent extends SpecializedAgent {
  constructor() {
    super({
      name: 'testing-specialist',
      description: 'Generates and manages test suites',
      tier: AgentTier.Expert,
      specializations: [AgentSpecialization.Testing],
      supportedLanguages: [SupportedLanguage.English],
      maxTokens: 8000,
      costPerToken: 0.001,
    });
  }

  protected async _initializeImpl(): Promise<void> {
    await this._loadTestingFrameworks();
    this._subscribeToEvents();
  }

  protected async _executeImpl<T>(_task: string, _context?: unknown): Promise<AgentResult<T>> {
    return {
      success: true,
      data: { actions: [] } as T,
      metrics: { tokensUsed: 0, executionTime: 0, cost: 0 },
    };
  }

  protected async _canHandleImpl(task: string, complexity: TaskComplexity): Promise<boolean> {
    const hasRequiredSpecialization = this.config.specializations.some((spec) =>
      task.toLowerCase().includes(spec.toLowerCase().replace('_', ' ')),
    );
    return hasRequiredSpecialization && complexity.specializedKnowledge;
  }

  protected async _disposeImpl(): Promise<void> {
    try {
      // Clear team context
      this._teamContext.clear();

      // Remove event listeners to prevent memory leaks
      const bus = AgentCommunicationBus.getInstance();
      bus.removeAllListeners(MessageType.TASK);
    } catch (error) {
      console.error('Error during TestingAgent disposal:', error, { agentName: this.config.name });
    }
  }

  private async _loadTestingFrameworks(): Promise<void> {
    // Load testing frameworks and patterns
  }

  private _subscribeToEvents(): void {
    const bus = AgentCommunicationBus.getInstance();

    // Add error boundary around async event handler
    bus.on(MessageType.TASK, async (message) => {
      try {
        if (message.content.type === 'test_request') {
          // Add timeout to prevent hanging operations
          const OPERATION_TIMEOUT_MS = 30000;

          const operationPromise = this.execute(message.content.code);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Testing operation timed out after ${OPERATION_TIMEOUT_MS}ms`));
            }, OPERATION_TIMEOUT_MS);
          });

          try {
            const result = await Promise.race([operationPromise, timeoutPromise]);

            bus.broadcast({
              sender: this.config.name,
              recipients: [message.sender],
              type: MessageType.RESPONSE,
              content: result,
              priority: MessagePriority.MEDIUM,
              correlationId: message.id,
            });
          } catch (executionError) {
            // Send error response instead of letting handler hang
            bus.broadcast({
              sender: this.config.name,
              recipients: [message.sender],
              type: MessageType.ERROR,
              content: {
                error: executionError instanceof Error ? executionError.message : 'Unknown execution error',
                originalMessage: message.id,
              },
              priority: MessagePriority.MEDIUM,
              correlationId: message.id,
            });
          }
        }
      } catch (error) {
        console.error('Error in TestingAgent event handler:', error, {
          messageId: message.id,
          agentName: this.config.name,
        });

        // Send error response to prevent hanging
        try {
          bus.broadcast({
            sender: this.config.name,
            recipients: [message.sender],
            type: MessageType.ERROR,
            content: {
              error: 'Event handler failed',
              details: error instanceof Error ? error.message : 'Unknown error',
            },
            priority: MessagePriority.MEDIUM,
            correlationId: message.id,
          });
        } catch (broadcastError) {
          console.error('Failed to send error response:', broadcastError);
        }
      }
    });
  }
}

/**
 * Documentation Agent - Maintains project documentation
 */
export class DocumentationAgent extends SpecializedAgent {
  constructor() {
    super({
      name: 'documentation-specialist',
      description: 'Maintains and generates documentation',
      tier: AgentTier.Standard,
      specializations: [AgentSpecialization.Documentation],
      supportedLanguages: [SupportedLanguage.English],
      maxTokens: 8000,
      costPerToken: 0.001,
    });
  }

  protected async _initializeImpl(): Promise<void> {
    await this._loadDocTemplates();
    this._subscribeToEvents();
  }

  protected async _executeImpl<T>(_task: string, _context?: unknown): Promise<AgentResult<T>> {
    return {
      success: true,
      data: { actions: [] } as T,
      metrics: { tokensUsed: 0, executionTime: 0, cost: 0 },
    };
  }

  protected async _canHandleImpl(task: string, complexity: TaskComplexity): Promise<boolean> {
    const hasRequiredSpecialization = this.config.specializations.some((spec) =>
      task.toLowerCase().includes(spec.toLowerCase().replace('_', ' ')),
    );
    return hasRequiredSpecialization && complexity.specializedKnowledge;
  }

  protected async _disposeImpl(): Promise<void> {
    try {
      // Clear team context
      this._teamContext.clear();

      // Remove event listeners to prevent memory leaks
      const bus = AgentCommunicationBus.getInstance();
      bus.removeAllListeners(MessageType.INSIGHT);
    } catch (error) {
      console.error('Error during DocumentationAgent disposal:', error, { agentName: this.config.name });
    }
  }

  private async _loadDocTemplates(): Promise<void> {
    // Load documentation templates and standards
  }

  private _subscribeToEvents(): void {
    const bus = AgentCommunicationBus.getInstance();

    // Add error boundary around event handler
    bus.on(MessageType.INSIGHT, async (message) => {
      try {
        if (message.content.type === 'code_change') {
          // Add timeout to prevent hanging operations
          const OPERATION_TIMEOUT_MS = 30000;

          const operationPromise = this.execute('Update documentation', message.content);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Documentation update timed out after ${OPERATION_TIMEOUT_MS}ms`));
            }, OPERATION_TIMEOUT_MS);
          });

          try {
            await Promise.race([operationPromise, timeoutPromise]);
          } catch (executionError) {
            console.error('Error updating documentation:', executionError, {
              messageId: message.id,
              agentName: this.config.name,
            });
          }
        }
      } catch (error) {
        console.error('Error in DocumentationAgent event handler:', error, {
          messageId: message.id,
          agentName: this.config.name,
        });
      }
    });
  }
}

/**
 * Research Agent - Stays updated with latest tech trends
 */
export class ResearchAgent extends SpecializedAgent {
  constructor() {
    super({
      name: 'research-specialist',
      description: 'Researches and evaluates new technologies',
      tier: AgentTier.Expert,
      specializations: [AgentSpecialization.Research],
      supportedLanguages: [SupportedLanguage.English],
      maxTokens: 16000,
      costPerToken: 0.002,
    });
  }

  protected async _initializeImpl(): Promise<void> {
    await this._loadResearchSources();
    this._subscribeToEvents();
  }

  protected async _executeImpl<T>(_task: string, _context?: unknown): Promise<AgentResult<T>> {
    return {
      success: true,
      data: { actions: [] } as T,
      metrics: { tokensUsed: 0, executionTime: 0, cost: 0 },
    };
  }

  protected async _canHandleImpl(task: string, complexity: TaskComplexity): Promise<boolean> {
    const hasRequiredSpecialization = this.config.specializations.some((spec) =>
      task.toLowerCase().includes(spec.toLowerCase().replace('_', ' ')),
    );
    return hasRequiredSpecialization && complexity.specializedKnowledge;
  }

  protected async _disposeImpl(): Promise<void> {
    try {
      // Clear team context
      this._teamContext.clear();

      // Remove event listeners to prevent memory leaks
      const bus = AgentCommunicationBus.getInstance();
      bus.removeAllListeners(MessageType.QUERY);
    } catch (error) {
      console.error('Error during ResearchAgent disposal:', error, { agentName: this.config.name });
    }
  }

  private async _loadResearchSources(): Promise<void> {
    // Load research sources and databases
  }

  private _subscribeToEvents(): void {
    const bus = AgentCommunicationBus.getInstance();

    // Add error boundary around async event handler
    bus.on(MessageType.QUERY, async (message) => {
      try {
        if (message.content.type === 'research_request') {
          // Add timeout to prevent hanging operations
          const OPERATION_TIMEOUT_MS = 60000; // Longer timeout for research operations

          const operationPromise = this.execute(message.content.topic);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Research operation timed out after ${OPERATION_TIMEOUT_MS}ms`));
            }, OPERATION_TIMEOUT_MS);
          });

          try {
            const result = await Promise.race([operationPromise, timeoutPromise]);

            bus.broadcast({
              sender: this.config.name,
              recipients: [message.sender],
              type: MessageType.RESPONSE,
              content: result,
              priority: MessagePriority.MEDIUM,
              correlationId: message.id,
            });
          } catch (executionError) {
            // Send error response instead of letting handler hang
            bus.broadcast({
              sender: this.config.name,
              recipients: [message.sender],
              type: MessageType.ERROR,
              content: {
                error: executionError instanceof Error ? executionError.message : 'Unknown research error',
                originalMessage: message.id,
              },
              priority: MessagePriority.MEDIUM,
              correlationId: message.id,
            });
          }
        }
      } catch (error) {
        console.error('Error in ResearchAgent event handler:', error, {
          messageId: message.id,
          agentName: this.config.name,
        });

        // Send error response to prevent hanging
        try {
          bus.broadcast({
            sender: this.config.name,
            recipients: [message.sender],
            type: MessageType.ERROR,
            content: {
              error: 'Event handler failed',
              details: error instanceof Error ? error.message : 'Unknown error',
            },
            priority: MessagePriority.MEDIUM,
            correlationId: message.id,
          });
        } catch (broadcastError) {
          console.error('Failed to send error response:', broadcastError);
        }
      }
    });
  }
}

/**
 * Memory Agent - Manages historical context and knowledge
 */
export class MemoryAgent extends SpecializedAgent {
  private _memoryStore: Map<string, any>;

  constructor() {
    super({
      name: 'memory-specialist',
      description: 'Manages project memory and historical context',
      tier: AgentTier.Expert,
      specializations: [AgentSpecialization.Memory],
      supportedLanguages: [SupportedLanguage.English],
      maxTokens: 32000,
      costPerToken: 0.002,
    });
    this._memoryStore = new Map();
  }

  protected async _initializeImpl(): Promise<void> {
    await this._initializeMemoryStore();
    this._subscribeToEvents();
  }

  protected async _executeImpl<T>(_task: string, _context?: unknown): Promise<AgentResult<T>> {
    return {
      success: true,
      data: { actions: [] } as T,
      metrics: { tokensUsed: 0, executionTime: 0, cost: 0 },
    };
  }

  protected async _canHandleImpl(task: string, complexity: TaskComplexity): Promise<boolean> {
    const hasRequiredSpecialization = this.config.specializations.some((spec) =>
      task.toLowerCase().includes(spec.toLowerCase().replace('_', ' ')),
    );
    return hasRequiredSpecialization && complexity.specializedKnowledge;
  }

  protected async _disposeImpl(): Promise<void> {
    try {
      // Clear team context and memory store
      this._teamContext.clear();
      this._memoryStore.clear();

      // Remove event listeners to prevent memory leaks
      const bus = AgentCommunicationBus.getInstance();
      bus.removeAllListeners(MessageType.INSIGHT);
      bus.removeAllListeners(MessageType.QUERY);
    } catch (error) {
      console.error('Error during MemoryAgent disposal:', error, { agentName: this.config.name });
    }
  }

  private async _initializeMemoryStore(): Promise<void> {
    // Initialize memory storage systems
  }

  private _subscribeToEvents(): void {
    const bus = AgentCommunicationBus.getInstance();

    // Add error boundaries around event handlers
    bus.on(MessageType.INSIGHT, (message) => {
      try {
        this._storeMemory(message.content);
      } catch (error) {
        console.error('Error storing memory from insight:', error, {
          messageId: message.id,
          agentName: this.config.name,
        });
      }
    });

    bus.on(MessageType.QUERY, async (message) => {
      try {
        if (message.content.type === 'memory_query') {
          // Add timeout to prevent hanging operations
          const OPERATION_TIMEOUT_MS = 30000;

          const operationPromise = this.execute(message.content.query);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Memory query timed out after ${OPERATION_TIMEOUT_MS}ms`));
            }, OPERATION_TIMEOUT_MS);
          });

          try {
            const result = await Promise.race([operationPromise, timeoutPromise]);

            bus.broadcast({
              sender: this.config.name,
              recipients: [message.sender],
              type: MessageType.RESPONSE,
              content: result,
              priority: MessagePriority.MEDIUM,
              correlationId: message.id,
            });
          } catch (executionError) {
            // Send error response instead of letting handler hang
            bus.broadcast({
              sender: this.config.name,
              recipients: [message.sender],
              type: MessageType.ERROR,
              content: {
                error: executionError instanceof Error ? executionError.message : 'Unknown memory query error',
                originalMessage: message.id,
              },
              priority: MessagePriority.MEDIUM,
              correlationId: message.id,
            });
          }
        }
      } catch (error) {
        console.error('Error in MemoryAgent query handler:', error, {
          messageId: message.id,
          agentName: this.config.name,
        });

        // Send error response to prevent hanging
        try {
          bus.broadcast({
            sender: this.config.name,
            recipients: [message.sender],
            type: MessageType.ERROR,
            content: {
              error: 'Event handler failed',
              details: error instanceof Error ? error.message : 'Unknown error',
            },
            priority: MessagePriority.MEDIUM,
            correlationId: message.id,
          });
        } catch (broadcastError) {
          console.error('Failed to send error response:', broadcastError);
        }
      }
    });
  }

  private async _storeMemory(data: any): Promise<void> {
    const key =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36);
    this._memoryStore.set(key, {
      ...data,
      timestamp: new Date(),
      associations: await this._generateAssociations(data),
    });
  }

  private async _generateAssociations(_data: any): Promise<string[]> {
    // Generate semantic associations for better memory retrieval
    return [];
  }
}
