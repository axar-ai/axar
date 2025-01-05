import { getModel } from '../../../src/llm/model-factory';
import { coreProviders, loadDynamicProvider } from '../../../src/llm/providers';
import { LanguageModelV1 } from '@ai-sdk/provider';

// Mock the coreProviders and dynamic provider loader
jest.mock('../../../src/llm/providers', () => ({
  coreProviders: {
    openai: {
      languageModel: jest.fn(),
    },
  },
  loadDynamicProvider: jest.fn(),
}));

describe('getModel', () => {
  const mockLanguageModel: LanguageModelV1 = {
    specificationVersion: 'v1',
    provider: 'test-provider',
    modelId: 'test-model',
    defaultObjectGenerationMode: 'json',
    doGenerate: jest.fn(),
    doStream: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a model from coreProviders for a valid core provider', async () => {
    const providerName = 'openai';
    const modelName = 'gpt-4';
    const providerKey = providerName.toLowerCase();

    // Mock the coreProviders behavior
    (coreProviders[providerKey].languageModel as jest.Mock).mockResolvedValue(
      mockLanguageModel,
    );

    const model = await getModel(`${providerName}:${modelName}`);

    expect(coreProviders[providerKey].languageModel).toHaveBeenCalledWith(
      modelName,
    );
    expect(model).toEqual(mockLanguageModel);
  });

  it('should return a model from a dynamically loaded provider', async () => {
    const providerName = 'anthropic';
    const modelName = 'claude-2';

    const mockDynamicProvider = {
      languageModel: jest.fn().mockResolvedValue(mockLanguageModel),
    };

    // Mock the dynamic provider loader
    (loadDynamicProvider as jest.Mock).mockResolvedValue(mockDynamicProvider);

    const model = await getModel(`${providerName}:${modelName}`);

    expect(loadDynamicProvider).toHaveBeenCalledWith(
      providerName.toLowerCase(),
    );
    expect(mockDynamicProvider.languageModel).toHaveBeenCalledWith(modelName);
    expect(model).toEqual(mockLanguageModel);
  });

  it('should throw an error for an invalid provider:model format', async () => {
    await expect(getModel('invalid_format')).rejects.toThrow(
      'Invalid format. Use "provider:model_name", e.g., "openai:gpt-3.5".',
    );
  });

  it('should throw an error if the dynamic provider loader fails', async () => {
    const providerName = 'unknown-provider';
    const modelName = 'some-model';

    // Mock the dynamic provider loader to throw an error
    (loadDynamicProvider as jest.Mock).mockRejectedValue(
      new Error(`The provider "${providerName}" is not installed.`),
    );

    await expect(getModel(`${providerName}:${modelName}`)).rejects.toThrow(
      `The provider "${providerName}" is not installed.`,
    );
  });
});
