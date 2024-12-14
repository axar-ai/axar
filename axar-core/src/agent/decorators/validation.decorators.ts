import { META_KEYS } from "./meta-keys";
import { registerProperty, addValidationRule } from "./utils";
import { ClassConstructor, ValidationRule } from "./types";

/**
 * Creates a validation decorator with proper type checking
 * @param type - The type of validation rule
 * @param params - Optional parameters for the validation rule
 */
function createValidationDecorator(
  type: ValidationRule["type"],
  params?: any[]
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
  values: readonly T[]
): PropertyDecorator {
  return function (target: Object, propertyKey: string | symbol): void {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error("Enum values must be a non-empty array");
    }
    registerProperty(target, propertyKey);
    Reflect.defineMetadata(META_KEYS.ENUM_VALUES, values, target, propertyKey);
    addValidationRule(target, propertyKey, {
      type: "enum",
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
  itemType: () => ClassConstructor
): PropertyDecorator {
  return function (target: Object, propertyKey: string | symbol): void {
    if (typeof itemType !== "function") {
      throw new Error("Item type must be a function returning a constructor");
    }
    registerProperty(target, propertyKey);
    Reflect.defineMetadata(
      META_KEYS.ARRAY_ITEM_TYPE,
      itemType,
      target,
      propertyKey
    );
  };
}

// String validation decorators
export const email = () => createValidationDecorator("email");
export const url = () => createValidationDecorator("url");
export const pattern = (regex: RegExp) =>
  createValidationDecorator("pattern", [regex]);
export const uuid = () => createValidationDecorator("uuid");
export const cuid = () => createValidationDecorator("cuid");
export const datetime = () => createValidationDecorator("datetime");
export const ip = () => createValidationDecorator("ip");
export const max = (value: number) => createValidationDecorator("max", [value]);
export const min = (value: number) => createValidationDecorator("min", [value]);

// Number validation decorators
export const minimum = (value: number) =>
  createValidationDecorator("minimum", [value]);
export const maximum = (value: number) =>
  createValidationDecorator("maximum", [value]);
export const multipleOf = (value: number) =>
  createValidationDecorator("multipleOf", [value]);
export const exclusiveMinimum = (value: number) =>
  createValidationDecorator("exclusiveMinimum", [value]);
export const exclusiveMaximum = (value: number) =>
  createValidationDecorator("exclusiveMaximum", [value]);
export const integer = () => createValidationDecorator("integer");

// Array validation decorators
export const minItems = (min: number) =>
  createValidationDecorator("minItems", [min]);
export const maxItems = (max: number) =>
  createValidationDecorator("maxItems", [max]);
export const uniqueItems = () => createValidationDecorator("uniqueItems");
