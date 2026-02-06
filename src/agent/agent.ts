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
  ModelConfig,
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
   * Gets the model config configured through the @model decorator.
   *
   * @returns The model config
   */
  protected getModelConfig(): ModelConfig {
    return Agent.getMetadata<ModelConfig>(
      META_KEYS.MODEL_CONFIG,
      this.constructor,
      {},
    );
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
    const modelConfig = this.getModelConfig();
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
      maxSteps: modelConfig?.maxSteps ?? 3,
      maxTokens: modelConfig?.maxTokens,
      temperature: modelConfig?.temperature,
      topP: modelConfig?.topP,
      topK: modelConfig?.topK,
      presencePenalty: modelConfig?.presencePenalty,
      frequencyPenalty: modelConfig?.frequencyPenalty,
      maxRetries: modelConfig?.maxRetries,
      toolChoice: modelConfig?.toolChoice,
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
   * @example
   * ```typescript
   * // Simple text input/output
   * const agent = new SimpleAgent();
   * const response = await agent.run("What is TypeScript?");
   * console.log(response); // "TypeScript is a typed superset of JavaScript..."
   *
   * // Structured input/output
   * const greetingAgent = new GreetingAgent();
   * const response = await greetingAgent.run({
   *   userName: "Alice",
   *   userMood: "happy",
   *   dayOfWeek: "Saturday"
   * });
   * console.log(response); // { greeting: "Hello Alice!", moodResponse: "..." }
   * ```
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
   * Streams the agent's response for the given input. Useful for real-time UI updates
   * or processing long responses chunk by chunk.
   *
   * @example
   * ```typescript
   * // Simple text streaming
   * const agent = new SimpleAgent();
   * const { stream } = await agent.stream("What is TypeScript?");
   * for await (const chunk of stream) {
   *   process.stdout.write(chunk); // Chunks: "Type" ... "Script" ... "is a" ...
   * }
   *
   * // Structured output streaming
   * const greetingAgent = new GreetingAgent();
   * const { stream } = await greetingAgent.stream({
   *   userName: "Alice",
   *   userMood: "happy"
   * });
   * for await (const chunk of stream) {
   *   console.log(chunk); // Partial objects that build up the complete response
   * }
   * ```
   *
   * @param input - The input (user prompt) to process
   * @returns Promise resolving to an enhanced stream result containing the output stream
   * @throws {Error} If input validation fails or processing errors occur
   */
  async stream(input: TInput): Promise<StreamResult<TOutput>> {
    return this.telemetry.withSpan('streamRun', async () => {
      return this.withErrorHandling(async () => {
        const config = await this.createConfig(input);
        const rawStream = streamText(config) as StreamTextResult<
          Record<string, CoreTool>,
          TOutput
        >;
        return {
          stream: this.processStream(rawStream, this.getOutputSchema()),
          raw: rawStream,
        };
      });
    });
  }
}

/**
 * `model` decorator to associate a model identifier and configuration with an agent.
 *
 * @param modelIdentifier - The model identifier string (e.g., 'openai:gpt-4-mini')
 * @param config - Optional configuration for the model
 * @param config.maxTokens - Maximum number of tokens to generate
 * @param config.temperature - Sampling temperature between 0 and 1. Use either temperature or topP, not both.
 * @param config.topP - Nucleus sampling threshold. Sample from tokens whose cumulative probability exceeds topP. Use either temperature or topP, not both.
 * @param config.topK - Only sample from the top K options for each subsequent token. Recommended for advanced use cases only.
 * @param config.presencePenalty - Penalize tokens based on their presence in the prompt and generated text. Value between -2.0 and 2.0.
 * @param config.frequencyPenalty - Penalize tokens based on their frequency in the generated text. Value between -2.0 and 2.0.
 * @param config.maxRetries - Maximum number of retries for failed requests (defaults to 2 in SDK)
 * @param config.maxSteps - Maximum number of steps for tool calling (defaults to 3)
 * @param config.toolChoice - Tool choice mode - 'auto' or 'none'
 * @returns A class decorator function
 *
 * @example
 * ```typescript
 * // Basic usage
 * @model('openai:gpt-4-mini')
 * class MyAgent extends Agent<string, string> {}
 *
 * // With configuration
 * @model('openai:gpt-4-mini', {
 *   maxTokens: 100,    // limit response length
 *   temperature: 0.7,  // control randomness
 *   maxRetries: 3,     // retry failed requests
 *   maxSteps: 5,       // allow multi-step tool calling
 *   toolChoice: 'auto' // enable automatic tool selection
 * })
 * class MyConfiguredAgent extends Agent<string, string> {}
 *
 * // With advanced sampling parameters
 * @model('openai:gpt-4-mini', {
 *   topP: 0.9,              // nucleus sampling
 *   topK: 50,               // top-k sampling
 *   presencePenalty: 0.6,   // reduce repetition
 *   frequencyPenalty: 0.5   // reduce common tokens
 * })
 * class CreativeAgent extends Agent<string, string> {}
 * ```
 */
