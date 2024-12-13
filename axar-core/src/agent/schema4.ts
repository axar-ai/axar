// src/schema.ts

import "reflect-metadata";
import { z, ZodSchema } from "zod";
import { ClassConstructor } from "./decorators/types";
import { META_KEYS } from "./decorators/metaKeys";

// More specific validation types
type StringValidation =
  | "email"
  | "url"
  | "pattern"
  | "min"
  | "max"
  | "uuid"
  | "cuid"
  | "datetime"
  | "ip";

type NumberValidation =
  | "minimum"
  | "maximum"
  | "exclusiveMinimum"
  | "exclusiveMaximum"
  | "multipleOf"
  | "integer";

type ArrayValidation = "minItems" | "maxItems" | "uniqueItems";

type ValidationRule = {
  type: StringValidation | NumberValidation | ArrayValidation | "enum";
  params?: any[];
};

// Define default messages with proper typing
const DEFAULT_ERROR_MESSAGES = {
  email: "Invalid email address",
  url: "Invalid URL format",
  uuid: "Invalid UUID format",
  cuid: "Invalid CUID format",
  ip: "Invalid IP address",
  datetime: "Invalid datetime format",
  min: (min: number) => `Should be at least ${min}`,
  max: (max: number) => `Should not exceed ${max}`,
  minItems: (min: number) => `Should have at least ${min} items`,
  maxItems: (max: number) => `Should not have more than ${max} items`,
  uniqueItems: "All items must be unique",
  pattern: "Invalid format",
  integer: "Must be an integer",
  multipleOf: (n: number) => `Must be a multiple of ${n}`,
  minimum: (min: number) => `Should be greater than or equal to ${min}`,
  maximum: (max: number) => `Should be less than or equal to ${max}`,
  exclusiveMinimum: (min: number) => `Should be greater than ${min}`,
  exclusiveMaximum: (max: number) => `Should be less than ${max}`,
  enum: (values: readonly any[]) => `Must be one of: ${values.join(", ")}`,
} as const;

type SchemaOptions = {
  description?: string;
  example?: any;
  deprecated?: boolean;
};

// Schema decorator
export function schema(options: SchemaOptions = {}): ClassDecorator {
  return function (target: Function): void {
    Reflect.defineMetadata(META_KEYS.SCHEMA, options, target);
    // Automatically generate and store the Zod schema
    const zodSchema: ZodSchema<any> = toZodSchema(target as any);

    Reflect.defineMetadata(META_KEYS.OUTPUT_SCHEMA, zodSchema, target);
  };
}

// Alias for @schema
export const zodify = schema;

// Helper function to register properties
function registerProperty(target: any, propertyKey: string) {
  const properties: string[] =
    Reflect.getMetadata(META_KEYS.PROPERTIES, target) || [];
  if (!properties.includes(propertyKey)) {
    properties.push(propertyKey);
    Reflect.defineMetadata(META_KEYS.PROPERTIES, properties, target);
  }
}

// Metadata decorators
export function description(text: string) {
  return function (target: any, propertyKey: string) {
    registerProperty(target, propertyKey);
    Reflect.defineMetadata(META_KEYS.DESCRIPTION, text, target, propertyKey);
  };
}

export function example(value: any) {
  return function (target: any, propertyKey: string) {
    registerProperty(target, propertyKey);
    Reflect.defineMetadata(META_KEYS.EXAMPLE, value, target, propertyKey);
  };
}

// Optional decorator
export function optional(): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    registerProperty(target, propertyKey as string);
    Reflect.defineMetadata(META_KEYS.OPTIONAL, true, target, propertyKey);
  };
}

// Enum decorator
export function enumValues<T extends string | number>(values: readonly T[]) {
  return function (target: any, propertyKey: string) {
    registerProperty(target, propertyKey);
    Reflect.defineMetadata(META_KEYS.ENUM_VALUES, values, target, propertyKey);
    addValidationRule(target, propertyKey, {
      type: "enum",
      params: [values],
    });
  };
}

// Array items decorator
export function arrayItems(itemType: () => any): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    registerProperty(target, propertyKey as string);
    Reflect.defineMetadata(
      META_KEYS.ARRAY_ITEM_TYPE,
      itemType,
      target,
      propertyKey
    );
  };
}

// Validation decorators
export function min(value: number) {
  return function (target: any, propertyKey: string) {
    registerProperty(target, propertyKey); // Ensure property is registered
    addValidationRule(target, propertyKey, {
      type: "min",
      params: [value],
    });
  };
}

export function max(value: number) {
  return function (target: any, propertyKey: string) {
    registerProperty(target, propertyKey);
    addValidationRule(target, propertyKey, {
      type: "max",
      params: [value],
    });
  };
}

export function minimum(value: number) {
  return function (target: any, propertyKey: string) {
    registerProperty(target, propertyKey);
    addValidationRule(target, propertyKey, {
      type: "minimum",
      params: [value],
    });
  };
}

export function maximum(value: number) {
  return function (target: any, propertyKey: string) {
    registerProperty(target, propertyKey);
    addValidationRule(target, propertyKey, {
      type: "maximum",
      params: [value],
    });
  };
}

export function integer() {
  return function (target: any, propertyKey: string) {
    registerProperty(target, propertyKey);
    addValidationRule(target, propertyKey, {
      type: "integer",
    });
  };
}

export function url() {
  return function (target: any, propertyKey: string) {
    registerProperty(target, propertyKey);
    addValidationRule(target, propertyKey, {
      type: "url",
    });
  };
}

export function pattern(regex: RegExp) {
  return function (target: any, propertyKey: string) {
    registerProperty(target, propertyKey);
    addValidationRule(target, propertyKey, {
      type: "pattern",
      params: [regex],
    });
  };
}

export function uuid() {
  return function (target: any, propertyKey: string) {
    registerProperty(target, propertyKey);
    addValidationRule(target, propertyKey, {
      type: "uuid",
    });
  };
}

export function cuid() {
  return function (target: any, propertyKey: string) {
    registerProperty(target, propertyKey);
    addValidationRule(target, propertyKey, {
      type: "cuid",
    });
  };
}

export function datetime() {
  return function (target: any, propertyKey: string) {
    registerProperty(target, propertyKey);
    addValidationRule(target, propertyKey, {
      type: "datetime",
    });
  };
}

export function ip() {
  return function (target: any, propertyKey: string) {
    registerProperty(target, propertyKey);
    addValidationRule(target, propertyKey, {
      type: "ip",
    });
  };
}

export function multipleOf(value: number) {
  return function (target: any, propertyKey: string) {
    registerProperty(target, propertyKey);
    addValidationRule(target, propertyKey, {
      type: "multipleOf",
      params: [value],
    });
  };
}

export function exclusiveMinimum(value: number) {
  return function (target: any, propertyKey: string) {
    registerProperty(target, propertyKey);
    addValidationRule(target, propertyKey, {
      type: "exclusiveMinimum",
      params: [value],
    });
  };
}

export function exclusiveMaximum(value: number) {
  return function (target: any, propertyKey: string) {
    registerProperty(target, propertyKey);
    addValidationRule(target, propertyKey, {
      type: "exclusiveMaximum",
      params: [value],
    });
  };
}

export function email() {
  return function (target: any, propertyKey: string) {
    registerProperty(target, propertyKey); // Ensure property is registered
    addValidationRule(target, propertyKey, {
      type: "email",
    });
  };
}

export function minItems(min: number) {
  return function (target: any, propertyKey: string) {
    registerProperty(target, propertyKey);
    addValidationRule(target, propertyKey, {
      type: "minItems",
      params: [min],
    });
  };
}

export function maxItems(max: number) {
  return function (target: any, propertyKey: string) {
    registerProperty(target, propertyKey);
    addValidationRule(target, propertyKey, {
      type: "maxItems",
      params: [max],
    });
  };
}

export function uniqueItems() {
  return function (target: any, propertyKey: string) {
    registerProperty(target, propertyKey);
    addValidationRule(target, propertyKey, {
      type: "uniqueItems",
    });
  };
}

// Validation decorators helper functions
function getValidationMetadata(
  target: any,
  propertyKey: string
): ValidationRule[] {
  return (
    Reflect.getMetadata(META_KEYS.OUTPUT_SCHEMA, target, propertyKey) || []
  );
}

function setValidationMetadata(
  target: any,
  propertyKey: string,
  rules: ValidationRule[]
): void {
  Reflect.defineMetadata(META_KEYS.OUTPUT_SCHEMA, rules, target, propertyKey);
}

function addValidationRule(
  target: any,
  propertyKey: string,
  rule: ValidationRule
): void {
  const existingRules = getValidationMetadata(target, propertyKey);
  existingRules.push(rule);
  setValidationMetadata(target, propertyKey, existingRules);
}

// Function to check if a property is optional
function isOptional(target: any, propertyKey: string): boolean {
  return Reflect.getMetadata(META_KEYS.OPTIONAL, target, propertyKey) || false;
}

// Function to create base schema
function createBaseSchema(target: any, propertyKey: string): z.ZodTypeAny {
  // Check for enumValues
  const enumValues: any[] | undefined = Reflect.getMetadata(
    META_KEYS.ENUM_VALUES,
    target,
    propertyKey
  );

  if (enumValues) {
    if (!Array.isArray(enumValues) || enumValues.length === 0) {
      throw new Error(
        `@enumValues on ${propertyKey} must be a non-empty array`
      );
    }
    // Convert to [string, ...string[]] if possible
    if (enumValues.every((v) => typeof v === "string")) {
      return z.enum(enumValues as [string, ...string[]]);
    } else if (enumValues.every((v) => typeof v === "number")) {
      // Zod does not support numeric enums directly, need to handle differently
      return z
        .enum(enumValues.map(String) as [string, ...string[]])
        .transform((val) => {
          const num = Number(val);
          if (Number.isNaN(num)) {
            throw new Error("Invalid enum value");
          }
          return num;
        });
    } else {
      throw new Error(
        `@enumValues on ${propertyKey} must be all strings or all numbers`
      );
    }
  }

  // Check if the property is an array
  const propertyType = Reflect.getMetadata("design:type", target, propertyKey);

  if (propertyType === Array) {
    // Get the item type from metadata
    const itemTypeFn: () => any = Reflect.getMetadata(
      META_KEYS.ARRAY_ITEM_TYPE,
      target,
      propertyKey
    );

    if (!itemTypeFn) {
      throw new Error(
        `Array property ${propertyKey} is missing @arrayItems decorator`
      );
    }

    const itemType = itemTypeFn();
    let itemSchema: z.ZodTypeAny;

    switch (itemType) {
      case String:
        itemSchema = z.string();
        break;
      case Number:
        itemSchema = z.number();
        break;
      case Boolean:
        itemSchema = z.boolean();
        break;
      case Date:
        itemSchema = z.date();
        break;
      default:
        if (typeof itemType === "function") {
          // Assume it's a class that can be converted to Zod schema
          itemSchema = toZodSchema(itemType);
        } else {
          itemSchema = z.any();
        }
    }

    return z.array(itemSchema);
  }

  // Handle primitive types
  switch (propertyType) {
    case String:
      return z.string();
    case Number:
      return z.number();
    case Boolean:
      return z.boolean();
    case Date:
      return z.date();
    default:
      // Handle nested objects
      if (propertyType?.prototype) {
        try {
          return toZodSchema(propertyType);
        } catch (error) {
          console.warn(
            `Failed to create schema for nested type: ${propertyType.name}`
          );
          return z.any();
        }
      }
      return z.any();
  }
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

// Apply validation rule to a schema
function applyValidationRule(
  schema: z.ZodTypeAny,
  rule: ValidationRule
): z.ZodTypeAny {
  switch (rule.type) {
    // String validations
    case "email":
      if (!isZodString(schema)) {
        throw new Error("Email validation can only be applied to strings");
      }
      return schema.email();
    case "url":
      if (!isZodString(schema)) {
        throw new Error("URL validation can only be applied to strings");
      }
      return schema.url();
    case "uuid":
      if (!isZodString(schema)) {
        throw new Error("UUID validation can only be applied to strings");
      }
      return schema.uuid();
    case "cuid":
      if (!isZodString(schema)) {
        throw new Error("CUID validation can only be applied to strings");
      }
      return schema.cuid();
    case "datetime":
      if (!isZodString(schema)) {
        throw new Error("Datetime validation can only be applied to strings");
      }
      return schema.datetime();
    case "ip":
      if (!isZodString(schema)) {
        throw new Error("IP validation can only be applied to strings");
      }
      return schema.ip();
    case "pattern":
      if (!isZodString(schema)) {
        throw new Error("Pattern validation can only be applied to strings");
      }
      return schema.regex(rule.params![0]);
    case "min":
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
        `Min validation cannot be applied to ${schema.constructor.name}`
      );
    case "max":
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
        `Max validation cannot be applied to ${schema.constructor.name}`
      );
    // Number validations
    case "minimum":
      if (!isZodNumber(schema)) {
        throw new Error("Minimum validation can only be applied to numbers");
      }
      return schema.gte(rule.params![0]);
    case "maximum":
      if (!isZodNumber(schema)) {
        throw new Error("Maximum validation can only be applied to numbers");
      }
      return schema.lte(rule.params![0]);
    case "exclusiveMinimum":
      if (!isZodNumber(schema)) {
        throw new Error(
          "ExclusiveMinimum validation can only be applied to numbers"
        );
      }
      return schema.gt(rule.params![0]);
    case "exclusiveMaximum":
      if (!isZodNumber(schema)) {
        throw new Error(
          "ExclusiveMaximum validation can only be applied to numbers"
        );
      }
      return schema.lt(rule.params![0]);
    case "multipleOf":
      if (!isZodNumber(schema)) {
        throw new Error("MultipleOf validation can only be applied to numbers");
      }
      return schema.multipleOf(rule.params![0]);
    case "integer":
      if (!isZodNumber(schema)) {
        throw new Error("Integer validation can only be applied to numbers");
      }
      return schema.int();
    // Array validations
    case "minItems":
      if (!isZodArray(schema)) {
        throw new Error("MinItems validation can only be applied to arrays");
      }
      return schema.min(rule.params![0]);
    case "maxItems":
      if (!isZodArray(schema)) {
        throw new Error("MaxItems validation can only be applied to arrays");
      }
      return schema.max(rule.params![0]);
    case "uniqueItems":
      if (!isZodArray(schema)) {
        throw new Error("UniqueItems validation can only be applied to arrays");
      }
      return schema.refine(
        (items) =>
          new Set(items.map((item) => JSON.stringify(item))).size ===
          items.length,
        { message: DEFAULT_ERROR_MESSAGES.uniqueItems }
      );
    case "enum":
      // Enums are handled in createBaseSchema
      return schema;
    default:
      throw new Error(`Unknown validation type: ${(rule as any).type}`);
  }
}

// Convert class to Zod schema
export function toZodSchema1<T extends { new (...args: any[]): any }>(
  target: T
): z.ZodObject<any> {
  const prototype = target.prototype;
  const shape: { [key: string]: z.ZodTypeAny } = {};

  // Get schema options if they exist
  const schemaOptions: SchemaOptions =
    Reflect.getMetadata(META_KEYS.SCHEMA, target) || {};

  // Get registered properties
  const properties: string[] =
    Reflect.getMetadata(META_KEYS.PROPERTIES, prototype) || [];

  for (const propertyKey of properties) {
    const rules: ValidationRule[] =
      Reflect.getMetadata(META_KEYS.OUTPUT_SCHEMA, prototype, propertyKey) ||
      [];

    const description = Reflect.getMetadata(
      "description",
      prototype,
      propertyKey
    );

    // Create base schema from type
    let schema = createBaseSchema(prototype, propertyKey);

    // Apply validation rules
    rules.forEach((rule) => {
      schema = applyValidationRule(schema, rule);
    });

    // Apply description if exists
    if (description) {
      schema = schema.describe(description);
    }

    // Check if the property is optional
    if (isOptional(prototype, propertyKey)) {
      schema = schema.optional();
    }

    shape[propertyKey] = schema;
  }

  let zodSchema = z.object(shape);

  // Apply schema-level description if exists
  if (schemaOptions.description) {
    zodSchema = zodSchema.describe(schemaOptions.description);
  }

  return zodSchema;
}

// Optional: Implement caching for performance
const schemaCache = new Map<Function, ZodSchema<any>>();

//export function toZodSchema<T>(target: ClassConstructor<T>): ZodSchema<T> {
export function toZodSchema<T>(target: ClassConstructor<T>): z.ZodObject<any> {
  if (schemaCache.has(target)) {
    console.log("Cache hit");
    return schemaCache.get(target) as z.ZodObject<any>;
  }

  const prototype = target.prototype;
  const shape: { [key: string]: z.ZodTypeAny } = {};

  // Get all property keys that have metadata
  const properties: string[] =
    Reflect.getMetadata(META_KEYS.PROPERTIES, prototype) || [];

  for (const propertyKey of properties) {
    const rules: ValidationRule[] =
      Reflect.getMetadata(META_KEYS.OUTPUT_SCHEMA, prototype, propertyKey) ||
      [];

    const description: string | undefined = Reflect.getMetadata(
      META_KEYS.DESCRIPTION,
      prototype,
      propertyKey
    );

    // Create base schema from type
    let schema = createBaseSchema(prototype, propertyKey);

    // Apply validation rules
    rules.forEach((rule) => {
      schema = applyValidationRule(schema, rule);
    });

    // Apply description if exists
    if (description) {
      schema = schema.describe(description);
    }

    // Check if the property is optional
    if (isOptional(prototype, propertyKey)) {
      schema = schema.optional();
    }

    shape[propertyKey] = schema;
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
