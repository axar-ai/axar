import { LLMType, ModelName } from "../../src/llm/query-processor";
import { createTaskExecutor } from "../../src/task-executor.factory";
import { dummySchema } from "../test-utils/dummy-schemas";

jest.mock("../../src/task-executor", () => {
	return {
		TaskExecutor: jest.fn().mockImplementation(() => {
			return {
				getTaskHandler: jest.fn().mockResolvedValue({
					processQuery: jest.fn().mockResolvedValue("Mocked result"),
				}),
				executeTask: jest.fn().mockResolvedValue("Mocked result"),
			};
		}),
	};
});

describe("createTaskExecutor", () => {
	let taskExecutor: ReturnType<typeof createTaskExecutor>;

	beforeEach(() => {
		taskExecutor = createTaskExecutor({
			llmType: LLMType.OPENAI,
			credentials: { apiKey: "test-api-key" },
			taskConfig: { modelName: ModelName.GPT_4O },
		});
	});

	it("should initialize with correct configuration", () => {
		expect(taskExecutor).toBeDefined();
	});

	it("should call executeTask and return the mocked result", async () => {
		const schema = dummySchema;
		const query = { cityName: "Dhaka" };
		const result = await taskExecutor.executeTask(schema, query);

		expect(result).toBe("Mocked result");
	});
});
