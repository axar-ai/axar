import { jsonSchema } from "ai";
import { Translator } from "../../src/translator";
import { dummySchema } from "../test-utils/dummy-schemas";

jest.mock("ai", () => ({
	jsonSchema: jest.fn(),
}));

describe("Translator", () => {
	const mockResponseSchema = dummySchema;

	let translator: Translator;

	beforeEach(() => {
		translator = new Translator();
	});

	it("should translate schema to JSON successfully", async () => {
		const translatedSchema = { translated: true };
		(jsonSchema as jest.Mock).mockReturnValue(translatedSchema);

		const baseSchema = mockResponseSchema;
		const result = await translator.translate(baseSchema);

		expect(jsonSchema).toHaveBeenCalledWith(mockResponseSchema.response);
		expect(result).toEqual(translatedSchema);
	});

	it("should throw an error if schema translation fails", async () => {
		// Mock the jsonSchema function to throw an error
		(jsonSchema as jest.Mock).mockImplementation(() => {
			throw new Error("Mock translation error");
		});

		const baseSchema = { response: mockResponseSchema };

		await expect(translator.translate(baseSchema)).rejects.toThrow(
			"Failed to translate schema to JSON: Mock translation error"
		);

		// Verify that jsonSchema was called
		expect(jsonSchema).toHaveBeenCalledWith(mockResponseSchema);
	});
});
