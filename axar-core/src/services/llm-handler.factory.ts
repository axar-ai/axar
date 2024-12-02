import {
	LLMType,
	ModelName,
	QueryProcessor,
} from "./../interfaces/query-processor";
import { OpenAIllmHandler } from "./../llm/openai-query-processor";

/**
 * Factory class for creating the appropriate LLM handler based on the LLM type.
 */
export class LLMHandlerFactory {
	/**
	 * Returns the appropriate LLM handler based on the provided LLM type.
	 * @param llmType - The type of the LLM (e.g., OpenAI, GPT-4).
	 * @param apiKey - The API key required for the LLM.
	 * @param modelName - The model name (e.g., GPT-4).
	 * @returns A Promise resolving to a QueryProcessor instance for the corresponding LLM.
	 * @throws Error if the LLM type is not supported.
	 */
	async getHandler(
		llmType: LLMType,
		apiKey: string,
		modelName: ModelName
	): Promise<QueryProcessor> {
		// Normalize llmType to lowercase for comparison
		const normalizedLlmType = llmType.toLowerCase();

		// Switch case to handle different LLM types
		switch (normalizedLlmType) {
			case "openai":
				return new OpenAIllmHandler(apiKey, modelName);
			// Add other cases for different LLMs here
			default:
				throw new Error(`Unsupported LLM type: ${llmType}`);
		}
	}
}
