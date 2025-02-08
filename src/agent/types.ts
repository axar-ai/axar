import { z, ZodSchema } from 'zod';
import { SchemaConstructor } from '../schema';
import { CoreTool, StreamTextResult, DeepPartial } from 'ai';

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
 * Metadata for tool annotation
 */
export type ToolMetadata = Readonly<{
  name: string;
  description: string;
  method: string;
  parameters: z.ZodObject<any>;
}>;

/**
 * Type helper for processed stream output that handles both string and object types.
 * For string types, it returns string directly.
 * For object types, it returns a deep partial version of the type, allowing for partial objects during streaming.
 *
 * @typeParam T - The type to process. Can be string or any object type.
 */
export type StreamOutput<T> = T extends string ? string : DeepPartial<T>;

/**
 * Stream result that provides both processed and raw stream access
 */
export interface StreamResult<TOutput> {
  /**
   * Processed stream that automatically handles TOutput type.
   * For string outputs, provides string chunks.
   * For object outputs, provides partial objects as they stream.
   */
  stream: AsyncIterable<StreamOutput<TOutput>>;

  /** Raw stream access for advanced usage */
  raw: StreamTextResult<Record<string, CoreTool>, TOutput>;
}
