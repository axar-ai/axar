import { systemPrompt, model, output, tool, Agent } from '@axarai/axar';
import { property, min, max, schema, optional, enumValues } from '@axarai/axar';

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
  @enumValues(['Happy', 'Sad', 'Neutral'])
  @optional()
  status?: 'Happy' | 'Sad' | 'Neutral';
}

@schema()
class ToolParams {
  @property("Customer's name")
  customerName!: string;

  @property('Whether to include pending transactions')
  @optional()
  includePending?: boolean;
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

  @tool("Get customer's current balance")
  async customerBalance(params: ToolParams): Promise<number> {
    return this.db.customerBalance(
      this.customerId,
      params.customerName,
      params.includePending ?? true,
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
