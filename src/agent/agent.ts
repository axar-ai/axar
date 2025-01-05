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

// Base agent that handles core functionality
export abstract class Agent<TInput = string, TOutput = any> {
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
      console.warn(
        `No output schema found for ${this.constructor.name}. ` +
          `Did you forget to apply @output decorator? ` +
          `Falling back to string schema.`,
      );
      return z.string();
    }

    return schema;
  }

  async run(input: TInput): Promise<TOutput> {
    const model = await this.getModel();
    const tools = this.getTools();
    const schema = this.getOutputSchema();

    const systemPrompts = await Promise.all(
      this.getSystemPrompts().map((fn) => fn.call(this)),
    );

    const messages = [
      { role: 'system', content: systemPrompts.join('\n\n') },
      { role: 'user', content: String(input) },
    ] as CoreMessage[];

    const baseConfig = {
      model: model,
      messages: messages,
      tools: tools,
      // FIXME: this needs to be configurable
      maxSteps: 3,
    };

    // Check if schema is for string then use plain text result
    if (schema instanceof z.ZodString) {
      const result = await generateText(baseConfig);
      return result.text as TOutput;
    }

    // For all other cases (including primitives and complex types)
    const result = await generateText({
      ...baseConfig,
      experimental_output: Output.object({
        schema: schema,
      }),
    });

    // For primitive types (boolean, number), return .value
    if (schema instanceof z.ZodBoolean || schema instanceof z.ZodNumber) {
      return result.experimental_output.value as TOutput;
    }

    // For complex types, return the whole object
    return result.experimental_output as TOutput;
  }

  // Stream method for streaming responses
  // async stream(input: TInput): Promise<StreamingTextResponse> {
  //   // Similar to run() but uses streamText from AI SDK
  //   // Implementation would follow AI SDK streaming patterns
  //   throw new Error("Streaming not yet implemented");
  // }
}
