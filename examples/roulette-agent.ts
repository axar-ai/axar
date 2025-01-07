import z from 'zod';
import { model, output, systemPrompt, tool, Agent } from '@axar-ai/axar-core';

// FIXME: Support boolean output

export const SupportResponseSchema = z.boolean();

type SupportResponse = z.infer<typeof SupportResponseSchema>;
@model('openai:gpt-4o-mini')
@output(SupportResponseSchema)
@systemPrompt(`
  See if the customer has won the game based on the number they provide
`)
export class RouletteAgent extends Agent<string, SupportResponse> {
  constructor(private winningNumber: number) {
    super();
  }

  @tool(
    'Check if the customer number is a winner',
    z.object({ customerNumber: z.number() }),
  )
  checkWinner({ customerNumber }: { customerNumber: number }): boolean {
    console.log(`Checking if ${customerNumber} is a winner`);
    return customerNumber === this.winningNumber;
  }
}

async function main() {
  const agent = new RouletteAgent(18);

  let result = await agent.run('Put my money on square eighteen');
  console.log(result);

  result = await agent.run('I bet five is the winner');
  console.log(result);
}

if (require.main === module) {
  main().catch(console.error);
}
