import type { WebContainer } from '@webcontainer/api';
import { EventEmitter } from 'events';

interface ResourceLimits {
  maxMemoryMB: number;
  maxCpuPercentage: number;
  maxProcesses: number;
  maxFileSize: number;
  timeoutMs: number;
}

interface NetworkPolicy {
  allowedHosts: string[];
  allowedPorts: number[];
  blockInbound: boolean;
  maxConcurrentConnections: number;
}

interface FilesystemPolicy {
  readOnlyPaths: string[];
  writablePaths: string[];
  blockedPaths: string[];
  maxFileSize: number;
  allowedFileTypes: string[];
}

interface ContainerHealth {
  memoryUsage: number;
  cpuUsage: number;
  activeProcesses: number;
  networkConnections: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface AuditLogEntry {
  timestamp: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure';
  details: Record<string, unknown>;
}

/**
 * Manages security and resource constraints for WebContainer instances
 */
export class ContainerManager extends EventEmitter {
  private readonly _limits: ResourceLimits;
  private readonly _container: WebContainer;
  private readonly _networkPolicy: NetworkPolicy;
  private readonly _filesystemPolicy: FilesystemPolicy;
  private readonly _healthCheckInterval = 5000; // 5 seconds
  private readonly _auditLog: AuditLogEntry[] = [];
  private _intervalId?: number;
  private _activeConnections = new Set<string>();

  constructor(
    container: WebContainer,
    limits: Partial<ResourceLimits> = {},
    networkPolicy: Partial<NetworkPolicy> = {},
    filesystemPolicy: Partial<FilesystemPolicy> = {},
  ) {
    super();
    this._container = container;

    // Resource limits
    this._limits = {
      maxMemoryMB: limits.maxMemoryMB || 512,
      maxCpuPercentage: limits.maxCpuPercentage || 80,
      maxProcesses: limits.maxProcesses || 10,
      maxFileSize: limits.maxFileSize || 10 * 1024 * 1024, // 10MB
      timeoutMs: limits.timeoutMs || 30000, // 30 seconds
    };

    // Network security policy
    this._networkPolicy = {
      allowedHosts: networkPolicy.allowedHosts || ['localhost'],
      allowedPorts: networkPolicy.allowedPorts || [3000, 8080],
      blockInbound: networkPolicy.blockInbound ?? true,
      maxConcurrentConnections: networkPolicy.maxConcurrentConnections || 10,
    };

    // Filesystem security policy
    this._filesystemPolicy = {
      readOnlyPaths: filesystemPolicy.readOnlyPaths || ['/usr', '/etc'],
      writablePaths: filesystemPolicy.writablePaths || ['/tmp', '/app'],
      blockedPaths: filesystemPolicy.blockedPaths || ['/etc/passwd', '/etc/shadow'],
      maxFileSize: filesystemPolicy.maxFileSize || 10 * 1024 * 1024, // 10MB
      allowedFileTypes: filesystemPolicy.allowedFileTypes || ['.js', '.ts', '.json', '.txt', '.md', '.html', '.css'],
    };

    this._startHealthCheck();

    this._setupNetworkInterceptor();
  }

  /**
   * Start monitoring container health
   */
  private _startHealthCheck(): void {
    if (this._intervalId) {
      return;
    }

    this._intervalId = window.setInterval(async () => {
      const health = await this._checkHealth();

      if (health.status === 'critical') {
        await this._handleCriticalHealth(health);
      }

      this.emit('health', health);
    }, this._healthCheckInterval);
  }

  /**
   * Stop health monitoring
   */
  private _stopHealthCheck(): void {
    if (this._intervalId) {
      window.clearInterval(this._intervalId);
      this._intervalId = undefined;
    }
  }

  /**
   * Check container health metrics
   */
  private async _checkHealth(): Promise<ContainerHealth> {
    // Get memory usage through performance.memory API if available
    const memory = (performance as any).memory;
    const memoryUsage = memory ? memory.usedJSHeapSize / (1024 * 1024) : 0;

    // Estimate CPU usage through task timing
    const cpuUsage = await this._estimateCpuUsage();

    // Get active processes count
    const activeProcesses = await this._getActiveProcessCount();

    // Get network connections count
    const networkConnections = this._activeConnections.size;

    // Determine health status
    const status = this._determineHealthStatus(memoryUsage, cpuUsage, activeProcesses, networkConnections);

    return {
      memoryUsage,
      cpuUsage,
      activeProcesses,
      networkConnections,
      status,
    };
  }

  /**
   * Set up network request interceptor
   */
  private _setupNetworkInterceptor(): void {
    const originalFetch = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input.toString();
      const host = new URL(url).hostname;

      // Check network policies
      if (!this._isHostAllowed(host)) {
        const error = new Error(`Network access denied: ${host} is not in allowed hosts`);
        this._logAudit('network_access', url, 'failure', { error: error.message });
        throw error;
      }

      if (this._activeConnections.size >= this._networkPolicy.maxConcurrentConnections) {
        const error = new Error('Too many concurrent network connections');
        this._logAudit('network_access', url, 'failure', { error: error.message });
        throw error;
      }

      // Track connection
      const connectionId = Math.random().toString(36).substring(7);
      this._activeConnections.add(connectionId);
      this._logAudit('network_access', url, 'success', { connectionId });

      try {
        const response = await originalFetch(input, init);
        return response;
      } finally {
        this._activeConnections.delete(connectionId);
      }
    };
  }

  /**
   * Check if host is allowed by network policy
   */
  private _isHostAllowed(host: string): boolean {
    return this._networkPolicy.allowedHosts.some((allowed) => {
      if (allowed.startsWith('*.')) {
        const domain = allowed.slice(2);
        return host === domain || host.endsWith('.' + domain);
      }
      return host === allowed;
    });
  }

  /**
   * Validate filesystem access
   */
  private async _validateFilesystemAccess(path: string, operation: 'read' | 'write'): Promise<boolean> {
    // Check blocked paths
    if (this._filesystemPolicy.blockedPaths.some((blocked) => path.startsWith(blocked))) {
      this._logAudit('filesystem_access', path, 'failure', {
        operation,
        reason: 'blocked_path',
      });
      return false;
    }

    // Check operation-specific permissions
    if (operation === 'write') {
      const isWritable = this._filesystemPolicy.writablePaths.some((writable) => path.startsWith(writable));

      if (!isWritable) {
        this._logAudit('filesystem_access', path, 'failure', {
          operation,
          reason: 'write_not_allowed',
        });
        return false;
      }
    } else {
      const isReadable =
        this._filesystemPolicy.readOnlyPaths.some((readable) => path.startsWith(readable)) ||
        this._filesystemPolicy.writablePaths.some((writable) => path.startsWith(writable));

      if (!isReadable) {
        this._logAudit('filesystem_access', path, 'failure', {
          operation,
          reason: 'read_not_allowed',
        });
        return false;
      }
    }

    this._logAudit('filesystem_access', path, 'success', { operation });

    return true;
  }

  /**
   * Add entry to audit log
   */
  private _logAudit(
    action: string,
    resource: string,
    outcome: 'success' | 'failure',
    details: Record<string, unknown> = {},
  ): void {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      action,
      resource,
      outcome,
      details,
    };

    this._auditLog.push(entry);
    this.emit('audit', entry);

    // Keep audit log size manageable
    if (this._auditLog.length > 1000) {
      this._auditLog.shift();
    }
  }

  /**
   * Estimate CPU usage through task timing
   */
  private async _estimateCpuUsage(): Promise<number> {
    const iterations = 1000000;
    const startTime = performance.now();

    // Perform CPU-intensive task
    for (let i = 0; i < iterations; i++) {
      Math.random();
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Calculate relative CPU load (0-100)
    return Math.min((duration / 10) * 100, 100);
  }

  /**
   * Get count of active processes
   */
  private async _getActiveProcessCount(): Promise<number> {
    try {
      // Use ps command to list processes
      const process = await this._container.spawn('ps', ['aux']);
      const output = await new Response(process.output).text();

      // Count lines (subtract 1 for header)
      return output.split('\n').length - 1;
    } catch {
      return 0;
    }
  }

  /**
   * Determine container health status based on metrics
   */
  private _determineHealthStatus(
    memoryUsage: number,
    cpuUsage: number,
    activeProcesses: number,
    networkConnections: number,
  ): ContainerHealth['status'] {
    if (
      memoryUsage > this._limits.maxMemoryMB ||
      cpuUsage > this._limits.maxCpuPercentage ||
      activeProcesses > this._limits.maxProcesses ||
      networkConnections >= this._networkPolicy.maxConcurrentConnections
    ) {
      return 'critical';
    }

    if (
      memoryUsage > this._limits.maxMemoryMB * 0.8 ||
      cpuUsage > this._limits.maxCpuPercentage * 0.8 ||
      activeProcesses > this._limits.maxProcesses * 0.8 ||
      networkConnections >= this._networkPolicy.maxConcurrentConnections * 0.8
    ) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Handle critical health status
   */
  private async _handleCriticalHealth(health: ContainerHealth): Promise<void> {
    this._logAudit('health_critical', 'container', 'failure', {
      memoryUsage: health.memoryUsage,
      cpuUsage: health.cpuUsage,
      activeProcesses: health.activeProcesses,
      networkConnections: health.networkConnections,
      status: health.status,
    });

    // Attempt to recover by terminating non-essential processes
    try {
      const processes = await this._container.spawn('ps', ['aux']);
      const output = await new Response(processes.output).text();

      // Parse process list and terminate non-essential ones
      const lines = output.split('\n').slice(1); // Skip header

      for (const line of lines) {
        const [pid] = line.split(/\s+/);

        if (pid && !this._isEssentialProcess(line)) {
          await this._container.spawn('kill', [pid]);
          this._logAudit('process_terminated', pid, 'success', {
            reason: 'health_recovery',
          });
        }
      }
    } catch (error) {
      this._logAudit('health_recovery', 'container', 'failure', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check if a process is essential for container operation
   */
  private _isEssentialProcess(processInfo: string): boolean {
    const essentialPatterns = [
      /jsh/, // Shell process
      /node.*app\/entry/, // Main application
      /ps aux/, // System monitoring
    ];

    return essentialPatterns.some((pattern) => pattern.test(processInfo));
  }

  /**
   * Execute a command with timeout and resource limits
   */
  async executeCommand(command: string, args: string[] = [], options: { timeout?: number } = {}): Promise<string> {
    const timeout = options.timeout || this._limits.timeoutMs;

    try {
      this._logAudit('command_execute', command, 'success', { args, timeout });

      const process = await this._container.spawn(command, args);

      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Command execution timed out')), timeout);
      });

      // Race between command execution and timeout
      const outputStream = await Promise.race([process.output, timeoutPromise]);
      const output = await new Response(outputStream).text();

      this._logAudit('command_execute', command, 'success', { args, output });

      return output;
    } catch (error) {
      this._logAudit('command_execute', command, 'failure', {
        args,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Command execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get audit log entries
   */
  getAuditLog(): AuditLogEntry[] {
    return [...this._auditLog];
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this._stopHealthCheck();
    window.fetch = fetch; // Restore original fetch
    this.removeAllListeners();
    this._logAudit('container_dispose', 'container', 'success');
  }
}