<p align="center">
  <img src="https://1845789600-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FEsqZ01bZEklboQR0Pa9C%2Fuploads%2FzA1p5nNK5LK1Nlo8yjxh%2FColor%20logo%20with%20background.svg?alt=media&token=df4fd20a-d9be-4994-99b7-8ae3f9f558cb" alt="AXAR Logo" width="360">
</p>

<div align="center" style="margin-bottom: 16px;">
  <a href="https://axar-ai.gitbook.io/axar"><img src="https://img.shields.io/badge/GitBook-Docu-lightblue" alt="Documentation"></a>
  <a href="https://github.com/axar-ai/axar/actions/workflows/ci.yml?query=branch%3Amain"><img src="https://github.com/axar-ai/axar/actions/workflows/ci.yml/badge.svg?event=push" alt="CI"></a>
  <!-- <a href='https://coveralls.io/github/axar-ai/axar?branch=main'><img src='https://coveralls.io/repos/github/axar-ai/axar/badge.svg?branch=main' alt='Coverage Status' /></a> -->
  <a href="https://www.npmjs.com/package/@axarai/axar"><img alt="NPM Version" src="https://img.shields.io/npm/v/%40axarai%2Faxar"></a>
  <a href="https://www.npmjs.com/package/@axarai/axar"><img alt="NPM download" src="https://img.shields.io/npm/dw/%40axarai%2Faxar"></a>
  <a href="https://github.com/axar-ai/axar/blob/main/LICENSE"><img src="https://img.shields.io/github/license/axar-ai/axar" alt="license"></a>
</div>
<br/>

**AXAR AI** is a lightweight framework for building production-ready agentic applications using TypeScript. It’s designed to help you create robust, production-grade LLM-powered apps using familiar coding practices—no unnecessary abstractions, no steep learning curve.

## ⌾ Yet another framework?

Most agent frameworks are overcomplicated. And many prioritize flashy demos over practical use, making it harder to debug, iterate, and trust in production. Developers need tools that are simple to work with, reliable, and easy to integrate into existing workflows.

At its core, AXAR is built around code. Writing explicit, structured instructions is the best way to achieve clarity, control, and precision—qualities that are essential when working in the unpredictable world LLMs.

If you’re building real-world AI applications, AXAR gets out of your way and lets you focus on shipping reliable software.

### 🌍 Hello world!

Here's a minimal example of an AXAR agent:

```ts
import { model, systemPrompt, Agent } from '@axarai/axar';

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

## Why use AXAR

- **🧩 Type-first design**: Structured, typed inputs and outputs with TypeScript (Zod or @annotations) for predictable and reliable agent workflows.

- **🛠️ Familiar and intuitive**: Built on patterns like dependency injection and decorators, so you can use what you already know.

- **🎛️ Explicit control**: Define agent behavior, guardrails, and validations directly in code for clarity and maintainability.

- **🔍 Transparent**: Includes tools for real-time logging and monitoring, giving you full control and insight into agent operations.

- **🪶 Minimalistic**: Lightweight minimal design with little to no overhead for your codebase.

- **🌐 Model agnostic**: Works with OpenAI, Anthropic, Gemini, and more, with easy extensibility for additional models.

- **🚀 Streamed outputs**: Streams LLM responses with built-in validation for fast and accurate results.

## Resources

- [📕 AXAR AI Documentation ↗](https://axar-ai.gitbook.io/axar)
- [💬 Discord](https://discord.gg/4h8fUZTWD9)
- [👔 LinkedIn](https://www.linkedin.com/company/axar-ai/)
- [🐙 GitHub](https://github.com/axar-ai)

## Usage

### 1. Configure your project

Set up a new project and install the required dependencies:

```bash
mkdir axar-demo
cd axar-demo
npm init -y
npm i @axarai/axar ts-node typescript
npx tsc --init
```

> [!WARNING]
> You need to configure your `tsconfig.json` file as follows for better compatibility:
>
> ```json
> {
>   "compilerOptions": {
>     "strict": true,
>     "module": "CommonJS",
>     "target": "es2020",
>     "esModuleInterop": true,
>     "experimentalDecorators": true,
>     "emitDecoratorMetadata": true
>   }
> }
> ```

### 2. Write your first agent

Create a new file `text-agent.ts` and add the following code:

```ts
import { model, systemPrompt, Agent } from '@axarai/axar';

@model('openai:gpt-4o-mini')
@systemPrompt('Be concise, reply with one sentence')
class TextAgent extends Agent<string, string> {}

(async () => {
  const response = await new TextAgent().run('Who invented the internet?');
  console.log(response);
})();
```

### 3. Run the agent

```bash
export OPENAI_API_KEY="sk-proj-YOUR-API-KEY"
npx ts-node text-agent.ts
```

> [!WARNING]
> AXAR AI (axar) is currently in early alpha. It is not intended to be used in production as of yet. But we're working hard to get there and we would love your help!

## In-depth example

You can easily extend AXAR agents with tools, dynamic prompts, and structured responses to build more robust and flexible agents.

### 💬 Bank agent (dynamic prompts, tools, structured data, and DI)

Here's a more complex example (truncated to fit in this README):

(Full code here: [examples/bank-agent4.ts](examples/bank-agent4.ts))

<p align="center">
  <img src="https://1845789600-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FEsqZ01bZEklboQR0Pa9C%2Fuploads%2F1w7BWzdiMjXduOh0KAzW%2Fbank-agent.svg?alt=media&token=dcc90aa0-3119-4ecd-9f03-991f7dc99a35">
</p>

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

## Setting up for contribution

- **Install dependencies**: `npm install`
- **Build**: `npm run build`
- **Run tests**: `npm run test`

## Contributing

We welcome contributions from the community. Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information. We run regular workshops and events to help you get started. Join our [Discord](https://discord.gg/4h8fUZTWD9) to stay in the loop.

## Inspirations

AXAR is built on ideas from some of the best tools and frameworks out there. We use Vercel's AI SDK and take inspiration from [Pydantic AI](https://github.com/pydantic/pydantic-ai) and OpenAI’s [Swarm](https://github.com/openai/swarm). These projects have set the standard for developer-friendly AI tooling, and AXAR builds on that foundation.

## License

AXAR AI is open-sourced under the Apache 2.0 license. See the [LICENSE](LICENSE) file for more details.
