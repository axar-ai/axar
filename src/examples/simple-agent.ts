import { model, systemPrompt, Agent } from '../agent';

@model('openai:gpt-4o-mini')
@systemPrompt('Be concise, reply with one sentence')
export class SimpleAgent extends Agent<string, string> {}

async function main() {
  const response = await new SimpleAgent().run(
    'Where does "hello world" come from?',
  );
  console.log(response);
}

if (require.main === module) {
  main().catch(console.error);
}
