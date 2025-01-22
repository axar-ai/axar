import { model, systemPrompt, Agent, tool } from '@axarai/axar';
import { z } from 'zod';

const WeatherParamsSchema = z.object({
  location: z.string().describe('Location of the user'),
});

type WeatherParams = z.infer<typeof WeatherParamsSchema>;

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

  @tool('Get weather info', WeatherParamsSchema)
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
