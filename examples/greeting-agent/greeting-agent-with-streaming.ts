import {
  model,
  systemPrompt,
  Agent,
  schema,
  property,
  output,
  input,
  tool,
  optional,
} from '@axarai/axar';

@schema()
class GreetingAgentRequest {
  @property("User's full name")
  userName!: string;

  @property("User's current mood")
  userMood!: 'happy' | 'neutral' | 'sad';

  @property("User's language preference")
  language!: string;
}

@schema()
class GreetingAgentResponse {
  @property("A greeting message to cater to the user's mood")
  greeting!: string;

  @property('A line acknowledging the current time')
  timeResponse!: string;

  @property("A personalized message based on user's mood")
  @optional()
  moodMessage?: string;
}

@model('openai:gpt-4o-mini')
@systemPrompt(`
  Greet the user by name in their preferred language, matching their mood and considering current time.
  Build the response gradually, starting with the greeting, then adding time acknowledgment, and finally a mood-based message.
  
  You must respond with a JSON object containing:
  - greeting: A friendly greeting using their name
  - timeResponse: A response about the current time
  - moodMessage: A message matching their mood
`)
@input(GreetingAgentRequest)
@output(GreetingAgentResponse)
export class StructuredGreetingAgent extends Agent<
  GreetingAgentRequest,
  GreetingAgentResponse
> {
  @tool('Get current time')
  async getCurrentTime(): Promise<string> {
    return `The current time is ${new Date().toLocaleString()}.`;
  }
}

// Simple string-based streaming example
@model('openai:gpt-4o-mini')
@systemPrompt(`
  Greet the user in a friendly tone. 
  Build your response gradually:
  1. Start with a greeting
  2. Add a friendly question
  3. End with a warm closing
`)
export class SimpleGreetingAgent extends Agent<string, string> {
  @tool('Get current time')
  async getCurrentTime(): Promise<string> {
    return `The current time is ${new Date().toLocaleString()}.`;
  }
}

// Example usage with structured streaming
async function demoStructuredStreaming() {
  const agent = new StructuredGreetingAgent();
  const stream = await agent.streamRun({
    userName: 'Alice',
    userMood: 'happy',
    language: 'English',
  });

  console.log('Streaming structured response:');

  // Stream partial objects as they arrive
  for await (const partial of stream.processedStream) {
    console.log('Partial:', partial);
  }
}

// Example usage with simple string streaming
async function demoSimpleStreaming() {
  const agent = new SimpleGreetingAgent();
  const stream = await agent.streamRun('My name is Bob');

  console.log('\nStreaming simple response:');
  // Stream text chunks as they arrive
  for await (const chunk of stream.processedStream) {
    process.stdout.write(chunk);
  }
}

// Run both examples
(async () => {
  await demoStructuredStreaming();
  await demoSimpleStreaming();
})().catch(console.error);
