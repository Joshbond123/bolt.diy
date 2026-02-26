import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const providerKeyRotationIndex: Record<string, number> = {};

export default class CerebrasProvider extends BaseProvider {
  name = 'Cerebras';
  getApiKeyLink = 'https://cloud.cerebras.ai/platform/api-keys';

  config = {
    baseUrl: 'https://api.cerebras.ai/v1',
    baseUrlKey: 'CEREBRAS_API_BASE_URL',
    apiTokenKey: 'CEREBRAS_API_KEY',
  };

  staticModels: ModelInfo[] = [
    {
      name: 'gpt-oss-120b',
      label: 'GPT-OSS 120B',
      provider: 'Cerebras',
      maxTokenAllowed: 32000,
    },
  ];

  private _getAllApiKeys(rawApiKey: string | undefined) {
    return (rawApiKey || '')
      .split(/[,\n]/)
      .map((key) => key.trim())
      .filter(Boolean);
  }

  private _getRotatedApiKey(rawApiKey: string | undefined) {
    const keys = this._getAllApiKeys(rawApiKey);

    if (keys.length === 0) {
      return undefined;
    }

    const currentIndex = providerKeyRotationIndex[this.name] || 0;
    const selectedKey = keys[currentIndex % keys.length];
    providerKeyRotationIndex[this.name] = (currentIndex + 1) % keys.length;

    return selectedKey;
  }

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { baseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: 'CEREBRAS_API_BASE_URL',
      defaultApiTokenKey: 'CEREBRAS_API_KEY',
    });

    if (!baseUrl) {
      throw new Error(`Missing API base URL for ${this.name} provider`);
    }

    const rotatedKey = this._getRotatedApiKey(apiKey);

    if (!rotatedKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const cerebras = createOpenAI({
      apiKey: rotatedKey,
      baseURL: baseUrl,
    });

    return cerebras(model);
  }
}
