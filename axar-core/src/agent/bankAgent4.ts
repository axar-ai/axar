import { systemPrompt, model, output } from "./decorators";
import { tool } from "./decorators/toolx";
import { Agent } from "./agentx";
import { description, min, max, schema } from "./schema4";
import z from "zod";

interface DatabaseConn {
  customerName(id: number): Promise<string>;
  customerBalance(
    id: number,
    customerName: string,
    includePending: boolean
  ): Promise<number>;
}

@schema()
class SupportResponse {
  @description("Human-readable advice to give to the customer.")
  support_advice!: string;
  @description("Whether to block customer's card.")
  block_card!: boolean;
  @description("Risk level of query")
  @min(0)
  @max(1)
  risk!: number;
  @description("Customer's emotional state")
  status?: "Happy" | "Sad" | "Neutral";
}

@schema()
class ToolParams {
  @description("Customer's name")
  customerName!: string;

  @description("Whether to include pending transactions")
  includePending?: boolean;
}

//TODO: @model("openai/gpt-4o-mini")
@model("gpt-4o-mini")
@systemPrompt(`
  You are a support agent in our bank. 
  Give the customer support and judge the risk level of their query.
  Reply using the customer's name.
`)
@output(SupportResponse)
class SupportAgent extends Agent<string, SupportResponse> {
  constructor(private customerId: number, private db: DatabaseConn) {
    super();
  }

  @systemPrompt()
  async getCustomerContext(): Promise<string> {
    const name = await this.db.customerName(this.customerId);
    return `The customer's name is '${name}'`;
  }

  @tool("Get customer's current balance")
  async customerBalance(params: ToolParams): Promise<number> {
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
