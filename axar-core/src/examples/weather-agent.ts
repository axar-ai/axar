import { z } from "zod";
import { model, systemPrompt, output, tool, Agent } from "../agent";

export interface APIKeys {
	weatherApiKey: string | null;
	geoApiKey: string | null;
}

export interface Deps {
	client: { get: (url: string, params: Record<string, any>) => Promise<any> };
	keys: APIKeys;
}

export const LatLngSchema = z.object({
	lat: z.number().describe("Latitude of the location"),
	lng: z.number().describe("Longitude of the location"),
});

export const WeatherSchema = z.object({
	temperature: z.string().describe("Temperature at the location"),
	description: z.string().describe("Weather description"),
});

type LatLngSchemaRequest = z.infer<typeof LatLngSchema>;

@model("gpt-4o")
@systemPrompt("Be concise, reply with one sentence.")
export class WeatherAgent extends Agent<string, any> {
	constructor(private deps: Deps) {
		super();
	}

	@tool(
		"Get latitude and longitude of a location",
		z.object({
			locationDescription: z.string(),
		})
	)
	async getLatLng({ locationDescription }: { locationDescription: string }) {
		if (!this.deps.keys.geoApiKey) {
			// No API key, return a dummy response
			return { lat: 51.1, lng: -0.1 };
		}

		const params = {
			q: locationDescription,
			api_key: this.deps.keys.geoApiKey,
		};
		console.log("Calling geocode API with", params);

		const response = await this.deps.client.get(
			"https://geocode.maps.co/search",
			params
		);
		const data = await response.json();

		if (data.length > 0) {
			return { lat: data[0].lat, lng: data[0].lon };
		} else {
			throw new Error("Could not find the location");
		}
	}

	@tool(
		"Get weather at a location",
		z.object({
			lat: z.number(),
			lng: z.number(),
		})
	)
	async getWeather({ lat, lng }: { lat: number; lng: number }) {
		if (!this.deps.keys.weatherApiKey) {
			// No API key, return a dummy response
			return { temperature: "21°C", description: "Sunny" };
		}

		const params = {
			apikey: this.deps.keys.weatherApiKey,
			location: `${lat},${lng}`,
			units: "metric",
		};
		console.log("Calling weather API with", params);

		const response = await this.deps.client.get(
			"https://api.tomorrow.io/v4/weather/realtime",
			params
		);
		const data = await response.json();
		console.log("🚀 ~ WeatherAgent ~ getWeather ~ data:", data);

		const weatherCodeDescriptions: Record<number, string> = {
			1000: "Clear, Sunny",
			1100: "Mostly Clear",
			1101: "Partly Cloudy",
			1102: "Mostly Cloudy",
			1001: "Cloudy",
			2000: "Fog",
			2100: "Light Fog",
			4000: "Drizzle",
			4001: "Rain",
			4200: "Light Rain",
			4201: "Heavy Rain",
			5000: "Snow",
			5001: "Flurries",
			5100: "Light Snow",
			5101: "Heavy Snow",
			6000: "Freezing Drizzle",
			6001: "Freezing Rain",
			6200: "Light Freezing Rain",
			6201: "Heavy Freezing Rain",
			7000: "Ice Pellets",
			7101: "Heavy Ice Pellets",
			7102: "Light Ice Pellets",
			8000: "Thunderstorm",
		};

		const values = data.data.values;
		return {
			temperature: `${values.temperatureApparent.toFixed(0)}°C`,
			description: weatherCodeDescriptions[values.weatherCode] || "Unknown",
		};
	}
}

async function main() {
	const mockHttpClient = {
		get: async (url: string, params: Record<string, any>) => {
			console.log(`HTTP GET: ${url} with params`, params);
			// Mock API responses
			if (url.includes("geocode.maps.co")) {
				return { json: async () => [{ lat: 51.5074, lon: -0.1278 }] };
			}
			if (url.includes("api.tomorrow.io")) {
				return {
					json: async () => ({
						data: {
							values: { temperatureApparent: 22.5, weatherCode: 1000 },
						},
					}),
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

	const latLng = await agent.getLatLng({ locationDescription: "London" });
	console.log("LatLng:", latLng);

	const weather = await agent.getWeather({ lat: latLng.lat, lng: latLng.lng });
	console.log("Weather:", weather);
}

main().catch(console.error);
