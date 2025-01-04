import { systemPrompt, model, output, tool, Agent } from "../agent";
import { property, min, max, schema } from "../schema";
import z from "zod";

export interface DatabaseConn {
	customerName(id: number): Promise<string>;
	customerBalance(
		id: number,
		customerName: string,
		includePending: boolean
	): Promise<number>;
}

@schema()
class SupportResponsex {
	@property("Human-readable advice to give to the customer.")
	support_advice!: string;
	@property("Whether to block customer's card.")
	block_card!: boolean;
	@property("Risk level of query")
	@min(0)
	@max(1)
	risk!: number;
	@property("Customer's emotional state")
	status?: "Happy" | "Sad" | "Neutral";
}

@schema()
class ToolParams {
	@property("Customer's name")
	customerName!: string;

	@property("Whether to include pending transactions")
	includePending?: boolean;
}

export const SupportResponseSchema = z.object({
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

//TODO: @model("openai/gpt-4o-mini")
@model("gpt-4o-mini")
@systemPrompt(`
  You are a support agent in our bank. 
  Give the customer support and judge the risk level of their query.
  Reply using the customer's name.
`)
@output(SupportResponseSchema)
export class SupportAgent extends Agent<string, SupportResponse> {
	constructor(private customerId: number, private db: DatabaseConn) {
		super();
	}

	@systemPrompt()
	async getCustomerContext(): Promise<string> {
		const name = await this.db.customerName(this.customerId);
		return `The customer's name is '${name}'`;
	}

	@tool("Get customer's current balance", ToolParams)
	async getCustomerBalance(params: ToolParams): Promise<number> {
		console.log("getCustomerBalance");
		return this.db.customerBalance(
			this.customerId,
			params.customerName,
			params.includePending ?? true
		);
	}
}

async function main() {
	const db: DatabaseConn = {
		async customerName(id: number) {
			return "John";
		},
		async customerBalance(
			id: number,
			customerName: string,
			includePending: boolean
		) {
			console.log("customerBalance", id, customerName, includePending);
			if (customerName === "Jane") return 987.65;
			if (customerName === "John") return 5047.71;
			return 123.45;
		},
	};

	const agent = new SupportAgent(123, db);

	// Simple query
	const balanceResult = await agent.run("What is my balance?");
	console.log(balanceResult);

	// Lost card scenario
	const cardResult = await agent.run("I just lost my card!");
	console.log(cardResult);
}

main().catch(console.error);
