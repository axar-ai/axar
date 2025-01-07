import z from 'zod';
import { model, systemPrompt, output, tool, Agent } from '@axar/core';

export interface DatabaseConn {
  customerName(id: number): Promise<string>;
  customerBalance(
    id: number,
    customerName: string,
    includePending: boolean,
  ): Promise<number>;
}

export const SupportResponseSchema = z.object({
  support_advice: z
    .string()
    .describe('Human-readable advice to give to the customer.'),
  block_card: z.boolean().describe("Whether to block customer's card."),
  risk: z.number().min(0).max(1).describe('Risk level of query'),
  status: z
    .enum(['Happy', 'Sad', 'Neutral'])
    .optional()
    .describe("Customer's emotional state"),
});

type SupportResponse = z.infer<typeof SupportResponseSchema>;

@model('openai:gpt-4o-mini')
@output(SupportResponseSchema)
@systemPrompt(`
  You are a support agent in our bank. 
  Give the customer support and judge the risk level of their query.
  Reply using the customer's name.
`)
export class SupportAgent extends Agent<string, SupportResponse> {
  constructor(
    private customerId: number,
    private db: DatabaseConn,
  ) {
    super();
  }

  @systemPrompt()
  private async getCustomerContext(): Promise<string> {
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
    const balance = await this.db.customerBalance(
      this.customerId,
      customerName,
      includePending,
    );
    return balance;
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
