import { ProviderV1 } from '@ai-sdk/provider';
import * as OpenAI from '@ai-sdk/openai';
import * as Anthropic from '@ai-sdk/anthropic';

/**
 * Map of core provider implementations that are available by default.
 * Includes built-in providers like OpenAI and Anthropic.
 */
export const coreProviders: Record<string, ProviderV1> = {
  openai: OpenAI.openai,
  anthropic: Anthropic.anthropic,
};

/**
 * Map of all provider implementations that are available by default.
 * Includes built-in providers like OpenAI and Anthropic.
 */
const SupportedProviders = [
  {
    name: 'openai',
    package: '@ai-sdk/openai',
    exportedAs: 'openai'
  },
  {
    name: 'anthropic',
    package: '@ai-sdk/anthropic',
    exportedAs: 'anthropic'
  },
  {
    name: 'ollama',
    package: 'ollama-ai-provider',
    exportedAs: 'ollama'
  }
]

/**
 * Cache for dynamically loaded providers to avoid repeated imports.
 */
export const dynamicProviderCache: Record<string, ProviderV1> = {};

/**
 * Dynamically loads a provider implementation by name.
 *
 * @param providerName - The name of the provider to load (e.g., "cohere", "azure")
 * @returns Promise resolving to the provider implementation
 * @throws {Error} If the provider module is not found or doesn't implement ProviderV1
 *
 * @example
 * ```typescript
 * const cohereProvider = await loadDynamicProvider('cohere');
 * ```
 */
export async function loadDynamicProvider(
  providerName: string,
): Promise<ProviderV1> {
  if (!providerName) {
    throw new Error('Provider name is required to load a provider.');
  }

  if (dynamicProviderCache[providerName]) {
    return dynamicProviderCache[providerName];
  }

  try {
    const selectedProvider = SupportedProviders.find(provider => provider.name === providerName);
    if (!selectedProvider) {
      throw new Error(
        `Unsupported provider ${selectedProvider}. Please see the supported list of provider here: https://https://axar-ai.gitbook.io/axar/basics/model`
      );
    }

    const providerModule = await import(selectedProvider.package);
    const provider = providerModule[selectedProvider.exportedAs];

    if (!isValidProvider(provider)) {
      throw new Error(
        `The export "${providerName}" does not implement the ProviderV1 interface in the module "@ai-sdk/${providerName}".`,
      );
    }

    // Cache the provider for future use
    dynamicProviderCache[providerName] = provider;
    return provider;
  } catch (error) {
    console.error(`Error importing provider "${providerName}":`, error);
    if (isModuleNotFoundError(error)) {
      throw new Error(
        `The provider "${providerName}" is not installed. Please install "@ai-sdk/${providerName}" to use it.`,
      );
    }
    throw new Error(
      `Failed to load provider "${providerName}": ${(error as Error).message}`,
    );
  }
}

/**
 * Type guard to validate that an object implements the ProviderV1 interface.
 * The provider must expose a `languageModel` method for creating models.
 * @param provider The object to validate.
 * @returns True if the object implements ProviderV1.
 */
function isValidProvider(provider: unknown): provider is ProviderV1 {
  return (
    (typeof provider === 'object' || typeof provider === 'function') &&
    provider !== null &&
    'languageModel' in provider &&
    typeof (provider as ProviderV1).languageModel === 'function'
  );
}

/**
 * Type guard to check if the error is a module not found error.
 * @param error The caught error.
 * @returns True if the error is a module not found error.
 */
function isModuleNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as Record<string, unknown>).code === 'MODULE_NOT_FOUND'
  );
}
