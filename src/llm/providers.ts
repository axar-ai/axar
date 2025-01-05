import { ProviderV1 } from '@ai-sdk/provider';
import * as OpenAI from '@ai-sdk/openai';
import * as Anthropic from '@ai-sdk/anthropic';

export const coreProviders: Record<string, ProviderV1> = {
  openai: OpenAI.openai,
  anthropic: Anthropic.anthropic,
};

// Dynamic provider cache
export const dynamicProviderCache: Record<string, ProviderV1> = {};

/**
 * Dynamically import a provider module and access its named export.
 * Assumes the provider function has the same name as the provider.
 * @param providerName The normalized name of the provider.
 * @returns The provider function.
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
    const providerModule = await import(`@ai-sdk/${providerName}`);
    const provider = providerModule[providerName];

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
    typeof provider === 'object' &&
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
