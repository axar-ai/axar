import {
  WeatherAgent,
  WeatherResponse,
  APIKeys,
  Deps,
} from './../../../examples/weather-agent';

// Mock the AI SDK - the actual dependency
jest.mock('ai', () => ({
  generateText: jest.fn().mockResolvedValue({
    text: '',
    experimental_output: {
      summary: 'The weather in London is -3°C with heavy snow.',
    },
  }),
  Output: {
    object: jest.fn((config) => config),
  },
}));

// Mock the model factory
jest.mock('../../../src/llm/model-factory', () => ({
  getModel: jest.fn().mockResolvedValue({
    specificationVersion: 'v2',
    provider: 'openai',
    modelId: 'gpt-4-mini',
    doGenerate: jest.fn(),
    doStream: jest.fn(),
    supportedUrls: {},
  }),
}));

describe('WeatherAgent', () => {
  // Mock HTTP client
  const mockHttpClient = {
    get: jest.fn(),
  };

  // Mock API keys
  const keys: APIKeys = {
    weatherApiKey: 'mock-weather-api-key',
    geoApiKey: 'mock-geo-api-key',
  };

  const deps: Deps = { client: mockHttpClient, keys };
  let agent: WeatherAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new WeatherAgent(deps);
  });

  describe('getLatLng', () => {
    it('should return latitude and longitude for a valid location', async () => {
      // Mock API response
      mockHttpClient.get.mockResolvedValueOnce([
        { lat: 51.5074, lon: -0.1278 },
      ]);

      const result = await agent.getLatLng({ locationDescription: 'London' });
      expect(result).toEqual({ lat: 51.5074, lng: -0.1278 });
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://geocode.maps.co/search',
        { q: 'London', api_key: keys.geoApiKey },
      );
    });

    it('should throw an error if the location is not found', async () => {
      // Mock API response
      mockHttpClient.get.mockResolvedValueOnce([]);

      await expect(
        agent.getLatLng({ locationDescription: 'UnknownPlace' }),
      ).rejects.toThrow('Could not find the location');
    });
  });

  describe('getWeather', () => {
    it('should return weather data for valid latitude and longitude', async () => {
      // Mock API response
      mockHttpClient.get.mockResolvedValueOnce({
        values: { temperatureApparent: 15.3, weatherCode: 1001 },
      });

      const result = await agent.getWeather({ lat: 51.5074, lng: -0.1278 });
      expect(result).toEqual({
        temperature: '15°C',
        description: 'Cloudy',
      });
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.tomorrow.io/v4/weather/realtime',
        {
          apikey: keys.weatherApiKey,
          location: '51.5074,-0.1278',
          units: 'metric',
        },
      );
    });

    it('should handle unknown weather codes gracefully', async () => {
      // Mock API response
      mockHttpClient.get.mockResolvedValueOnce({
        values: { temperatureApparent: 10, weatherCode: 9999 },
      });

      const result = await agent.getWeather({ lat: 51.5074, lng: -0.1278 });
      expect(result).toEqual({
        temperature: '10°C',
        description: 'Unknown',
      });
    });
  });

  describe('run', () => {
    it('should call generateText with correct configuration', async () => {
      // Call the real run method
      const result = await agent.run('What is the weather like in London?');

      // Verify result comes from mocked generateText
      expect(result).toEqual({
        summary: 'The weather in London is -3°C with heavy snow.',
      });

      // Verify generateText was called with proper configuration
      const { generateText } = require('ai');
      expect(generateText).toHaveBeenCalledTimes(1);
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'What is the weather like in London?',
            }),
          ]),
          // Verify tools are passed
          tools: expect.objectContaining({
            getLatLng: expect.any(Object),
            getWeather: expect.any(Object),
          }),
        }),
      );
    });

    it('should include system prompt in the request', async () => {
      await agent.run('What is the weather?');

      const { generateText } = require('ai');
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: 'Be concise, reply with one sentence.',
            }),
          ]),
        }),
      );
    });

    it('should pass model configuration options', async () => {
      await agent.run('Weather check');

      const { generateText } = require('ai');
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: 100,
          temperature: 0.5,
          maxRetries: 3,
          maxSteps: 3,
          toolChoice: 'auto',
        }),
      );
    });
  });
});
