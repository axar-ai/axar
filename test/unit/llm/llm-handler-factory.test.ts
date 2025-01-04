import { LLMHandlerFactory } from "./../../../src/llm/llm-handler.factory";
import { OpenAIllmHandler } from "./../../../src/llm/openai-query-processor";
import { LLMType, ModelName } from "./../../../src/llm/query-processor";

describe("LLMHandlerFactory", () => {
	let factory: LLMHandlerFactory;

	beforeEach(() => {
		factory = new LLMHandlerFactory();
	});

	it("should return an OpenAIllmHandler for 'openai' LLM type", async () => {
		const apiKey = "test-api-key";
		const modelName = ModelName.GPT_4;

		const handler = await factory.getHandler(LLMType.OPENAI, apiKey, modelName);

		expect(handler).toBeInstanceOf(OpenAIllmHandler);
		expect(handler).toHaveProperty("llm");
		expect(handler).toHaveProperty("modelName", modelName);
	});

	it("should throw an error for unsupported LLM types", async () => {
		const unsupportedLlmType = "unsupportedType" as LLMType;
		const apiKey = "test-api-key";
		const modelName = ModelName.GPT_4;

		await expect(
			factory.getHandler(unsupportedLlmType, apiKey, modelName)
		).rejects.toThrow(`Unsupported LLM type: ${unsupportedLlmType}`);
	});
});
