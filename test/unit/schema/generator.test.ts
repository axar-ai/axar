import { z } from 'zod';
import { describe, it, expect } from '@jest/globals';
import {
  schema,
  property,
  optional,
  arrayItems,
  email,
  url,
  min,
  max,
  pattern,
  minimum,
  maximum,
  multipleOf,
  integer,
  minItems,
  maxItems,
  uniqueItems,
  enumValues,
  uuid,
  cuid,
  datetime,
  ip,
  exclusiveMinimum,
  exclusiveMaximum,
} from '../../../src/schema/decorators';
import { toZodSchema } from '../../../src/schema/generator';
import { META_KEYS } from '../../../src/schema/meta-keys';
import { registerProperty } from '../../../src/schema/utils';

// Enable strict property initialization for test classes
class TestBase {
  constructor() {
    Object.defineProperties(
      this,
      Object.getOwnPropertyDescriptors(Object.getPrototypeOf(this)),
    );
  }
}

describe('Schema Generator', () => {
  describe('Basic Types', () => {
    @schema()
    class BasicTypes extends TestBase {
      @property('')
      stringProp!: string;

      @property('')
      numberProp!: number;

      @property('')
      booleanProp!: boolean;

      @property('')
      dateProp!: Date;

      @property('')
      symbolProp!: symbol;

      @optional()
      @property('')
      optionalString?: string;
    }

    it('should generate correct schema for basic types', () => {
      const schema = toZodSchema(BasicTypes);

      expect(schema.shape.stringProp).toBeInstanceOf(z.ZodString);
      expect(schema.shape.numberProp).toBeInstanceOf(z.ZodNumber);
      expect(schema.shape.booleanProp).toBeInstanceOf(z.ZodBoolean);
      expect(schema.shape.dateProp).toBeInstanceOf(z.ZodDate);
      expect(schema.shape.symbolProp).toBeInstanceOf(z.ZodSymbol);
      expect(schema.shape.optionalString).toBeInstanceOf(z.ZodOptional);
    });

    it('should validate correct data', () => {
      const schema = toZodSchema(BasicTypes);
      const validData = {
        stringProp: 'test',
        numberProp: 123,
        booleanProp: true,
        dateProp: new Date(),
        symbolProp: Symbol('test'),
      };

      expect(() => schema.parse(validData)).not.toThrow();
    });

    it('should reject invalid data', () => {
      const schema = toZodSchema(BasicTypes);
      const invalidData = {
        stringProp: 123, // should be string
        numberProp: 'test', // should be number
        booleanProp: 'true', // should be boolean
        dateProp: '2023-01-01', // should be Date object
      };

      expect(() => schema.parse(invalidData)).toThrow();
    });
  });

  describe('String Validations', () => {
    @schema()
    class StringValidations extends TestBase {
      @property('')
      @email()
      email!: string;

      @property('')
      @url()
      url!: string;

      @property('')
      @min(3)
      @max(10)
      lengthConstrained!: string;

      @property('')
      @pattern(/^[A-Z]+$/)
      uppercase!: string;
    }

    it('should validate email correctly', () => {
      const schema = toZodSchema(StringValidations);

      expect(() =>
        schema.parse({
          ...getValidStringValidations(),
          email: 'invalid-email',
        }),
      ).toThrow();

      expect(() =>
        schema.parse({
          ...getValidStringValidations(),
          email: 'test@example.com',
        }),
      ).not.toThrow();
    });

    it('should validate URL correctly', () => {
      const schema = toZodSchema(StringValidations);

      expect(() =>
        schema.parse({
          ...getValidStringValidations(),
          url: 'invalid-url',
        }),
      ).toThrow();

      expect(() =>
        schema.parse({
          ...getValidStringValidations(),
          url: 'https://example.com',
        }),
      ).not.toThrow();
    });

    it('should validate string length constraints', () => {
      const schema = toZodSchema(StringValidations);

      expect(() =>
        schema.parse({
          ...getValidStringValidations(),
          lengthConstrained: 'ab',
        }),
      ).toThrow(); // too short

      expect(() =>
        schema.parse({
          ...getValidStringValidations(),
          lengthConstrained: 'abcdefghijk',
        }),
      ).toThrow(); // too long

      expect(() =>
        schema.parse({
          ...getValidStringValidations(),
          lengthConstrained: 'abcdef',
        }),
      ).not.toThrow();
    });

    it('should validate regex pattern', () => {
      const schema = toZodSchema(StringValidations);

      expect(() =>
        schema.parse({
          ...getValidStringValidations(),
          uppercase: 'invalid',
        }),
      ).toThrow();

      expect(() =>
        schema.parse({
          ...getValidStringValidations(),
          uppercase: 'VALID',
        }),
      ).not.toThrow();
    });

    function getValidStringValidations() {
      return {
        email: 'test@example.com',
        url: 'https://example.com',
        lengthConstrained: 'abcdef',
        uppercase: 'VALID',
      };
    }
  });

  describe('Number Validations', () => {
    @schema()
    class NumberValidations extends TestBase {
      @property('')
      @minimum(0)
      @maximum(100)
      range!: number;

      @property('')
      @multipleOf(5)
      multiple!: number;

      @property('')
      @integer()
      integer!: number;
    }

    it('should validate number range correctly', () => {
      const schema = toZodSchema(NumberValidations);
      const validData = { range: 50, multiple: 10, integer: 1 };

      expect(() => schema.parse(validData)).not.toThrow();
      expect(() => schema.parse({ ...validData, range: -1 })).toThrow();
      expect(() => schema.parse({ ...validData, range: 101 })).toThrow();
    });

    it('should validate multiple of correctly', () => {
      const schema = toZodSchema(NumberValidations);
      const validData = { range: 50, multiple: 10, integer: 1 };

      expect(() => schema.parse(validData)).not.toThrow();
      expect(() => schema.parse({ ...validData, multiple: 7 })).toThrow();
    });

    it('should validate integer correctly', () => {
      const schema = toZodSchema(NumberValidations);
      const validData = { range: 50, multiple: 10, integer: 1 };

      expect(() => schema.parse(validData)).not.toThrow();
      expect(() => schema.parse({ ...validData, integer: 1.5 })).toThrow();
    });
  });

  describe('Array Schema Edge Cases', () => {
    @schema()
    class SimpleItem extends TestBase {
      @property('')
      value!: string;
    }

    class MissingArrayItemsClass extends TestBase {
      @property('')
      array!: string[];
    }

    @schema()
    class NestedArrayClass extends TestBase {
      @property('')
      @arrayItems(() => SimpleItem)
      items!: SimpleItem[];
    }

    it('should throw error for array without @arrayItems decorator', () => {
      expect(() => toZodSchema(MissingArrayItemsClass)).toThrow(
        'Array property array must use @arrayItems decorator',
      );
    });

    it('should handle deeply nested array items', () => {
      const schema = toZodSchema(NestedArrayClass);
      const validData = { items: [{ value: 'test' }] };
      const invalidData = { items: [{ value: 123 }] };

      expect(() => schema.parse(validData)).not.toThrow();
      expect(() => schema.parse(invalidData)).toThrow();
    });
  });

  describe('Schema Caching', () => {
    @schema()
    class CachedClass extends TestBase {
      @property('')
      prop!: string;
    }

    it('should return the same schema instance for multiple calls', () => {
      const schema1 = toZodSchema(CachedClass);
      const schema2 = toZodSchema(CachedClass);

      expect(schema1).toBe(schema2);
    });
  });

  describe('Schema and Property Descriptions', () => {
    @schema('Test schema')
    class DescribedClass extends TestBase {
      @property({ description: 'Test property' })
      prop!: string;
    }

    it('should include schema and property descriptions', () => {
      const schema = toZodSchema(DescribedClass);

      expect(schema._def.description).toBe('Test schema');
      expect(schema.shape.prop._def.description).toBe('Test property');
    });
  });

  describe('Enum Validations', () => {
    @schema()
    class StringEnumClass extends TestBase {
      @property('')
      @enumValues(['A', 'B', 'C'])
      stringEnum!: string;
    }

    @schema()
    class NumberEnumClass extends TestBase {
      @property('')
      @enumValues([1, 2, 3])
      numberEnum!: number;
    }

    it('should validate string enum correctly', () => {
      const schema = toZodSchema(StringEnumClass);
      const validData = { stringEnum: 'A' };
      const invalidData = { stringEnum: 'D' };

      expect(() => schema.parse(validData)).not.toThrow();
      expect(() => schema.parse(invalidData)).toThrow();
    });

    it('should validate number enum correctly', () => {
      const schema = toZodSchema(NumberEnumClass);
      const validData = { numberEnum: '1' };
      const invalidData = { numberEnum: '4' };

      expect(() => schema.parse(validData)).not.toThrow();
      expect(() => schema.parse(invalidData)).toThrow();
    });

    it('should throw error for empty enum values', () => {
      expect(() => {
        @schema()
        class EmptyEnumClass extends TestBase {
          @property('')
          @enumValues([])
          emptyEnum!: string;
        }
      }).toThrow('Enum values must be a non-empty array');
    });

    it('should throw error for mixed enum values', () => {
      expect(() => {
        @schema()
        class MixedEnumClass extends TestBase {
          @property('')
          @enumValues(['A', 1] as const)
          mixedEnum!: string | number;
        }
      }).toThrow(
        'Enum values for mixedEnum must be all strings or all numbers',
      );
    });

    it('should throw error for invalid number enum value', () => {
      const schema = toZodSchema(NumberEnumClass);
      const invalidData = { numberEnum: 'not-a-number' };

      expect(() => schema.parse(invalidData)).toThrow(
        "Invalid enum value. Expected '1' | '2' | '3', received 'not-a-number'",
      );
    });
  });

  describe('Array Validations', () => {
    @schema()
    class ItemType extends TestBase {
      @property('')
      @min(3)
      name!: string;

      @property('')
      @minimum(0)
      value!: number;
    }

    @schema()
    class ArrayValidations extends TestBase {
      @property('')
      @arrayItems(() => String)
      @minItems(2)
      @maxItems(4)
      sizeConstrained!: string[];

      @property('')
      @arrayItems(() => Number)
      @uniqueItems()
      unique!: number[];

      @property('')
      @arrayItems(() => ItemType)
      complexItems!: ItemType[];
    }

    it('should validate array size constraints', () => {
      const schema = toZodSchema(ArrayValidations);
      const validData = {
        sizeConstrained: ['a', 'b'],
        unique: [1, 2],
        complexItems: [{ name: 'test', value: 1 }],
      };
      const tooShort = {
        sizeConstrained: ['a'],
        unique: [1, 2],
        complexItems: [{ name: 'test', value: 1 }],
      };
      const tooLong = {
        sizeConstrained: ['a', 'b', 'c', 'd', 'e'],
        unique: [1, 2],
        complexItems: [{ name: 'test', value: 1 }],
      };

      expect(() => schema.parse(validData)).not.toThrow();
      expect(() => schema.parse(tooShort)).toThrow();
      expect(() => schema.parse(tooLong)).toThrow();
    });

    it('should validate unique items', () => {
      const schema = toZodSchema(ArrayValidations);
      const validData = {
        sizeConstrained: ['a', 'b'],
        unique: [1, 2, 3],
        complexItems: [{ name: 'test', value: 1 }],
      };
      const duplicates = {
        sizeConstrained: ['a', 'b'],
        unique: [1, 2, 2],
        complexItems: [{ name: 'test', value: 1 }],
      };

      expect(() => schema.parse(validData)).not.toThrow();
      expect(() => schema.parse(duplicates)).toThrow(
        'All items in array must be unique',
      );
    });

    it('should validate array item types', () => {
      const schema = toZodSchema(ArrayValidations);
      const validData = {
        sizeConstrained: ['a', 'b'],
        unique: [1, 2],
        complexItems: [
          { name: 'test123', value: 1 },
          { name: 'another', value: 0 },
        ],
      };
      const invalidItemType = {
        sizeConstrained: ['a', 'b'],
        unique: [1, 2],
        complexItems: [
          { name: 'ab', value: 1 }, // name too short
          { name: 'test', value: -1 }, // value below minimum
        ],
      };

      expect(() => schema.parse(validData)).not.toThrow();
      expect(() => schema.parse(invalidItemType)).toThrow();
    });
  });

  describe('String Format Validations', () => {
    @schema()
    class StringFormats extends TestBase {
      @property('')
      @uuid()
      uuid!: string;

      @property('')
      @cuid()
      cuid!: string;

      @property('')
      @datetime()
      datetime!: string;

      @property('')
      @ip()
      ip!: string;
    }

    it('should validate UUID format', () => {
      const schema = toZodSchema(StringFormats);
      const validData = {
        ...getValidStringFormats(),
        uuid: '123e4567-e89b-12d3-a456-426614174000',
      };
      const invalidData = {
        ...getValidStringFormats(),
        uuid: 'not-a-uuid',
      };

      expect(() => schema.parse(validData)).not.toThrow();
      expect(() => schema.parse(invalidData)).toThrow();
    });

    it('should validate CUID format', () => {
      const schema = toZodSchema(StringFormats);
      const validData = {
        ...getValidStringFormats(),
        cuid: 'cjld2cjxh0000qzrmn831i7rn',
      };
      const invalidData = {
        ...getValidStringFormats(),
        cuid: 'not-a-cuid',
      };

      expect(() => schema.parse(validData)).not.toThrow();
      expect(() => schema.parse(invalidData)).toThrow();
    });

    it('should validate datetime format', () => {
      const schema = toZodSchema(StringFormats);
      const validData = {
        ...getValidStringFormats(),
        datetime: '2023-01-01T12:00:00Z',
      };
      const invalidData = {
        ...getValidStringFormats(),
        datetime: 'not-a-date',
      };

      expect(() => schema.parse(validData)).not.toThrow();
      expect(() => schema.parse(invalidData)).toThrow();
    });

    it('should validate IP address format', () => {
      const schema = toZodSchema(StringFormats);
      const validData = {
        ...getValidStringFormats(),
        ip: '192.168.1.1',
      };
      const invalidData = {
        ...getValidStringFormats(),
        ip: 'not-an-ip',
      };

      expect(() => schema.parse(validData)).not.toThrow();
      expect(() => schema.parse(invalidData)).toThrow();
    });

    function getValidStringFormats() {
      return {
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        cuid: 'cjld2cjxh0000qzrmn831i7rn',
        datetime: '2023-01-01T12:00:00Z',
        ip: '192.168.1.1',
      };
    }
  });

  describe('Number Range Validations', () => {
    @schema()
    class NumberRanges extends TestBase {
      @property('')
      @exclusiveMinimum(0)
      @exclusiveMaximum(10)
      exclusive!: number;

      @property('')
      @minimum(-5)
      @maximum(5)
      negativeToPositive!: number;

      @property('')
      @minimum(0)
      @maximum(0)
      exactlyZero!: number;
    }

    it('should validate exclusive ranges', () => {
      const schema = toZodSchema(NumberRanges);
      const validData = {
        exclusive: 5,
        negativeToPositive: 0,
        exactlyZero: 0,
      };

      // Test exclusive minimum
      expect(() => schema.parse(validData)).not.toThrow();
      expect(() => schema.parse({ ...validData, exclusive: 0 })).toThrow();

      // Test exclusive maximum
      expect(() => schema.parse({ ...validData, exclusive: 10 })).toThrow();
    });

    it('should validate negative numbers', () => {
      const schema = toZodSchema(NumberRanges);
      const validData = {
        exclusive: 5,
        negativeToPositive: -3,
        exactlyZero: 0,
      };

      expect(() => schema.parse(validData)).not.toThrow();
      expect(() =>
        schema.parse({ ...validData, negativeToPositive: -6 }),
      ).toThrow();
      expect(() =>
        schema.parse({ ...validData, negativeToPositive: 6 }),
      ).toThrow();
    });

    it('should validate zero values', () => {
      const schema = toZodSchema(NumberRanges);
      const validData = {
        exclusive: 5,
        negativeToPositive: 0,
        exactlyZero: 0,
      };

      expect(() => schema.parse(validData)).not.toThrow();
      expect(() => schema.parse({ ...validData, exactlyZero: 0.1 })).toThrow();
      expect(() => schema.parse({ ...validData, exactlyZero: -0.1 })).toThrow();
    });
  });

  describe('Nested Object Validations', () => {
    @schema()
    class Address extends TestBase {
      @property('')
      @min(5)
      street!: string;

      @property('')
      @pattern(/^\d{5}$/)
      zipCode!: string;
    }

    @schema()
    class Person extends TestBase {
      @property('')
      name!: string;

      @property('')
      @arrayItems(() => Address)
      addresses!: Address[];

      @optional()
      @property('')
      primaryAddress?: Address;
    }

    it('should validate nested objects', () => {
      const schema = toZodSchema(Person);
      const validData = {
        name: 'John',
        addresses: [
          { street: 'Main Street', zipCode: '12345' },
          { street: 'Second Street', zipCode: '67890' },
        ],
        primaryAddress: { street: 'Main Street', zipCode: '12345' },
      };

      expect(() => schema.parse(validData)).not.toThrow();
    });

    it('should validate nested object properties', () => {
      const schema = toZodSchema(Person);
      const invalidData = {
        name: 'John',
        addresses: [
          { street: 'Short', zipCode: '12345' }, // street too short
          { street: 'Second Street', zipCode: 'invalid' }, // invalid zip
        ],
      };

      expect(() => schema.parse(invalidData)).toThrow();
    });
  });

  describe('Optional Properties with Validations', () => {
    @schema()
    class OptionalValidations extends TestBase {
      @optional()
      @property('')
      @email()
      optionalEmail?: string;

      @optional()
      @property('')
      @minimum(0)
      @maximum(100)
      optionalScore?: number;

      @optional()
      @property('')
      @arrayItems(() => String)
      @minItems(2)
      optionalTags?: string[];
    }

    it('should skip validation for undefined optional properties', () => {
      const schema = toZodSchema(OptionalValidations);
      const validData = {};

      expect(() => schema.parse(validData)).not.toThrow();
    });

    it('should validate present optional properties', () => {
      const schema = toZodSchema(OptionalValidations);
      const invalidData = {
        optionalEmail: 'invalid-email',
        optionalScore: 101,
        optionalTags: ['single-tag'],
      };

      expect(() => schema.parse(invalidData)).toThrow();
    });
  });

  describe('Custom Error Messages', () => {
    @schema()
    class CustomErrors extends TestBase {
      @property('')
      @min(8)
      @pattern(/[A-Z]/)
      @pattern(/[0-9]/)
      password!: string;

      @property('')
      @minimum(0)
      @maximum(150)
      age!: number;
    }

    it('should throw validation errors', () => {
      const schema = toZodSchema(CustomErrors);

      try {
        schema.parse({ password: 'short', age: -1 });
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.errors.length).toBeGreaterThan(0);
        expect(
          error.errors.some((e: any) =>
            e.message.includes('String must contain at least 8 character(s)'),
          ),
        ).toBe(true);
        expect(
          error.errors.some((e: any) =>
            e.message.includes('Number must be greater than or equal to 0'),
          ),
        ).toBe(true);
      }
    });
  });

  describe('Validation Rule Edge Cases', () => {
    it('should throw error for incompatible validations', () => {
      // Test email validation on number
      class EmailOnNumber {
        @property('')
        value: number;
        constructor() {
          this.value = 123;
        }
      }
      Reflect.defineMetadata(
        'design:type',
        Number,
        EmailOnNumber.prototype,
        'value',
      );
      Reflect.defineMetadata(
        META_KEYS.PROPERTY_RULES,
        [{ type: 'email' }],
        EmailOnNumber.prototype,
        'value',
      );
      expect(() => toZodSchema(EmailOnNumber)).toThrow(
        'Email validation can only be applied to strings',
      );

      // Test integer validation on string
      class IntegerOnString {
        @property('')
        value: string;
        constructor() {
          this.value = 'test';
        }
      }
      Reflect.defineMetadata(
        'design:type',
        String,
        IntegerOnString.prototype,
        'value',
      );
      Reflect.defineMetadata(
        META_KEYS.PROPERTY_RULES,
        [{ type: 'integer' }],
        IntegerOnString.prototype,
        'value',
      );
      expect(() => toZodSchema(IntegerOnString)).toThrow(
        'Integer validation can only be applied to numbers',
      );

      // Test minItems validation on string
      class MinItemsOnString {
        @property('')
        value: string;
        constructor() {
          this.value = 'test';
        }
      }
      Reflect.defineMetadata(
        'design:type',
        String,
        MinItemsOnString.prototype,
        'value',
      );
      Reflect.defineMetadata(
        META_KEYS.PROPERTY_RULES,
        [{ type: 'minItems', value: 1 }],
        MinItemsOnString.prototype,
        'value',
      );
      expect(() => toZodSchema(MinItemsOnString)).toThrow(
        'MinItems validation can only be applied to arrays',
      );

      // Test pattern validation on number
      class PatternOnNumber {
        @property('')
        value: number;
        constructor() {
          this.value = 123;
        }
      }
      Reflect.defineMetadata(
        'design:type',
        Number,
        PatternOnNumber.prototype,
        'value',
      );
      Reflect.defineMetadata(
        META_KEYS.PROPERTY_RULES,
        [{ type: 'pattern', value: '^test$' }],
        PatternOnNumber.prototype,
        'value',
      );
      expect(() => toZodSchema(PatternOnNumber)).toThrow(
        'Pattern validation can only be applied to strings',
      );

      // Test min validation on boolean
      class MinOnBoolean {
        @property('')
        value: boolean;
        constructor() {
          this.value = true;
        }
      }
      Reflect.defineMetadata(
        'design:type',
        Boolean,
        MinOnBoolean.prototype,
        'value',
      );
      Reflect.defineMetadata(
        META_KEYS.PROPERTY_RULES,
        [{ type: 'min', value: 0 }],
        MinOnBoolean.prototype,
        'value',
      );
      expect(() => toZodSchema(MinOnBoolean)).toThrow(
        'Min validation cannot be applied to ZodBoolean',
      );
    });
  });

  describe('Primitive Schema Edge Cases', () => {
    class UndefinedType {
      value: any;
      constructor(value: any) {
        this.value = value;
      }
    }

    it('should throw error for unsupported types', () => {
      expect(() => {
        @schema()
        class UnsupportedTypeClass {
          @property('')
          unsupported!: UndefinedType;
        }
      }).toThrow('Type UndefinedType must be decorated with @schema');
    });
  });

  describe('Nested Type Schema Creation', () => {
    it('should throw error when nested type is not decorated with @schema', () => {
      expect(() => {
        class InvalidNestedType {
          value: string = '';
        }

        @schema()
        class BrokenNestedClass {
          @property('')
          nested!: InvalidNestedType;
        }
      }).toThrow('Type InvalidNestedType must be decorated with @schema');
    });
  });

  describe('Additional Validation Rule Edge Cases', () => {
    it('should throw error for max validation on unsupported type', () => {
      expect(() => {
        @schema()
        class MaxOnDate {
          @property('')
          @max(10)
          value!: Date;
        }
      }).toThrow('Max validation cannot be applied to ZodDate');
    });

    it('should throw error for validation rules on array of wrong type', () => {
      expect(() => {
        @schema()
        class ArrayOfWrongType {
          @property('')
          @arrayItems(() => String)
          @minimum(0) // This should fail as minimum can't be applied to string arrays
          value!: string[];
        }
      }).toThrow('Minimum validation can only be applied to numbers');
    });
  });

  describe('Array Validation Edge Cases', () => {
    it('should throw error for array items with invalid type', () => {
      expect(() => {
        @schema()
        class InvalidArrayType {
          @property('')
          @arrayItems(() => undefined as any) // This should fail as undefined is not a valid type
          value!: any[];
        }
      }).toThrow();
    });

    it('should throw error for array items with missing type', () => {
      expect(() => {
        @schema()
        class MissingArrayType {
          @property('')
          value!: any[]; // Missing @arrayItems decorator
        }
      }).toThrow('Array property value must use @arrayItems decorator');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined property type', () => {
      expect(() => {
        @schema()
        class UndefinedType {
          @property('')
          value: any;
        }
        // Remove design:type metadata to simulate undefined type
        Reflect.deleteMetadata('design:type', UndefinedType.prototype, 'value');
      }).toThrow();
    });

    it('should handle array property without item type', () => {
      expect(() => {
        @schema()
        class ArrayWithoutType {
          @property('')
          value!: any[];
        }
      }).toThrow();
    });

    it('should handle array property with invalid item type', () => {
      expect(() => {
        @schema()
        class ArrayWithInvalidType {
          @property('')
          @arrayItems(() => null as any)
          value!: any[];
        }
      }).toThrow();
    });

    it('should handle property with unsupported type', () => {
      class CustomType {}
      expect(() => {
        @schema()
        class UnsupportedType {
          @property('')
          value!: CustomType;
        }
      }).toThrow();
    });

    it('should handle property with invalid validation rule params', () => {
      expect(() => {
        @schema()
        class InvalidParams {
          @pattern(new RegExp('[')) // Invalid regex pattern
          value!: string;
        }
      }).toThrow();
    });

    it('should handle validation rules applied to wrong types', () => {
      expect(() => {
        @schema()
        class WrongTypes {
          @min(5) // min on boolean
          value!: boolean;
        }
      }).toThrow('Min validation cannot be applied to ZodBoolean');

      expect(() => {
        @schema()
        class WrongTypes2 {
          @property('')
          @minimum(5) // minimum on string
          value!: string;
        }
      }).toThrow('Minimum validation can only be applied to numbers');

      expect(() => {
        @schema()
        class WrongTypes3 {
          @property('')
          @minItems(5) // minItems on number
          value!: number;
        }
      }).toThrow('MinItems validation can only be applied to arrays');

      expect(() => {
        @schema()
        class WrongTypes4 {
          @property('')
          @uniqueItems() // uniqueItems on string
          value!: string;
        }
      }).toThrow('UniqueItems validation can only be applied to arrays');

      expect(() => {
        @schema()
        class WrongTypes5 {
          @property('')
          @integer() // integer on string
          value!: string;
        }
      }).toThrow('Integer validation can only be applied to numbers');
    });

    it('should handle unknown validation type', () => {
      // Create a custom validation decorator for unknown type
      function unknownValidation(): PropertyDecorator {
        return function (target: Object, propertyKey: string | symbol): void {
          registerProperty(target, propertyKey);
          Reflect.defineMetadata(
            META_KEYS.PROPERTY_RULES,
            [{ type: 'unknown', params: [] }],
            target,
            propertyKey,
          );
        };
      }

      expect(() => {
        @schema()
        class UnknownValidation {
          @unknownValidation()
          value!: string;
        }
      }).toThrow();
    });
  });

  describe('Validation Rules on Wrong Types', () => {
    it('should throw when min is applied to boolean', () => {
      expect(() => {
        @schema()
        class WrongTypes {
          @property({})
          @min(5)
          booleanWithMin!: boolean;

          @property({})
          @max(10)
          booleanWithMax!: boolean;

          @property({})
          @minimum(5)
          stringWithMinimum!: string;

          @property({})
          @maximum(10)
          stringWithMaximum!: string;

          @property({})
          @minItems(1)
          numberWithMinItems!: number;

          @property({})
          @maxItems(5)
          stringWithMaxItems!: string;
        }
      }).toThrow();
    });
  });

  describe('Schema Generator Error Cases', () => {
    it('should throw error for min/max validation on unsupported types', () => {
      expect(() => {
        @schema()
        class InvalidValidations extends TestBase {
          @property('')
          @min(5)
          dateWithMin!: Date; // min validation doesn't work on Date

          @property('')
          @max(10)
          dateWithMax!: Date; // max validation doesn't work on Date
        }
      }).toThrow('Min validation cannot be applied to ZodDate');
    });

    it('should throw error for pattern validation on number', () => {
      expect(() => {
        @schema()
        class InvalidPatternValidation extends TestBase {
          @property('')
          @pattern(/test/)
          numberWithPattern!: number; // pattern only works on strings
        }
      }).toThrow('Pattern validation can only be applied to strings');
    });

    it('should throw error for number validations on string', () => {
      expect(() => {
        @schema()
        class InvalidNumberValidations extends TestBase {
          @property('')
          @minimum(5)
          stringWithMinimum!: string; // minimum only works on numbers

          @property('')
          @maximum(10)
          stringWithMaximum!: string; // maximum only works on numbers

          @property('')
          @multipleOf(2)
          stringWithMultipleOf!: string; // multipleOf only works on numbers

          @property('')
          @integer()
          stringWithInteger!: string; // integer only works on numbers
        }
      }).toThrow('Minimum validation can only be applied to numbers');
    });

    it('should throw error for array validations on non-arrays', () => {
      expect(() => {
        @schema()
        class InvalidArrayValidations extends TestBase {
          @property('')
          @minItems(1)
          numberWithMinItems!: number; // minItems only works on arrays

          @property('')
          @maxItems(5)
          stringWithMaxItems!: string; // maxItems only works on arrays

          @property('')
          @uniqueItems()
          numberWithUniqueItems!: number; // uniqueItems only works on arrays
        }
      }).toThrow('MinItems validation can only be applied to arrays');
    });

    it('should throw error for string validations on non-strings', () => {
      expect(() => {
        @schema()
        class InvalidStringValidations extends TestBase {
          @property('')
          @email()
          numberWithEmail!: number; // email only works on strings

          @property('')
          @url()
          numberWithUrl!: number; // url only works on strings

          @property('')
          @uuid()
          numberWithUuid!: number; // uuid only works on strings

          @property('')
          @cuid()
          numberWithCuid!: number; // cuid only works on strings

          @property('')
          @datetime()
          numberWithDatetime!: number; // datetime only works on strings

          @property('')
          @ip()
          numberWithIp!: number; // ip only works on strings
        }
      }).toThrow('Email validation can only be applied to strings');
    });

    it('should throw error for array without item type', () => {
      expect(() => {
        @schema()
        class MissingArrayType extends TestBase {
          @property('')
          value!: string[]; // Missing @arrayItems decorator
        }
        toZodSchema(MissingArrayType);
      }).toThrow('Array property value must use @arrayItems decorator');
    });
  });
});
