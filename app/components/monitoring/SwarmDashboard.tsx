import * as Dialog from '@radix-ui/react-dialog';
import { Card, Title, LineChart, BarChart, DonutChart, Metric, Text, Flex, Grid } from '@tremor/react';
import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { dialogBackdropVariants, dialogVariants } from '~/components/ui/Dialog';
import { IconButton } from '~/components/ui/IconButton';
import { swarmLogger, type LogEntry, type AgentMetrics, LogLevel } from '~/lib/modules/logging/SwarmLogger';

interface SwarmDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SwarmDashboard: React.FC<SwarmDashboardProps> = ({ isOpen, onClose }) => {
  const [metrics, setMetrics] = useState<AgentMetrics[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'logs'>('overview');
  const [filter, setFilter] = useState({
    level: LogLevel.INFO,
    startTime: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
  });

  useEffect(() => {
    const updateData = () => {
      setMetrics(swarmLogger.getMetrics());
      setLogs(swarmLogger.getLogs(filter));
    };

    updateData();

    const unsubscribe = swarmLogger.subscribe(() => updateData());
    const interval = setInterval(updateData, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [filter]);

  const performanceData = metrics.map((m) => ({
    agent: m.agentId,
    'Success Rate': (m.successRate * 100).toFixed(1),
    'Error Rate': (m.errorRate * 100).toFixed(1),
    'Response Time': m.responseTime,
  }));

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[var(--z-dialog)]"
            variants={dialogBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div
            className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-[1200px] h-[85vh] bg-bolt-elements-bg-depth-1 border border-bolt-elements-borderColor rounded-lg shadow-lg z-[var(--z-dialog)] p-6"
            variants={dialogVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-xl font-semibold text-bolt-elements-textPrimary">
                Swarm Dashboard
              </Dialog.Title>
              <IconButton
                icon="i-ph:x"
                onClick={onClose}
                className="text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-bg-depth-3 rounded-md transition-all"
              />
            </div>

            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-md ${
                  activeTab === 'overview'
                    ? 'bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text'
                    : 'text-bolt-elements-textSecondary hover:bg-bolt-elements-bg-depth-2'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('metrics')}
                className={`px-4 py-2 rounded-md ${
                  activeTab === 'metrics'
                    ? 'bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text'
                    : 'text-bolt-elements-textSecondary hover:bg-bolt-elements-bg-depth-2'
                }`}
              >
                Detailed Metrics
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-4 py-2 rounded-md ${
                  activeTab === 'logs'
                    ? 'bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text'
                    : 'text-bolt-elements-textSecondary hover:bg-bolt-elements-bg-depth-2'
                }`}
              >
                Logs
              </button>
            </div>

            <div className="h-[calc(100%-8rem)] overflow-auto">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <Grid numItems={2} className="gap-6">
                    <Card>
                      <Title>Success Rate by Agent</Title>
                      <LineChart
                        data={performanceData}
                        index="agent"
                        categories={['Success Rate']}
                        colors={['emerald']}
                        valueFormatter={(value) => `${value}%`}
                        showLegend={false}
                      />
                    </Card>
                    <Card>
                      <Title>Response Time by Agent</Title>
                      <BarChart
                        data={performanceData}
                        index="agent"
                        categories={['Response Time']}
                        colors={['blue']}
                        valueFormatter={(value) => `${value}ms`}
                        showLegend={false}
                      />
                    </Card>
                  </Grid>

                  <div className="grid grid-cols-2 gap-4">
                    {metrics.map((metric) => (
                      <Card key={metric.agentId} className="space-y-4">
                        <Title>{metric.agentId}</Title>
                        <Grid numItems={2} className="gap-4">
                          <div>
                            <Text>Success Rate</Text>
                            <Metric color="emerald">{(metric.successRate * 100).toFixed(1)}%</Metric>
                          </div>
                          <div>
                            <Text>Response Time</Text>
                            <Metric>{metric.responseTime.toFixed(0)}ms</Metric>
                          </div>
                        </Grid>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'metrics' && (
                <div className="space-y-4">
                  {metrics.map((metric) => (
                    <Card key={metric.agentId} className="space-y-6">
                      <Flex>
                        <Title>{metric.agentId}</Title>
                        <Text>Total Requests: {metric.totalRequests}</Text>
                      </Flex>

                      <Grid numItems={2} className="gap-6">
                        <div>
                          <Title>Performance Metrics</Title>
                          <div className="mt-4">
                            <DonutChart
                              data={[
                                {
                                  name: 'Success Rate',
                                  value: metric.successRate * 100,
                                },
                                {
                                  name: 'Error Rate',
                                  value: metric.errorRate * 100,
                                },
                              ]}
                              category="value"
                              index="name"
                              colors={['emerald', 'rose']}
                              valueFormatter={(value) => `${value.toFixed(1)}%`}
                            />
                          </div>
                        </div>
                        <div>
                          <Title>Output Types</Title>
                          <div className="mt-4">
                            <BarChart
                              data={Object.entries(metric.outputTypes).map(([type, count]) => ({
                                type,
                                count,
                              }))}
                              index="type"
                              categories={['count']}
                              colors={['blue']}
                              showLegend={false}
                            />
                          </div>
                        </div>
                      </Grid>
                    </Card>
                  ))}
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="space-y-4">
                  <div className="flex gap-4 mb-4">
                    <select
                      value={filter.level}
                      onChange={(e) => setFilter({ ...filter, level: e.target.value as LogLevel })}
                      className="bg-bolt-elements-bg-depth-2 text-bolt-elements-textPrimary border border-bolt-elements-borderColor rounded-md px-2 py-1"
                      aria-label="Log Level Filter"
                      title="Select Log Level"
                    >
                      {Object.values(LogLevel).map((level) => (
                        <option key={level} value={level}>
                          {level.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    {logs.map((log, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded-md ${
                          log.level === LogLevel.ERROR
                            ? 'bg-red-500/10'
                            : log.level === LogLevel.WARN
                              ? 'bg-yellow-500/10'
                              : 'bg-bolt-elements-bg-depth-2'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-bolt-elements-textTertiary">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              log.level === LogLevel.ERROR
                                ? 'text-red-500'
                                : log.level === LogLevel.WARN
                                  ? 'text-yellow-500'
                                  : 'text-bolt-elements-textSecondary'
                            }`}
                          >
                            {log.level.toUpperCase()}
                          </span>
                          <span className="text-xs text-bolt-elements-textTertiary">[{log.category}]</span>
                        </div>
                        <p className="text-sm text-bolt-elements-textPrimary mt-1">{log.message}</p>
                        {log.metadata && (
                          <pre className="text-xs text-bolt-elements-textTertiary mt-1 overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
