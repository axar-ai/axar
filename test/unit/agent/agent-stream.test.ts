import { Agent, model, output, systemPrompt, tool } from '../../../src/agent';
import { z } from 'zod';
import { CoreTool, ToolExecutionOptions } from 'ai';

jest.mock('ai', () => {
  const streamText = jest.fn();
  return {
    streamText,
    Output: {
      object: jest.fn((config) => config),
    },
  };
});

jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn((modelName) => modelName),
}));

const streamTextMock = require('ai').streamText;

const SupportResponseSchema = z.object({
  support_advice: z
    .string()
    .describe('Human-readable advice to give to the customer.'),
  block_card: z.boolean().describe("Whether to block customer's card."),
  risk: z.number().min(0).max(1).describe('Risk level of query'),
  status: z
    .enum(['Happy', 'Sad', 'Neutral'])
    .optional()
    .describe("Customer's emotional state"),
});

type SupportResponse = z.infer<typeof SupportResponseSchema>;

// Mock the model-factory (same as in agent.test.ts)
jest.mock('../../../src/llm/model-factory', () => ({
  getModel: jest.fn().mockImplementation(async (providerModel: string) => {
    if (!providerModel) {
      throw new Error(
        'Model metadata not found. Please apply @model decorator.',
      );
    }
    if (providerModel === 'openai:gpt-4o-mini') {
      return {
        specificationVersion: 'v1',
        provider: 'openai',
        modelId: 'gpt-4o-mini',
        defaultObjectGenerationMode: 'json',
        doGenerate: jest.fn(),
        doStream: jest.fn(),
      };
    }
    throw new Error('Provider and model metadata not found.');
  }),
}));

describe('Agent Streaming', () => {
  @model('openai:gpt-4o-mini')
  @output(SupportResponseSchema)
  @systemPrompt(`
      You are a support agent in our bank. 
      Give the customer support and judge the risk level of their query.
      Reply using the customer's name.
    `)
  class TestAgent extends Agent<any, SupportResponse> {
    constructor(private customerId: number) {
      super();
    }

    @systemPrompt()
    async getCustomerContext(): Promise<string> {
      const name = 'Sudipta';
      return `Customer ID: ${name}`;
    }

    @tool(
      "Get customer's current balance",
      z.object({
        includePending: z.boolean().optional(),
        customerName: z.string(),
      }),
    )
    async customerBalance(
      includePending: boolean,
      customerName: string,
    ): Promise<number> {
      return 123.45;
    }
  }

  let agent: TestAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    agent = new TestAgent(1);
  });

  describe('streamRun', () => {
    it('should handle string output type correctly', async () => {
      const stringSchema = z.string();
      jest.spyOn(agent as any, 'getOutputSchema').mockReturnValue(stringSchema);

      const mockStream = {
        text: 'streaming response',
        textStream: createAsyncIterable(['chunk1', 'chunk2']),
        fullStream: createAsyncIterable(['event1', 'event2']),
        experimental_output: { value: 'streaming response' },
        experimental_partialOutputStream: createAsyncIterable([
          'chunk1',
          'chunk2',
        ]),
      };
      streamTextMock.mockReturnValue(mockStream);

      const result = await agent.stream('input');

      // Check stream result structure
      expect(result).toHaveProperty('stream');
      expect(result).toHaveProperty('raw');

      // Check processed stream
      const chunks = [];
      for await (const chunk of result.stream) {
        chunks.push(chunk);
      }
      expect(chunks).toEqual(['chunk1', 'chunk2']);

      // Check raw stream access
      expect(result.raw).toBe(mockStream);
    });

    it('should handle complex output types correctly', async () => {
      const mockResponse: SupportResponse = {
        support_advice: 'Help the customer',
        block_card: false,
        risk: 0.1,
        status: 'Happy',
      };

      const mockStream = {
        text: JSON.stringify(mockResponse),
        textStream: createAsyncIterable(['{"support', '_advice": "Help']),
        fullStream: createAsyncIterable(['event1', 'event2']),
        experimental_output: mockResponse,
        experimental_partialOutputStream: createAsyncIterable([
          { support_advice: 'Help' },
          { support_advice: 'Help the customer', block_card: false },
          mockResponse,
        ]),
      };
      streamTextMock.mockReturnValue(mockStream);

      const result = await agent.stream('input');

      // Check stream result structure
      expect(result).toHaveProperty('stream');
      expect(result).toHaveProperty('raw');

      // Check processed stream (partial objects)
      const chunks = [];
      for await (const chunk of result.stream) {
        chunks.push(chunk);
      }
      expect(chunks).toEqual([
        { support_advice: 'Help' },
        { support_advice: 'Help the customer', block_card: false },
        mockResponse,
      ]);

      // Verify the final chunk has the complete type structure
      const finalChunk = chunks[chunks.length - 1] as SupportResponse;
      expect(finalChunk).toEqual(mockResponse);
      expect(typeof finalChunk.support_advice).toBe('string');
      expect(typeof finalChunk.block_card).toBe('boolean');
      expect(typeof finalChunk.risk).toBe('number');
      expect(finalChunk.risk).toBeGreaterThanOrEqual(0);
      expect(finalChunk.risk).toBeLessThanOrEqual(1);
      expect(['Happy', 'Sad', 'Neutral']).toContain(finalChunk.status);

      // Check raw stream access
      expect(result.raw).toBe(mockStream);
    });

    it('should handle primitive output types correctly', async () => {
      const numberSchema = z.number();
      jest.spyOn(agent as any, 'getOutputSchema').mockReturnValue(numberSchema);

      const mockStream = {
        text: '42',
        textStream: createAsyncIterable(['4', '42']),
        fullStream: createAsyncIterable(['event1', 'event2']),
        experimental_output: { value: 42 },
        experimental_partialOutputStream: createAsyncIterable([40, 42]),
      };
      streamTextMock.mockReturnValue(mockStream);

      const result = await agent.stream('input');

      // Check processed stream for primitive type
      const chunks = [];
      for await (const chunk of result.stream) {
        chunks.push(chunk);
      }
      expect(chunks).toEqual([40, 42]);

      // Check raw stream access
      expect(result.raw).toBe(mockStream);
    });

    it('should pass tools to streamText correctly', async () => {
      const mockTools = {
        tool1: {
          description: 'Test tool',
          parameters: { type: 'object' },
          execute: jest.fn(),
        },
      };
      jest.spyOn(agent as any, 'getTools').mockReturnValue(mockTools);

      const mockStream = {
        text: 'test',
        textStream: createAsyncIterable(['test']),
        fullStream: createAsyncIterable(['event']),
        experimental_output: { value: 'test' },
        experimental_partialOutputStream: createAsyncIterable(['test']),
      };
      streamTextMock.mockReturnValue(mockStream);

      await agent.stream('input');

      expect(streamTextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: mockTools,
        }),
      );
    });

    it('should handle telemetry attributes correctly', async () => {
      const telemetrySpy = jest.spyOn(agent['telemetry'], 'addAttribute');

      const mockStream = {
        text: 'test',
        textStream: createAsyncIterable(['test']),
        fullStream: createAsyncIterable(['event']),
        experimental_output: { value: 'test' },
        experimental_partialOutputStream: createAsyncIterable(['test']),
      };
      streamTextMock.mockReturnValue(mockStream);

      await agent.stream('input');

      expect(telemetrySpy).toHaveBeenCalledWith(
        'agent.model',
        'gpt-4o-mini:openai',
      );
      expect(telemetrySpy).toHaveBeenCalledWith(
        'agent.tools',
        expect.arrayContaining(['customerBalance']),
      );
      expect(telemetrySpy).toHaveBeenCalledWith(
        'agent.output_schema',
        expect.any(Object),
      );
      expect(telemetrySpy).toHaveBeenCalledWith(
        'agent.input_schema',
        undefined,
      );
    });

    it('should combine multiple system prompts correctly', async () => {
      const prompts = ['System prompt 1', 'System prompt 2'];
      jest
        .spyOn(agent as any, 'getSystemPrompts')
        .mockReturnValue([async () => prompts[0], async () => prompts[1]]);

      const mockStream = {
        text: 'test',
        textStream: createAsyncIterable(['test']),
        fullStream: createAsyncIterable(['event']),
        experimental_output: { value: 'test' },
        experimental_partialOutputStream: createAsyncIterable(['test']),
      };
      streamTextMock.mockReturnValue(mockStream);

      await agent.stream('input');

      expect(streamTextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            {
              role: 'system',
              content: prompts.join('\n\n'),
            },
          ]),
        }),
      );
    });

    it('should handle errors from streamText', async () => {
      const mockError = new Error('Streaming Error');
      streamTextMock.mockImplementation(() => {
        throw mockError;
      });

      const telemetrySpy = jest.spyOn(agent['telemetry'], 'addAttribute');

      await expect(agent.stream('input')).rejects.toThrow('Streaming Error');
      expect(telemetrySpy).toHaveBeenCalledWith('error', 'Streaming Error');
    });

    it('should configure maxSteps correctly', async () => {
      const mockStream = {
        text: 'test response',
        textStream: createAsyncIterable(['test response']),
        fullStream: createAsyncIterable(['event']),
        experimental_output: { value: 'test response' },
        experimental_partialOutputStream: createAsyncIterable([
          'test response',
        ]),
      };
      streamTextMock.mockReturnValue(mockStream);

      await agent.stream('input');

      expect(streamTextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          maxSteps: 3,
          model: expect.objectContaining({
            modelId: 'gpt-4o-mini',
            provider: 'openai',
            specificationVersion: 'v1',
          }),
          messages: expect.any(Array),
          tools: expect.any(Object),
        }),
      );
    });

    it('should handle stream interruption', async () => {
      const error = new Error('Stream interrupted');
      streamTextMock.mockImplementation(() => {
        throw error;
      });

      const telemetrySpy = jest.spyOn(agent['telemetry'], 'addAttribute');

      try {
        await agent.stream('input');
      } catch (e) {
        // Verify telemetry calls in order
        expect(telemetrySpy).toHaveBeenNthCalledWith(
          1,
          'agent.model',
          'gpt-4o-mini:openai',
        );
        expect(telemetrySpy).toHaveBeenNthCalledWith(2, 'agent.tools', [
          'customerBalance',
        ]);
        expect(telemetrySpy).toHaveBeenNthCalledWith(
          3,
          'agent.output_schema',
          expect.any(Object),
        );
        expect(telemetrySpy).toHaveBeenNthCalledWith(
          4,
          'agent.input_schema',
          undefined,
        );
        expect(telemetrySpy).toHaveBeenNthCalledWith(
          5,
          'error',
          'Stream interrupted',
        );
        expect(e).toEqual(error);
        return;
      }
      throw new Error('Expected streamRun to throw');
    });

    it('should validate input before streaming', async () => {
      const inputSchema = z.object({
        query: z.string(),
      });
      jest.spyOn(agent as any, 'getInputSchema').mockReturnValue(inputSchema);

      await expect(agent.stream({ query: 123 })).rejects.toThrow();
    });

    it('should handle experimental output configuration', async () => {
      const mockStream = {
        text: 'test',
        textStream: createAsyncIterable(['test']),
        fullStream: createAsyncIterable(['event']),
        experimental_output: {
          schema: SupportResponseSchema,
          value: {
            support_advice: 'Help the customer',
            block_card: false,
            risk: 0.1,
            status: 'Happy',
          },
        },
        experimental_partialOutputStream: createAsyncIterable([
          { support_advice: 'Help' },
        ]),
      };
      streamTextMock.mockReturnValue(mockStream);

      await agent.stream('input');

      expect(streamTextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          experimental_output: expect.objectContaining({
            schema: SupportResponseSchema,
          }),
        }),
      );
    });

    it('should use model configuration when provided', async () => {
      const config = {
        maxTokens: 100,
        temperature: 0.5,
        maxRetries: 3,
        maxSteps: 5,
        toolChoice: 'auto' as const,
      };

      @model('openai:gpt-4o-mini', config)
      class ConfiguredAgent extends Agent<string, string> {}

      const configuredAgent = new ConfiguredAgent();
      const mockStream = {
        text: 'test',
        textStream: createAsyncIterable(['test']),
        fullStream: createAsyncIterable(['event']),
        experimental_output: { value: 'test' },
        experimental_partialOutputStream: createAsyncIterable(['test']),
      };
      streamTextMock.mockReturnValue(mockStream);

      await configuredAgent.stream('test input');

      expect(streamTextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: config.maxTokens,
          temperature: config.temperature,
          maxRetries: config.maxRetries,
          maxSteps: config.maxSteps,
          toolChoice: config.toolChoice,
        }),
      );
    });

    it('should use default maxSteps when not provided in config', async () => {
      const mockStream = {
        text: 'test',
        textStream: createAsyncIterable(['test']),
        fullStream: createAsyncIterable(['event']),
        experimental_output: { value: 'test' },
        experimental_partialOutputStream: createAsyncIterable(['test']),
      };
      streamTextMock.mockReturnValue(mockStream);

      await agent.stream('test input');

      expect(streamTextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          maxSteps: 3, // default value
        }),
      );
    });

    // Helper function to create AsyncIterable for testing
    function createAsyncIterable<T>(items: T[]): AsyncIterable<T> {
      return {
        async *[Symbol.asyncIterator]() {
          for (const item of items) {
            yield item;
          }
        },
      };
    }
  });
});
