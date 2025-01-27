import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useSettings } from '~/lib/hooks/useSettings';

interface ProviderStatus {
  name: string;
  enabled: boolean;
  isLocal: boolean;
  isRunning: boolean | null;
  error?: string;
  lastChecked: Date;
  responseTime?: number;
  url: string | null;
}

interface SystemInfo {
  os: string;
  arch: string;
  memory: {
    total: string;
    free: string;
    used: string;
  };
  uptime: string;
  node: string;
  v8: string;
}

interface IProviderConfig {
  name: string;
  settings: {
    enabled: boolean;
    baseUrl?: string;
  };
}

interface CommitData {
  commit: string;
  version?: string;
}

const connitJson: CommitData = {
  commit: __COMMIT_HASH,
  version: __APP_VERSION,
};

const LOCAL_PROVIDERS = ['Ollama', 'LMStudio', 'OpenAILike'];

const versionHash = connitJson.commit;
const versionTag = connitJson.version;

const providerBaseUrlEnvKeys: Record<string, { baseUrlKey: string }> = {
  Anthropic: { baseUrlKey: 'ANTHROPIC_API_URL' },
  OpenAI: { baseUrlKey: 'OPENAI_API_URL' },
};

const GITHUB_URLS = {
  commitJson: async (branch: string) => {
    try {
      const response = await fetch(`https://api.github.com/repos/stackblitz-labs/bolt.diy/commits/${branch}`);
      const data: { sha: string } = await response.json();

      const packageJsonResp = await fetch(
        `https://raw.githubusercontent.com/stackblitz-labs/bolt.diy/${branch}/package.json`,
      );
      const packageJson: { version: string } = await packageJsonResp.json();

      return {
        commit: data.sha.slice(0, 7),
        version: packageJson.version,
      };
    } catch (error) {
      console.log('Failed to fetch local commit info:', error);
      throw new Error('Failed to fetch local commit info');
    }
  },
};

const checkProviderStatus = async (url: string | null, providerName: string): Promise<ProviderStatus> => {
  if (!url) {
    return {
      name: providerName,
      enabled: false,
      isLocal: true,
      isRunning: false,
      error: 'No URL configured',
      lastChecked: new Date(),
      url: null,
    };
  }

  const startTime = performance.now();

  try {
    const checkUrls = [`${url}/api/health`, url.endsWith('v1') ? `${url}/models` : `${url}/v1/models`];

    const results = await Promise.all(
      checkUrls.map(async (checkUrl) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(checkUrl, {
            signal: controller.signal,
            headers: {
              Accept: 'application/json',
            },
          });
          clearTimeout(timeoutId);

          const ok = response.ok;

          if (ok) {
            try {
              const data = await response.json();

              console.log(`[Debug] Endpoint ${checkUrl} data:`, data);
            } catch {
              console.log(`[Debug] Could not parse JSON from ${checkUrl}`);
            }
          }

          return ok;
        } catch (error) {
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              return false;
            }

            console.log(`[Debug] Endpoint ${checkUrl} failed:`, error);
          }

          return false;
        }
      }),
    );

    const isRunning = results.some((result) => result);

    return {
      name: providerName,
      enabled: false,
      isLocal: true,
      isRunning,
      lastChecked: new Date(),
      responseTime: performance.now() - startTime,
      url,
    };
  } catch (error) {
    return {
      name: providerName,
      enabled: false,
      isLocal: true,
      isRunning: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date(),
      responseTime: performance.now() - startTime,
      url,
    };
  }
};

export default function DebugTab() {
  const { providers, isLatestBranch } = useSettings();
  const [activeProviders, setActiveProviders] = useState<ProviderStatus[]>([]);
  const [updateMessage, setUpdateMessage] = useState<string>('');
  const [systemInfo] = useState<SystemInfo>(() => {
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) {
        return '0 B';
      }

      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));

      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    return {
      os: navigator.platform,
      arch: navigator.userAgent,
      memory: {
        total: formatBytes(8 * 1024 * 1024 * 1024),
        free: 'Not available',
        used: 'Not available',
      },
      uptime: 'Not available',
      node: 'Not available',
      v8: 'Not available',
    };
  });
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const updateProviderStatuses = useCallback(async () => {
    if (!providers) {
      return;
    }

    try {
      const entries = Object.entries(providers) as [string, IProviderConfig][];
      const statuses = await Promise.all(
        entries
          .filter(([, provider]) => LOCAL_PROVIDERS.includes(provider.name))
          .map(async ([, provider]) => {
            const baseUrlKey =
              provider.name in providerBaseUrlEnvKeys
                ? providerBaseUrlEnvKeys[provider.name].baseUrlKey
                : `REACT_APP_${provider.name.toUpperCase()}_URL`;

            let settingsUrl = provider.settings.baseUrl;

            if (settingsUrl && settingsUrl.trim().length === 0) {
              settingsUrl = undefined;
            }

            const url = settingsUrl || import.meta.env[baseUrlKey] || null;
            console.log(`[Debug] Using URL for ${provider.name}:`, url, `(from ${baseUrlKey})`);

            const status = await checkProviderStatus(url, provider.name);

            return {
              ...status,
              enabled: provider.settings.enabled ?? false,
            };
          }),
      );

      setActiveProviders(statuses);
    } catch (error) {
      console.error('[Debug] Failed to update provider statuses:', error);
    }
  }, [providers]);

  useEffect(() => {
    updateProviderStatuses();

    const interval = setInterval(updateProviderStatuses, 30000);

    return () => clearInterval(interval);
  }, [updateProviderStatuses]);

  const handleCheckForUpdate = useCallback(async () => {
    if (isCheckingUpdate) {
      return;
    }

    try {
      setIsCheckingUpdate(true);
      setUpdateMessage('Checking for updates...');

      const branchToCheck = isLatestBranch ? 'main' : 'stable';
      const latestCommitResp = await GITHUB_URLS.commitJson(branchToCheck);

      const remoteCommitHash = latestCommitResp.commit;
      const currentCommitHash = versionHash;

      if (remoteCommitHash !== currentCommitHash) {
        setUpdateMessage(
          `Update available from ${branchToCheck} branch!\n` +
            `Current: ${currentCommitHash.slice(0, 7)}\n` +
            `Latest: ${remoteCommitHash.slice(0, 7)}`,
        );
      } else {
        setUpdateMessage(`You are on the latest version from the ${branchToCheck} branch`);
      }
    } catch (error) {
      setUpdateMessage('Failed to check for updates');
      console.error('[Debug] Failed to check for updates:', error);
    } finally {
      setIsCheckingUpdate(false);
    }
  }, [isCheckingUpdate, isLatestBranch]);

  const handleCopyToClipboard = useCallback(() => {
    const debugInfo = {
      System: systemInfo,
      Providers: activeProviders.map((provider) => ({
        name: provider.name,
        enabled: provider.enabled,
        isLocal: provider.isLocal,
        running: provider.isRunning,
        error: provider.error,
        lastChecked: provider.lastChecked,
        responseTime: provider.responseTime,
        url: provider.url,
      })),
      Version: {
        hash: versionHash.slice(0, 7),
        branch: isLatestBranch ? 'main' : 'stable',
      },
      Timestamp: new Date().toISOString(),
    };

    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2)).then(() => {
      toast.success('Debug information copied to clipboard!');
    });
  }, [activeProviders, systemInfo, isLatestBranch]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-bolt-elements-textPrimary">Debug Information</h3>
        <div className="flex gap-2">
          <button
            onClick={handleCopyToClipboard}
            className="bg-bolt-elements-button-primary-background rounded-lg px-4 py-2 transition-colors duration-200 hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text"
          >
            Copy Debug Info
          </button>
          <button
            onClick={handleCheckForUpdate}
            disabled={isCheckingUpdate}
            className={`bg-bolt-elements-button-primary-background rounded-lg px-4 py-2 transition-colors duration-200
              ${!isCheckingUpdate ? 'hover:bg-bolt-elements-button-primary-backgroundHover' : 'opacity-75 cursor-not-allowed'}
              text-bolt-elements-button-primary-text`}
          >
            {isCheckingUpdate ? 'Checking...' : 'Check for Updates'}
          </button>
        </div>
      </div>

      {updateMessage && (
        <div
          className={`bg-bolt-elements-surface rounded-lg p-3 ${
            updateMessage.includes('Update available') ? 'border-l-4 border-yellow-400' : ''
          }`}
        >
          <p className="text-bolt-elements-textSecondary whitespace-pre-line">{updateMessage}</p>
          {updateMessage.includes('Update available') && (
            <div className="mt-3 text-sm">
              <p className="font-medium text-bolt-elements-textPrimary">To update:</p>
              <ol className="list-decimal ml-4 mt-1 text-bolt-elements-textSecondary">
                <li>
                  Pull the latest changes:{' '}
                  <code className="bg-bolt-elements-surface-hover px-1 rounded">git pull upstream main</code>
                </li>
                <li>
                  Install any new dependencies:{' '}
                  <code className="bg-bolt-elements-surface-hover px-1 rounded">pnpm install</code>
                </li>
                <li>Restart the application</li>
              </ol>
            </div>
          )}
        </div>
      )}

      <section className="space-y-4">
        <div>
          <h4 className="text-md font-medium text-bolt-elements-textPrimary mb-2">System Information</h4>
          <div className="bg-bolt-elements-surface rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-bolt-elements-textSecondary">Operating System</p>
                <p className="text-sm font-medium text-bolt-elements-textPrimary">{systemInfo.os}</p>
              </div>
              <div>
                <p className="text-xs text-bolt-elements-textSecondary">Architecture</p>
                <p className="text-sm font-medium text-bolt-elements-textPrimary">{systemInfo.arch}</p>
              </div>
              <div>
                <p className="text-xs text-bolt-elements-textSecondary">Total Memory</p>
                <p className="text-sm font-medium text-bolt-elements-textPrimary">{systemInfo.memory.total}</p>
              </div>
              <div>
                <p className="text-xs text-bolt-elements-textSecondary">Free Memory</p>
                <p className="text-sm font-medium text-bolt-elements-textPrimary">{systemInfo.memory.free}</p>
              </div>
              <div>
                <p className="text-xs text-bolt-elements-textSecondary">Used Memory</p>
                <p className="text-sm font-medium text-bolt-elements-textPrimary">{systemInfo.memory.used}</p>
              </div>
              <div>
                <p className="text-xs text-bolt-elements-textSecondary">Uptime</p>
                <p className="text-sm font-medium text-bolt-elements-textPrimary">{systemInfo.uptime}</p>
              </div>
              <div>
                <p className="text-xs text-bolt-elements-textSecondary">Node.js Version</p>
                <p className="text-sm font-medium text-bolt-elements-textPrimary">{systemInfo.node}</p>
              </div>
              <div>
                <p className="text-xs text-bolt-elements-textSecondary">V8 Version</p>
                <p className="text-sm font-medium text-bolt-elements-textPrimary">{systemInfo.v8}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-bolt-elements-surface-hover">
              <p className="text-xs text-bolt-elements-textSecondary">Version</p>
              <p className="text-sm font-medium text-bolt-elements-textPrimary font-mono">
                {connitJson.commit.slice(0, 7)}
                <span className="ml-2 text-xs text-bolt-elements-textSecondary">
                  (v{versionTag || '0.0.1'}) - {isLatestBranch ? 'nightly' : 'stable'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-bolt-elements-textPrimary mb-2">Local LLM Status</h4>
          <div className="bg-bolt-elements-surface rounded-lg">
            <div className="grid grid-cols-1 divide-y">
              {activeProviders.map((provider) => (
                <div key={provider.name} className="p-3 flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            !provider.enabled ? 'bg-gray-300' : provider.isRunning ? 'bg-green-400' : 'bg-red-400'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-bolt-elements-textPrimary">{provider.name}</p>
                        {provider.url && (
                          <p className="text-xs text-bolt-elements-textSecondary truncate max-w-[300px]">
                            {provider.url}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          provider.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {provider.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      {provider.enabled && (
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            provider.isRunning ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {provider.isRunning ? 'Running' : 'Not Running'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pl-5 flex flex-col space-y-1 text-xs">
                    <div className="flex flex-wrap gap-2">
                      <span className="text-bolt-elements-textSecondary">
                        Last checked: {new Date(provider.lastChecked).toLocaleTimeString()}
                      </span>
                      {provider.responseTime && (
                        <span className="text-bolt-elements-textSecondary">
                          Response time: {Math.round(provider.responseTime)}ms
                        </span>
                      )}
                    </div>

                    {provider.error && (
                      <div className="mt-1 text-red-600 bg-red-50 rounded-md p-2">
                        <span className="font-medium">Error:</span> {provider.error}
                      </div>
                    )}

                    {provider.url && (
                      <div className="text-bolt-elements-textSecondary">
                        <span className="font-medium">Endpoints checked:</span>
                        <ul className="list-disc list-inside pl-2 mt-1">
                          <li>{provider.url} (root)</li>
                          <li>{provider.url}/api/health</li>
                          <li>{provider.url}/v1/models</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {activeProviders.length === 0 && (
                <div className="p-4 text-center text-bolt-elements-textSecondary">No local LLMs configured</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
