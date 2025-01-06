import { z, ZodSchema } from 'zod';

/**
 * Represents a class constructor with no argument
 */
export type ClassConstructor<T = any> = { new (): T };
// TODO: export type ClassConstructor<T = unknown> = new (...args: any[]) => T;

export type OutputType =
  | ZodSchema
  | ClassConstructor
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor;

/**
 * Metadata for tool annotation
 */
export type ToolMetadata = Readonly<{
  name: string;
  description: string;
  method: string;
  parameters: z.ZodObject<any>;
}>;
