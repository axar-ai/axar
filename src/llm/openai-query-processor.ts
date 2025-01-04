import { createOpenAI, OpenAIProvider } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { ModelName, QueryProcessor } from "./query-processor";

export class OpenAIllmHandler implements QueryProcessor {
	private llm: OpenAIProvider;
	private modelName: ModelName;

	constructor(apiKey: string, name: ModelName = ModelName.GPT_4) {
		this.modelName = name;
		this.llm = createOpenAI({
			apiKey,
			compatibility: "strict", // strict mode, enable when using the OpenAI API
		});
	}

	async processQuery(
		schema: any,
		schemaName: string,
		schemaDescription: string,
		shots: any
	): Promise<any> {
		try {
			const requst = await generateObject({
				model: this.llm(this.modelName),
				schema: schema,
				schemaName: schemaName,
				schemaDescription: schemaDescription,
				messages: shots,
			});

			const { object } = requst;

			return object;
		} catch (error) {
			console.error("OpenAI processing error:", error);
			throw error;
		}
	}
}
