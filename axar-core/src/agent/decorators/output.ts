import "reflect-metadata";
import { ZodSchema } from "zod";
import { META_KEYS } from "./metaKeys";
import { toZodSchema } from "../schema4";
import { ClassConstructor } from "./types";

/**
 * `@output` decorator to define the output schema for an agent.
 * Supports both ZodSchema and class-based schemas.
 *
 * @param schemaOrClass - A ZodSchema instance or a class constructor decorated with @schema.
 * @returns A class decorator function.
 */
export function output(
  schemaOrClass: ZodSchema<any> | ClassConstructor
): ClassDecorator {
  return function (target: Function): void {
    let zodSchema: ZodSchema<any>;

    if (schemaOrClass instanceof ZodSchema) {
      // Directly use the provided ZodSchema
      zodSchema = schemaOrClass;
    } else {
      // Assume it's a class constructor decorated with @schema
      zodSchema = toZodSchema(schemaOrClass);
    }

    // Store the ZodSchema in metadata for the Agent base class to retrieve
    Reflect.defineMetadata(META_KEYS.OUTPUT_SCHEMA, zodSchema, target);
  };
}
