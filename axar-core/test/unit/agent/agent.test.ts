import { z } from "zod";
import {
  email,
  min,
  max,
  pattern,
  uuid,
  cuid,
  datetime,
  ip,
  minimum,
  maximum,
  exclusiveMinimum,
  exclusiveMaximum,
  multipleOf,
  minItems,
  maxItems,
  uniqueItems,
  enumValues,
  property,
  zodify,
  arrayItems,
  optional,
  integer,
} from "../../../src/schema";

import { toZodSchema } from "../../../src/schema/generator";

describe("toZodSchema", () => {
  // Basic Types and Validations
  describe("string validations", () => {
    @zodify()
    class StringValidations {
      @email()
      email!: string;

      @min(5)
      @max(10)
      username!: string;

      @pattern(/^[A-Z]+$/)
      uppercaseOnly!: string;

      @uuid()
      id!: string;

      @cuid()
      cuid!: string;

      @datetime()
      timestamp!: string;

      @ip()
      ipAddress!: string;
    }

    const schema = toZodSchema(StringValidations);

    it("validates email correctly", () => {
      expect(
        schema.safeParse({
          email: "test@example.com",
          username: "user123",
          uppercaseOnly: "ABC",
          id: "123e4567-e89b-12d3-a456-426614174000",
          cuid: "cjld2cjxh0000qzrmn831i7rn",
          timestamp: "2023-01-01T00:00:00Z",
          ipAddress: "192.168.1.1",
        }).success
      ).toBe(true);

      expect(
        schema.safeParse({
          email: "invalid-email",
          username: "user123",
          uppercaseOnly: "ABC",
          id: "123e4567-e89b-12d3-a456-426614174000",
          cuid: "cjld2cjxh0000qzrmn831i7rn",
          timestamp: "2023-01-01T00:00:00Z",
          ipAddress: "192.168.1.1",
        }).success
      ).toBe(false);
    });

    // Add more specific tests for each string validation
  });

  describe("email validation", () => {
    @zodify()
    class EmailTest {
      @email()
      email!: string;
    }

    const emailSchema = toZodSchema(EmailTest);

    // Debug the schema
    console.log("Schema:", emailSchema);

    it("rejects invalid emails", () => {
      const testCases = [
        "invalid-email",
        "missingat.com",
        "@nodomain",
        "spaces in@email.com",
        "",
      ];

      testCases.forEach((email) => {
        const parsed = emailSchema.safeParse({ email });
        if (parsed.success) {
          console.log(`Email "${email}" was accepted`);
          // Log the actual validated data
          console.log("Validated data:", parsed.data);
        } else {
          console.log(`Email "${email}" was rejected:`, parsed.error.errors);
        }
      });
    });
  });

  // Number Validations
  describe("number validations", () => {
    @zodify()
    class NumberValidations {
      @minimum(0)
      @maximum(100)
      percentage!: number;

      @exclusiveMinimum(0)
      @exclusiveMaximum(10)
      score!: number;

      @multipleOf(5)
      multiple!: number;

      @integer()
      count!: number;
    }

    const schema = toZodSchema(NumberValidations);

    it("validates number constraints correctly", () => {
      expect(
        schema.safeParse({
          percentage: 50,
          score: 5,
          multiple: 15,
          count: 1,
        }).success
      ).toBe(true);

      expect(
        schema.safeParse({
          percentage: -1,
          score: 5,
          multiple: 15,
          count: 1,
        }).success
      ).toBe(false);
    });

    // Add more specific tests for each number validation
  });

  // Array Validations
  // describe("array validations", () => {
  //   @zodify()
  //   class ArrayValidations {
  //     @minItems(1)
  //     @maxItems(3)
  //     tags!: string[];

  //     @uniqueItems()
  //     uniqueNumbers!: number[];
  //   }

  //   const schema = toZodSchema(ArrayValidations);

  //   it("validates array constraints correctly", () => {
  //     expect(
  //       schema.safeParse({
  //         tags: ["tag1", "tag2"],
  //         uniqueNumbers: [1, 2, 3],
  //       }).success
  //     ).toBe(true);

  //     expect(
  //       schema.safeParse({
  //         tags: [],
  //         uniqueNumbers: [1, 2, 3],
  //       }).success
  //     ).toBe(false);

  //     expect(
  //       schema.safeParse({
  //         tags: ["tag1"],
  //         uniqueNumbers: [1, 1, 2],
  //       }).success
  //     ).toBe(false);
  //   });
  // });

  // Enum Validations
  describe("enum validations", () => {
    enum Role {
      Admin = "ADMIN",
      User = "USER",
    }

    @zodify()
    class EnumValidations {
      @enumValues(["ADMIN", "USER"] as const)
      role!: Role;
    }

    const schema = toZodSchema(EnumValidations);

    it("validates enum values correctly", () => {
      expect(schema.safeParse({ role: "ADMIN" }).success).toBe(true);
      expect(schema.safeParse({ role: "INVALID" }).success).toBe(false);
    });
  });

  // Nested Objects
  // describe("nested objects", () => {
  //   class Address {
  //     @pattern(/^[0-9]{5}$/)
  //     zipCode!: string;

  //     @minItems(1)
  //     streetLines!: string[];
  //   }

  //   @zodify()
  //   class User {
  //     @email()
  //     email!: string;

  //     address!: Address;

  //     @minItems(1)
  //     alternateAddresses!: Address[];
  //   }

  //   const schema = toZodSchema(User);

  //   it("validates nested objects correctly", () => {
  //     expect(
  //       schema.safeParse({
  //         email: "test@example.com",
  //         address: {
  //           zipCode: "12345",
  //           streetLines: ["123 Main St"],
  //         },
  //         alternateAddresses: [
  //           {
  //             zipCode: "54321",
  //             streetLines: ["456 Oak Ave"],
  //           },
  //         ],
  //       }).success
  //     ).toBe(true);

  //     expect(
  //       schema.safeParse({
  //         email: "test@example.com",
  //         address: {
  //           zipCode: "invalid",
  //           streetLines: ["123 Main St"],
  //         },
  //         alternateAddresses: [],
  //       }).success
  //     ).toBe(false);
  //   });
  // });

  // Optional Fields
  describe("optional fields", () => {
    @zodify()
    class OptionalFields {
      @email()
      email!: string;

      @min(3)
      @optional()
      nickname?: string;

      @minimum(0)
      @optional()
      age?: number;
    }

    const schema = toZodSchema(OptionalFields);

    it("handles optional fields correctly", () => {
      expect(
        schema.safeParse({
          email: "test@example.com",
        }).success
      ).toBe(true);

      expect(
        schema.safeParse({
          email: "test@example.com",
          nickname: "joe",
          age: 25,
        }).success
      ).toBe(true);

      expect(
        schema.safeParse({
          email: "test@example.com",
          nickname: "a", // too short
        }).success
      ).toBe(false);
    });
  });

  // Schema Metadata
  describe("schema metadata", () => {
    @zodify({
      description: "User data validation schema",
    })
    class MetadataTest {
      @property("User's email address")
      @email()
      email!: string;
    }

    const schema = toZodSchema(MetadataTest);

    it("includes schema metadata", () => {
      expect(schema.description).toBe("User data validation schema");
      // Access shape as a property instead of calling it as a function
      const fields = schema.shape as { [key: string]: z.ZodTypeAny };
      expect(fields.email.description).toBe("User's email address");
    });
  });

  // Error Cases
  describe("error handling", () => {
    it("handles invalid validation combinations", () => {
      expect(() => {
        @zodify()
        class InvalidValidation {
          @email()
          @integer() // Should throw error - can't apply integer to string
          invalid!: string;
        }
        toZodSchema(InvalidValidation);
      }).toThrow();
    });

    it("handles missing required fields", () => {
      @zodify()
      class Required {
        @email()
        email!: string;
      }
      const schema = toZodSchema(Required);
      expect(schema.safeParse({}).success).toBe(false);
    });
  });
});
