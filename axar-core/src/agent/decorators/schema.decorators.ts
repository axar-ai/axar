import { ZodSchema } from "zod";
import { META_KEYS } from "./meta-keys";
import { registerProperty } from "./utils";
import { toZodSchema } from "./schema-generator";
import { SchemaOptions } from "./types";

/**
 * Decorates a class for automatic schema generation using Zod.
 * When applied, it generates and stores a Zod schema based on the class properties
 * and their decorators.
 *
 * @param options - Configuration options for schema generation
 * @returns A class decorator
 *
 * @example
 * ```typescript
 * @schema()
 * class UserProfile {
 *   @description("User's full name")
 *   @example("John Doe")
 *   name!: string;
 *
 *   @optional()
 *   @description("User's age in years")
 *   @example(25)
 *   age?: number;
 * }
 * ```
 */
export function schema(options: SchemaOptions = {}): ClassDecorator {
  return function (target: Function): void {
    Reflect.defineMetadata(META_KEYS.SCHEMA, options, target);
    // Automatically generate and store the Zod schema
    const zodSchema: ZodSchema<any> = toZodSchema(target as any);

    Reflect.defineMetadata(META_KEYS.OUTPUT_SCHEMA, zodSchema, target);
  };
}

/** Alias for {@link schema} decorator */
export const zodify = schema;

/**
 * Adds a description to a class property. This description will be included
 * in the generated schema and can be used for documentation purposes.
 *
 * @param text - The description text for the property
 * @returns A property decorator
 *
 * @example
 * ```typescript
 * class Product {
 *   @description("Unique identifier for the product")
 *   id: string;
 *
 *   @description("Current price in USD")
 *   price: number;
 * }
 * ```
 */
export function description(text: string): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    registerProperty(target, propertyKey);
    Reflect.defineMetadata(META_KEYS.DESCRIPTION, text, target, propertyKey);
  };
}
// FIXME: Consolidate to a single @Property decorator

/**
 * Adds example values to a class property. These examples can be used for
 * documentation and testing purposes.
 *
 * @param value - The example value(s) for the property
 * @returns A property decorator
 *
 * @example
 * ```typescript
 * class Order {
 *   @example("ORD-2024-001")
 *   orderId: string;
 *
 *   @example(["pending", "shipped", "delivered"])
 *   status: string;
 *
 *   @example({ street: "123 Main St", city: "Boston" })
 *   shippingAddress: Address;
 * }
 * ```
 */
export function example<T>(value: T): PropertyDecorator {
  return function (target: Object, propertyKey: string | symbol): void {
    registerProperty(target, propertyKey);

    // Validate that the example value is not undefined
    if (value === undefined) {
      throw new Error(
        `Example value for ${String(propertyKey)} cannot be undefined`
      );
    }

    Reflect.defineMetadata(META_KEYS.EXAMPLE, value, target, propertyKey);
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
