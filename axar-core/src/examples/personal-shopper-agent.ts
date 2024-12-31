import { z } from "zod";
import { model, output, systemPrompt, tool, Agent } from "../agent";
import { property, schema } from "../schema";

export interface DatabaseConn {
	refundItem(userId: number, itemId: number): Promise<string>;
	notifyCustomer(userId: number, itemId: number): Promise<string>;
	orderItem(userId: number, itemId: number): Promise<string>;
}

@schema()
export class PersonalShopperResponse {
	@property("User ID")
	userId!: number;

	@property("Execution details")
	details?: string;
}

@schema()
class ToolParams {
	@property("User ID")
	userId!: number;

	@property("Item ID")
	itemId!: number;
}

@model("gpt-4o-mini")
@systemPrompt(`
  You are a refund agent. Process refund requests by initiating a refund for the specified user and item.
`)
@output(PersonalShopperResponse)
export class RefundAgent extends Agent<string, PersonalShopperResponse> {
	constructor(private db: DatabaseConn) {
		super();
	}

	@tool("Process a refund for the specified user and item", z.object({}))
	async refundItem(params: ToolParams): Promise<PersonalShopperResponse> {
		const result = await this.db.refundItem(params.userId, params.itemId);
		return { userId: params.userId, details: result };
	}
}

@model("gpt-4o-mini")
@systemPrompt(`
  You are a notification agent. Notify customers about updates or actions related to their requests.
`)
@output(PersonalShopperResponse)
export class NotifyAgent extends Agent<string, PersonalShopperResponse> {
	constructor(private db: DatabaseConn) {
		super();
	}

	@tool("Notify the customer about their request", z.object({}))
	async notifyCustomer(params: ToolParams): Promise<PersonalShopperResponse> {
		const result = await this.db.notifyCustomer(params.userId, params.itemId);
		return { userId: params.userId, details: result };
	}
}

@model("gpt-4o-mini")
@systemPrompt(`
  You are an order agent. Place orders for customers based on their requests.
`)
@output(PersonalShopperResponse)
export class OrderAgent extends Agent<string, PersonalShopperResponse> {
	constructor(private db: DatabaseConn) {
		super();
	}

	@tool("Place an order for the specified user and item", z.object({}))
	async orderItem(params: ToolParams): Promise<PersonalShopperResponse> {
		const result = await this.db.orderItem(params.userId, params.itemId);
		return { userId: params.userId, details: result };
	}
}

@model("gpt-4o-mini")
@systemPrompt(`
  You are a personal shopper agent responsible for triaging customer requests.
  - If the user request is about refunds, delegate to the RefundAgent.
  - If the user request is about notifications, delegate to the NotifyAgent.
  - If the user request is about orders, delegate to the OrderAgent.
  Always decide based on the context of the query.
`)
@output(PersonalShopperResponse)
export class PersonalShopperAgent extends Agent<
	string,
	PersonalShopperResponse
> {
	constructor(
		private refundAgent: RefundAgent,
		private notifyAgent: NotifyAgent,
		private orderAgent: OrderAgent
	) {
		super();
	}

	@tool("Delegate to the appropriate agent based on user request")
	async delegateRequest(
		query: string,
		params: ToolParams
	): Promise<PersonalShopperResponse> {
		if (query.includes("refund") || query.includes("return")) {
			return await this.refundAgent.run(
				`Process a refund with this information ${JSON.stringify(params)}`
			);
		}
		if (query.includes("notify") || query.includes("notification")) {
			return await this.notifyAgent.run(
				"Notify customer with this information ${JSON.stringify(params)}"
			);
		}
		if (query.includes("order") || query.includes("purchase")) {
			return await this.orderAgent.run(
				"Place an order with this information ${JSON.stringify(params)}"
			);
		}
		return {
			userId: params.userId,
			details: "Request could not be processed.",
		};
	}
}

// Usage Example
async function main() {
	const db: DatabaseConn = {
		async refundItem(userId: number, itemId: number) {
			return `Refund initiated for user ${userId} and item ${itemId}`;
		},
		async notifyCustomer(userId: number, itemId: number) {
			return `Notification sent to user ${userId} for item ${itemId}`;
		},
		async orderItem(userId: number, itemId: number) {
			return `Order placed for user ${userId} and item ${itemId}`;
		},
	};

	// Create agents
	const refundAgent = new RefundAgent(db);
	const notifyAgent = new NotifyAgent(db);
	const orderAgent = new OrderAgent(db);
	const personalShopperAgent = new PersonalShopperAgent(
		refundAgent,
		notifyAgent,
		orderAgent
	);

	// Example queries
	const refundResult = await personalShopperAgent.delegateRequest(
		"I want to return an item.",
		{ userId: 1, itemId: 101 }
	);
	console.log(refundResult);

	const notifyResult = await personalShopperAgent.delegateRequest(
		"Notify me about my order status.",
		{ userId: 1, itemId: 101 }
	);
	console.log(notifyResult);

	const orderResult = await personalShopperAgent.delegateRequest(
		"I want to buy this product.",
		{ userId: 1, itemId: 101 }
	);
	console.log(orderResult);
}

main().catch(console.error);
