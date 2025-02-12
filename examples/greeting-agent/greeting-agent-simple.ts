import { model, systemPrompt, Agent } from '@axarai/axar';

// Specify the AI model used by the agent
@model('openai:gpt-4o-mini')
// Provide a system-level prompt to guide the agent's behavior
@systemPrompt(`
  Greet the user by their name in a friendly tone.
`)
export class GreetingAgent extends Agent<string, string> {}

// Example usage
export async function main() {
  const response = await new GreetingAgent().run('My name is Alice.');
  console.log(response); // Output: "Hello, Alice! It's great to meet you! How are you doing today?"
}

// Only run if this file is executed directly (not imported as a module)
if (require.main === module) {
  main();
}
