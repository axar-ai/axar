import { tool, systemPrompt, model, output, Agent } from '@axarai/axar-core';
import { schema, property, min, max, optional } from '@axarai/axar-core';

import z from 'zod';

export interface DatabaseConn {
  customerName(id: number): Promise<string>;
  customerBalance(
    id: number,
    customerName: string,
    includePending: boolean,
  ): Promise<number>;
}

@schema()
export class SupportResponse {
  @property('Human-readable advice to give to the customer.')
  support_advice!: string;
  @property("Whether to block customer's card.")
  block_card!: boolean;
  @property('Risk level of query')
  @min(0)
  @max(1)
  risk!: number;
  @property("Customer's emotional state")
  @optional()
  status?: 'Happy' | 'Sad' | 'Neutral';
}

@model('openai:gpt-4o-mini')
@systemPrompt(`
  You are a support agent in our bank. 
  Give the customer support and judge the risk level of their query.
  Reply using the customer's name.
`)
@output(SupportResponse)
export class SupportAgent extends Agent<string, SupportResponse> {
  constructor(
    private customerId: number,
    private db: DatabaseConn,
  ) {
    super();
  }

  @systemPrompt()
  async getCustomerContext(): Promise<string> {
    const name = await this.db.customerName(this.customerId);
    return `The customer's name is '${name}'`;
  }

  @tool(
    "Get customer's current balance",
    z.object({
      includePending: z.boolean().optional(),
      customerName: z.string(),
    }),
  )
  async customerBalance({
    customerName,
    includePending = true,
  }: {
    customerName: string;
    includePending?: boolean;
  }): Promise<number> {
    return this.db.customerBalance(
      this.customerId,
      customerName,
      includePending ?? false,
    );
  }
}

async function main() {
  const db: DatabaseConn = {
    async customerName(id: number) {
      return 'John';
    },
    async customerBalance(
      id: number,
      customerName: string,
      includePending: boolean,
    ) {
      if (customerName === 'Jane') return 987.65;
      if (customerName === 'John') return 5047.71;
      return 123.45;
    },
  };

  const agent = new SupportAgent(123, db);

  // Simple query
  const balanceResult = await agent.run('What is my balance?');
  console.log(balanceResult);

  // Lost card scenario
  const cardResult = await agent.run('I just lost my card!');
  console.log(cardResult);
}

if (require.main === module) {
  main().catch(console.error);
}
