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
  '@ai-sdk/azure',
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
    // Mock console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
      jest.mock('@ai-sdk/openai', () => ({
        openai: {
          languageModel: jest.fn()
        },
      })); 
      const provider = await loadDynamicProvider('openai');
      expect(provider).toBe(dynamicProviderCache['openai']);
      expect(provider.languageModel).toBeDefined();
    });

    it('should throw error for empty provider name', async () => {
      await expect(loadDynamicProvider('')).rejects.toThrow(
        'Provider name is required',
      );
    });

    it('should throw error if package is not installed', async () => {
      await expect(loadDynamicProvider('cohere')).rejects.toThrow(/is not installed. Please install/);
    });

    it('should throw error for invalid provider implementation', async () => {
      jest.resetModules();
      jest.mock('@ai-sdk/openai', () => ({
        openai: {},
      }));
      await expect(loadDynamicProvider('openai')).rejects.toThrow(/does not implement the ProviderV1 interface in the module/);
    });

    it('should throw error for non-existent provider', async () => {
      await expect(loadDynamicProvider('non-existent')).rejects.toThrow(
        'Unsupported provider',
      );
    });
  });
});
