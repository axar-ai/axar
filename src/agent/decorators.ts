import 'reflect-metadata';
import { z, ZodSchema, ZodObject } from 'zod';
import { META_KEYS } from './meta-keys';
import { ClassConstructor, ToolMetadata, InputOutputType } from './types';
import { hasSchemaDef, getSchemaDef } from '../schema';

/**
 * `model` decorator to associate a model identifier with a class.
 *
 * @param modelIdentifier - The model identifier string.
 * @returns A class decorator function.
 */
export function model(modelIdentifier: string): ClassDecorator {
  return function <T extends Function>(target: T): T {
    Reflect.defineMetadata(META_KEYS.MODEL, modelIdentifier, target);
    return target;
  };
}

/**
 * Creates a schema from the provided type specification
 */
function createSchema(type: InputOutputType, decoratorName: string): ZodSchema {
  if (type instanceof ZodSchema) {
    return type;
  }

  const primitiveSchemas = {
    [String.name]: z.string(),
    [Number.name]: z.number(),
    [Boolean.name]: z.boolean(),
  };

  const primitiveSchema = primitiveSchemas[type.name];
  if (primitiveSchema) {
    return primitiveSchema;
  }

  if (hasSchemaDef(type)) {
    return getSchemaDef(type);
  }
  const typeName =
    typeof type === 'function' && type.name ? type.name : String(type);

  throw new Error(
    `${decoratorName} error: Could not create a schema for "${typeName}". ` +
      `Type must be a Zod schema, a class decorated with @schema, or a primitive constructor (String, Number, Boolean).`,
  );
}

/**
 * Creates a decorator for input/output schema definition
 */
function createSchemaDecorator(metaKey: symbol, decoratorName: string) {
  return function (type: InputOutputType): ClassDecorator {
    return function <T extends Function>(target: T): T {
      const schema = createSchema(type, decoratorName);
      Reflect.defineMetadata(metaKey, schema, target);
      return target;
    };
  };
}

/**
 * Specifies the output schema for a class.
 *
 * @param type - The output type specification, which can be:
 *   - A Zod schema
 *   - A class decorated with @schema
 *   - A primitive type (String, Number, Boolean)
 *
 * @example
 * ```typescript
 * // Using primitive
 * @output(String)
 * class StringAgent extends Agent<string, string> {}
 *
 * // Using schema-decorated class
 * @output(UserProfile)
 * class UserAgent extends Agent<string, UserProfile> {}
 *
 * // Using Zod schema directly
 * @output(z.boolean())
 * class BooleanAgent extends Agent<string, boolean> {}
 * ```
 */
export const output = createSchemaDecorator(META_KEYS.OUTPUT, '@output');

/**
 * Specifies the input schema for a class.
 *
 * @param type - The input type specification, which can be:
 *   - A Zod schema
 *   - A class decorated with @schema
 *   - A primitive type (String, Number, Boolean)
 *
 * @example
 * ```typescript
 * // Using primitive
 * @input(Boolean)
 * class BooleanAgent extends Agent<boolean, string> {}
 *
 * // Using schema-decorated class
 * @input(UserProfile)
 * class UserAgent extends Agent<UserProfile, string> {}
 *
 * // Using Zod schema directly
 * @input(z.boolean())
 * class BooleanAgent extends Agent<boolean, string> {}
 * ```
 */
export const input = createSchemaDecorator(META_KEYS.INPUT, '@input');

/**
 * `systemPrompt` decorator to set system prompts for classes and methods.
 *
 * Usage:
 * - As a Class Decorator: @systemPrompt("Your system prompt here.")
 * - As a Method Decorator: @systemPrompt
 *
 * When used as a method decorator, the decorated method must return a string.
 * The returned string is added to the system prompts.
 *
 * @param prompt - (Optional) The system prompt string.
 * @returns A decorator function.
 */
export function systemPrompt(prompt: string): ClassDecorator;

/**
 * Decorates a method to work a dynamic system prompt provider.
 *
 * @returns A decorator function.
 */
export function systemPrompt(): MethodDecorator;

// Implementation
export function systemPrompt(
  prompt?: string,
): ClassDecorator | MethodDecorator {
  // Class Decorator
  if (typeof prompt === 'string') {
    return function <T extends Function>(target: T): T {
      const systemPrompts =
        Reflect.getMetadata(META_KEYS.SYSTEM_PROMPTS, target) || [];

      // Add class prompt to the beginning
      systemPrompts.unshift(async () => prompt);

      Reflect.defineMetadata(META_KEYS.SYSTEM_PROMPTS, systemPrompts, target);
      return target;
    };
  } else {
    // Method Decorator
    return function (
      target: Object,
      propertyKey: string | symbol,
      descriptor: PropertyDescriptor,
    ): void | PropertyDescriptor {
      if (typeof descriptor.value !== 'function') {
        throw new Error(
          `@systemPrompt can only be applied to methods, not to property '${String(
            propertyKey,
          )}'.`,
        );
      }

      // Retrieve existing system prompts or initialize
      const systemPrompts =
        Reflect.getMetadata(META_KEYS.SYSTEM_PROMPTS, target.constructor) || [];
      systemPrompts.push(async function (this: any) {
        const result = await descriptor.value.apply(this); // Use the actual instance's `this`
        if (typeof result !== 'string') {
          throw new Error(
            `Method '${String(
              propertyKey,
            )}' decorated with @systemPrompt must return a string.`,
          );
        }
        return result;
      });

      Reflect.defineMetadata(
        META_KEYS.SYSTEM_PROMPTS,
        systemPrompts,
        target.constructor,
      );

      return descriptor;
    };
  }
}

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
  schemaOrClass?: ZodSchema<any> | ClassConstructor,
): MethodDecorator {
  return function (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    let schema: ZodSchema<any>;

    if (schemaOrClass) {
      if (schemaOrClass instanceof z.ZodSchema) {
        // Explicit Zod schema provided
        schema = schemaOrClass;
      } else if (hasSchemaDef(schemaOrClass)) {
        schema = getSchemaDef(schemaOrClass);
      } else {
        throw new Error(
          `${schemaOrClass.name} must be either a Zod schema or a class decorated with @schema`,
        );
      }
    } else {
      // No schema provided, derive via reflection
      const paramTypes: any[] = Reflect.getMetadata(
        'design:paramtypes',
        target,
        propertyKey,
      );

      if (!paramTypes || paramTypes.length === 0) {
        throw new Error(
          `@tool decorator on ${String(
            propertyKey,
          )} requires at least one parameter or an explicit schema.`,
        );
      }

      const paramType = paramTypes[0];

      // Check if paramType is a class decorated with @schema
      if (!hasSchemaDef(paramType)) {
        throw new Error(
          `@tool decorator on ${String(
            propertyKey,
          )} requires an explicit Zod schema or a parameter class decorated with @schema.`,
        );
      }

      // Convert the parameter class to Zod schema
      schema = getSchemaDef(paramType);
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

    return descriptor;
  };
}
