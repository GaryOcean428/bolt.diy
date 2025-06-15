import { type AgentState } from './ModelSwarm';
import { swarmLogger, LogLevel } from '~/lib/modules/logging/SwarmLogger';

/**
 * SwarmWebSocket Error Handling Design
 * ====================================
 *
 * This module implements robust WebSocket error handling and resource management:
 *
 * 1. **Connection State Management**: Prevents race conditions between connection
 *    attempts and state checks through proper state tracking
 *
 * 2. **Reconnection Strategy**: Exponential backoff with max attempts, cleanup
 *    of previous timeouts, and proper cancellation when destroyed
 *
 * 3. **Subscriber Safety**: Error boundaries around subscriber callbacks prevent
 *    one failing subscriber from affecting others
 *
 * 4. **Serialization Safety**: JSON.stringify errors are caught and logged,
 *    preventing send operations from failing silently
 *
 * 5. **Resource Cleanup**: Proper cleanup of timeouts, event listeners, and
 *    subscribers on close() to prevent memory leaks
 *
 * 6. **Error Propagation**: Malformed messages result in error updates to
 *    subscribers rather than silent failures
 *
 * The `_isDestroyed` flag prevents operations after cleanup, ensuring no
 * dangling operations or memory leaks.
 */

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
  private _reconnectTimeoutId: NodeJS.Timeout | null = null;
  private _isDestroyed = false;

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
    // Prevent connection attempts if destroyed
    if (this._isDestroyed) {
      return;
    }

    // Prevent multiple concurrent connection attempts
    if (this._ws?.readyState === WebSocket.CONNECTING || this._ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/swarm/updates`;

    try {
      this._ws = new WebSocket(wsUrl);

      this._ws.onopen = () => {
        if (this._isDestroyed) {
          return;
        }

        this._reconnectAttempts = 0;
        swarmLogger.log(LogLevel.INFO, 'WebSocket', 'Connected to swarm updates');
      };

      this._ws.onclose = (event) => {
        if (this._isDestroyed) {
          return;
        }

        swarmLogger.log(LogLevel.WARN, 'WebSocket', 'Connection closed', {
          code: event.code,
          reason: event.reason,
        });
        this._handleReconnect();
      };

      this._ws.onerror = (error) => {
        if (this._isDestroyed) {
          return;
        }

        swarmLogger.log(LogLevel.ERROR, 'WebSocket', 'Connection error', { error });
      };

      this._ws.onmessage = (event) => {
        if (this._isDestroyed) {
          return;
        }

        try {
          const update: SwarmUpdate = JSON.parse(event.data);
          this._notifySubscribers(update);
        } catch (error) {
          swarmLogger.log(LogLevel.ERROR, 'WebSocket', 'Error parsing message', {
            error,
            data: event.data,
          });

          // Send error update to subscribers for malformed messages
          this._notifySubscribers({
            type: 'error',
            agentId: 'websocket',
            data: {
              message: 'Failed to parse WebSocket message',
              originalData: event.data,
              error: error instanceof Error ? error.message : 'Unknown parsing error',
            },
            timestamp: Date.now(),
          });
        }
      };
    } catch (error) {
      swarmLogger.log(LogLevel.ERROR, 'WebSocket', 'Connection error', { error });

      // Schedule reconnect on connection failure
      if (!this._isDestroyed) {
        this._handleReconnect();
      }
    }
  }

  private _handleReconnect() {
    // Don't reconnect if destroyed or max attempts reached
    if (this._isDestroyed || this._reconnectAttempts >= this._maxReconnectAttempts) {
      if (this._reconnectAttempts >= this._maxReconnectAttempts) {
        swarmLogger.log(LogLevel.ERROR, 'WebSocket', 'Max reconnection attempts reached');

        // Notify subscribers of permanent failure
        this._notifySubscribers({
          type: 'error',
          agentId: 'websocket',
          data: {
            message: 'WebSocket connection failed permanently',
            maxAttemptsReached: true,
          },
          timestamp: Date.now(),
        });
      }

      return;
    }

    // Clear any existing reconnect timeout
    if (this._reconnectTimeoutId) {
      clearTimeout(this._reconnectTimeoutId);
    }

    swarmLogger.log(LogLevel.INFO, 'WebSocket', 'Attempting to reconnect', {
      attempt: this._reconnectAttempts + 1,
    });

    const delay = this._reconnectDelay * Math.pow(2, this._reconnectAttempts);

    this._reconnectTimeoutId = setTimeout(() => {
      if (this._isDestroyed) {
        return;
      }

      this._reconnectAttempts++;
      this._connect();
    }, delay);
  }

  private _notifySubscribers(update: SwarmUpdate) {
    // Create a snapshot of subscribers to avoid issues with concurrent modifications
    const subscribers = Array.from(this._subscribers);

    subscribers.forEach((callback) => {
      try {
        callback(update);
      } catch (error) {
        swarmLogger.log(LogLevel.ERROR, 'WebSocket', 'Error in subscriber callback', {
          error,
          updateType: update.type,
          agentId: update.agentId,
        });

        /*
         * Consider removing problematic subscribers after repeated failures
         * This prevents one bad subscriber from affecting others
         */
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
    if (this._isDestroyed || this._ws?.readyState !== WebSocket.OPEN) {
      swarmLogger.log(LogLevel.WARN, 'SwarmWebSocket', 'Cannot send metrics - WebSocket not ready', {
        agentId,
        readyState: this._ws?.readyState,
        isDestroyed: this._isDestroyed,
      });
      return;
    }

    try {
      const update: SwarmUpdate = {
        type: 'metrics',
        agentId,
        data: metrics,
        timestamp: Date.now(),
      };

      const message = JSON.stringify(update);
      this._ws.send(message);
    } catch (error) {
      swarmLogger.log(LogLevel.ERROR, 'SwarmWebSocket', 'Failed to send metrics update', {
        error,
        agentId,
        metrics,
      });
    }
  }

  sendStatusUpdate(agentId: string, status: 'healthy' | 'unhealthy' | 'cooling') {
    if (this._isDestroyed || this._ws?.readyState !== WebSocket.OPEN) {
      swarmLogger.log(LogLevel.WARN, 'SwarmWebSocket', 'Cannot send status - WebSocket not ready', {
        agentId,
        status,
        readyState: this._ws?.readyState,
        isDestroyed: this._isDestroyed,
      });
      return;
    }

    try {
      const update: SwarmUpdate = {
        type: 'status',
        agentId,
        data: { status },
        timestamp: Date.now(),
      };

      const message = JSON.stringify(update);
      this._ws.send(message);
    } catch (error) {
      swarmLogger.log(LogLevel.ERROR, 'SwarmWebSocket', 'Failed to send status update', {
        error,
        agentId,
        status,
      });
    }
  }

  sendErrorUpdate(agentId: string, error: Error) {
    if (this._isDestroyed || this._ws?.readyState !== WebSocket.OPEN) {
      swarmLogger.log(LogLevel.WARN, 'SwarmWebSocket', 'Cannot send error - WebSocket not ready', {
        agentId,
        errorMessage: error.message,
        readyState: this._ws?.readyState,
        isDestroyed: this._isDestroyed,
      });
      return;
    }

    try {
      const update: SwarmUpdate = {
        type: 'error',
        agentId,
        data: {
          message: error.message,
          stack: error.stack,
        },
        timestamp: Date.now(),
      };

      const message = JSON.stringify(update);
      this._ws.send(message);
    } catch (serializationError) {
      swarmLogger.log(LogLevel.ERROR, 'SwarmWebSocket', 'Failed to send error update', {
        error: serializationError,
        originalError: error,
        agentId,
      });
    }
  }

  sendMessage(message: string): void {
    if (this._isDestroyed) {
      throw new Error('WebSocket is destroyed');
    }

    if (this._ws?.readyState === WebSocket.OPEN) {
      try {
        this._ws.send(message);
      } catch (error) {
        swarmLogger.log(LogLevel.ERROR, 'SwarmWebSocket', 'Failed to send message', {
          error,
          message: message.substring(0, 100) + (message.length > 100 ? '...' : ''), // Log truncated message
        });
        throw error;
      }
    } else {
      const errorMsg = 'WebSocket not open';
      swarmLogger.log(LogLevel.ERROR, 'SwarmWebSocket', errorMsg, {
        readyState: this._ws?.readyState,
        isDestroyed: this._isDestroyed,
      });
      throw new Error(errorMsg);
    }
  }

  close(): void {
    this._isDestroyed = true;

    // Clear reconnect timeout
    if (this._reconnectTimeoutId) {
      clearTimeout(this._reconnectTimeoutId);
      this._reconnectTimeoutId = null;
    }

    // Close WebSocket connection
    if (this._ws) {
      // Remove event listeners to prevent further callbacks
      this._ws.onopen = null;
      this._ws.onclose = null;
      this._ws.onerror = null;
      this._ws.onmessage = null;

      if (this._ws.readyState === WebSocket.OPEN || this._ws.readyState === WebSocket.CONNECTING) {
        this._ws.close();
      }

      this._ws = null;
    }

    // Clear all subscribers to prevent memory leaks
    this._subscribers.clear();

    swarmLogger.log(LogLevel.INFO, 'SwarmWebSocket', 'WebSocket connection closed and cleaned up');
  }
}
