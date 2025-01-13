import { z } from 'zod';
import { model, output, systemPrompt, tool, Agent } from '@axarai/axar';
import { property, schema } from '@axarai/axar';

export interface DatabaseConn {
  refundItem(userId: number, itemId: number): Promise<string>;
  notifyCustomer(
    userId: number,
    itemId: number,
    method: string,
  ): Promise<string>;
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
class ToolParams {
  @property('User ID')
  userId!: number;

  @property('Item ID')
  itemId!: number;

  @property('Notification method')
  method?: string;
}

@model('openai:gpt-4o-mini')
@systemPrompt(`
  	You are a refund agent that handles all actions related to refunds after a return has been processed.
    You must ask for both the user ID and item ID to initiate a refund. Ask for both userId and itemId in one message.
    If the user asks you to notify them, you must ask them what their preferred method of notification is. For notifications, you must
    ask them for userId, itemId and method in one message.
`)
@output(PersonalShopperResponse)
export class RefundAgent extends Agent<string, PersonalShopperResponse> {
  constructor(private db: DatabaseConn) {
    super();
  }

  @tool(
    'Process a refund for the specified user and item',
    z.object({ userId: z.number(), itemId: z.number() }),
  )
  async refundItem(params: ToolParams): Promise<PersonalShopperResponse> {
    const result = await this.db.refundItem(params.userId, params.itemId);
    return { userId: params.userId, details: result };
  }
}

@model('openai:gpt-4o-mini')
@systemPrompt(`
  If the user requests a notification
`)
@output(PersonalShopperResponse)
export class NotifyAgent extends Agent<string, PersonalShopperResponse> {
  constructor(private db: DatabaseConn) {
    super();
  }

  @tool(
    `Notify a customer by their preferred method of either phone or email`,
    z.object({ userId: z.number(), itemId: z.number(), method: z.string() }),
  )
  async notifyCustomer(params: ToolParams): Promise<PersonalShopperResponse> {
    const result = await this.db.notifyCustomer(
      params.userId,
      params.itemId,
      params.method || 'email',
    );
    return { userId: params.userId, details: result };
  }
}

@model('openai:gpt-4o-mini')
@systemPrompt(`
  You are a sales agent that handles all actions related to placing an order to purchase an item.
    Regardless of what the user wants to purchase, you will get the user_id and item_id.
    An order cannot be placed without these two pieces of information. Ask for both userId and itemId in one message.
    If the user asks you to notify them, you must ask them what their preferred method is. For notifications, you must
    ask them for userId, itemId and method in one message.
`)
@output(PersonalShopperResponse)
export class SalesAgent extends Agent<string, PersonalShopperResponse> {
  constructor(private db: DatabaseConn) {
    super();
  }

  @tool(
    'Place an order for the specified user and item',
    z.object({ userId: z.number(), itemId: z.number() }),
  )
  async orderItem(params: ToolParams): Promise<PersonalShopperResponse> {
    const result = await this.db.orderItem(params.userId, params.itemId);
    return { userId: params.userId, details: result };
  }
}

@model('openai:gpt-4o-mini')
@systemPrompt(`
 You are to triage a user's request and call the appropriate agent.
  If the user request is about making an order or purchasing an item, transfer to the Sales Agent.
  If the user request is about getting a refund on an item, transfer to the Refund Agent.
  If the user request involves sending a notification, transfer to the Notify Agent.
  Ask for minimal information when needed, such as userId, itemId, and method.
`)
@output(PersonalShopperResponse)
export class PersonalShopperAgent extends Agent<
  string,
  PersonalShopperResponse
> {
  constructor(
    private refundAgent: RefundAgent,
    private notifyAgent: NotifyAgent,
    private salesAgent: SalesAgent,
  ) {
    super();
  }

  @tool('Get user id and item id', z.object({}))
  async getParams(): Promise<ToolParams> {
    return {
      userId: 1,
      itemId: 3,
    };
  }

  @tool(
    `Initiate a refund based on the user ID and item ID.
    Takes as input arguments in the format '{"userId":"1","itemId":"3"}`,
    z.object({
      query: z.string(),
      params: z.object({ userId: z.number(), itemId: z.number() }),
    }),
  )
  async refund({
    query,
    params,
  }: {
    query: string;
    params: ToolParams;
  }): Promise<PersonalShopperResponse> {
    return this.refundAgent.run(
      `Process a refund with this information ${JSON.stringify(params)}`,
    );
  }

  @tool(
    'Notify a customer by their preferred method of either phone or email',
    z.object({
      query: z.string(),
      params: z.object({ userId: z.number(), itemId: z.number() }),
    }),
  )
  async notify({
    query,
    params,
  }: {
    query: string;
    params: ToolParams;
  }): Promise<PersonalShopperResponse> {
    return this.notifyAgent.run(
      `Notify customer with this information ${JSON.stringify(params)}`,
    );
  }

  @tool(
    'Place a new order based on user request, get the user ID and item ID',
    z.object({
      query: z.string(),
      params: z.object({ userId: z.number(), itemId: z.number() }),
    }),
  )
  async order({
    query,
    params,
  }: {
    query: string;
    params: ToolParams;
  }): Promise<PersonalShopperResponse> {
    return this.salesAgent.run(
      `Place an order with this information ${JSON.stringify(params)}`,
    );
  }
}

// Usage Example
async function main() {
  const db: DatabaseConn = {
    async refundItem(userId: number, itemId: number) {
      if (itemId % 2 === 0) {
        return `Refund not applicable for item ${itemId}`;
      }
      return `Refund initiated for user ${userId} and item ${itemId}`;
    },
    async notifyCustomer(userId: number, itemId: number, method: string) {
      if (method === 'phone') {
        return `Phone notification sent to user ${userId} for item ${itemId}`;
      }
      return `Email notification sent to user ${userId} for item ${itemId}`;
    },
    async orderItem(userId: number, itemId: number) {
      return `Order placed for user ${userId} and item ${itemId}`;
    },
  };

  // Create agents
  const refundAgent = new RefundAgent(db);
  const notifyAgent = new NotifyAgent(db);
  const salesAgent = new SalesAgent(db);
  const personalShopperAgent = new PersonalShopperAgent(
    refundAgent,
    notifyAgent,
    salesAgent,
  );

  // Example queries
  const refundResult = await personalShopperAgent.run(
    'I want to return this item, and send notification',
  );
  console.log(refundResult);

  const orderResult = await personalShopperAgent.run(
    'I want to buy this product.',
  );
  console.log(orderResult);
}

if (require.main === module) {
  main().catch(console.error);
}
