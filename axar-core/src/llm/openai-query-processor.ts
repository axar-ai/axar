import { createOpenAI, OpenAIProvider } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { ModelName, QueryProcessor } from "./../interfaces/query-processor";

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
		query: any,
		schemaName: string,
		schemaDescription: string
	): Promise<any> {
		try {
			const { object } = await generateObject({
				model: this.llm(this.modelName),
				schema: schema,
				prompt: JSON.stringify(query),
				schemaName: schemaName,
				schemaDescription: schemaDescription,
			});

			console.log(JSON.stringify(object, null, 2));

			return object;
		} catch (error) {
			console.error("OpenAI processing error:", error);
			throw error;
		}
	}
}
