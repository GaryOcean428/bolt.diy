import { EventEmitter } from 'node:events';

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
    this.on('message', this._logMessage.bind(this));
    this.on('consensus_request', this._handleConsensusRequest.bind(this));
    this.on('consensus_vote', this._handleConsensusVote.bind(this));
  }

  private _logMessage(message: AgentMessage): void {
    this._messageLog.push(message);

    // Keep only last 1000 messages
    if (this._messageLog.length > 1000) {
      this._messageLog.shift();
    }
  }

  broadcast(message: Omit<AgentMessage, 'id' | 'timestamp'>): void {
    const fullMessage: AgentMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    this.emit('message', fullMessage);
    this.emit(message.type, fullMessage);
  }

  async requestConsensus(
    sender: string,
    topic: string,
    options: string[],
    requiredVotes: number,
    timeoutMs: number = 30000,
  ): Promise<string | null> {
    const proposalId = crypto.randomUUID();
    const deadline = new Date(Date.now() + timeoutMs);

    const proposal: ConsensusProposal = {
      proposalId,
      topic,
      options,
      deadline,
      requiredVotes,
    };

    this._activeConsensus.set(proposalId, proposal);
    this._consensusVotes.set(proposalId, new Map());

    this.broadcast({
      sender,
      recipients: [],
      type: MessageType.CONSENSUS_REQUEST,
      content: proposal,
      priority: MessagePriority.HIGH,
    });

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this._finalizeConsensus(proposalId));
      }, timeoutMs);
    });
  }

  private _handleConsensusRequest(message: AgentMessage): void {
    const proposal = message.content as ConsensusProposal;
    this._activeConsensus.set(proposal.proposalId, proposal);
    this._consensusVotes.set(proposal.proposalId, new Map());
  }

  private _handleConsensusVote(message: AgentMessage): void {
    const { proposalId, vote } = message.content;
    const votes = this._consensusVotes.get(proposalId);

    if (votes) {
      votes.set(message.sender, vote);

      const proposal = this._activeConsensus.get(proposalId);

      if (proposal && votes.size >= proposal.requiredVotes) {
        this._finalizeConsensus(proposalId);
      }
    }
  }

  private _finalizeConsensus(proposalId: string): string | null {
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

    // Cleanup
    this._activeConsensus.delete(proposalId);
    this._consensusVotes.delete(proposalId);

    return winner;
  }

  getMessageHistory(limit: number = 100): AgentMessage[] {
    return this._messageLog.slice(-limit);
  }
}
