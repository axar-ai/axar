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
 * A list of all provider implementations available via the Vercel AI SDK.  
 * Includes built-in providers such as OpenAI, Anthropic, Azure, Cohere, and community provider like Ollama.  
 */
export const supportedProviders: { name: string, packagePath: string; exportName: string }[] = [
  {
    name: 'openai',
    packagePath: '@ai-sdk/openai',
    exportName: 'openai'
  },
  {
    name: 'azure',
    packagePath: '@ai-sdk/azure',
    exportName: 'azure'
  },
  {
    name: 'anthropic',
    packagePath: '@ai-sdk/anthropic',
    exportName: 'anthropic'
  },
  {
    name: 'cohere',
    packagePath: '@ai-sdk/cohere',
    exportName: 'cohere'
  },
  {
    name: 'ollama',
    packagePath: 'ollama-ai-provider',
    exportName: 'ollama'
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

  const selectedProvider = supportedProviders.find(provider => provider.name === providerName);
  try {
    if (!selectedProvider) {
      throw new Error(
        `Unsupported provider '${providerName}'. Refer to the list of supported providers here: https://axar-ai.gitbook.io/axar/basics/model.`
      );
    }

    const modulePath = require.resolve(selectedProvider.packagePath, { paths: [process.cwd()] });
    const providerModule = await import(modulePath);
    const provider = providerModule[selectedProvider.exportName];

    if (!isValidProvider(provider)) {
      throw new Error(
        `The export "${selectedProvider.exportName}" does not implement the ProviderV1 interface in the module "${selectedProvider.packagePath}".`,
      );
    }

    // Cache the provider for future use
    dynamicProviderCache[providerName] = provider;
    return provider;
  } catch (error) {
    if (isModuleNotFoundError(error)) {
      throw new Error(
        `The provider "${providerName}" is not installed. Please install "${selectedProvider?.packagePath}" to use it.`,
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
  console.log("🚀 ~ isModuleNotFoundError ~ error:", error)
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as Record<string, unknown>).code === 'MODULE_NOT_FOUND'
  );
}
