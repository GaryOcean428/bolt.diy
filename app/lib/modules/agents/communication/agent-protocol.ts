import { EventEmitter } from 'node:events';

/**
 * Agent Communication Protocol Error Handling Design
 * ==================================================
 *
 * This module implements fault-tolerant agent communication with comprehensive error handling:
 *
 * 1. **Event Handler Safety**: All EventEmitter handlers are wrapped in try-catch blocks
 *    to prevent one failing handler from affecting others
 *
 * 2. **Consensus Timeout Management**: Proper cleanup of consensus proposals and timeouts
 *    prevents memory leaks from unfinalized consensus operations
 *
 * 3. **Message Validation**: Input validation in handlers prevents processing of malformed
 *    messages that could cause errors
 *
 * 4. **Resource Cleanup**: The _consensusTimeouts map tracks all timeouts for proper cleanup,
 *    and _cleanupConsensus ensures no resources are leaked
 *
 * 5. **Error Broadcasting**: Failed operations emit error events to allow listeners to
 *    respond appropriately rather than failing silently
 *
 * 6. **Graceful Degradation**: Methods return null/error responses rather than throwing
 *    exceptions that could crash calling code
 *
 * The consensus mechanism includes timeout protection to prevent indefinite waiting
 * and proper cleanup regardless of success or failure.
 */

export interface AgentMessage {
  id: string;
  sender: string;
  recipients: string[];
  type: MessageType;
  content: any;
  timestamp: Date;
  priority: MessagePriority;
  correlationId?: string;
}

export enum MessageType {
  INSIGHT = 'insight',
  QUERY = 'query',
  RESPONSE = 'response',
  TASK = 'task',
  STATUS = 'status',
  ERROR = 'error',
  CONSENSUS_REQUEST = 'consensus_request',
  CONSENSUS_VOTE = 'consensus_vote',
}

export enum MessagePriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3,
}

export interface ConsensusProposal {
  proposalId: string;
  topic: string;
  options: string[];
  deadline: Date;
  requiredVotes: number;
}

/**
 * Handles communication between agents using a pub/sub pattern
 */
export class AgentCommunicationBus extends EventEmitter {
  private static _instance: AgentCommunicationBus;
  private _messageLog: AgentMessage[] = [];
  private _activeConsensus = new Map<string, ConsensusProposal>();
  private _consensusVotes = new Map<string, Map<string, string>>();
  private _consensusTimeouts = new Map<string, NodeJS.Timeout>();

  private constructor() {
    super();
    this._setupMessageHandlers();
  }

  static getInstance(): AgentCommunicationBus {
    if (!AgentCommunicationBus._instance) {
      AgentCommunicationBus._instance = new AgentCommunicationBus();
    }

    return AgentCommunicationBus._instance;
  }

  private _setupMessageHandlers(): void {
    // Add error boundaries around all event handlers
    this.on('message', (message: AgentMessage) => {
      try {
        this._logMessage(message);
      } catch (error) {
        console.error('Error in message handler:', error, { messageId: message.id });
      }
    });

    this.on('consensus_request', (message: AgentMessage) => {
      try {
        this._handleConsensusRequest(message);
      } catch (error) {
        console.error('Error in consensus request handler:', error, { messageId: message.id });
      }
    });

    this.on('consensus_vote', (message: AgentMessage) => {
      try {
        this._handleConsensusVote(message);
      } catch (error) {
        console.error('Error in consensus vote handler:', error, { messageId: message.id });
      }
    });

    // Add error boundary for any unhandled errors
    this.on('error', (error: Error) => {
      console.error('Unhandled error in AgentCommunicationBus:', error);
    });
  }

  private _logMessage(message: AgentMessage): void {
    this._messageLog.push(message);

    // Keep only last 1000 messages
    if (this._messageLog.length > 1000) {
      this._messageLog.shift();
    }
  }

  broadcast(message: Omit<AgentMessage, 'id' | 'timestamp'>): void {
    try {
      const fullMessage: AgentMessage = {
        ...message,
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2) + Date.now().toString(36),
        timestamp: new Date(),
      };

      // Emit with error boundaries
      this.emit('message', fullMessage);
      this.emit(message.type, fullMessage);
    } catch (error) {
      console.error('Error broadcasting message:', error, { messageType: message.type });

      // Emit error event for listeners to handle
      this.emit('error', error instanceof Error ? error : new Error('Unknown broadcast error'));
    }
  }

  async requestConsensus(
    sender: string,
    topic: string,
    options: string[],
    requiredVotes: number,
    timeoutMs: number = 30000,
  ): Promise<string | null> {
    const proposalId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36);
    const deadline = new Date(Date.now() + timeoutMs);

    const proposal: ConsensusProposal = {
      proposalId,
      topic,
      options,
      deadline,
      requiredVotes,
    };

    try {
      this._activeConsensus.set(proposalId, proposal);
      this._consensusVotes.set(proposalId, new Map());

      this.broadcast({
        sender,
        recipients: [],
        type: MessageType.CONSENSUS_REQUEST,
        content: proposal,
        priority: MessagePriority.HIGH,
      });

      // Create timeout with proper cleanup
      return new Promise<string | null>((resolve) => {
        const timeoutId = setTimeout(() => {
          try {
            const result = this._finalizeConsensus(proposalId);
            resolve(result);
          } catch (error) {
            console.error('Error finalizing consensus:', error, { proposalId });
            resolve(null);
          }
        }, timeoutMs);

        // Store timeout ID for cleanup
        this._consensusTimeouts.set(proposalId, timeoutId);
      });
    } catch (error) {
      // Clean up on error
      this._cleanupConsensus(proposalId);
      console.error('Error requesting consensus:', error, { proposalId, topic });

      return null;
    }
  }

  private _handleConsensusRequest(message: AgentMessage): void {
    try {
      const proposal = message.content as ConsensusProposal;

      if (!proposal.proposalId) {
        throw new Error('Invalid consensus proposal - missing proposalId');
      }

      this._activeConsensus.set(proposal.proposalId, proposal);
      this._consensusVotes.set(proposal.proposalId, new Map());
    } catch (error) {
      console.error('Error handling consensus request:', error, { messageId: message.id });
    }
  }

  private _handleConsensusVote(message: AgentMessage): void {
    try {
      const { proposalId, vote } = message.content;

      if (!proposalId || !vote) {
        throw new Error('Invalid consensus vote - missing proposalId or vote');
      }

      const votes = this._consensusVotes.get(proposalId);

      if (!votes) {
        console.warn('Received vote for unknown proposal:', proposalId);
        return;
      }

      votes.set(message.sender, vote);

      const proposal = this._activeConsensus.get(proposalId);

      if (proposal && votes.size >= proposal.requiredVotes) {
        try {
          this._finalizeConsensus(proposalId);
        } catch (error) {
          console.error('Error finalizing consensus after vote:', error, { proposalId });
        }
      }
    } catch (error) {
      console.error('Error handling consensus vote:', error, { messageId: message.id });
    }
  }

  private _finalizeConsensus(proposalId: string): string | null {
    try {
      const votes = this._consensusVotes.get(proposalId);

      if (!votes) {
        return null;
      }

      // Count votes
      const voteCounts = new Map<string, number>();

      for (const vote of votes.values()) {
        voteCounts.set(vote, (voteCounts.get(vote) || 0) + 1);
      }

      // Find winner
      let winner: string | null = null;
      let maxVotes = 0;

      for (const [option, count] of voteCounts.entries()) {
        if (count > maxVotes) {
          maxVotes = count;
          winner = option;
        }
      }

      return winner;
    } catch (error) {
      console.error('Error finalizing consensus:', error, { proposalId });
      return null;
    } finally {
      // Always cleanup, even on error
      this._cleanupConsensus(proposalId);
    }
  }

  private _cleanupConsensus(proposalId: string): void {
    try {
      // Clear timeout if it exists
      const timeoutId = this._consensusTimeouts.get(proposalId);

      if (timeoutId) {
        clearTimeout(timeoutId);
        this._consensusTimeouts.delete(proposalId);
      }

      // Clean up consensus data
      this._activeConsensus.delete(proposalId);
      this._consensusVotes.delete(proposalId);
    } catch (error) {
      console.error('Error cleaning up consensus:', error, { proposalId });
    }
  }

  getMessageHistory(limit: number = 100): AgentMessage[] {
    return this._messageLog.slice(-limit);
  }
}
