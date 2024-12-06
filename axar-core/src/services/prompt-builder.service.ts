import {
	CoreAssistantMessage,
	CoreMessage,
	CoreSystemMessage,
	CoreToolMessage,
	CoreUserMessage,
	ToolCallPart,
	ToolResultPart,
} from "ai";
import { TranslatorService } from "./translator.service";
import { ValidatorService } from "./validator.service";

/**
 * Service for building prompts by translating and validating schemas.
 */
export class PromptBuilderService {
	private translatorService: TranslatorService;
	private validatorService: ValidatorService;

	constructor() {
		this.translatorService = new TranslatorService();
		this.validatorService = new ValidatorService();
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
			const translatedSchema = await this.translatorService.translate(schema);

			// Validate the schema
			this.validatorService.validate(schema);

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
