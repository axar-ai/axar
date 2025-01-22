import {
  model,
  systemPrompt,
  Agent,
  tool,
  schema,
  property,
} from '@axarai/axar';

@schema()
class WeatherParams {
  @property('Location of the user')
  location!: string;
}

@model('openai:gpt-4o-mini')
@systemPrompt(`
  Greet the user based on the current time and weather.
  Get the current time and weather if you need it.
`)
export class GreetingAgent extends Agent<string, string> {
  @tool('Get current time')
  getCurrentTime(): string {
    return `The current time is ${new Date().toLocaleString()}.`;
  }

  @tool('Get weather info')
  getWeatherInfo(weather: WeatherParams): string {
    return `The weather is rainy today in ${weather.location}.`;
  }
}

// Instantiate and run the agent
(async () => {
  const response = await new GreetingAgent().run(
    'Hello, my name is Alice. I am from San Francisco.',
  );
  console.log(response);
})();
