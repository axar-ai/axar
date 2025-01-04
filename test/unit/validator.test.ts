import { Validator } from "../../src/validator";
import { dummySchema } from "../test-utils/dummy-schemas";

describe("Validator", () => {
	let validator: Validator;
	beforeEach(() => {
		validator = new Validator();
	});

	it("Should validate the schema successfully", async () => {
		const schema = dummySchema;
		const result = await validator.validate(dummySchema);

		expect(result).toBe(schema);
	});
});
