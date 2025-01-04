import { OpenAIllmHandler } from "./../../../src/llm/openai-query-processor";
import { ModelName } from "./../../../src/llm/query-processor";
import { generateObject } from "ai";
import { createOpenAI, OpenAIProvider } from "@ai-sdk/openai";
import { dummyShots } from "../../test-utils/dummy-shots";
import { dummySchema } from "../../test-utils/dummy-schemas";

jest.mock("@ai-sdk/openai", () => ({
	createOpenAI: jest.fn(),
}));

jest.mock("ai", () => ({
	generateObject: jest.fn(),
}));

describe("OpenAIllmHandler", () => {
	const apiKey = "test-api-key";
	const modelName = ModelName.GPT_4;
	let mockOpenAIProvider: jest.Mocked<OpenAIProvider>;
	let handler: OpenAIllmHandler;

	beforeEach(() => {
		mockOpenAIProvider = jest.fn() as unknown as jest.Mocked<OpenAIProvider>;
		(createOpenAI as jest.Mock).mockReturnValue(mockOpenAIProvider);

		handler = new OpenAIllmHandler(apiKey, modelName);
	});

	it("should initialize with the correct apiKey and modelName", () => {
		expect(createOpenAI).toHaveBeenCalledWith({
			apiKey,
			compatibility: "strict",
		});
		expect(handler).toBeDefined();
	});

	it("should process queries correctly", async () => {
		const mockSchema = dummySchema;
		const schemaName = dummySchema.name;
		const schemaDescription = dummySchema.description;
		const shots = dummyShots;
		const mockObject = dummyShots[0].exampleResponseParams;

		(generateObject as jest.Mock).mockResolvedValue({
			object: mockObject,
		});

		const result = await handler.processQuery(
			mockSchema,
			schemaName,
			schemaDescription,
			shots
		);

		expect(generateObject).toHaveBeenCalledWith({
			model: mockOpenAIProvider(modelName),
			schema: mockSchema,
			schemaName,
			schemaDescription,
			messages: shots,
		});

		expect(result).toEqual(mockObject);
	});

	// it("should throw an error if processQuery fails", async () => {
	// 	const mockSchema = dummySchema;
	// 	const schemaName = dummySchema.name;
	// 	const schemaDescription = dummySchema.description;
	// 	const shots = dummyShots;

	// 	const mockError = new Error("Test error");
	// 	(generateObject as jest.Mock).mockRejectedValue(mockError);

	// 	await expect(
	// 		handler.processQuery(mockSchema, schemaName, schemaDescription, shots)
	// 	).rejects.toThrow(mockError);

	// 	expect(generateObject).toHaveBeenCalledWith({
	// 		model: mockOpenAIProvider(modelName),
	// 		schema: mockSchema,
	// 		schemaName,
	// 		schemaDescription,
	// 		messages: shots,
	// 	});
	// });
});
