import {
	email,
	min,
	max,
	pattern,
	datetime,
	minimum,
	maximum,
	multipleOf,
	minItems,
	maxItems,
	uniqueItems,
	enumValues,
	zodify,
	arrayItems,
} from "../../../src/schema";
import { toZodSchema } from "../../../src/schema/generator";

describe("toZodSchema - Advanced Scenarios", () => {
	// Mixed Type Arrays
	// describe("mixed type arrays", () => {
	// 	@zodify()
	// 	class MixedArrays {
	// 		@uniqueItems()
	// 		@arrayItems(() => Object)
	// 		mixedArray!: (string | number)[];
	// 		@minItems(1)
	// 		@arrayItems(() => Object)
	// 		objectArray!: { id: number; name: string }[];
	// 	}
	// 	const schema = toZodSchema(MixedArrays);
	// 	it("validates mixed type arrays", () => {
	// 		expect(
	// 			schema.safeParse({
	// 				mixedArray: ["test", 123, "abc"],
	// 				objectArray: [{ id: 1, name: "test" }],
	// 			}).success
	// 		).toBe(true);
	// 		expect(
	// 			schema.safeParse({
	// 				mixedArray: ["test", "test"], // Duplicate values
	// 				objectArray: [{ id: 1, name: "test" }],
	// 			}).success
	// 		).toBe(false);
	// 	});
	// });
	//Deep Nested Structures
	// describe("deeply nested structures", () => {
	// 	class GeoLocation {
	// 		@minimum(-90)
	// 		@maximum(90)
	// 		latitude!: number;
	// 		@minimum(-180)
	// 		@maximum(180)
	// 		longitude!: number;
	// 	}
	// 	class Address {
	// 		@pattern(/^[0-9]{5}$/)
	// 		zipCode!: string;
	// 		@minItems(1)
	// 		@arrayItems(() => String)
	// 		streetLines!: string[];
	// 		location!: GeoLocation;
	// 	}
	// 	class Company {
	// 		@pattern(/^[A-Z0-9]{10}$/)
	// 		registrationNumber!: string;
	// 		@minItems(1)
	// 		@arrayItems(() => Address)
	// 		addresses!: Address[];
	// 	}
	// 	@zodify()
	// 	class DeepNestedUser {
	// 		@email()
	// 		email!: string;
	// 		company!: Company;
	// 		@minItems(1)
	// 		@arrayItems(() => Company)
	// 		previousCompanies?: Company[];
	// 	}
	// 	const schema = toZodSchema(DeepNestedUser);
	// 	it("validates deeply nested structures", () => {
	// 		const validData = {
	// 			email: "test@example.com",
	// 			company: {
	// 				registrationNumber: "ABC1234567",
	// 				addresses: [
	// 					{
	// 						zipCode: "12345",
	// 						streetLines: ["123 Main St"],
	// 						location: {
	// 							latitude: 40.7128,
	// 							longitude: -74.006,
	// 						},
	// 					},
	// 				],
	// 			},
	// 		};
	// 		expect(schema.safeParse(validData).success).toBe(true);
	// 		const invalidData = {
	// 			email: "test@example.com",
	// 			company: {
	// 				registrationNumber: "invalid",
	// 				addresses: [
	// 					{
	// 						zipCode: "12345",
	// 						streetLines: ["123 Main St"],
	// 						location: {
	// 							latitude: 100, // Invalid latitude
	// 							longitude: -74.006,
	// 						},
	// 					},
	// 				],
	// 			},
	// 		};
	// 		expect(schema.safeParse(invalidData).success).toBe(false);
	// 	});
	// });
	//Circular References
	// describe("circular references", () => {
	// 	class TreeNode {
	// 		@min(1)
	// 		value!: number;
	// 		parent?: TreeNode;
	// 		@minItems(0)
	// 		@arrayItems(() => TreeNode)
	// 		children!: TreeNode[];
	// 	}
	// 	const schema = toZodSchema(TreeNode);
	// 	it("handles circular references", () => {
	// 		const validNode = {
	// 			value: 1,
	// 			children: [
	// 				{
	// 					value: 2,
	// 					children: [],
	// 				},
	// 			],
	// 		};
	// 		expect(schema.safeParse(validNode).success).toBe(true);
	// 	});
	// });
	//Complex Validation Combinations
	describe("complex validation combinations", () => {
		class Tag {
			@min(2)
			@max(10)
			name!: string;

			@minimum(0)
			@maximum(100)
			weight!: number;
		}

		@zodify()
		class ComplexValidations {
			@min(3)
			@max(50)
			@pattern(/^[a-zA-Z0-9-]+$/)
			username!: string;

			@uniqueItems()
			@minItems(1)
			@maxItems(5)
			@arrayItems(() => String)
			roles!: string[];

			@minimum(0)
			@multipleOf(0.5)
			score!: number;

			@uniqueItems()
			@minItems(2)
			@maxItems(5)
			@arrayItems(() => Tag)
			tags!: Tag[];
		}

		const schema = toZodSchema(ComplexValidations);

		it("validates complex combinations", () => {
			// Valid case
			const validData = {
				username: "user-123",
				roles: ["admin", "user"],
				score: 8.5,
				tags: [
					{ name: "tag1", weight: 50 },
					{ name: "tag2", weight: 75 },
				],
			};
			const validResult = schema.safeParse(validData);
			expect(validResult.success).toBe(true);

			// Invalid case
			const invalidData = {
				username: "u", // Too short
				roles: ["admin", "admin"], // Duplicate
				score: 8.7, // Not a multiple of 0.5
				tags: [
					{ name: "t", weight: 50 }, // Name too short
				],
			};
			const invalidResult = schema.safeParse(invalidData);
			expect(invalidResult.success).toBe(false);

			// Checking specific validation errors
			if (!invalidResult.success) {
				const errors = invalidResult.error.errors;

				// Error messages to assert
				expect(errors).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							path: ["username"],
							message: expect.any(String),
						}),
						expect.objectContaining({
							path: ["roles"],
							message: expect.any(String),
						}),
						expect.objectContaining({
							path: ["score"],
							message: expect.any(String),
						}),
						expect.objectContaining({
							path: ["tags", 0, "name"],
							message: expect.any(String),
						}),
					])
				);
			}
		});
	});
	// Date Validations
	describe("date validations", () => {
		@zodify()
		class DateValidations {
			created!: Date;
			@datetime()
			isoString!: string;
			dates!: Date[];
		}
		const schema = toZodSchema(DateValidations);
		it("validates dates correctly", () => {
			expect(
				schema.safeParse({
					created: new Date(),
					isoString: new Date().toISOString(),
					dates: [new Date(), new Date()],
				}).success
			).toBe(true);
			expect(
				schema.safeParse({
					created: "invalid date",
					isoString: "invalid iso",
					dates: [new Date()],
				}).success
			).toBe(false);
		});
	});
	// Union Types and Discriminated Unions
	describe("union types", () => {
		enum PaymentType {
			CreditCard = "credit_card",
			BankTransfer = "bank_transfer",
		}
		@zodify()
		class Payment {
			@enumValues(["credit_card", "bank_transfer"] as const)
			type!: PaymentType;
			amount!: number;
			// Credit card specific fields
			cardNumber?: string;
			cvv?: string;
			// Bank transfer specific fields
			accountNumber?: string;
			routingNumber?: string;
		}
		const schema = toZodSchema(Payment);
		it("validates union types correctly", () => {
			expect(
				schema.safeParse({
					type: "credit_card",
					amount: 100,
					cardNumber: "4111111111111111",
					cvv: "123",
				}).success
			).toBe(true);
			expect(
				schema.safeParse({
					type: "bank_transfer",
					amount: 100,
					accountNumber: "12345678",
					routingNumber: "87654321",
				}).success
			).toBe(true);
			expect(
				schema.safeParse({
					type: "invalid_type",
					amount: 100,
				}).success
			).toBe(false);
		});
	});
	// Edge Cases and Special Values
	describe("edge cases", () => {
		@zodify()
		class EdgeCases {
			@min(0)
			zeroLength!: string;
			@minimum(0)
			zeroValue!: number;
			@minItems(0)
			@arrayItems(() => String)
			emptyArray!: string[];
			@pattern(/^$/)
			emptyString!: string;
			@pattern(/^\s*$/)
			whitespaceString!: string;
		}
		const schema = toZodSchema(EdgeCases);
		it("handles edge cases correctly", () => {
			expect(
				schema.safeParse({
					zeroLength: "",
					zeroValue: 0,
					emptyArray: [],
					emptyString: "",
					whitespaceString: "   ",
				}).success
			).toBe(true);
		});
	});
});
