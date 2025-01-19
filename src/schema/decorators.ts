import { ZodSchema } from 'zod';
import { META_KEYS } from './meta-keys';
import { registerProperty, addValidationRule } from './utils';
import { toZodSchema } from './generator';
import {
  SchemaOptions,
  PropertyOptions,
  ValidationRule,
  SchemaConstructor,
} from './types';

/**
 * Decorates a class for automatic schema generation using Zod.
 * When applied, it generates and stores a Zod schema based on the class properties
 * and their decorators.
 *
 * @param descriptionOrOptions - Either a description string or a SchemaOptions object
 * @returns A class decorator
 *
 * @example
 * ```typescript
 * // Using string description
 * @schema("User profile information")
 * class UserProfile {
 *   @property("User's full name")
 *   name: string;
 * }
 *
 * // Using SchemaOptions object
 * @schema({
 *   description: "User profile information"
 * })
 * class UserProfile {
 *   @property("User's full name")
 *   name: string;
 * }
 * ```
 */
export function schema(
  descriptionOrOptions: string | SchemaOptions = {},
): ClassDecorator {
  return function <T extends Function>(target: T): T {
    let options: SchemaOptions;
    if (typeof descriptionOrOptions === 'string') {
      options = { description: descriptionOrOptions };
    } else {
      options = descriptionOrOptions;
    }

    Reflect.defineMetadata(META_KEYS.SCHEMA, options, target);
    // Generate and store the Zod schema
    const zodSchema: ZodSchema<any> = toZodSchema(target as any);
    Reflect.defineMetadata(META_KEYS.SCHEMA_DEF, zodSchema, target);
    return target;
  };
}

/** Alias for {@link schema} decorator, use if conflicts with Zod */
export const zodify = schema;

/**
 * Adds metadata to a class property. This can include descriptions and examples
 * that will be included in the generated schema.
 *
 * @param descriptionOrOptions - Either a description string or a PropertyOptions object
 * @returns A property decorator
 *
 * @example
 * ```typescript
 * class User {
 *   // Using string description
 *   @property("User's full name")
 *   name: string;
 *
 *   // Using PropertyOptions object
 *   @property({
 *     description: "User's age in years",
 *     example: 25
 *   })
 *   age: number;
 * }
 * ```
 */
export function property(
  descriptionOrOptions: string | PropertyOptions,
): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol): void {
    registerProperty(target, propertyKey);

    let options: PropertyOptions;
    if (typeof descriptionOrOptions === 'string') {
      options = { description: descriptionOrOptions };
    } else {
      options = descriptionOrOptions;
    }

    Reflect.defineMetadata(META_KEYS.PROPERTY, options, target, propertyKey);
  };
}

/**
 * Marks a class property as optional in the generated schema.
 * Optional properties can be undefined or omitted when creating instances.
 *
 * @returns A property decorator
 *
 * @example
 * ```typescript
 * class UserSettings {
 *   @optional()
 *   @description("Preferred theme (defaults to system)")
 *   theme?: 'light' | 'dark';
 *
 *   @optional()
 *   @example("en-US")
 *   language?: string;
 * }
 * ```
 */
export function optional(): PropertyDecorator {
  return function (target: Object, propertyKey: string | symbol): void {
    registerProperty(target, propertyKey);
    Reflect.defineMetadata(META_KEYS.OPTIONAL, true, target, propertyKey);
  };
}

/**
 * Creates a validation decorator with proper type checking
 * @param type - The type of validation rule
 * @param params - Optional parameters for the validation rule
 */
function createValidationDecorator(
  type: ValidationRule['type'],
  params?: any[],
): PropertyDecorator {
  return function (target: Object, propertyKey: string | symbol): void {
    registerProperty(target, propertyKey);
    addValidationRule(target, propertyKey, {
      type,
      params,
    });
  };
}

/**
 * Decorates a property with enum validation
 * @param values - Array of valid enum values
 *
 * @example
 * ```typescript
 * class User {
 *   @enumValues(['admin', 'user', 'guest'])
 *   role: string;
 * }
 * ```
 */
export function enumValues<T extends string | number>(
  values: readonly T[],
): PropertyDecorator {
  return function (target: Object, propertyKey: string | symbol): void {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error('Enum values must be a non-empty array');
    }
    registerProperty(target, propertyKey);
    Reflect.defineMetadata(META_KEYS.ENUM_VALUES, values, target, propertyKey);
    addValidationRule(target, propertyKey, {
      type: 'enum',
      params: [values],
    });
  };
}

/**
 * Decorates an array property with item type information
 * @param itemType - Function returning the item type
 *
 * @example
 * ```typescript
 * class PostList {
 *   @arrayItems(() => Post)
 *   items: Post[];
 * }
 * ```
 */
export function arrayItems(
  itemType: () => SchemaConstructor,
): PropertyDecorator {
  return function (target: Object, propertyKey: string | symbol): void {
    if (typeof itemType !== 'function') {
      throw new Error('Item type must be a function returning a constructor');
    }
    registerProperty(target, propertyKey);
    Reflect.defineMetadata(
      META_KEYS.ARRAY_ITEM_TYPE,
      itemType,
      target,
      propertyKey,
    );
  };
}

/**
 * Validates that a string property is a valid email address.
 * @example
 * ```ts
 * class User {
 *   @email()
 *   email: string;
 * }
 * ```
 */
export const email = () => createValidationDecorator('email');

/**
 * Validates that a string property is a valid URL.
 * @example `@url() website: string;`
 */
export const url = () => createValidationDecorator('url');

/**
 * Validates that a string property matches the given regular expression pattern.
 * @param regex - The regular expression to test against
 * @example `@pattern(/^[A-Z]{2}\d{3}$/) code: string;`
 */
export const pattern = (regex: RegExp) =>
  createValidationDecorator('pattern', [regex]);

/**
 * Validates that a string property is a valid UUID.
 * @example `@uuid() id: string;`
 */
export const uuid = () => createValidationDecorator('uuid');

/**
 * Validates that a string property is a valid CUID.
 * @example `@cuid() id: string;`
 */
export const cuid = () => createValidationDecorator('cuid');

/**
 * Validates that a string property is a valid ISO datetime string.
 * @example `@datetime() createdAt: string;`
 */
export const datetime = () => createValidationDecorator('datetime');

/**
 * Validates that a string property is a valid IP address.
 * @example `@ip() serverAddress: string;`
 */
export const ip = () => createValidationDecorator('ip');

/**
 * Validates that a string's length is at most the specified value.
 * @param value - Maximum length allowed
 * @example `@max(100) description: string;`
 */
export const max = (value: number) => createValidationDecorator('max', [value]);

/**
 * Validates that a string's length is at least the specified value.
 * @param value - Minimum length required
 * @example `@min(3) username: string;`
 */
export const min = (value: number) => createValidationDecorator('min', [value]);

// Number validation decorators

/**
 * Validates that a number is greater than or equal to the specified value.
 * @param value - Minimum value allowed (inclusive)
 * @example `@minimum(0) price: number;`
 */
export const minimum = (value: number) =>
  createValidationDecorator('minimum', [value]);

/**
 * Validates that a number is less than or equal to the specified value.
 * @param value - Maximum value allowed (inclusive)
 * @example `@maximum(100) percentage: number;`
 */
export const maximum = (value: number) =>
  createValidationDecorator('maximum', [value]);

/**
 * Validates that a number is a multiple of the specified value.
 * @param value - The number must be divisible by this value
 * @example `@multipleOf(5) quantity: number;`
 */
export const multipleOf = (value: number) =>
  createValidationDecorator('multipleOf', [value]);

/**
 * Validates that a number is strictly greater than the specified value.
 * @param value - Minimum value allowed (exclusive)
 * @example `@exclusiveMinimum(0) positiveNumber: number;`
 */
export const exclusiveMinimum = (value: number) =>
  createValidationDecorator('exclusiveMinimum', [value]);

/**
 * Validates that a number is strictly less than the specified value.
 * @param value - Maximum value allowed (exclusive)
 * @example `@exclusiveMaximum(100) score: number;`
 */
export const exclusiveMaximum = (value: number) =>
  createValidationDecorator('exclusiveMaximum', [value]);

/**
 * Validates that a number is an integer (no decimal places).
 * @example `@integer() age: number;`
 */
export const integer = () => createValidationDecorator('integer');

// Array validation decorators

/**
 * Validates that an array has at least the specified number of items.
 * @param min - Minimum number of items required
 * @example `@minItems(1) tags: string[];`
 */
export const minItems = (min: number) =>
  createValidationDecorator('minItems', [min]);

/**
 * Validates that an array has at most the specified number of items.
 * @param max - Maximum number of items allowed
 * @example `@maxItems(10) selections: string[];`
 */
export const maxItems = (max: number) =>
  createValidationDecorator('maxItems', [max]);

/**
 * Validates that all items in an array are unique.
 * @example `@uniqueItems() categories: string[];`
 */
export const uniqueItems = () => createValidationDecorator('uniqueItems');
