import { Agent, model, output, systemPrompt, tool } from "../../../src/agent";
import { z } from "zod";
import { generateText } from "ai";

jest.mock("ai", () => ({
	generateText: jest.fn(),
}));

jest.mock("@ai-sdk/openai", () => ({
	openai: jest.fn((modelName) => modelName),
}));

const SupportResponseSchema = z.object({
	support_advice: z
		.string()
		.describe("Human-readable advice to give to the customer."),
	block_card: z.boolean().describe("Whether to block customer's card."),
	risk: z.number().min(0).max(1).describe("Risk level of query"),
	status: z
		.enum(["Happy", "Sad", "Neutral"])
		.optional()
		.describe("Customer's emotional state"),
});

type SupportResponse = z.infer<typeof SupportResponseSchema>;

describe("Agent", () => {
	@model("gpt-4o-mini")
	@output(SupportResponseSchema)
	@systemPrompt(`
      You are a support agent in our bank. 
      Give the customer support and judge the risk level of their query.
      Reply using the customer's name.
    `)
	class TestAgent extends Agent<string, SupportResponse> {
		constructor(private customerId: number) {
			super();
		}

		@systemPrompt()
		async getCustomerContext(): Promise<string> {
			const name = "Sudipta";
			return `Customer ID: ${name}`;
		}

		@tool(
			"Get customer's current balance",
			z.object({
				includePending: z.boolean().optional(),
				customerName: z.string(),
			})
		)
		async customerBalance(
			includePending: boolean,
			customerName: string
		): Promise<number> {
			return 123.45;
		}
	}

	afterAll(() => {
		jest.restoreAllMocks();
	});

	let agent: TestAgent;

	beforeEach(() => {
		agent = new TestAgent(1);
	});

	describe("getModel", () => {
		it("should return the model from metadata", () => {
			const model = agent["getModel"]();
			expect(model).toEqual("gpt-4o-mini");
		});

		it("should throw an error if model metadata is missing", () => {
			jest.spyOn(Reflect, "getMetadata").mockReturnValue(null);
			expect(() => agent["getModel"]()).toThrow(
				"Model metadata not found. Please apply @model decorator."
			);
		});
	});

	describe("getTools", () => {
		it("should return the tools formatted correctly", () => {
			const tools = agent["getTools"]();
			expect(tools).toHaveProperty("customerBalance");

			const customerBalanceTool = tools["customerBalance"] as {
				description: string;
				parameters: unknown;
				execute: (...args: any[]) => Promise<number>;
			};

			expect(customerBalanceTool.description).toBe(
				"Get customer's current balance"
			);
		});
	});

	describe("getSystemPrompts", () => {
		it("should return system prompts from metadata", async () => {
			const prompts = await Promise.all(
				agent["getSystemPrompts"]().map((fn) => fn())
			);
			expect(prompts).toEqual([
				"\n" +
					"      You are a support agent in our bank. \n" +
					"      Give the customer support and judge the risk level of their query.\n" +
					"      Reply using the customer's name.\n" +
					"    ",
				"Customer ID: Sudipta",
			]);
		});
	});

	describe("getValidationSchema", () => {
		it("should return the validation schema from metadata", () => {
			const mockSchema = SupportResponseSchema;

			const schema = agent["getValidationSchema"]();
			expect(schema).toEqual(mockSchema);
		});

		it("should throw an error if schema metadata is missing", () => {
			Reflect.getMetadata = jest.fn(() => null);
			expect(() => agent["getValidationSchema"]()).toThrow(
				"Validation schema for TestAgent not found. Ensure the class is decorated with @output."
			);
		});
	});

	// describe("run", () => {
	// 	it("should call generateText with the correct arguments and validate the output", async () => {
	// 		(generateText as jest.Mock).mockResolvedValue({
	// 			experimental_output: { key: "value" },
	// 		});

	// 		const result = await agent.run("input");
	// 		console.log("🚀 ~ it ~ result:", result);
	// 		expect(result).toEqual({ key: "value" });
	// 	});

	// 	it("should throw an error if validation fails", async () => {
	// 		(generateText as jest.Mock).mockResolvedValue({
	// 			experimental_output: { invalidKey: "value" },
	// 		});

	// 		await expect(agent.run("input")).rejects.toThrow("Validation error");
	// 	});
	// });
});
