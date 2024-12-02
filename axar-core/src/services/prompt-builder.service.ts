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
	 * @param shorts - Optional parameter for additional configurations (e.g., examples).
	 * @returns The generated prompt as a string.
	 * @throws Error if the prompt generation fails.
	 */
	async generatePrompt(schema: any, shorts: any = null): Promise<string> {
		try {
			// Translate schema to JSON
			const translatedSchema = await this.translatorService.translate(schema);

			// Validate the schema
			this.validatorService.validate(schema);

			// Combine translated schema and shorts (if any) into a prompt
			return this.buildPrompt(translatedSchema, shorts);
		} catch (error: any) {
			throw new Error("Failed to generate prompt: " + error.message);
		}
	}

	/**
	 * Combines the translated schema and optional shorts into a final prompt.
	 * @param translatedSchema - The translated schema as a string.
	 * @param shorts - Optional parameter for additional configurations.
	 * @returns The final prompt.
	 */
	private buildPrompt(translatedSchema: string, shorts: any): string {
		// If shorts are provided, modify the prompt accordingly (example logic)
		let prompt = translatedSchema;
		if (shorts) {
			prompt += `\n\nAdditional info: ${JSON.stringify(shorts)}`;
		}
		return prompt;
	}
}
