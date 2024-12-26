import { model, systemPrompt } from "./../agent/decorators";
import { Agent } from "./../agent";

@model("gpt-4o-mini")
@systemPrompt("Be concise, reply with one sentence")
export class SimpleAgent extends Agent<string, string> {}

async function main() {
	const response = await new SimpleAgent().run(
		'Where does "hello world" come from?'
	);
	console.log(response);
}

main().catch(console.error);
