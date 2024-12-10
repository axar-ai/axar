import {
	CoreAssistantMessage,
	CoreMessage,
	CoreSystemMessage,
	CoreToolMessage,
	CoreUserMessage,
	ToolCallPart,
} from "ai";
import { Translator } from "./translator";
import { Validator } from "./validator";

/**
 * Service for building prompts by translating and validating schemas.
 */
export class PromptBuilder {
	private translator: Translator;
	private validator: Validator;

	constructor() {
		this.translator = new Translator();
		this.validator = new Validator();
	}

	/**
	 * Generates a prompt by translating and validating the schema.
	 * @param schema - The schema to translate and validate.
	 * @returns The generated prompt as a string.
	 * @throws Error if the prompt generation fails.
	 */
	async generatePrompt(schema: any): Promise<string> {
		try {
			// Translate schema to JSON
			const translatedSchema = await this.translator.translate(schema);

			// Validate the schema
			this.validator.validate(schema);

			return this.buildPrompt(translatedSchema);
		} catch (error: any) {
			throw new Error("Failed to generate prompt: " + error.message);
		}
	}

	async generateShots(
		schema: any,
		shots: any[],
		query: any
	): Promise<Array<CoreMessage>> {
		try {
			const messages: Array<
				| CoreSystemMessage
				| CoreUserMessage
				| CoreAssistantMessage
				| CoreToolMessage
			> = [];

			messages.push({
				role: "user",
				content: JSON.stringify(query),
			});

			for (const example of shots) {
				const toolCallPart: Array<ToolCallPart> = [];

				toolCallPart.push({
					type: "tool-call",
					toolCallId: "tool-call-1",
					toolName: schema.name,
					args: JSON.stringify(example),
				});

				messages.push({
					role: "assistant",
					content: JSON.stringify(toolCallPart),
				});
			}

			return messages;
		} catch (error: any) {
			throw new Error("Failed to generate prompt: " + error.message);
		}
	}

	/**
	 * @param translatedSchema - The translated schema as a string.
	 * @returns The final prompt.
	 */
	private buildPrompt(translatedSchema: string): string {
		let prompt = translatedSchema;
		return prompt;
	}
}
