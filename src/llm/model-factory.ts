import { coreProviders, loadDynamicProvider } from './providers';
import { LanguageModelV2 } from '@ai-sdk/provider';

/**
 * Creates a language model instance based on the provider and model name.
 *
 * @param providerModel - A string in the format "provider:model_name" (e.g., "openai:gpt-4").
 * @returns A promise resolving to an instance of LanguageModelV2.
 * @throws {Error} If the provider:model format is invalid or provider is not found.
 *
 * @example
 * ```typescript
 * const model = await getModel('openai:gpt-4');
 * ```
 */
export async function getModel(
  providerModel: string,
): Promise<LanguageModelV2> {
  if (!providerModel) {
    throw new Error(
      'Provider and model metadata not found. Please provide a valid provider:model_name string.',
    );
  }

  const trimmed = providerModel.trim();
  const colonIndex = trimmed.indexOf(':');
  if (colonIndex === -1) {
    throw new Error(
      'Invalid format. Use "provider:model_name", e.g., "openai:gpt-3.5".',
    );
  }
  const provider = trimmed.slice(0, colonIndex);
  const modelName = trimmed.slice(colonIndex + 1);
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
