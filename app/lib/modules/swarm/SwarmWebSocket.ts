import { type AgentState } from './ModelSwarm';
import { swarmLogger, LogLevel } from '~/lib/modules/logging/SwarmLogger';

interface SwarmUpdate {
  type: 'metrics' | 'status' | 'error';
  agentId: string;
  data: any;
  timestamp: number;
}

type SwarmUpdateCallback = (update: SwarmUpdate) => void;

export class SwarmWebSocket {
  private static _instance: SwarmWebSocket;
  private _ws: WebSocket | null = null;
  private _reconnectAttempts = 0;
  private readonly _maxReconnectAttempts = 5;
  private readonly _reconnectDelay = 1000;
  private _subscribers: Set<SwarmUpdateCallback> = new Set();

  private constructor() {
    if (typeof window !== 'undefined') {
      this._connect();
    }
  }

  static getInstance(): SwarmWebSocket {
    if (!SwarmWebSocket._instance) {
      SwarmWebSocket._instance = new SwarmWebSocket();
    }

    return SwarmWebSocket._instance;
  }

  private _connect() {
    if (this._ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/swarm/updates`;

    try {
      this._ws = new WebSocket(wsUrl);

      this._ws.onopen = () => {
        this._reconnectAttempts = 0;
        swarmLogger.log(LogLevel.INFO, 'WebSocket', 'Connected to swarm updates');
      };

      this._ws.onclose = () => {
        swarmLogger.log(LogLevel.WARN, 'WebSocket', 'Connection closed');
        this._handleReconnect();
      };

      this._ws.onerror = (error) => {
        swarmLogger.log(LogLevel.ERROR, 'WebSocket', 'Connection error', { error });
      };

      this._ws.onmessage = (event) => {
        try {
          const update: SwarmUpdate = JSON.parse(event.data);
          this._notifySubscribers(update);
        } catch (error) {
          swarmLogger.log(LogLevel.ERROR, 'WebSocket', 'Error parsing message', { error });
        }
      };
    } catch (error) {
      swarmLogger.log(LogLevel.ERROR, 'WebSocket', 'Connection error', { error });
    }
  }

  private _handleReconnect() {
    if (this._reconnectAttempts >= this._maxReconnectAttempts) {
      swarmLogger.log(LogLevel.ERROR, 'WebSocket', 'Max reconnection attempts reached');
      return;
    }

    swarmLogger.log(LogLevel.INFO, 'WebSocket', 'Attempting to reconnect', {
      attempt: this._reconnectAttempts + 1,
    });

    const delay = this._reconnectDelay * Math.pow(2, this._reconnectAttempts - 1);

    setTimeout(() => {
      this._reconnectAttempts++;
      this._connect();
    }, delay);
  }

  private _notifySubscribers(update: SwarmUpdate) {
    this._subscribers.forEach((callback) => {
      try {
        callback(update);
      } catch (error) {
        swarmLogger.log(LogLevel.ERROR, 'WebSocket', 'Error in subscriber callback', { error });
      }
    });
  }

  subscribe(callback: SwarmUpdateCallback): () => void {
    this._subscribers.add(callback);

    return () => {
      this._subscribers.delete(callback);
    };
  }

  sendMetricsUpdate(agentId: string, metrics: Partial<AgentState['performance']>) {
    if (this._ws?.readyState !== WebSocket.OPEN) {
      return;
    }

    const update: SwarmUpdate = {
      type: 'metrics',
      agentId,
      data: metrics,
      timestamp: Date.now(),
    };

    this._ws.send(JSON.stringify(update));
  }

  sendStatusUpdate(agentId: string, status: 'healthy' | 'unhealthy' | 'cooling') {
    if (this._ws?.readyState !== WebSocket.OPEN) {
      return;
    }

    const update: SwarmUpdate = {
      type: 'status',
      agentId,
      data: { status },
      timestamp: Date.now(),
    };

    this._ws.send(JSON.stringify(update));
  }

  sendErrorUpdate(agentId: string, error: Error) {
    if (this._ws?.readyState !== WebSocket.OPEN) {
      return;
    }

    const update: SwarmUpdate = {
      type: 'error',
      agentId,
      data: {
        message: error.message,
        stack: error.stack,
      },
      timestamp: Date.now(),
    };

    this._ws.send(JSON.stringify(update));
  }

  sendMessage(message: string): void {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(message);
    } else {
      swarmLogger.log(LogLevel.ERROR, 'SwarmWebSocket', 'WebSocket not open', {
        readyState: this._ws?.readyState,
      });
      throw new Error('WebSocket not open');
    }
  }

  close(): void {
    if (this._ws) {
      this._ws.close();
    }
  }

  private _handleOpen(): void {
    swarmLogger.log(LogLevel.INFO, 'SwarmWebSocket', 'WebSocket connection opened');
  }

  private _handleMessage(event: MessageEvent): void {
    try {
      const update: SwarmUpdate = JSON.parse(event.data);
      this._notifySubscribers(update);
    } catch (error) {
      swarmLogger.log(LogLevel.ERROR, 'SwarmWebSocket', 'Failed to handle message', {
        error,
        data: event.data,
      });
    }
  }

  private _handleClose(event: CloseEvent): void {
    swarmLogger.log(LogLevel.INFO, 'SwarmWebSocket', 'WebSocket connection closed', {
      code: event.code,
      reason: event.reason,
    });
  }

  private _handleError(event: Event): void {
    swarmLogger.log(LogLevel.ERROR, 'SwarmWebSocket', 'WebSocket error', {
      error: event,
    });
  }
}
