import { Agent, model, output, systemPrompt, tool } from '../../../src/agent';
import { z } from 'zod';
import { logger } from '../../../src/common';
import { CoreTool, ToolExecutionOptions, LanguageModelV1 } from 'ai';

jest.mock('ai', () => {
  const generateText = jest.fn();
  return {
    generateText,
    Output: {
      object: jest.fn((config) => config),
    },
  };
});

jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn((modelName) => modelName),
}));

const generateTextMock = require('ai').generateText;

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

// Mock the model-factory
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

describe('Agent', () => {
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

  describe('getModel', () => {
    it('should retrieve configured model from class metadata', async () => {
      const model = await agent['getModel']();
      expect(model).toEqual({
        specificationVersion: 'v1',
        provider: 'openai',
        modelId: 'gpt-4o-mini',
        defaultObjectGenerationMode: 'json',
        doGenerate: expect.any(Function),
        doStream: expect.any(Function),
      });
    });

    it('should throw error when model decorator is missing', async () => {
      class UnDecoratedAgent extends Agent<any, SupportResponse> {}
      const undecoratedAgent = new UnDecoratedAgent();
      await expect(undecoratedAgent['getModel']()).rejects.toThrow(
        'Model metadata not found. Please apply @model decorator.',
      );
    });
  });

  describe('getTools', () => {
    it('should format tool metadata with description and parameters', () => {
      const tools = agent['getTools']();
      expect(tools).toHaveProperty('customerBalance');

      const customerBalanceTool = tools['customerBalance'] as {
        description: string;
        parameters: unknown;
        execute: (...args: any[]) => Promise<number>;
      };

      expect(customerBalanceTool.description).toBe(
        "Get customer's current balance",
      );
    });

    it('should execute tool method correctly', async () => {
      const tools = agent['getTools']();
      expect(tools).toHaveProperty('customerBalance');

      const customerBalanceTool = tools['customerBalance'] as CoreTool;
      expect(customerBalanceTool.execute).toBeDefined();

      const options: ToolExecutionOptions = {
        toolCallId: 'test-call',
        messages: [],
      };

      // Call execute with the correct arguments
      const result = await customerBalanceTool.execute!(
        {
          includePending: true,
          customerName: 'John',
        },
        options,
      );
      expect(result).toBe(123.45);
    });

    it('should return empty object when no tools are configured', () => {
      class NoToolsAgent extends Agent<any, any> {}
      const noToolsAgent = new NoToolsAgent();
      const tools = noToolsAgent['getTools']();
      expect(tools).toEqual({});
    });
  });

  describe('getSystemPrompts', () => {
    it('should combine static and dynamic system prompts', async () => {
      const prompts = await Promise.all(
        agent['getSystemPrompts']().map((fn) => fn()),
      );
      expect(prompts).toEqual([
        '\n' +
          '      You are a support agent in our bank. \n' +
          '      Give the customer support and judge the risk level of their query.\n' +
          "      Reply using the customer's name.\n" +
          '    ',
        'Customer ID: Sudipta',
      ]);
    });
  });

  describe('getOutputSchema', () => {
    it('should return the validation schema from metadata', () => {
      const schema = agent['getOutputSchema']();
      expect(schema).toEqual(SupportResponseSchema);
    });

    it('should return string schema when output schema is not defined', () => {
      class UnDecoratedAgent extends Agent<any, SupportResponse> {}
      const undecoratedAgent = new UnDecoratedAgent();
      const schema = undecoratedAgent['getOutputSchema']();
      expect(schema.constructor.name).toBe('ZodString');
    });
  });

  describe('serializeInput', () => {
    describe('primitive handling', () => {
      it('should serialize string input directly', () => {
        const result = agent['serializeInput']('test input', undefined);
        expect(result).toBe('test input');
      });

      it('should convert number to string', () => {
        const result = agent['serializeInput'](123, undefined);
        expect(result).toBe('123');
      });

      it('should convert boolean to string', () => {
        const result = agent['serializeInput'](true, undefined);
        expect(result).toBe('true');
      });

      it('should handle null value', () => {
        const result = agent['serializeInput'](null, undefined);
        expect(result).toBe('null');
      });

      it('should handle undefined value', () => {
        const result = agent['serializeInput'](undefined, undefined);
        expect(result).toBe('undefined');
      });
    });

    describe('object handling', () => {
      it('should stringify valid objects', () => {
        const input = { key: 'value', nested: { foo: 'bar' } };
        const result = agent['serializeInput'](input, undefined);
        expect(result).toBe(JSON.stringify(input));
      });

      it('should throw error for non-serializable objects', () => {
        const circularObj: any = {};
        circularObj.self = circularObj;
        expect(() => agent['serializeInput'](circularObj, undefined)).toThrow(
          'Failed to serialize input',
        );
      });

      it('should handle non-Error objects in serialization errors', () => {
        // Mock JSON.stringify to throw a string error
        const originalStringify = JSON.stringify;
        JSON.stringify = jest.fn().mockImplementation(() => {
          throw 'Some string error';
        });

        try {
          expect(() =>
            agent['serializeInput']({ test: 'value' }, undefined),
          ).toThrow('Failed to serialize input: Unknown error');
        } finally {
          JSON.stringify = originalStringify;
        }
      });

      it('should warn when serializing object without schema', () => {
        const loggerSpy = jest.spyOn(logger, 'warn');
        agent['serializeInput']({ test: 'value' }, undefined);
        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('No input schema found for TestAgent'),
        );
      });
    });

    describe('schema validation', () => {
      it('should pass validation for valid input', () => {
        const schema = z.object({ key: z.string() });
        const validInput = { key: 'value' };
        expect(() => agent['serializeInput'](validInput, schema)).not.toThrow();
      });

      it('should throw for invalid input', () => {
        const schema = z.object({ key: z.string() });
        const invalidInput = { key: 123 };
        expect(() => agent['serializeInput'](invalidInput, schema)).toThrow();
      });
    });
  });

  describe('run', () => {
    it('should handle primitive output types correctly', async () => {
      const booleanSchema = z.boolean();
      jest
        .spyOn(agent as any, 'getOutputSchema')
        .mockReturnValue(booleanSchema);
      generateTextMock.mockResolvedValue({
        experimental_output: { value: true },
      });

      const result = await agent.run('input');
      expect(result).toBe(true);
    });

    it('should handle number output type', async () => {
      const numberSchema = z.number();
      jest.spyOn(agent as any, 'getOutputSchema').mockReturnValue(numberSchema);
      generateTextMock.mockResolvedValue({
        experimental_output: { value: 42 },
      });

      const result = await agent.run('input');
      expect(result).toBe(42);
    });

    it('should handle array output type', async () => {
      const arraySchema = z.array(z.string());
      jest.spyOn(agent as any, 'getOutputSchema').mockReturnValue(arraySchema);
      const mockOutput = ['item1', 'item2'];
      generateTextMock.mockResolvedValue({
        experimental_output: mockOutput,
      });

      const result = await agent.run('input');
      expect(result).toEqual(mockOutput);
    });

    it('should handle telemetry attributes correctly', async () => {
      const telemetrySpy = jest.spyOn(agent['telemetry'], 'addAttribute');
      await agent.run('input');

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

    it('should handle string output type', async () => {
      const stringSchema = z.string();
      jest.spyOn(agent as any, 'getOutputSchema').mockReturnValue(stringSchema);
      generateTextMock.mockResolvedValue({
        text: 'response text',
      });

      const result = await agent.run('input');
      expect(result).toBe('response text');
    });

    it('should combine multiple system prompts correctly', async () => {
      const prompts = ['System prompt 1', 'System prompt 2'];
      jest
        .spyOn(agent as any, 'getSystemPrompts')
        .mockReturnValue([async () => prompts[0], async () => prompts[1]]);

      await agent.run('input');

      expect(generateTextMock).toHaveBeenCalledWith(
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

    it('should pass tools to generateText correctly', async () => {
      const mockTools = {
        tool1: {
          description: 'Test tool',
          parameters: { type: 'object' },
          execute: jest.fn(),
        },
      };
      jest.spyOn(agent as any, 'getTools').mockReturnValue(mockTools);

      await agent.run('input');

      expect(generateTextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: mockTools,
        }),
      );
    });

    it('should handle errors from generateText', async () => {
      generateTextMock.mockRejectedValue(new Error('API Error'));
      await expect(agent.run('input')).rejects.toThrow('API Error');
    });

    it('should configure experimental_output correctly for complex types', async () => {
      const complexSchema = z.object({
        field1: z.string(),
        field2: z.number(),
      });
      jest
        .spyOn(agent as any, 'getOutputSchema')
        .mockReturnValue(complexSchema);

      // Mock successful response from generateText
      generateTextMock.mockResolvedValue({
        experimental_output: {
          field1: 'test',
          field2: 123,
        },
      });

      await agent.run('input');

      expect(generateTextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          experimental_output: expect.objectContaining({
            schema: complexSchema,
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
      const generateTextSpy = jest.spyOn(require('ai'), 'generateText');

      await configuredAgent.run('test input');

      expect(generateTextSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: config.maxTokens,
          temperature: config.temperature,
          maxRetries: config.maxRetries,
          maxSteps: config.maxSteps,
          toolChoice: config.toolChoice,
        }),
      );
    });

    it('should use advanced sampling parameters when provided', async () => {
      const advancedConfig = {
        topP: 0.9,
        topK: 50,
        presencePenalty: 0.6,
        frequencyPenalty: 0.5,
      };

      @model('openai:gpt-4o-mini', advancedConfig)
      class AdvancedConfigAgent extends Agent<string, string> {}

      const advancedConfigAgent = new AdvancedConfigAgent();
      const generateTextSpy = jest.spyOn(require('ai'), 'generateText');

      await advancedConfigAgent.run('test input');

      expect(generateTextSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          topP: advancedConfig.topP,
          topK: advancedConfig.topK,
          presencePenalty: advancedConfig.presencePenalty,
          frequencyPenalty: advancedConfig.frequencyPenalty,
        }),
      );
    });

    it('should use full model configuration with all parameters', async () => {
      const fullConfig = {
        maxTokens: 200,
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        presencePenalty: 0.3,
        frequencyPenalty: 0.4,
        maxRetries: 2,
        maxSteps: 5,
        toolChoice: 'auto' as const,
      };

      @model('openai:gpt-4o-mini', fullConfig)
      class FullConfigAgent extends Agent<string, string> {}

      const fullConfigAgent = new FullConfigAgent();
      const generateTextSpy = jest.spyOn(require('ai'), 'generateText');

      await fullConfigAgent.run('test input');

      expect(generateTextSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: fullConfig.maxTokens,
          temperature: fullConfig.temperature,
          topP: fullConfig.topP,
          topK: fullConfig.topK,
          presencePenalty: fullConfig.presencePenalty,
          frequencyPenalty: fullConfig.frequencyPenalty,
          maxRetries: fullConfig.maxRetries,
          maxSteps: fullConfig.maxSteps,
          toolChoice: fullConfig.toolChoice,
        }),
      );
    });

    it('should use default maxSteps when not provided in config', async () => {
      const generateTextSpy = jest.spyOn(require('ai'), 'generateText');
      await agent.run('test input');

      expect(generateTextSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          maxSteps: 3, // default value
        }),
      );
    });
  });

  describe('getInputSchema', () => {
    it('should return undefined when no input schema is configured', () => {
      class UnDecoratedAgent extends Agent<any, SupportResponse> {}
      const undecoratedAgent = new UnDecoratedAgent();
      expect(undecoratedAgent['getInputSchema']()).toBeUndefined();
    });

    it('should return configured input schema', () => {
      const mockSchema = z.string();
      jest.spyOn(Reflect, 'getMetadata').mockReturnValue(mockSchema);
      expect(agent['getInputSchema']()).toBe(mockSchema);
    });
  });

  describe('addTelemetry', () => {
    it('should handle undefined inputSchema', () => {
      const telemetrySpy = jest.spyOn(agent['telemetry'], 'addAttribute');
      const model = {
        modelId: 'test-model',
        provider: 'test-provider',
      } as LanguageModelV1;
      const tools = {};
      const outputSchema = z.string();

      agent['addTelemetry'](model, tools, outputSchema, undefined);

      expect(telemetrySpy).toHaveBeenCalledWith(
        'agent.model',
        'test-model:test-provider',
      );
      expect(telemetrySpy).toHaveBeenCalledWith('agent.tools', []);
      expect(telemetrySpy).toHaveBeenCalledWith(
        'agent.output_schema',
        outputSchema,
      );
      expect(telemetrySpy).toHaveBeenCalledWith(
        'agent.input_schema',
        undefined,
      );
    });
  });

  describe('getModelConfig', () => {
    it('should return empty object when no config is provided', () => {
      @model('openai:gpt-4o-mini')
      class NoConfigAgent extends Agent<string, string> {}

      const noConfigAgent = new NoConfigAgent();
      const config = noConfigAgent['getModelConfig']();
      expect(config).toEqual({});
    });

    it('should return full config when provided', () => {
      const fullConfig = {
        maxTokens: 100,
        temperature: 0.5,
        maxRetries: 3,
        maxSteps: 3,
        toolChoice: 'auto' as const,
      };

      @model('openai:gpt-4o-mini', fullConfig)
      class FullConfigAgent extends Agent<string, string> {}

      const fullConfigAgent = new FullConfigAgent();
      const config = fullConfigAgent['getModelConfig']();
      expect(config).toEqual(fullConfig);
    });

    it('should return partial config with undefined values', () => {
      const partialConfig = {
        maxTokens: 100,
        maxRetries: 3,
      };

      @model('openai:gpt-4o-mini', partialConfig)
      class PartialConfigAgent extends Agent<string, string> {}

      const partialConfigAgent = new PartialConfigAgent();
      const config = partialConfigAgent['getModelConfig']();
      expect(config).toEqual(partialConfig);
      expect(config.temperature).toBeUndefined();
      expect(config.maxSteps).toBeUndefined();
      expect(config.toolChoice).toBeUndefined();
    });
  });
});
