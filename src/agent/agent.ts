import { z, ZodSchema } from 'zod';
import {
  generateText,
  LanguageModelV1,
  CoreMessage,
  CoreTool,
  Output,
} from 'ai';
import { META_KEYS } from './meta-keys';
import { ToolMetadata } from './types';
import { getModel } from '../llm';
import { logger } from '../common';

// Base agent that handles core functionality
export abstract class Agent<TInput = any, TOutput = any> {
  private static getMetadata<T>(key: symbol, target: any): T {
    return Reflect.getMetadata(key, target) || ([] as unknown as T);
  }

  protected async getModel(): Promise<LanguageModelV1> {
    const providerModelName = Agent.getMetadata<string>(
      META_KEYS.MODEL,
      this.constructor,
    );
    if (!providerModelName) {
      throw new Error(
        'Model metadata not found. Please apply @model decorator.',
      );
    }

    return await getModel(providerModelName);
  }

  protected getTools(): Record<string, CoreTool> {
    const tools = Agent.getMetadata<ToolMetadata[]>(
      META_KEYS.TOOLS,
      this.constructor,
    );

    const toolsFormatted = Object.fromEntries(
      tools.map((tool) => [
        tool.name,
        {
          description: tool.description,
          parameters: tool.parameters,
          execute: (...args: any[]) => (this as any)[tool.method](...args),
        },
      ]),
    );

    return toolsFormatted as Record<string, CoreTool>;
  }

  protected getSystemPrompts(): Array<() => Promise<string>> {
    return Agent.getMetadata<Array<() => Promise<string>>>(
      META_KEYS.SYSTEM_PROMPTS,
      this.constructor,
    );
  }

  protected getOutputSchema(): ZodSchema<any> {
    // Retrieve the ZodSchema from metadata
    const schema: ZodSchema<TOutput> = Reflect.getMetadata(
      META_KEYS.OUTPUT,
      this.constructor,
    );

    if (!schema) {
      logger.debug(
        `No output schema found for ${this.constructor.name}. ` +
          `Did you forget to apply @output decorator? ` +
          `Falling back to string schema.`,
      );
      return z.string();
    }

    return schema;
  }

  protected getInputSchema(): ZodSchema<any> | undefined {
    // Retrieve the ZodSchema from metadata
    const schema: ZodSchema<TInput> = Reflect.getMetadata(
      META_KEYS.INPUT,
      this.constructor,
    );

    return schema;
  }

  protected serializeInput(
    input: TInput,
    inputSchema: ZodSchema<TInput> | undefined,
  ): string {
    // If schema is provided then validate input
    if (inputSchema) {
      inputSchema.parse(input);
    }

    try {
      // Handle object inputs
      if (typeof input === 'object' && input !== null) {
        // Warn only if we have an object type input but no schema
        if (!inputSchema) {
          logger.warn(
            `No input schema found for ${this.constructor.name}. ` +
              `Did you forget to apply @input decorator?`,
          );
        }
        return JSON.stringify(input);
      }

      // Handle primitives
      return String(input);
    } catch (error) {
      throw new Error(
        `Failed to serialize input: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Runs the agent with the given input and returns the output.
   * @param input - The input to run the agent with.
   * @returns The output of the agent.
   */
  async run(input: TInput): Promise<TOutput> {
    const model = await this.getModel();
    const tools = this.getTools();
    const outputSchema = this.getOutputSchema();
    const inputSchema = this.getInputSchema();

    const systemPrompts = await Promise.all(
      this.getSystemPrompts().map((fn) => fn.call(this)),
    );

    const inputString = this.serializeInput(input, inputSchema);

    const messages = [
      { role: 'system', content: systemPrompts.join('\n\n') },
      { role: 'user', content: inputString },
    ] as CoreMessage[];

    const baseOutputConfig = {
      model: model,
      messages: messages,
      tools: tools,
      // FIXME: this needs to be configurable
      maxSteps: 3,
    };

    const isStringSchema = outputSchema instanceof z.ZodString;
    const isPrimitiveSchema =
      outputSchema instanceof z.ZodBoolean ||
      outputSchema instanceof z.ZodNumber;

    // Check if not plain string schema, for all other cases (including primitives and complex types) use object output
    const finalOutputConfig = isStringSchema
      ? baseOutputConfig
      : {
          ...baseOutputConfig,
          experimental_output: Output.object({
            schema: outputSchema,
          }),
        };

    const result = await generateText(finalOutputConfig);

    // For plain string schema, return the text
    if (isStringSchema) {
      return result.text as TOutput;
    }

    // For primitive types (boolean, number), return .value
    if (isPrimitiveSchema) {
      return result.experimental_output.value as TOutput;
    }

    // For object/array or other complex types, return the whole object
    return result.experimental_output as TOutput;
  }
}
