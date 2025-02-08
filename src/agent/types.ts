import { z, ZodSchema } from 'zod';
import { SchemaConstructor } from '../schema';
import { CoreTool, StreamTextResult } from 'ai';

/**
 * Type helper for processed stream output that handles both string and object types.
 * For string types, it returns string directly.
 * For object types, it returns a deep partial version of the type, allowing for partial objects during streaming.
 *
 * @typeParam T - The type to process. Can be string or any object type.
 */
export type ProcessedStreamOutput<T> = T extends string
  ? string
  : DeepPartial<T>;

/**
 * Union type representing all possible input/output type specifications.
 * Can be a Zod schema, a schema constructor, or a primitive constructor.
 * Used to define the shape and validation rules for agent inputs and outputs.
 */
export type InputOutputType =
  | ZodSchema
  | SchemaConstructor
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor;

/**
 * Makes all properties in T optional and recursively does the same for all nested objects
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/**
 * Enhanced stream result that provides both processed and raw stream access
 */
export interface AgentStreamResult<TOutput> {
  /**
   * Processed stream that automatically handles TOutput type.
   * For string outputs, provides string chunks.
   * For object outputs, provides partial objects as they stream.
   */
  processedStream: AsyncIterable<ProcessedStreamOutput<TOutput>>;

  /** Raw stream access for advanced usage */
  raw: StreamTextResult<Record<string, CoreTool>, TOutput>;
}

/**
 * Metadata for tool annotation
 */
export type ToolMetadata = Readonly<{
  name: string;
  description: string;
  method: string;
  parameters: z.ZodObject<any>;
}>;
