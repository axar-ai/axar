import "reflect-metadata";
import { META_KEYS } from "./metaKeys";
import { z, ZodObject, ZodSchema } from "zod";
import { toZodSchema } from "../schema4";
import { ClassConstructor } from "./types";

/**
 * `@tool` decorator to mark a method as a tool with a description and schema.
 * Supports both explicit ZodSchema and class-based schema derivation.
 *
 * Usage with ZodSchema:
 * @tool("Description", z.object({ ... }))
 *
 * Usage with class-based schema:
 * @tool("Description")
 * async method(params: ClassBasedParams): Promise<ReturnType> { ... }
 *
 * @param description - Description of the tool's functionality.
 * @param schemaOrClass - Optional Zod schema or class constructor.
 * @returns A method decorator function.
 */
export function tool(
  description: string,
  schemaOrClass?: ZodSchema<any> | ClassConstructor
): MethodDecorator {
  return function (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): void | PropertyDescriptor {
    let schema: ZodSchema<any>;

    if (schemaOrClass) {
      if (schemaOrClass instanceof z.ZodSchema) {
        // Explicit Zod schema provided
        schema = schemaOrClass;
        console.log("schema");
        printSchema(schema);
      } else {
        // Assume it's a class constructor decorated with @schema
        schema = toZodSchema(schemaOrClass);
        console.log("class");
        printSchema(schema);
      }
    } else {
      // No schema provided, derive via reflection
      const paramTypes: any[] = Reflect.getMetadata(
        "design:paramtypes",
        target,
        propertyKey
      );

      if (!paramTypes || paramTypes.length === 0) {
        throw new Error(
          `@tool decorator on ${String(
            propertyKey
          )} requires at least one parameter or an explicit schema.`
        );
      }

      const paramType = paramTypes[0];

      // Check if paramType is a class decorated with @schema
      const hasSchema = Reflect.hasMetadata(META_KEYS.SCHEMA, paramType);
      if (!hasSchema) {
        throw new Error(
          `@tool decorator on ${String(
            propertyKey
          )} requires an explicit Zod schema or a parameter class decorated with @schema.`
        );
      }

      // Convert the parameter class to Zod schema
      schema = toZodSchema(paramType);
      printSchema(schema);
    }

    // Retrieve existing tools metadata or initialize an empty array
    const tools: ToolMetadata[] =
      Reflect.getMetadata(META_KEYS.TOOLS, target.constructor) || [];

    // Add the new tool to the metadata
    tools.push({
      name: String(propertyKey),
      description,
      method: String(propertyKey),
      parameters: schema as ZodObject<any>,
    });

    // Define the updated tools metadata on the constructor
    Reflect.defineMetadata(META_KEYS.TOOLS, tools, target.constructor);

    // Wrap the original method to validate input
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      if (args[0]) {
        schema.parse(args[0]); // This will throw if validation fails
      }
      return originalMethod.apply(this, args);
    };

    // Optionally, return the descriptor if you want to modify it
    // return descriptor;
  };
}

// Tool metadata interface
interface ToolMetadata {
  name: string;
  description: string;
  method: string;
  parameters: z.ZodObject<any>;
}

function printSchema(schema: any, depth = 0) {
  const indent = " ".repeat(depth * 2);
  if (schema._def.typeName === "ZodObject") {
    console.log(`${indent}Object:`);
    for (const [key, value] of Object.entries(schema.shape)) {
      console.log(`${indent}  ${key}:`);
      printSchema(value, depth + 1);
    }
  } else {
    console.log(`${indent}${schema._def.typeName}`);
  }
}
