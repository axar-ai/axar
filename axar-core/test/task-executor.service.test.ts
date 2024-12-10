import { LLMType, ModelName } from "../src/llm/query-processor";
import { createTaskExecutor } from "../src/task-executor.factory";

const dummySchema = {
  name: "getTouristPlaces",
  description: "Returns a list of tourist places for a given city name.",
  request: {
    type: "object",
    properties: {
      cityName: {
        type: "string",
        description:
          "The name of the city for which to retrieve tourist places.",
      },
    },
    required: ["cityName"],
  },
  response: {
    type: "object",
    properties: {
      places: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name of the tourist place.",
            },
            description: {
              type: "string",
              description: "A brief description of the tourist place.",
            },
            category: {
              type: "string",
              description:
                "The category of the tourist place, e.g., historical, natural, cultural.",
            },
          },
          required: ["name"],
        },
        description: "A list of tourist places in the specified city.",
      },
      status: {
        type: "string",
        enum: ["success", "failure"],
        description: "The status of the function execution.",
      },
      message: {
        type: "string",
        description:
          "An optional message providing additional details about the result.",
      },
    },
    required: ["places", "status"],
  },
};

jest.mock("../src/task-executor.service", () => {
  return {
    TaskExecutorService: jest.fn().mockImplementation(() => {
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
