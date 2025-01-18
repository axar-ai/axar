import { z, ZodSchema } from 'zod';
import { SchemaConstructor } from '../schema';

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
