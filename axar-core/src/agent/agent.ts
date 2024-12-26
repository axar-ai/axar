// src/agent/Agent.ts
import { ZodSchema } from "zod";
import {
	generateText,
	LanguageModelV1,
	CoreMessage,
	CoreTool,
	Output,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { META_KEYS } from "./meta-keys";
import { ToolMetadata } from "./types";

// Base agent that handles core functionality
export abstract class Agent<TInput = string, TOutput = any> {
	private static getMetadata<T>(key: symbol, target: any): T {
		return Reflect.getMetadata(key, target) || null;
	}

	protected getModel(): LanguageModelV1 {
		const modelName = Agent.getMetadata<string>(
			META_KEYS.MODEL,
			this.constructor
		);
		if (!modelName) {
			throw new Error(
				"Model metadata not found. Please apply @model decorator."
			);
		}
		return openai(modelName);
	}

	protected getTools(): Record<string, CoreTool> {
		const tools = Agent.getMetadata<ToolMetadata[]>(
			META_KEYS.TOOLS,
			this.constructor
		);

		if (!tools) {
			throw new Error(
				"Tools metadata not found. Please apply @tool decorator."
			);
		}

		const toolsFormatted = Object.fromEntries(
			tools.map((tool) => [
				tool.name,
				{
					description: tool.description,
					parameters: tool.parameters,
					execute: (...args: any[]) => (this as any)[tool.method](...args),
				},
			])
		);

		// console.log(toolsFormatted);
		// throw new Error("Method not implemented.");

		return toolsFormatted as Record<string, CoreTool>;
	}

	protected getSystemPrompts(): Array<() => Promise<string>> {
		return Agent.getMetadata<Array<() => Promise<string>>>(
			META_KEYS.SYSTEM_PROMPTS,
			this.constructor
		);
	}

	protected getValidationSchema(): ZodSchema<any> {
		// Retrieve the ZodSchema from metadata
		const schema: ZodSchema<TOutput> = Reflect.getMetadata(
			META_KEYS.OUTPUT,
			this.constructor
		);

		if (!schema) {
			throw new Error(
				`Validation schema for ${this.constructor.name} not found. Ensure the class is decorated with @output.`
			);
		}

		return schema;
	}

	async run(input: TInput): Promise<TOutput> {
		const model = this.getModel();
		const tools = this.getTools();
		const schema = this.getValidationSchema();

		const systemPrompts = await Promise.all(
			this.getSystemPrompts().map((fn) => fn.call(this))
		);

		const messages = [
			{ role: "system", content: systemPrompts.join("\n\n") },
			{ role: "user", content: String(input) },
		] as CoreMessage[];

		//console.log("schema 🚀 ~ run ~ schema:", schema);
		//console.log(model);
		//console.log(messages);

		const hasSchema =
			schema && schema.parse && typeof schema.parse === "function";

		if (hasSchema) {
			const result = await generateText({
				model: model,
				//schema: schema || undefined, // Pass schema if present, otherwise undefined
				//output: schema ? "object" : "no-schema", // Use 'no-schema' if no schema is present
				messages: messages,
				tools: tools,
				experimental_output: Output.object({
					schema: schema,
				}),
				maxSteps: 3,
			});

			return result.experimental_output as TOutput;
			//return schema.parse(output) as TOutput;
		}

		console.log("hello");
		console.log(messages);
		console.log(tools);
		const result = await generateText({
			model: model,
			messages: messages as CoreMessage[],
			tools: tools,
			maxSteps: 3,
		});

		return result.text as TOutput;
	}

	// Stream method for streaming responses
	// async stream(input: TInput): Promise<StreamingTextResponse> {
	//   // Similar to run() but uses streamText from AI SDK
	//   // Implementation would follow AI SDK streaming patterns
	//   throw new Error("Streaming not yet implemented");
	// }
}
