import { useEffect, useMemo } from 'react';
import { ALLOWED_MODELS, getModelByName } from '~/lib/constants/allowedModels';
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from '~/lib/constants/models';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { ProviderInfo } from '~/types/model';

interface ModelSelectorProps {
  model?: string;
  setModel?: (model: string) => void;
  provider?: ProviderInfo;
  setProvider?: (provider: ProviderInfo) => void;
  modelList: ModelInfo[];
  providerList: ProviderInfo[];
  apiKeys: Record<string, string>;
}

export const ModelSelector = ({
  model,
  setModel,
  provider,
  setProvider,
  providerList,
  apiKeys,
}: ModelSelectorProps) => {
  // Validate and set default model if needed
  useEffect(() => {
    if (!model || !getModelByName(model)) {
      setModel?.(DEFAULT_MODEL);

      const defaultProvider = providerList.find((p) => p.name === DEFAULT_PROVIDER);

      if (defaultProvider) {
        setProvider?.(defaultProvider);
      }
    }
  }, [model, setModel, setProvider, providerList]);

  const filteredModels = useMemo(() => {
    return ALLOWED_MODELS.filter((m) => m.provider === provider?.name);
  }, [provider]);

  if (!provider || filteredModels.length === 0) {
    return (
      <div className="mb-2 p-4 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-prompt-background text-bolt-elements-textPrimary">
        <p className="text-center">Please select a valid provider to continue.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="provider-select" className="text-sm font-medium text-bolt-elements-textSecondary">
          Provider
        </label>
        <select
          id="provider-select"
          value={provider?.name || DEFAULT_PROVIDER}
          onChange={(e) => {
            const newProvider = providerList.find((p) => p.name === e.target.value);

            if (newProvider) {
              setProvider?.(newProvider);

              // Reset model when provider changes
              const firstModel = filteredModels[0]?.apiModelName || DEFAULT_MODEL;
              setModel?.(firstModel);
            }
          }}
          className="w-full px-3 py-2 text-bolt-elements-select-text bg-bolt-elements-select-background border border-bolt-elements-select-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
          aria-label="Select provider"
          title="Select AI provider"
        >
          {providerList.map((p) => (
            <option
              key={p.name}
              value={p.name}
              className="text-bolt-elements-select-text bg-bolt-elements-select-background"
            >
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="model-select" className="text-sm font-medium text-bolt-elements-textSecondary">
          Model
        </label>
        <select
          id="model-select"
          value={model || DEFAULT_MODEL}
          onChange={(e) => setModel?.(e.target.value)}
          className="w-full px-3 py-2 text-bolt-elements-select-text bg-bolt-elements-select-background border border-bolt-elements-select-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
          aria-label="Select model"
          title="Select AI model"
        >
          {filteredModels.map((m) => (
            <option
              key={m.apiModelName}
              value={m.apiModelName}
              className="text-bolt-elements-select-text bg-bolt-elements-select-background"
            >
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {provider?.getApiKeyLink && !apiKeys?.[provider.name] && (
        <a
          href={provider.getApiKeyLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-accent-500 hover:text-accent-600 mt-1"
        >
          {provider.labelForGetApiKey || 'Get API Key'}
        </a>
      )}
    </div>
  );
};
