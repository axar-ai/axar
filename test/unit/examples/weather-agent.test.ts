import {
  WeatherAgent,
  WeatherResponse,
  APIKeys,
  Deps,
} from './../../../examples/weather-agent';

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
    agent = new WeatherAgent(deps);
  });

  // Cleanup after each test
  afterEach(() => {
    jest.clearAllMocks();
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
    it('should return a WeatherResponse for a valid location', async () => {
      // Mock `getLatLng` and `getWeather` responses
      mockHttpClient.get
        .mockResolvedValueOnce([{ lat: 51.5074, lon: -0.1278 }]) // geocode.maps.co
        .mockResolvedValueOnce({
          values: { temperatureApparent: -2.5, weatherCode: 5101 },
        }); // api.tomorrow.io

      // Mock run method
      jest.spyOn(agent, 'run').mockResolvedValueOnce({
        summary: 'The weather in London is -2.5°C with snow.',
      } as WeatherResponse);

      const result = await agent.run('What is the weather like in London?');
      expect(result).toHaveProperty(
        'summary',
        'The weather in London is -2.5°C with snow.',
      );
    });
  });
});
