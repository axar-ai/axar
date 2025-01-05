import {
  coreProviders,
  dynamicProviderCache,
  loadDynamicProvider,
} from '../../../src/llm/providers';
import { ProviderV1 } from '@ai-sdk/provider';

// Mock dynamic imports
jest.mock(
  '@ai-sdk/cohere',
  () => ({
    cohere: {
      languageModel: jest.fn(),
    },
  }),
  { virtual: true },
);

jest.mock(
  '@ai-sdk/invalid-provider',
  () => ({
    'invalid-provider': {},
  }),
  { virtual: true },
);

describe('providers.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the dynamicProviderCache
    Object.keys(dynamicProviderCache).forEach(
      (key) => delete dynamicProviderCache[key],
    );
  });

  describe('coreProviders', () => {
    it('should have predefined core providers', () => {
      expect(coreProviders).toHaveProperty('openai');
      expect(coreProviders).toHaveProperty('anthropic');
    });
  });

  describe('loadDynamicProvider', () => {
    it('should return a provider from the cache if it exists', async () => {
      const mockProvider: ProviderV1 = {
        languageModel: jest.fn(),
        textEmbeddingModel: jest.fn(),
      };
      dynamicProviderCache['cohere'] = mockProvider;

      const provider = await loadDynamicProvider('cohere');
      expect(provider).toBe(mockProvider);
    });

    it('should dynamically import and cache a valid provider', async () => {
      const provider = await loadDynamicProvider('cohere');
      expect(provider).toBe(dynamicProviderCache['cohere']);
      expect(provider.languageModel).toBeDefined();
    });

    it('should throw an error if the provider does not implement ProviderV1', async () => {
      await expect(loadDynamicProvider('invalid-provider')).rejects.toThrow(
        'does not implement the ProviderV1 interface',
      );
    });

    it('should throw an error if the module is not found', async () => {
      await expect(loadDynamicProvider('nonexistent-provider')).rejects.toThrow(
        'The provider "nonexistent-provider" is not installed.',
      );
    });

    it('should throw a generic error if dynamic import fails for another reason', async () => {
      jest.mock(
        '@ai-sdk/failing-provider',
        () => {
          throw new Error('Unexpected error');
        },
        { virtual: true },
      );

      await expect(loadDynamicProvider('failing-provider')).rejects.toThrow(
        'Unexpected error',
      );
    });
  });
});
