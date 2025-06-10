import * as Collapsible from '@radix-ui/react-collapsible';
import React from 'react';
import { APIKeyManager } from './APIKeyManager';
import { ModelSelector } from './ModelSelector';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { ProviderInfo } from '~/types/model';
import { PROVIDER_LIST } from '~/utils/constants';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  model?: string;
  setModel?: (model: string) => void;
  provider?: ProviderInfo;
  setProvider?: (provider: ProviderInfo) => void;
  apiKeys: Record<string, string>;
  setApiKeys: (keys: Record<string, string>) => void;
  modelList?: ModelInfo[];
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  model,
  setModel,
  provider,
  setProvider,
  apiKeys,
  setApiKeys,
  modelList = [],
}) => {
  const [modelSettingsOpen, setModelSettingsOpen] = React.useState(true);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = React.useState(false);

  return (
    <div
      className={`fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 shadow-lg transform transition-transform ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
        <h2 className="text-lg font-semibold">Settings</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          aria-label="Close settings"
        >
          <div className="i-ph:x text-xl" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        <Collapsible.Root open={modelSettingsOpen} onOpenChange={setModelSettingsOpen}>
          <Collapsible.Trigger asChild>
            <button className="flex justify-between items-center w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <span className="font-medium">Model Settings</span>
              <div
                className={`i-ph:caret-down text-xl transition-transform ${modelSettingsOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </Collapsible.Trigger>

          <Collapsible.Content className="space-y-4 mt-2">
            <ModelSelector
              model={model}
              setModel={setModel}
              provider={provider}
              setProvider={setProvider}
              modelList={modelList}
              providerList={Array.from(PROVIDER_LIST)}
              apiKeys={apiKeys}
            />{' '}
            {provider && setApiKeys && (
              <APIKeyManager
                provider={provider}
                apiKey={apiKeys[provider.name] || ''}
                setApiKey={(key) => {
                  const newApiKeys = { ...apiKeys, [provider.name]: key };
                  setApiKeys(newApiKeys);
                }}
              />
            )}
          </Collapsible.Content>
        </Collapsible.Root>

        <Collapsible.Root open={advancedSettingsOpen} onOpenChange={setAdvancedSettingsOpen}>
          <Collapsible.Trigger asChild>
            <button className="flex justify-between items-center w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <span className="font-medium">Advanced Settings</span>
              <div
                className={`i-ph:caret-down text-xl transition-transform ${advancedSettingsOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </Collapsible.Trigger>

          <Collapsible.Content className="space-y-4 mt-2">
            {/* Add advanced settings here */}
            <div className="text-sm text-gray-500 dark:text-gray-400">Advanced settings coming soon...</div>
          </Collapsible.Content>
        </Collapsible.Root>
      </div>
    </div>
  );
};
