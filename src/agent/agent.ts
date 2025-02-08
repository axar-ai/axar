import { z, ZodSchema } from 'zod';
import {
  generateText,
  CoreMessage,
  CoreTool,
  Output,
  LanguageModelV1,
  StreamTextResult,
} from 'ai';
import { META_KEYS } from './meta-keys';
import {
  ToolMetadata,
  StreamResult,
  StreamOutput,
  OutputConfig,
} from './types';
import { getModel } from '../llm';
import { logger, Telemetry } from '../common';
import { streamText } from 'ai';

/**
 * Base class for creating AI agents with standardized input/output handling,
 * tool management, and model integration.
 *
 * @typeParam TInput - The type of input the agent accepts
 * @typeParam TOutput - The type of output the agent produces
 */
export abstract class Agent<TInput = any, TOutput = any> {
  private telemetry: Telemetry<Agent<TInput, TOutput>>;

  constructor() {
    this.telemetry = new Telemetry(this);
  }

  /**
   * Retrieves metadata from a decorator.
   *
   * @param key - The metadata key symbol
   * @param target - The target object to get metadata from
   * @param defaultValue - The default value to return if metadata is not found
   * @returns The metadata value or default empty array
   */
  private static getMetadata<T>(key: symbol, target: any, defaultValue?: T): T {
    const metadata = Reflect.getMetadata(key, target);
    return metadata !== undefined
      ? metadata
      : (defaultValue ?? ([] as unknown as T));
  }

  /**
   * Gets the configured language model for this agent.
   *
   * @returns Promise resolving to the language model instance
   * @throws {Error} If model metadata is not found
   */
  protected async getModel(): Promise<LanguageModelV1> {
    const providerModelName = Agent.getMetadata<string>(
      META_KEYS.MODEL,
      this.constructor,
      '',
    );
    if (!providerModelName) {
      throw new Error(
        'Model metadata not found. Please apply @model decorator.',
      );
    }

    return await getModel(providerModelName);
  }

  /**
   * Gets the tools configured for this agent through the @tool decorator.
   *
   * @returns A record of tool names to their implementations
   */
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

  /**
   * Gets the system prompts configured through the @systemPrompt decorator.
   *
   * @returns An array of functions that generate system prompt strings
   */
  protected getSystemPrompts(): Array<() => Promise<string>> {
    return Agent.getMetadata<Array<() => Promise<string>>>(
      META_KEYS.SYSTEM_PROMPTS,
      this.constructor,
    );
  }

  /**
   * Gets the output schema configured through the @output decorator.
   *
   * @returns The Zod schema for validating agent outputs, fallbacks to string schema if not configured
   */
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

  /**
   * Gets the input schema configured through the @input decorator.
   *
   * @returns The Zod schema for validating agent inputs, if configured
   */
  protected getInputSchema(): ZodSchema<any> | undefined {
    // Retrieve the ZodSchema from metadata
    const schema: ZodSchema<TInput> = Reflect.getMetadata(
      META_KEYS.INPUT,
      this.constructor,
    );

    return schema;
  }

  /**
   * Serializes the input into a string format for the language model.
   *
   * @param input - The input to serialize
   * @param inputSchema - Optional schema to validate the input
   * @returns The serialized input string
   * @throws {Error} If serialization or validation fails
   */
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
   * Creates the base configuration for both run and stream operations.
   *
   * @param input - The input to process
   * @returns Base configuration object with model, tools, schemas, and messages
   */
  private async createConfig(input: TInput): Promise<OutputConfig> {
    const model = await this.getModel();
    const tools = this.getTools();
    const outputSchema = this.getOutputSchema();
    const inputSchema = this.getInputSchema();

    this.addTelemetry(model, tools, outputSchema, inputSchema);

    const systemPrompts = await Promise.all(
      this.getSystemPrompts().map((fn) => fn.call(this)),
    );
    const inputString = this.serializeInput(input, inputSchema);
    const messages = [
      { role: 'system', content: systemPrompts.join('\n\n') },
      { role: 'user', content: inputString },
    ] as CoreMessage[];

    const config: OutputConfig = {
      model,
      messages,
      tools,
      maxSteps: 3,
      experimental_telemetry: {
        isEnabled: this.telemetry.isRecording(),
        functionId: this.constructor.name,
      },
    };

    // Only add experimental_output for non-string schemas
    if (!(outputSchema instanceof z.ZodString)) {
      config.experimental_output = Output.object({ schema: outputSchema });
    }

    return config;
  }

  /**
   * Wraps an async operation with error handling and telemetry.
   *
   * @param operation - The async operation to execute
   * @returns The result of the operation
   * @throws The caught error after recording it in telemetry
   */
  private async withErrorHandling<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.telemetry.addAttribute(
        'error',
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

  /**
   * Adds telemetry attributes for monitoring and debugging purposes.
   * Records information about the model, tools, and schemas being used.
   *
   * @param model - The language model being used
   * @param tools - The tools available to the agent
   * @param outputSchema - The schema for validating outputs
   * @param inputSchema - The schema for validating inputs, if any
   */
  private addTelemetry(
    model: LanguageModelV1,
    tools: Record<string, CoreTool>,
    outputSchema: z.ZodType<any, z.ZodTypeDef, any>,
    inputSchema: z.ZodType<any, z.ZodTypeDef, any> | undefined,
  ): void {
    this.telemetry.addAttribute(
      'agent.model',
      `${model.modelId}:${model.provider}`,
    );
    this.telemetry.addAttribute('agent.tools', Object.keys(tools));
    this.telemetry.addAttribute('agent.output_schema', outputSchema);
    this.telemetry.addAttribute('agent.input_schema', inputSchema);
  }

  /**
   * Creates a processed stream that automatically handles the output type.
   * For string schemas, returns the text stream directly.
   * For other types, returns the experimental partial output stream.
   *
   * @param stream - The raw stream result from the model
   * @param schema - The schema defining the output type
   * @returns An async iterable of processed chunks matching the output type
   */
  private processStream(
    stream: StreamTextResult<Record<string, CoreTool>, TOutput>,
    schema: ZodSchema,
  ): AsyncIterable<StreamOutput<TOutput>> {
    if (schema instanceof z.ZodString) {
      if (!stream.textStream) {
        throw new Error('Expected text stream but received undefined');
      }
      return stream.textStream as AsyncIterable<StreamOutput<TOutput>>;
    }
    return stream.experimental_partialOutputStream as AsyncIterable<
      StreamOutput<TOutput>
    >;
  }

  /**
   * Processes the output from generateText based on the schema type.
   *
   * @param result - The result from generateText
   * @param schema - The output schema
   * @returns Processed output matching the schema type
   */
  private processOutput(result: any, schema: ZodSchema): TOutput {
    const isStringSchema = schema instanceof z.ZodString;
    const isPrimitiveSchema =
      schema instanceof z.ZodBoolean || schema instanceof z.ZodNumber;

    if (isStringSchema) {
      return result.text as TOutput;
    }

    if (isPrimitiveSchema) {
      return result.experimental_output.value as TOutput;
    }

    return result.experimental_output as TOutput;
  }

  /**
   * Runs the agent with the given input and returns the output.
   *
   * @param input - The input (user prompt) to process
   * @returns Promise resolving to the processed output
   * @throws {Error} If input validation fails or processing errors occur
   */
  async run(input: TInput): Promise<TOutput> {
    return this.telemetry.withSpan('run', async () => {
      return this.withErrorHandling(async () => {
        const config = await this.createConfig(input);
        const result = await generateText(config);
        return this.processOutput(result, this.getOutputSchema());
      });
    });
  }

  /**
   * Streams the agent's response for the given input.
   *
   * @param input - The input (user prompt) to process
   * @returns Promise resolving to an enhanced stream result
   * @throws {Error} If input validation fails or processing errors occur
   */
  async stream(input: TInput): Promise<StreamResult<TOutput>> {
    return this.telemetry.withSpan('streamRun', async () => {
      return this.withErrorHandling(async () => {
        const config = await this.createConfig(input);
        const rawStream = await (streamText(config) as unknown as Promise<
          StreamTextResult<Record<string, CoreTool>, TOutput>
        >);

        return {
          stream: this.processStream(rawStream, this.getOutputSchema()),
          raw: rawStream,
        };
      });
    });
  }
}
