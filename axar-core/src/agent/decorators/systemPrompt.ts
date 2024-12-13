// src/decorators/systemPrompt.ts
import "reflect-metadata";
import { META_KEYS } from "./metaKeys";

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

// Function Overloads
export function systemPrompt(prompt: string): ClassDecorator;
export function systemPrompt(): MethodDecorator;

// Implementation
export function systemPrompt(
  prompt?: string
): ClassDecorator | MethodDecorator {
  // Class Decorator
  if (typeof prompt === "string") {
    const classDecorator: ClassDecorator = function (
      constructor: Function
    ): void {
      const systemPrompts =
        Reflect.getMetadata(META_KEYS.SYSTEM_PROMPTS, constructor) || [];

      // Add class prompt to the beginning
      systemPrompts.unshift(async () => prompt);

      Reflect.defineMetadata(
        META_KEYS.SYSTEM_PROMPTS,
        systemPrompts,
        constructor
      );
    };
    return classDecorator;
  } else {
    // Method Decorator
    const methodDecorator: MethodDecorator = function (
      target: Object,
      propertyKey: string | symbol,
      descriptor: PropertyDescriptor
    ): void | PropertyDescriptor {
      if (typeof descriptor.value !== "function") {
        throw new Error(
          `@systemPrompt can only be applied to methods, not to property '${String(
            propertyKey
          )}'.`
        );
      }

      // Retrieve existing system prompts or initialize
      const systemPrompts =
        Reflect.getMetadata(META_KEYS.SYSTEM_PROMPTS, target.constructor) || [];
      systemPrompts.push(async function (this: any) {
        const result = await descriptor.value.apply(this); // Use the actual instance's `this`
        if (typeof result !== "string") {
          throw new Error(
            `Method '${String(
              propertyKey
            )}' decorated with @systemPrompt must return a string.`
          );
        }
        return result;
      });

      Reflect.defineMetadata(
        META_KEYS.SYSTEM_PROMPTS,
        systemPrompts,
        target.constructor
      );

      return descriptor;
    };
    return methodDecorator;
  }
}
