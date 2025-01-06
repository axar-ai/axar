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
  });
});
