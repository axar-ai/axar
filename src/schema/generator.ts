import 'reflect-metadata';
import { z } from 'zod';
import { SchemaConstructor } from './types';
import { META_KEYS } from './meta-keys';
import { SchemaOptions, PropertyOptions, ValidationRule } from './types';
import { hasSchemaDef } from './info';

/**
 * Checks if a property is marked as optional
 * @param target - Target object (class prototype)
 * @param propertyKey - Property name
 */
function isOptional(target: Object, propertyKey: string | symbol): boolean {
  return Reflect.getMetadata(META_KEYS.OPTIONAL, target, propertyKey) || false;
}

// Type guards
function isZodString(schema: z.ZodTypeAny): schema is z.ZodString {
  return schema instanceof z.ZodString;
}

function isZodNumber(schema: z.ZodTypeAny): schema is z.ZodNumber {
  return schema instanceof z.ZodNumber;
}

function isZodArray(schema: z.ZodTypeAny): schema is z.ZodArray<any> {
  return schema instanceof z.ZodArray;
}

/**
 * Creates a base Zod schema for a property based on its type
 * @param target - Target object (class prototype)
 * @param propertyKey - Property name
 */
function createBaseSchema(
  target: Object,
  propertyKey: string | symbol,
): z.ZodTypeAny {
  // Try to create enum schema first
  const enumSchema = createEnumSchema(target, propertyKey);
  if (enumSchema) return enumSchema;

  const propertyType = Reflect.getMetadata('design:type', target, propertyKey);

  if (propertyType === Array) {
    return createArraySchema(target, propertyKey);
  }

  return createPrimitiveOrObjectSchema(propertyType, propertyKey);
}

function createEnumSchema(
  target: Object,
  propertyKey: string | symbol,
): z.ZodType | null {
  const enumValues: readonly (string | number)[] | undefined =
    Reflect.getMetadata(META_KEYS.ENUM_VALUES, target, propertyKey);

  if (!enumValues) return null;

  if (!Array.isArray(enumValues) || enumValues.length === 0) {
    throw new Error(
      `Enum values for ${String(propertyKey)} must be a non-empty array`,
    );
  }

  if (enumValues.every((v): v is string => typeof v === 'string')) {
    return z.enum(enumValues as [string, ...string[]]);
  }

  if (enumValues.every((v): v is number => typeof v === 'number')) {
    return z
      .enum(enumValues.map(String) as [string, ...string[]])
      .transform((val) => {
        const num = Number(val);
        if (Number.isNaN(num)) {
          throw new Error(`Invalid enum value for ${String(propertyKey)}`);
        }
        return num;
      });
  }

  throw new Error(
    `Enum values for ${String(propertyKey)} must be all strings or all numbers`,
  );
}

function createArraySchema(
  target: Object,
  propertyKey: string | symbol,
): z.ZodArray<z.ZodTypeAny> {
  const itemTypeFn = Reflect.getMetadata(
    META_KEYS.ARRAY_ITEM_TYPE,
    target,
    propertyKey,
  ) as (() => Function) | undefined;

  if (!itemTypeFn) {
    throw new Error(
      `Array property ${String(propertyKey)} must use @arrayItems decorator`,
    );
  }

  const itemType = itemTypeFn();
  return z.array(createPrimitiveOrObjectSchema(itemType, propertyKey));
}

/**
 * Creates a Zod schema for a primitive type or custom class
 * @param type - Constructor function for the type
 * @param propertyKey - Property name (used for error messages)
 * @returns Appropriate Zod schema for the type
 * @throws Error if type is unsupported or invalid
 */
function createPrimitiveOrObjectSchema(
  type: Function,
  propertyKey: string | symbol,
): z.ZodTypeAny {
  switch (type) {
    case undefined:
      throw new Error(
        `Type for property ${String(propertyKey)} cannot be undefined`,
      );
    case String:
      return z.string();
    case Number:
      return z.number();
    case Boolean:
      return z.boolean();
    case Date:
      return z.date();
    case Symbol:
      return z.symbol();
    case BigInt:
      return z.bigint();
    default:
      if (type?.name === 'Object') {
        throw new Error(
          `Type 'any' is not allowed for property ${String(propertyKey)}. Please specify a concrete type`,
        );
      }
      if (type?.prototype) {
        try {
          if (!hasSchemaDef(type as unknown as SchemaConstructor)) {
            throw new Error(`Type ${type.name} must be decorated with @schema`);
          }
          return toZodSchema(type as SchemaConstructor);
        } catch (error) {
          throw new Error(
            `Failed to create schema for nested type ${type.name} in ${String(
              propertyKey,
            )}: ${(error as Error).message}`,
          );
        }
      }
      throw new Error(`Unsupported type for property ${String(propertyKey)}`);
  }
}

/**
 * Applies a validation rule to a Zod schema
 * @param schema - Base Zod schema
 * @param rule - Validation rule to apply
 * @throws Error if validation rule cannot be applied to schema type
 */
function applyValidationRule(
  schema: z.ZodTypeAny,
  rule: ValidationRule,
): z.ZodTypeAny {
  switch (rule.type) {
    // String validations
    case 'email':
      if (!isZodString(schema)) {
        throw new Error('Email validation can only be applied to strings');
      }
      return schema.email();
    case 'url':
      if (!isZodString(schema)) {
        throw new Error('URL validation can only be applied to strings');
      }
      return schema.url();
    case 'uuid':
      if (!isZodString(schema)) {
        throw new Error('UUID validation can only be applied to strings');
      }
      return schema.uuid();
    case 'cuid':
      if (!isZodString(schema)) {
        throw new Error('CUID validation can only be applied to strings');
      }
      return schema.cuid();
    case 'datetime':
      if (!isZodString(schema)) {
        throw new Error('Datetime validation can only be applied to strings');
      }
      return schema.datetime();
    case 'ip':
      if (!isZodString(schema)) {
        throw new Error('IP validation can only be applied to strings');
      }
      return schema.ip();
    case 'pattern':
      if (!isZodString(schema)) {
        throw new Error('Pattern validation can only be applied to strings');
      }
      return schema.regex(rule.params![0]);
    case 'min':
      if (isZodString(schema)) {
        return schema.min(rule.params![0]);
      }
      if (isZodArray(schema)) {
        return schema.min(rule.params![0]);
      }
      if (isZodNumber(schema)) {
        return schema.gte(rule.params![0]);
      }
      throw new Error(
        `Min validation cannot be applied to ${schema.constructor.name}`,
      );
    case 'max':
      if (isZodString(schema)) {
        return schema.max(rule.params![0]);
      }
      if (isZodArray(schema)) {
        return schema.max(rule.params![0]);
      }
      if (isZodNumber(schema)) {
        return schema.lte(rule.params![0]);
      }
      throw new Error(
        `Max validation cannot be applied to ${schema.constructor.name}`,
      );
    // Number validations
    case 'minimum':
      if (!isZodNumber(schema)) {
        throw new Error('Minimum validation can only be applied to numbers');
      }
      return schema.gte(rule.params![0]);
    case 'maximum':
      if (!isZodNumber(schema)) {
        throw new Error('Maximum validation can only be applied to numbers');
      }
      return schema.lte(rule.params![0]);
    case 'exclusiveMinimum':
      if (!isZodNumber(schema)) {
        throw new Error(
          'ExclusiveMinimum validation can only be applied to numbers',
        );
      }
      return schema.gt(rule.params![0]);
    case 'exclusiveMaximum':
      if (!isZodNumber(schema)) {
        throw new Error(
          'ExclusiveMaximum validation can only be applied to numbers',
        );
      }
      return schema.lt(rule.params![0]);
    case 'multipleOf':
      if (!isZodNumber(schema)) {
        throw new Error('MultipleOf validation can only be applied to numbers');
      }
      return schema.multipleOf(rule.params![0]);
    case 'integer':
      if (!isZodNumber(schema)) {
        throw new Error('Integer validation can only be applied to numbers');
      }
      return schema.int();
    // Array validations
    case 'minItems':
      if (!isZodArray(schema)) {
        throw new Error('MinItems validation can only be applied to arrays');
      }
      return schema.min(rule.params![0]);
    case 'maxItems':
      if (!isZodArray(schema)) {
        throw new Error('MaxItems validation can only be applied to arrays');
      }
      return schema.max(rule.params![0]);
    case 'uniqueItems':
      if (!isZodArray(schema)) {
        throw new Error('UniqueItems validation can only be applied to arrays');
      }
      return schema.refine(
        (items) =>
          new Set(items.map((item) => JSON.stringify(item))).size ===
          items.length,
        { message: 'All items in array must be unique' },
      );
    case 'enum':
      // Enums are handled in createBaseSchema
      return schema;
    default:
      throw new Error(`Unknown validation type: ${(rule as any).type}`);
  }
}

// Implement caching for performance
const schemaCache = new WeakMap<Function, z.ZodObject<any>>();

/**
 * Creates a Zod schema for a given class constructor.
 *
 * Scans the class for property decorators and applies their validation rules
 * to the generated schema.
 *
 * @param target - The class constructor to generate the schema for
 * @returns A cached Zod object schema with all validations applied
 *
 * @example
 * ```ts
 * @schema({ description: 'User data' })
 * class User {
 *   @property({ description: 'User email' })
 *   @validate('email')
 *   email: string;
 *
 *   @optional()
 *   @validate('min', 3)
 *   name?: string;
 * }
 *
 * const userSchema = toZodSchema(User);
 * ``` *
 * @features
 * - Schema-level descriptions via `@schema` decorator
 * - Property-level descriptions via `@property` decorator
 * - Optional properties via `@optional` decorator
 * - Built-in validations (min, max, pattern, etc.)
 * - Custom validation rules via `@validate` decorator
 * - Automatic schema caching for performance
 */
export function toZodSchema<T>(target: SchemaConstructor<T>): z.ZodObject<any> {
  const cached = schemaCache.get(target);
  if (cached) return cached;

  const shape: Record<string, z.ZodTypeAny> = {};
  const properties: string[] =
    Reflect.getMetadata(META_KEYS.PROPERTIES, target.prototype) || [];

  for (const propertyKey of properties) {
    const rules: ValidationRule[] =
      Reflect.getMetadata(
        META_KEYS.PROPERTY_RULES,
        target.prototype,
        propertyKey,
      ) || [];

    const propertyOptions: PropertyOptions | undefined = Reflect.getMetadata(
      META_KEYS.PROPERTY,
      target.prototype,
      propertyKey,
    );

    // Create base schema from type
    let propertySchema = createBaseSchema(target.prototype, propertyKey);

    // Apply validation rules
    rules.forEach((rule) => {
      propertySchema = applyValidationRule(propertySchema, rule);
    });

    // Apply description if exists
    if (propertyOptions?.description) {
      propertySchema = propertySchema.describe(propertyOptions.description);
    }

    // Check if the property is optional
    if (isOptional(target.prototype, propertyKey)) {
      propertySchema = propertySchema.optional();
    }

    shape[propertyKey] = propertySchema;
  }

  let zodSchema = z.object(shape);

  // Apply schema-level description if exists
  const schemaOptions: SchemaOptions =
    Reflect.getMetadata(META_KEYS.SCHEMA, target) || {};
  if (schemaOptions.description) {
    zodSchema = zodSchema.describe(schemaOptions.description);
  }

  // Cache the schema for future use
  schemaCache.set(target, zodSchema);
  return zodSchema;
}
