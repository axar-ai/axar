import { model, output, systemPrompt, tool, Agent } from '@axarai/axar';
import { property, schema } from '@axarai/axar';

export interface DatabaseConn {
  refundItem(userId: number, itemId: number): Promise<string>;
  notifyCustomer(userId: number, itemId: number): Promise<string>;
  orderItem(userId: number, itemId: number): Promise<string>;
}

@schema()
export class PersonalShopperResponse {
  @property('User ID')
  userId!: number;

  @property('Execution details')
  details?: string;
}

@schema()
export class ToolParams {
  @property('User ID')
  userId!: number;

  @property('Item ID')
  itemId!: number;
}

// Define the agent
@model('openai:gpt-4o-mini')
@systemPrompt(`
  You are a personal shopper bot designed to triage requests.
  Based on the customer's query, you will decide whether to handle refunds, orders, or notifications.
  Respond concisely using execution details as needed.
`)
@output(PersonalShopperResponse)
export class PersonalShopperAgent extends Agent<
  string,
  PersonalShopperResponse
> {
  constructor(private db: DatabaseConn) {
    super();
  }

  @tool('Process a refund for the specified user and item')
  async refundItem(params: ToolParams): Promise<PersonalShopperResponse> {
    const result = await this.db.refundItem(params.userId, params.itemId);
    return { userId: params.userId, details: result };
  }

  @tool('Notify the customer about their request')
  async notifyCustomer(params: ToolParams): Promise<PersonalShopperResponse> {
    const result = await this.db.notifyCustomer(params.userId, params.itemId);
    return { userId: params.userId, details: result };
  }

  @tool('Place an order for the specified user and item')
  async orderItem(params: ToolParams): Promise<PersonalShopperResponse> {
    const result = await this.db.orderItem(params.userId, params.itemId);
    return { userId: params.userId, details: result };
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

  const agent = new PersonalShopperAgent(db);

  // Example queries
  const refundResult = await agent.run('I want to return an item.');
  console.log(refundResult);

  const notifyResult = await agent.run('Notify me about my order status.');
  console.log(notifyResult);

  const orderResult = await agent.run('I want to buy this product.');
  console.log(orderResult);
}

if (require.main === module) {
  main().catch(console.error);
}
