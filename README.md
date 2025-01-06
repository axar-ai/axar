<p align="center">
  <img src="https://axar.ai/assets/images/image01.svg?v=0cac29f0" alt="AXAR Logo" width="360">
</p>

<div align="center">
  <a href="https://github.com/axar-ai/axar-core/actions/workflows/ci.yml?query=branch%3Amain"><img src="https://github.com/axar-ai/axar-core/actions/workflows/ci.yml/badge.svg?event=push" alt="CI"></a>
  <a href='https://coveralls.io/github/axar-ai/axar-core?branch=main'><img src='https://coveralls.io/repos/github/axar-ai/axar-core/badge.svg?branch=main' alt='Coverage Status' /></a>
<a href="https://github.com/axar-ai/axar-core/blob/main/LICENSE"><img src="https://img.shields.io/github/license/axar-ai/axar-core" alt="license"></a>

</div>

Most agent frameworks today miss the mark: they’re designed to impress on stage, not deliver in production. Flashy demos and overengineered complexity have overshadowed what truly matters—giving developers the tools they need to build reliable, robust applications.

## What developers really need

In the race toward AGI, we’ve overlooked a critical truth: production-grade application development demands clarity, control, and trust. We need tools that are intuitive to code with, straightforward to debug, and simple to iterate on.

## Why code is king

Agents are only as good as their instructions. And when reliability is the goal, the best way to write those instructions is through code. Code gives developers clarity, control, and precision—qualities that matter more than ever in the unpredictable world of LLMs. Explicit, structured communication with LLMs isn’t just nice to have; it’s essential for better outcomes.

## Meet AXAR AI

**AXAR AI** is designed for developers building production-grade applications. It gives you full control to create predictable, robust solutions that integrate LLMs into proven development workflows. AXAR feels familiar and intuitive—letting you code as you would with any other application. No unnecessary complexity, no steep learning curve.

## Practicality over hype

At AXAR, we focus on what developers need: tools that are reliable, practical, and rooted in solid coding principles. We’re not chasing trends—we’re here to help you build applications you can trust in production. AXAR combines the best of traditional coding practices with the power of LLMs, making it easy to integrate AI into real-world applications.

If you’re building something real, something that _works_—AXAR AI is your framework.

## Why use AXAR AI

- **Type-first design**: Structured, typed inputs and outputs with TypeScript (decorator or Zod based) ensure predictable and reliable agent workflows.
- **Familiar and intuitive**: Built on patterns like dependency injection and decorators, so you can use what you already know.
- **Explicit control**: Define agent behavior, guardrails, and validations directly in code for clarity and maintainability.
- **Transparent**: Includes tools for real-time logging and monitoring, giving you full control and insight into agent operations.
- **Lightweight**: Minimalistic design with little to no overhead for your codebase.
- **Model agnostic**: Works with OpenAI, Anthropic, Mistral, and more, with easy extensibility for additional models.
- **Streamed outputs**: Streams LLM responses with built-in validation for fast and accurate results.
- **Production-ready**: Built for maintainable and reliable applications in production environments.

## Examples

### 🌍 Hello world!

Here's a minimal example of AXAR AI:

```ts
import { model, systemPrompt, Agent } from './agent';

// Define the agent.
@model('openai:gpt-4o-mini')
@systemPrompt('Be concise, reply with one sentence')
export class SimpleAgent extends Agent<string, string> {}

// Run the agent.
async function main() {
  const response = await new SimpleAgent().run(
    'Where does "hello world" come from?',
  );
  console.log(response);
}

main().catch(console.error);
```

It's basic for now, but you can easily extend it with tools, dynamic prompts, and structured responses to build more robust and flexible agents.

### 💬 Bank agent (dynamic prompts, tools, structured data, and DI)

Here's a more complex example (truncated to fit in this README):

(Full code here: [examples/bank-agent4.ts](src/examples/bank-agent4.ts))

```ts
// ...
// Define the structured response that the agent will produce.
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

// Define the schema for the parameters used by tools (functions accessible to the agent).
@schema()
class ToolParams {
  @property("Customer's name")
  customerName!: string;

  @property('Whether to include pending transactions')
  @optional()
  includePending?: boolean;
}

// Specify the AI model used by the agent (e.g., OpenAI GPT-4 mini version).
@model('openai:gpt-4o-mini')
// Provide a system-level prompt to guide the agent's behavior and tone.
@systemPrompt(`
  You are a support agent in our bank. 
  Give the customer support and judge the risk level of their query.
  Reply using the customer's name.
`)
// Define the expected output format of the agent.
@output(SupportResponse)
export class SupportAgent extends Agent<string, SupportResponse> {
  // Initialize the agent with a customer ID and a DB connection for fetching customer-specific data.
  constructor(
    private customerId: number,
    private db: DatabaseConn,
  ) {
    super();
  }

  // Provide additional context for the agent about the customer's details.
  @systemPrompt()
  async getCustomerContext(): Promise<string> {
    // Fetch the customer's name from the database and provide it as context.
    const name = await this.db.customerName(this.customerId);
    return `The customer's name is '${name}'`;
  }

  // Define a tool (function) accessible to the agent for retrieving the customer's balance.
  @tool("Get customer's current balance")
  async customerBalance(params: ToolParams): Promise<number> {
    // Fetch the customer's balance, optionally including pending transactions.
    return this.db.customerBalance(
      this.customerId,
      params.customerName,
      params.includePending ?? true,
    );
  }
}

async function main() {
  // Mock implementation of the database connection for this example.
  const db: DatabaseConn = {
    async customerName(id: number) {
      // Simulate retrieving the customer's name based on their ID.
      return 'John';
    },
    async customerBalance(
      id: number,
      customerName: string,
      includePending: boolean,
    ) {
      // Simulate retrieving the customer's balance with optional pending transactions.
      return 123.45;
    },
  };

  // Initialize the support agent with a sample customer ID and the mock database connection.
  const agent = new SupportAgent(123, db);

  // Run the agent with a sample query to retrieve the customer's balance.
  const balanceResult = await agent.run('What is my balance?');
  console.log(balanceResult);

  // Run the agent with a sample query to block the customer's card.
  const cardResult = await agent.run('I just lost my card!');
  console.log(cardResult);
}

// Entry point for the application. Log any errors that occur during execution.
main().catch(console.error);
```

## More examples

More examples can be found in the [examples](src/examples) directory.

## Usage

[Coming soon]

> [!WARNING]
> AXAR AI (axar-core) is currently in early alpha. It is not intended to be used in production as of yet. But we're working hard to get there and we would love your help!

## Documentation

[Coming soon]

## Setup

**Install dependencies**

```
npm install
```

**Build**

```
npx tsc
```

**Run tests**

```
npx jest
```

## Inspirations

AXAR is built on ideas from some of the best tools and frameworks out there. We use Vercel's AI SDK and take inspiration from [Pydantic AI](https://github.com/pydantic/pydantic-ai)and OpenAI’s [Swarm](https://github.com/openai/swarm). These projects have set the standard for developer-friendly AI tooling, and AXAR builds on that foundation.

## Resources

- [Discord](https://discord.gg/4h8fUZTWD9)
- [LinkedIn](https://www.linkedin.com/company/axar-ai/)
- [GitHub](https://github.com/axar-ai)

## Contributing

We welcome contributions from the community. Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information. We run regular workshops and events to help you get started. Join our [Discord](https://discord.gg/4h8fUZTWD9) to stay in the loop.

## License

AXAR AI is open-sourced under the Apache 2.0 license. See the [LICENSE](LICENSE) file for more details.
