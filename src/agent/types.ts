import { z, ZodSchema } from 'zod';
import { SchemaConstructor } from '../schema';
import {
  CoreTool,
  StreamTextResult,
  DeepPartial,
  Output,
  CoreMessage,
  LanguageModelV1,
} from 'ai';

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

/**
 * Type alias for the experimental output configuration returned by Output.object
 */
export type ExperimentalOutput = ReturnType<typeof Output.object>;

/**
 * Configuration for agent output handling
 */
export interface OutputConfig {
  model: LanguageModelV1;
  messages: CoreMessage[];
  tools: Record<string, CoreTool>;
  maxSteps: number;
  /** Maximum number of tokens to generate */
  maxTokens?: number;
  /** Sampling temperature between 0 and 1 */
  temperature?: number;
  /** Maximum number of retries for failed requests */
  maxRetries?: number;
  /** Tool choice mode - 'auto' or 'none' */
  toolChoice?: 'auto' | 'none';
  experimental_telemetry: {
    isEnabled: boolean;
    functionId: string;
  };
  experimental_output?: ExperimentalOutput;
}

/**
 * Configuration options for the language model.
 */
export interface ModelConfig {
  /** Maximum number of tokens to generate */
  maxTokens?: number;
  /** Sampling temperature between 0 and 1 */
  temperature?: number;
  /** Maximum number of retries for failed requests */
  maxRetries?: number;
  /** Maximum number of steps in a conversation */
  maxSteps?: number;
  /** Tool choice mode - 'auto' or 'none' */
  toolChoice?: 'auto' | 'none';
}
