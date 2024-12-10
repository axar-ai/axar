import { TaskExecutor } from "../../src/task-executor";
import { PromptBuilder } from "../../src/prompt-builder";
import { LLMHandlerFactory } from "../../src/llm/llm-handler.factory";
import { QueryProcessor } from "../../src/llm/query-processor";
import { dummySchema } from "../test-utils/dummy-schemas";
import { dummyShots } from "../test-utils/dummy-shots";

jest.mock("./../../src/prompt-builder");
jest.mock("./../../src/llm/llm-handler.factory");

jest.mock("./../../src/llm/llm-handler.factory", () => {
	return {
		LLMHandlerFactory: jest.fn().mockImplementation(() => ({
			getHandler: jest.fn().mockResolvedValue({
				processQuery: jest.fn(),
			} as unknown as jest.Mocked<QueryProcessor>),
		})),
	};
});

describe("TaskExecutor", () => {
	let taskExecutor: TaskExecutor;
	let mockPromptBuilder: jest.Mocked<PromptBuilder>;
	let mockQueryProcessor: jest.Mocked<QueryProcessor>;
	let mockLLMHandlerFactory: jest.Mocked<LLMHandlerFactory>;

	const mockConfig = {
		llmType: "OpenAI",
		credentials: { apiKey: "test-api-key" },
		taskConfig: { modelName: "gpt-3.5" },
	};

	beforeEach(() => {
		mockPromptBuilder = new PromptBuilder() as jest.Mocked<PromptBuilder>;
		mockLLMHandlerFactory =
			new LLMHandlerFactory() as jest.Mocked<LLMHandlerFactory>;
		mockQueryProcessor = {
			processQuery: jest.fn(),
		} as unknown as jest.Mocked<QueryProcessor>;

		const schema = dummySchema;
		const shots = dummyShots;
		const query = { cityName: "Dhaka" };

		mockPromptBuilder.generatePrompt.mockResolvedValue("mock-prompt-schema");
		mockPromptBuilder.generateShots.mockResolvedValue([
			{
				role: "user",
				content: JSON.stringify(query),
			},
			{
				role: "assistant",
				content: JSON.stringify([
					{
						type: "tool-call",
						toolCallId: "tool-call-1",
						toolName: schema.name,
						args: JSON.stringify(shots[0]),
					},
				]),
			},
		]);
		mockLLMHandlerFactory.getHandler.mockResolvedValue(mockQueryProcessor);

		taskExecutor = new TaskExecutor(mockConfig as any);
		taskExecutor["promptBuilder"] = mockPromptBuilder;
	});

	describe("executeTask", () => {
		it("should process the task using the provided handler", async () => {
			const mockSchema = {
				name: "getTouristPlaces",
				description: "Returns tourist places.",
			};
			const query = "What are the best places in Paris?";
			const shots = [{ example: "Eiffel Tower" }];

			// Mock the task handler's behavior
			mockQueryProcessor.processQuery.mockResolvedValue("mock-result");

			// Execute the task
			const result = await taskExecutor.executeTask(
				mockSchema,
				query,
				shots,
				mockQueryProcessor
			);

			// Assertions
			expect(mockPromptBuilder.generatePrompt).toHaveBeenCalledWith(mockSchema);
			expect(mockPromptBuilder.generateShots).toHaveBeenCalledWith(
				mockSchema,
				shots,
				query
			);

			expect(result).toBe("mock-result");
		});
	});

	// describe("getTaskHandler", () => {
	// 	it("should return an appropriate QueryProcessor instance", async () => {
	// 		const handler = await taskExecutor.getTaskHandler();

	// 		expect(handler).toBe(mockQueryProcessor);
	// 	});
	// });
});
