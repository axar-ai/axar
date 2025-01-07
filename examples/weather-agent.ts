import { z } from 'zod';
import { model, systemPrompt, output, tool, Agent } from '@axar-ai/axar-core';
import { property, schema } from '@axar-ai/axar-core';

export interface APIKeys {
  readonly weatherApiKey: string | null;
  readonly geoApiKey: string | null;
}

export interface Deps {
  readonly client: {
    get: (url: string, params: Record<string, any>) => Promise<any>;
  };
  readonly keys: APIKeys;
}

const WEATHER_CODE_DESCRIPTIONS: Record<number, string> = {
  1000: 'Clear, Sunny',
  1100: 'Mostly Clear',
  1101: 'Partly Cloudy',
  1102: 'Mostly Cloudy',
  1001: 'Cloudy',
  2000: 'Fog',
  2100: 'Light Fog',
  4000: 'Drizzle',
  4001: 'Rain',
  4200: 'Light Rain',
  4201: 'Heavy Rain',
  5000: 'Snow',
  5001: 'Flurries',
  5100: 'Light Snow',
  5101: 'Heavy Snow',
  6000: 'Freezing Drizzle',
  6001: 'Freezing Rain',
  6200: 'Light Freezing Rain',
  6201: 'Heavy Freezing Rain',
  7000: 'Ice Pellets',
  7101: 'Heavy Ice Pellets',
  7102: 'Light Ice Pellets',
  8000: 'Thunderstorm',
};

@schema()
export class WeatherResponse {
  @property(
    'Weather summary, including temperature, precipitation, and clothing recommendations',
  )
  summary!: string;
}

@model('openai:gpt-4o-mini')
@systemPrompt('Be concise, reply with one sentence.')
@output(WeatherResponse) // Apply the output decorator here with the schema
export class WeatherAgent extends Agent<string, WeatherResponse> {
  constructor(private deps: Deps) {
    super();
  }

  // Tool to get latitude and longitude of a location
  @tool(
    'Get latitude and longitude of a location',
    z.object({
      locationDescription: z.string(),
    }),
  )
  async getLatLng({ locationDescription }: { locationDescription: string }) {
    const params = {
      q: locationDescription,
      api_key: this.deps.keys.geoApiKey,
    };

    const response = await this.deps.client.get(
      'https://geocode.maps.co/search',
      params,
    );
    const data = await response;

    if (data.length > 0) {
      return { lat: data[0].lat, lng: data[0].lon };
    } else {
      throw new Error('Could not find the location');
    }
  }

  // Tool to get weather at a location
  @tool(
    'Get weather at a location',
    z.object({
      lat: z.number(),
      lng: z.number(),
    }),
  )
  async getWeather({ lat, lng }: { lat: number; lng: number }) {
    const params = {
      apikey: this.deps.keys.weatherApiKey,
      location: `${lat},${lng}`,
      units: 'metric',
    };

    const response = await this.deps.client.get(
      'https://api.tomorrow.io/v4/weather/realtime',
      params,
    );
    const data = await response;

    const values = data.values;
    return {
      temperature: `${values.temperatureApparent.toFixed(0)}°C`,
      description: WEATHER_CODE_DESCRIPTIONS[values.weatherCode] || 'Unknown',
    };
  }
}

// Main function to run the agent automatically
async function main() {
  const mockHttpClient = {
    get: async (url: string, params: Record<string, any>) => {
      // Mock API responses
      if (url.includes('geocode.maps.co')) {
        return [{ lat: 51.5074, lon: -0.1278 }];
      }
      if (url.includes('api.tomorrow.io')) {
        return {
          values: { temperatureApparent: -2.5, weatherCode: 5101 },
        };
      }
    },
  };

  const keys: APIKeys = {
    weatherApiKey: process.env.WEATHER_API_KEY || null,
    geoApiKey: process.env.GEO_API_KEY || null,
  };

  const deps: Deps = { client: mockHttpClient, keys };

  const agent = new WeatherAgent(deps);

  const londonWeather = await agent.run('What is the weather like in London?');
  console.log('London Weather:', londonWeather);

  const canadaWeather = await agent.run('What is the weather like in Canada?');
  console.log('Canada Weather:', canadaWeather);
}

if (require.main === module) {
  main().catch(console.error);
}
