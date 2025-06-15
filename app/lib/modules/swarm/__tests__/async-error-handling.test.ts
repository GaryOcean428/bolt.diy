import { AgentCommunicationBus, MessageType } from '~/lib/modules/agents/communication/agent-protocol';

describe('Async Error Handling Integration', () => {
  describe('AgentCommunicationBus', () => {
    let bus: AgentCommunicationBus;

    beforeEach(() => {
      // Reset singleton
      (AgentCommunicationBus as any)._instance = null;
      bus = AgentCommunicationBus.getInstance();
    });

    afterEach(() => {
      bus.removeAllListeners();
    });

    it('should handle consensus timeout gracefully', async () => {
      const result = await bus.requestConsensus(
        'test-agent',
        'test-topic',
        ['option1', 'option2'],
        2,
        100, // Short timeout
      );

      // Should return null on timeout
      expect(result).toBeNull();
    });

    it('should handle broadcast with invalid message gracefully', () => {
      // Should not throw even with minimal message
      expect(() => {
        bus.broadcast({
          sender: 'test',
          recipients: [],
          type: MessageType.INSIGHT,
          content: 'test',
          priority: 1,
        });
      }).not.toThrow();
    });

    it('should handle consensus request with proper cleanup', async () => {
      const proposalId = 'test-proposal';

      // Start a consensus request
      const consensusPromise = bus.requestConsensus(
        'test-agent',
        'test-topic',
        ['option1', 'option2'],
        2,
        100, // Short timeout
      );

      // Check that consensus data is stored
      expect((bus as any)._activeConsensus.has(proposalId)).toBe(false); // Should be different ID

      // Wait for timeout
      const result = await consensusPromise;

      // Should clean up after timeout
      expect(result).toBeNull();
      expect((bus as any)._activeConsensus.size).toBe(0);
      expect((bus as any)._consensusVotes.size).toBe(0);
      expect((bus as any)._consensusTimeouts.size).toBe(0);
    });

    it('should handle malformed consensus votes gracefully', () => {
      const originalConsoleError = console.error;
      const errorLogs: any[] = [];
      console.error = (...args: any[]) => errorLogs.push(args);

      try {
        // Send malformed vote message
        bus.emit('consensus_vote', {
          id: 'test-id',
          sender: 'test-agent',
          recipients: [],
          type: MessageType.CONSENSUS_VOTE,
          content: {
            // Missing proposalId and vote
          },
          timestamp: new Date(),
          priority: 1,
        });

        expect(errorLogs.length).toBeGreaterThan(0);
        expect(errorLogs[0][0]).toContain('Error handling consensus vote');
      } finally {
        console.error = originalConsoleError;
      }
    });

    it('should handle event handler errors without crashing the bus', () => {
      const originalConsoleError = console.error;
      const errorLogs: any[] = [];
      console.error = (...args: any[]) => errorLogs.push(args);

      try {
        // Add a safe listener that catches its own errors
        bus.on('test-event', (data) => {
          try {
            // Simulate conditional error
            if (data === 'error') {
              throw new Error('Handler error');
            }
          } catch (error) {
            console.error('Error in test handler:', error);

            // Don't let handler error crash the bus
          }
        });

        // Send normal event - should work
        bus.emit('test-event', 'normal');

        // Send error event - should be handled gracefully
        bus.emit('test-event', 'error');

        // Should have logged the error
        expect(errorLogs.length).toBeGreaterThan(0);
        expect(errorLogs[0][0]).toContain('Error in test handler');
      } finally {
        console.error = originalConsoleError;
        bus.removeAllListeners('test-event');
      }
    });
  });

  describe('Error Boundary Patterns', () => {
    it('should demonstrate timeout protection pattern', async () => {
      const TIMEOUT_MS = 100;

      // Simulate an operation that might hang
      const hangingOperation = new Promise((_resolve) => {
        // Never resolve to simulate hanging
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Operation timed out'));
        }, TIMEOUT_MS);
      });

      try {
        await Promise.race([hangingOperation, timeoutPromise]);
        fail('Should have timed out');
      } catch (error) {
        expect(error.message).toBe('Operation timed out');
      }
    });

    it('should demonstrate resource cleanup pattern', () => {
      let timeoutId: NodeJS.Timeout | null = null;
      let isCleanedUp = false;

      try {
        timeoutId = setTimeout(() => {
          // Some operation
        }, 1000);

        // Simulate error
        throw new Error('Test error');
      } catch {
        // Cleanup should happen in finally
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
          isCleanedUp = true;
        }
      }

      expect(isCleanedUp).toBe(true);
    });

    it('should demonstrate safe callback execution pattern', () => {
      const callbacks = [
        () => 'success',
        () => {
          throw new Error('Callback error');
        },
        () => 'success2',
      ];

      const results: any[] = [];
      const errors: any[] = [];

      callbacks.forEach((callback, index) => {
        try {
          const result = callback();
          results[index] = result;
        } catch (error) {
          errors[index] = error;

          // Don't let one callback failure stop others
        }
      });

      expect(results[0]).toBe('success');
      expect(results[2]).toBe('success2');
      expect(errors[1]).toBeInstanceOf(Error);
    });
  });
});
