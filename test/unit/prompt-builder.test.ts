import { PromptBuilder } from "../../src/prompt-builder";
import { Translator } from "../../src/translator";
import { Validator } from "../../src/validator";
import { dummySchema } from "../test-utils/dummy-schemas";
import { dummyShots } from "../test-utils/dummy-shots";

let translateResovler = jest.fn().mockResolvedValue("Translated schema");

jest.mock("../../src/translator", () => ({
	Translator: jest.fn().mockImplementation(() => ({
		translate: translateResovler, // Simulating successful translation
	})),
}));

jest.mock("../../src/validator", () => ({
	Validator: jest.fn().mockImplementation(() => ({
		validate: jest.fn(),
	})),
}));

describe("PromptBuilder", () => {
	let promptBuilder: PromptBuilder;
	let translator: Translator;
	let validator: Validator;

	beforeEach(() => {
		translator = new Translator();
		validator = new Validator();
		promptBuilder = new PromptBuilder();
	});

	describe("generatePrompt", () => {
		it("should generate a prompt successfully", async () => {
			const schema = dummySchema;
			const result = await promptBuilder.generatePrompt(schema);
			expect(result).toBe("Translated schema");
		});

		it("should throw an error if translation fails", async () => {
			translateResovler.mockRejectedValue(new Error("Translation error"));

			const schema = dummySchema;

			await expect(promptBuilder.generatePrompt(schema)).rejects.toThrow(
				"Failed to generate prompt: Translation error"
			);

			// Ensure validate method is not called
			expect(validator.validate).not.toHaveBeenCalled();
		});
	});

	describe("generateShots", () => {
		it("should generate messages successfully", async () => {
			const schema = dummySchema;
			const shots = dummyShots;
			const query = { cityName: "Dhaka" };

			const result = await promptBuilder.generateShots(schema, shots, query);

			expect(result).toEqual([
				{
					role: "user",
					content: JSON.stringify(query),
				},
				{
					role: "assistant",
					content: JSON.stringify([
						{
							type: "tool-call",
							toolCallId: "tool-call-1",
							toolName: dummySchema.name,
							args: JSON.stringify(dummyShots[0]),
						},
					]),
				},
			]);
		});

		it("should throw an error if generation fails", async () => {
			const schema = dummySchema;
			const shots = dummyShots;
			const query = {};

			jest
				.spyOn(promptBuilder, "generateShots")
				.mockRejectedValueOnce(
					new Error("Failed to generate prompt: Error in shot generation")
				);

			await expect(
				promptBuilder.generateShots(schema, shots, query)
			).rejects.toThrow("Failed to generate prompt: Error in shot generation");
		});
	});
});
