import { type AgentOutput } from '~/lib/modules/swarm/AgentOutput';

export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  level: LogLevel;
  category: string;
  message: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface AgentMetrics {
  agentId: string;
  model?: string;
  provider?: string;
  specialization: string[];
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  errorRate: number;
  responseTime: number;
  tokenUsage: number;
  costPerRequest: number;
  averageConfidence: number;
  outputTypes: Record<string, number>;
  lastNResponses: number[];
  lastUsed?: number;
}

export class SwarmLogger {
  private static _instance: SwarmLogger;
  private _logs: LogEntry[] = [];
  private _metrics: Map<string, AgentMetrics> = new Map();
  private readonly _maxLogs = 1000;
  private _subscribers: Set<(entry: LogEntry) => void> = new Set();

  private constructor() {
    // Initialize with localStorage if available
    if (typeof window !== 'undefined') {
      const savedMetrics = localStorage.getItem('swarm_metrics');

      if (savedMetrics) {
        this._metrics = new Map(JSON.parse(savedMetrics));
      }
    }
  }

  static getInstance(): SwarmLogger {
    if (!SwarmLogger._instance) {
      SwarmLogger._instance = new SwarmLogger();
    }

    return SwarmLogger._instance;
  }

  subscribe(callback: (entry: LogEntry) => void): () => void {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  private _notify(entry: LogEntry) {
    this._subscribers.forEach((callback) => callback(entry));
  }

  log(level: LogLevel, category: string, message: string, metadata?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      category,
      message,
      metadata,
      timestamp: Date.now(),
    };

    this._logs.push(entry);

    if (this._logs.length > this._maxLogs) {
      this._logs.shift();
    }

    this._notify(entry);
    console[level](`[${new Date(entry.timestamp).toISOString()}] [${category}] ${message}`, metadata || '');
  }

  trackAgentMetrics(agentId: string, metrics: Partial<AgentMetrics>) {
    const current = this._metrics.get(agentId) || {
      agentId,
      specialization: [],
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      successRate: 0,
      errorRate: 0,
      responseTime: 0,
      tokenUsage: 0,
      costPerRequest: 0,
      averageConfidence: 0,
      outputTypes: {},
      lastNResponses: [],
    };

    Object.assign(current, metrics);

    if (current.totalRequests > 0) {
      current.successRate = current.successfulRequests / current.totalRequests;
      current.errorRate = current.failedRequests / current.totalRequests;
    }

    this._metrics.set(agentId, current);
    this._persistMetrics();
  }

  trackOutput(agentId: string, output: AgentOutput, duration: number) {
    const current = this._metrics.get(agentId);

    if (current) {
      current.outputTypes[output.type] = (current.outputTypes[output.type] || 0) + 1;
      current.responseTime = (current.responseTime + duration) / 2;

      const confidence = (output.metadata as Record<string, any>)?.confidence || 0;
      current.averageConfidence =
        (current.averageConfidence * current.totalRequests + confidence) / (current.totalRequests + 1);

      this._metrics.set(agentId, current);
      this._persistMetrics();
    }
  }

  getMetrics(agentId?: string): AgentMetrics[] {
    if (agentId) {
      const metrics = this._metrics.get(agentId);
      return metrics ? [metrics] : [];
    }

    return Array.from(this._metrics.values());
  }

  getLogs(filter?: { level?: LogLevel; category?: string; startTime?: number; endTime?: number }): LogEntry[] {
    return this._logs.filter((entry) => {
      if (filter?.level && entry.level !== filter.level) {
        return false;
      }

      if (filter?.category && entry.category !== filter.category) {
        return false;
      }

      if (filter?.startTime && entry.timestamp < filter.startTime) {
        return false;
      }

      if (filter?.endTime && entry.timestamp > filter.endTime) {
        return false;
      }

      return true;
    });
  }

  private _persistMetrics() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('swarm_metrics', JSON.stringify(Array.from(this._metrics.entries())));
    }
  }

  clearMetrics() {
    this._metrics.clear();
    this._persistMetrics();
  }
}

export const swarmLogger = SwarmLogger.getInstance();
