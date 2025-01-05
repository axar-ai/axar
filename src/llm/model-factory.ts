import { coreProviders, loadDynamicProvider } from './providers';
import { LanguageModelV1 } from '@ai-sdk/provider';

/**
 * Create a language model instance based on the provider and model name.
 * @param providerModel A string in the format "provider:model_name".
 * @returns A promise resolving to an instance of LanguageModelV1.
 */
export async function getModel(
  providerModel: string,
): Promise<LanguageModelV1> {
  if (!providerModel) {
    throw new Error(
      'Provider and model metadata not found. Please provide a valid provider:model_name string.',
    );
  }

  const [provider, modelName] = providerModel.trim().split(':');
  if (!provider || !modelName) {
    throw new Error(
      'Invalid format. Use "provider:model_name", e.g., "openai:gpt-3.5".',
    );
  }

  const normalizedProvider = provider.toLowerCase();

  // Check if the provider exists in coreProviders
  if (coreProviders[normalizedProvider]) {
    const providerFunction = coreProviders[normalizedProvider];
    return providerFunction.languageModel(modelName); // Directly invoke the static provider
  }

  // Fallback to dynamic provider loading
  const providerFunction = await loadDynamicProvider(normalizedProvider);
  return providerFunction.languageModel(modelName); // Invoke the dynamically loaded provider
}
