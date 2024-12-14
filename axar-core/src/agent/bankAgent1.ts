import { systemPrompt, model, output } from "./decorators";
import { tool, description, schema, optional } from "./decorators";
import { Agent } from "./agentx";
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
class ToolParams {
  @description("Customer's name")
  customerName!: string;

  @description("Whether to include pending transactions")
  @optional()
  includePending?: boolean;
}

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

//TODO: @model("openai/gpt-4o-mini")
@model("gpt-4o-mini")
@systemPrompt(`
  You are a support agent in our bank. 
  Give the customer support and judge the risk level of their query.
  Reply using the customer's name.
`)
@output(SupportResponseSchema)
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
  // const cardResult = await agent.run("I just lost my card!");
  // console.log(cardResult);
}

main().catch(console.error);
