import { z, ZodSchema } from 'zod';
import { SchemaConstructor } from '../schema';
import { CoreTool } from 'ai';

// Type helper for processed stream output
export type ProcessedStreamOutput<T> = T extends string
  ? string
  : DeepPartial<T>;

// Extend StreamTextResult to include experimental properties
export interface StreamTextResult<
  TTools extends Record<string, CoreTool>,
  TOutput,
> {
  text: string;
  textStream: AsyncIterable<string>;
  fullStream: AsyncIterable<any>;
  experimental_output: {
    value?: any;
    [key: string]: any;
  };
  experimental_partialOutputStream: AsyncIterable<DeepPartial<TOutput>>;
}

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

  /** Final result promise that resolves to the complete TOutput */
  result: Promise<TOutput>;

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
