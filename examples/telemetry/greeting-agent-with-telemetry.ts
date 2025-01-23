import {
  model,
  systemPrompt,
  Agent,
  schema,
  property,
  output,
  input,
  enumValues,
  tool,
} from '@axarai/axar';

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';


@schema()
class GreetingAgentRequest {
  @property("User's full name")
  userName!: string;

  @property("User's current mood")
  @enumValues(['happy', 'neutral', 'sad'])
  userMood!: 'happy' | 'neutral' | 'sad';

  @property("User's language preference")
  language!: string;
}

@schema()
class GreetingAgentResponse {
  @property("A greeting message to cater to the user's mood")
  greeting!: string;

  @property("A line acknowledging the current time")
  timeResponse!: string;
}

@model('openai:gpt-4o-mini')
@systemPrompt(`Greet the user by name in their preferred language, matching their mood and considering current time.`,)
@input(GreetingAgentRequest)
@output(GreetingAgentResponse)
export class GreetingAgent extends Agent<
  GreetingAgentRequest,
  GreetingAgentResponse
> {
  @tool('Get current time')
  getCurrentTime(): string {
    return `The current time is ${new Date().toLocaleString()}.`;
  }
}

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'TelemetryExample',
  }),
  spanProcessor: new SimpleSpanProcessor(new OTLPTraceExporter()),
});

// Instantiate and run the agent
async function main() {
  sdk.start();
  try {
    const response = await new GreetingAgent().run({
      userName: 'Alice',
      userMood: 'happy',
      language: 'English',
    });
    console.log(response);
  } finally {
    await sdk.shutdown();
  }
}

main().catch(console.error);
