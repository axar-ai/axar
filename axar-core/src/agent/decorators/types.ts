import { z } from "zod";

/**
 * Represents a class constructor with no argument
 */
export type ClassConstructor<T = any> = { new (): T };
// TODO: export type ClassConstructor<T = unknown> = new (...args: any[]) => T;

/**
 * String validation rule types
 */
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

/**
 * Number validation rule types
 */
type NumberValidation =
  | "minimum"
  | "maximum"
  | "exclusiveMinimum"
  | "exclusiveMaximum"
  | "multipleOf"
  | "integer";

/**
 * Array validation rule types
 */
type ArrayValidation = "minItems" | "maxItems" | "uniqueItems";

export type ValidationRule = {
  type: StringValidation | NumberValidation | ArrayValidation | "enum";
  params?: any[];
};

/**
 * Options for schema annotation
 */
export type SchemaOptions = Readonly<{
  description?: string;
  example?: any;
  deprecated?: boolean;
}>;

/**
 * Metadata for tool annotation
 */
export type ToolMetadata = Readonly<{
  name: string;
  description: string;
  method: string;
  parameters: z.ZodObject<any>;
}>;
