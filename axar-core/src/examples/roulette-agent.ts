import z from "zod";
import { model, systemPrompt, tool } from "./../agent/decorators";
import { Agent } from "./../agent";

// FIXME: Support boolean output
@model("gpt-4o-mini")
// @validateOutput(SupportResponseSchema)
@systemPrompt(`
  See if the customer has won the game based on the number they provide
`)
class RouletteAgent extends Agent<string, boolean> {
	constructor(private winningNumber: number) {
		super();
	}

	@tool(
		"Check if the customer number is a winner",
		z.object({ customerNumber: z.number() })
	)
	checkWinner({ customerNumber }: { customerNumber: number }): boolean {
		console.log(`Checking if ${customerNumber} is a winner`);
		return customerNumber === this.winningNumber;
	}
}

async function main() {
	const agent = new RouletteAgent(18);

	let result = await agent.run("Put my money on square eighteen");
	console.log(result);

	result = await agent.run("I bet five is the winner");
	console.log(result);
}

main().catch(console.error);
