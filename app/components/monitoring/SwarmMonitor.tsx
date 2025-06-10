import React, { useState, useEffect } from 'react';
import { swarmLogger } from '~/lib/modules/logging/SwarmLogger';

const SwarmMonitor: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = swarmLogger.subscribe((entry) => {
      setLogs((prevLogs) => [...prevLogs, entry]);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div>
      <h2>Swarm Monitoring</h2>
      <div>
        {logs.map((log, index) => (
          <div key={index}>{log.message}</div>
        ))}
      </div>
    </div>
  );
};

export default SwarmMonitor;
