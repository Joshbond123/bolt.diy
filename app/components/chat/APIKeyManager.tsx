import React, { useState, useEffect, useCallback } from 'react';
import { IconButton } from '~/components/ui/IconButton';
import type { ProviderInfo } from '~/types/model';
import Cookies from 'js-cookie';

interface APIKeyManagerProps {
  provider: ProviderInfo;
  apiKey: string;
  setApiKey: (key: string) => void;
  getApiKeyLink?: string;
  labelForGetApiKey?: string;
}

const CEREBRAS_PROVIDER_NAME = 'Cerebras';

// cache which stores whether the provider's API key is set via environment variable
const providerEnvKeyStatusCache: Record<string, boolean> = {};

const apiKeyMemoizeCache: { [k: string]: Record<string, string> } = {};

export function getApiKeysFromCookies() {
  const storedApiKeys = Cookies.get('apiKeys');
  let parsedKeys: Record<string, string> = {};

  if (storedApiKeys) {
    parsedKeys = apiKeyMemoizeCache[storedApiKeys];

    if (!parsedKeys) {
      parsedKeys = apiKeyMemoizeCache[storedApiKeys] = JSON.parse(storedApiKeys);
    }
  }

  return parsedKeys;
}

const parseKeyList = (keyString: string) =>
  keyString
    .split(/[,\n]/)
    .map((key) => key.trim())
    .filter(Boolean);

const persistKeyToLocalFileDb = async (providerName: string, value: string) => {
  try {
    await fetch('/api/localdb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ provider: providerName, key: value }),
    });
  } catch (error) {
    console.warn('Failed to persist API key to local file database:', error);
  }
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const APIKeyManager: React.FC<APIKeyManagerProps> = ({ provider, apiKey, setApiKey }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);
  const [isEnvKeySet, setIsEnvKeySet] = useState(false);
  const [newCerebrasKey, setNewCerebrasKey] = useState('');

  const isCerebras = provider.name === CEREBRAS_PROVIDER_NAME;
  const cerebrasKeys = parseKeyList(tempKey);

  const saveApiKey = (value: string) => {
    setApiKey(value);

    const currentKeys = getApiKeysFromCookies();
    const newKeys = { ...currentKeys, [provider.name]: value };
    Cookies.set('apiKeys', JSON.stringify(newKeys));

    persistKeyToLocalFileDb(provider.name, value);
  };

  // Reset states and load saved key when provider changes
  useEffect(() => {
    const savedKeys = getApiKeysFromCookies();
    const savedKey = savedKeys[provider.name] || '';

    setTempKey(savedKey);
    setApiKey(savedKey);
    setNewCerebrasKey('');
    setIsEditing(false);
  }, [provider.name]);

  const checkEnvApiKey = useCallback(async () => {
    if (providerEnvKeyStatusCache[provider.name] !== undefined) {
      setIsEnvKeySet(providerEnvKeyStatusCache[provider.name]);
      return;
    }

    try {
      const response = await fetch(`/api/check-env-key?provider=${encodeURIComponent(provider.name)}`);
      const data = await response.json();
      const isSet = (data as { isSet: boolean }).isSet;
      providerEnvKeyStatusCache[provider.name] = isSet;
      setIsEnvKeySet(isSet);
    } catch (error) {
      console.error('Failed to check environment API key:', error);
      setIsEnvKeySet(false);
    }
  }, [provider.name]);

  useEffect(() => {
    checkEnvApiKey();
  }, [checkEnvApiKey]);

  const handleSave = () => {
    saveApiKey(tempKey);
    setIsEditing(false);
  };

  const handleAddCerebrasKey = () => {
    const sanitized = newCerebrasKey.trim();

    if (!sanitized || cerebrasKeys.includes(sanitized)) {
      return;
    }

    const updatedKeys = [...cerebrasKeys, sanitized].join('\n');
    setTempKey(updatedKeys);
    saveApiKey(updatedKeys);
    setNewCerebrasKey('');
  };

  const handleDeleteCerebrasKey = (index: number) => {
    const updatedKeys = cerebrasKeys.filter((_, keyIndex) => keyIndex !== index).join('\n');
    setTempKey(updatedKeys);
    saveApiKey(updatedKeys);
  };

  return (
    <div className="flex items-center justify-between py-3 px-1">
      <div className="flex items-center gap-2 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-bolt-elements-textSecondary">
            {provider?.name} API Key{isCerebras ? 's' : ''}:
          </span>
          {!isEditing && (
            <div className="flex items-center gap-2">
              {apiKey ? (
                <>
                  <div className="i-ph:check-circle-fill text-green-500 w-4 h-4" />
                  <span className="text-xs text-green-500">
                    {isCerebras ? `${parseKeyList(apiKey).length} keys set via UI` : 'Set via UI'}
                  </span>
                </>
              ) : isEnvKeySet ? (
                <>
                  <div className="i-ph:check-circle-fill text-green-500 w-4 h-4" />
                  <span className="text-xs text-green-500">Set via environment variable</span>
                </>
              ) : (
                <>
                  <div className="i-ph:x-circle-fill text-red-500 w-4 h-4" />
                  <span className="text-xs text-red-500">Not Set (Please set via UI or ENV_VAR)</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isEditing ? (
          isCerebras ? (
            <div className="w-[440px] rounded border border-bolt-elements-borderColor bg-bolt-elements-prompt-background p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-bolt-elements-textSecondary">
                  Add multiple Cerebras keys. Requests rotate keys automatically to reduce rate-limit issues.
                </p>
                <IconButton onClick={() => setIsEditing(false)} title="Done" className="text-green-500">
                  <div className="i-ph:check w-4 h-4" />
                </IconButton>
              </div>
              <div className="mb-2 flex gap-2">
                <input
                  type="password"
                  value={newCerebrasKey}
                  placeholder="Paste a Cerebras API key"
                  onChange={(e) => setNewCerebrasKey(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm rounded border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus"
                />
                <IconButton
                  onClick={handleAddCerebrasKey}
                  title="Add Key"
                  className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-500"
                >
                  <div className="i-ph:plus w-4 h-4" />
                </IconButton>
              </div>
              <div className="max-h-32 space-y-1 overflow-auto pr-1">
                {cerebrasKeys.length === 0 ? (
                  <p className="text-xs text-bolt-elements-textTertiary">No keys added yet.</p>
                ) : (
                  cerebrasKeys.map((_, index) => (
                    <div
                      key={`${provider.name}-key-${index}`}
                      className="flex items-center justify-between rounded border border-bolt-elements-borderColor px-2 py-1"
                    >
                      <span className="text-xs text-bolt-elements-textSecondary">Key #{index + 1}</span>
                      <IconButton
                        onClick={() => handleDeleteCerebrasKey(index)}
                        title="Delete Key"
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500"
                      >
                        <div className="i-ph:trash w-4 h-4" />
                      </IconButton>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={tempKey}
                placeholder="Enter API Key"
                onChange={(e) => setTempKey(e.target.value)}
                className="w-[300px] px-3 py-1.5 text-sm rounded border border-bolt-elements-borderColor 
                        bg-bolt-elements-prompt-background text-bolt-elements-textPrimary 
                        focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus"
              />
              <IconButton
                onClick={handleSave}
                title="Save API Key"
                className="bg-green-500/10 hover:bg-green-500/20 text-green-500"
              >
                <div className="i-ph:check w-4 h-4" />
              </IconButton>
              <IconButton
                onClick={() => setIsEditing(false)}
                title="Cancel"
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500"
              >
                <div className="i-ph:x w-4 h-4" />
              </IconButton>
            </div>
          )
        ) : (
          <>
            <IconButton
              onClick={() => setIsEditing(true)}
              title={isCerebras ? 'Manage API Keys' : 'Edit API Key'}
              className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-500"
            >
              <div className={isCerebras ? 'i-ph:key w-4 h-4' : 'i-ph:pencil-simple w-4 h-4'} />
            </IconButton>
            {provider?.getApiKeyLink && !apiKey && (
              <IconButton
                onClick={() => window.open(provider?.getApiKeyLink)}
                title="Get API Key"
                className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 flex items-center gap-2"
              >
                <span className="text-xs whitespace-nowrap">{provider?.labelForGetApiKey || 'Get API Key'}</span>
                <div className={`${provider?.icon || 'i-ph:key'} w-4 h-4`} />
              </IconButton>
            )}
          </>
        )}
      </div>
    </div>
  );
};
