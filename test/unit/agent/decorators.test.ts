import { z } from 'zod';
import { model, input, output, systemPrompt, tool } from '../../../src/agent';
import { META_KEYS } from '../../../src/agent/meta-keys';
import { schema } from '../../../src/schema';

describe('Decorators', () => {
  describe('@model', () => {
    it('should store model identifier in metadata', () => {
      // Test class
      @model('openai:gpt-4')
      class TestClass {}

      // Verify metadata
      const metadata = Reflect.getMetadata(META_KEYS.MODEL, TestClass);
      expect(metadata).toBe('openai:gpt-4');
    });

    it('should store model configuration in metadata when provided', () => {
      const config = {
        maxTokens: 100,
        temperature: 0.5,
        maxRetries: 3,
        maxSteps: 3,
        toolChoice: 'auto' as const,
      };

      @model('openai:gpt-4', config)
      class TestClass {}

      // Verify model identifier
      const modelMetadata = Reflect.getMetadata(META_KEYS.MODEL, TestClass);
      expect(modelMetadata).toBe('openai:gpt-4');

      // Verify configuration
      const configMetadata = Reflect.getMetadata(
        META_KEYS.MODEL_CONFIG,
        TestClass,
      );
      expect(configMetadata).toEqual(config);
    });

    it('should store partial model configuration correctly', () => {
      const partialConfig = {
        maxTokens: 100,
        maxRetries: 3,
        toolChoice: 'auto' as const,
      };

      @model('openai:gpt-4', partialConfig)
      class TestClass {}

      const configMetadata = Reflect.getMetadata(
        META_KEYS.MODEL_CONFIG,
        TestClass,
      );
      expect(configMetadata).toEqual(partialConfig);
      expect(configMetadata.temperature).toBeUndefined();
      expect(configMetadata.maxSteps).toBeUndefined();
    });

    it('should not store model configuration when not provided', () => {
      @model('openai:gpt-4')
      class TestClass {}

      const configMetadata = Reflect.getMetadata(
        META_KEYS.MODEL_CONFIG,
        TestClass,
      );
      expect(configMetadata).toBeUndefined();
    });
  });

  describe('@input/@output', () => {
    it('should store Zod schema in metadata', () => {
      const testSchema = z.object({ test: z.string() });

      @input(testSchema)
      @output(testSchema)
      class TestClass {}

      const inputMetadata = Reflect.getMetadata(META_KEYS.INPUT, TestClass);
      const outputMetadata = Reflect.getMetadata(META_KEYS.OUTPUT, TestClass);

      expect(inputMetadata).toBe(testSchema);
      expect(outputMetadata).toBe(testSchema);
    });

    it('should handle invalid type specification with proper error message', () => {
      // Create an object without a name property
      const invalidType = {};

      expect(() => {
        @input(invalidType as any)
        class TestClass {}
      }).toThrow(
        '@input error: Could not create a schema for "[object Object]". Type must be a Zod schema, a class decorated with @schema, or a primitive constructor (String, Number, Boolean).',
      );
    });

    it('should handle primitive types', () => {
      @input(String)
      @output(Number)
      class TestClass {}

      const inputMetadata = Reflect.getMetadata(META_KEYS.INPUT, TestClass);
      const outputMetadata = Reflect.getMetadata(META_KEYS.OUTPUT, TestClass);

      expect(inputMetadata).toBeInstanceOf(z.ZodString);
      expect(outputMetadata).toBeInstanceOf(z.ZodNumber);
    });

    it('should handle schema-decorated classes', () => {
      @schema()
      class TestSchema {
        field!: string;
      }

      @input(TestSchema)
      @output(TestSchema)
      class TestClass {}

      const inputMetadata = Reflect.getMetadata(META_KEYS.INPUT, TestClass);
      const outputMetadata = Reflect.getMetadata(META_KEYS.OUTPUT, TestClass);

      expect(inputMetadata).toBeInstanceOf(z.ZodObject);
      expect(outputMetadata).toBeInstanceOf(z.ZodObject);
    });

    it('should throw for invalid type specifications', () => {
      class InvalidType {}

      expect(() => {
        @input(InvalidType)
        class TestClass {}
      }).toThrow();

      expect(() => {
        @output(InvalidType)
        class TestClass {}
      }).toThrow();
    });
  });

  describe('@systemPrompt', () => {
    it('should store static prompt in metadata', () => {
      @systemPrompt('Test prompt')
      class TestClass {}

      const prompts = Reflect.getMetadata(META_KEYS.SYSTEM_PROMPTS, TestClass);
      expect(prompts).toHaveLength(1);
      expect(prompts[0]()).resolves.toBe('Test prompt');
    });

    it('should store method-based prompt in metadata', () => {
      class TestClass {
        @systemPrompt()
        async getPrompt() {
          return 'Dynamic prompt';
        }
      }

      const prompts = Reflect.getMetadata(META_KEYS.SYSTEM_PROMPTS, TestClass);
      expect(prompts).toHaveLength(1);
    });

    it('should combine multiple prompts in order', () => {
      @systemPrompt('Static prompt')
      class TestClass {
        @systemPrompt()
        async getPrompt1() {
          return 'Dynamic prompt 1';
        }

        @systemPrompt()
        async getPrompt2() {
          return 'Dynamic prompt 2';
        }
      }

      const prompts = Reflect.getMetadata(META_KEYS.SYSTEM_PROMPTS, TestClass);
      expect(prompts).toHaveLength(3);
    });

    it('should throw for non-string returning methods', async () => {
      class TestClass {
        @systemPrompt()
        async invalidPrompt() {
          return 123;
        }
      }

      const instance = new TestClass();
      const prompts = Reflect.getMetadata(META_KEYS.SYSTEM_PROMPTS, TestClass);
      // Update the expected error message to match exactly
      await expect(prompts[0].call(instance)).rejects.toThrow(
        "Method 'invalidPrompt' decorated with @systemPrompt must return a string.",
      );
    });

    it('should throw when applied to a property', () => {
      class TestClass {} // Define the class first
      const decorator = systemPrompt();
      expect(() => {
        decorator(TestClass.prototype, 'prompt', {
          configurable: true,
          enumerable: true,
        } as PropertyDescriptor);
      }).toThrow('@systemPrompt can only be applied to methods');
    });
  });

  describe('@tool', () => {
    it('should store tool metadata with explicit schema', () => {
      class TestClass {
        @tool('Test tool', z.object({ param: z.string() }))
        async testTool(param: string) {
          return param;
        }
      }

      const tools = Reflect.getMetadata(META_KEYS.TOOLS, TestClass);
      expect(tools).toHaveLength(1);
      expect(tools[0]).toMatchObject({
        name: 'testTool',
        description: 'Test tool',
        method: 'testTool',
      });
      expect(tools[0].parameters).toBeInstanceOf(z.ZodObject);
    });

    it('should handle schema-decorated parameter class', () => {
      @schema()
      class TestParams {
        param!: string;
      }

      class TestClass {
        @tool('Test tool')
        async testTool(params: TestParams) {
          return params.param;
        }
      }

      const tools = Reflect.getMetadata(META_KEYS.TOOLS, TestClass);
      expect(tools[0].parameters).toBeInstanceOf(z.ZodObject);
    });

    it('should handle methods with no parameters', () => {
      class TestClass {
        @tool('Test tool')
        async testTool() {
          return 'result';
        }
      }

      const tools = Reflect.getMetadata(META_KEYS.TOOLS, TestClass);
      expect(tools[0].parameters).toBeInstanceOf(z.ZodObject);
      expect(Object.keys(tools[0].parameters.shape)).toHaveLength(0);
    });

    it('should throw when schema class is provided but not decorated with @schema', () => {
      class UnDecoratedSchema {
        field!: string;
      }

      expect(() => {
        class TestClass {
          @tool('Test tool', UnDecoratedSchema)
          async testTool(params: UnDecoratedSchema) {
            return params.field;
          }
        }
      }).toThrow(
        'must be either a Zod schema or a class decorated with @schema',
      );
    });

    it('should throw when parameter type is not a valid class or constructor', () => {
      // Create a non-constructable type
      const nonConstructableType = Object.create(null);
      nonConstructableType.name = 'InvalidType';

      // Mock Reflect.getMetadata to return our invalid type
      const originalGetMetadata = Reflect.getMetadata;
      Reflect.getMetadata = jest
        .fn()
        .mockImplementation((key, target, prop) => {
          if (key === 'design:paramtypes') {
            return [nonConstructableType];
          }
          return originalGetMetadata(key, target, prop);
        });

      try {
        expect(() => {
          class TestClass {
            @tool('Test tool')
            async testTool(param: any) {
              return param;
            }
          }
        }).toThrow('is not a valid class or constructor');
      } finally {
        // Restore original Reflect.getMetadata
        Reflect.getMetadata = originalGetMetadata;
      }
    });

    it('should support primitive string parameters', async () => {
      class TestClass {
        @tool('Test tool')
        async testTool(param: string) {
          return param.toUpperCase();
        }
      }

      const instance = new TestClass();
      // Primitive params are wrapped in { input: value }
      await expect(instance.testTool({ input: 'test' } as any)).resolves.toBe(
        'TEST',
      );
    });

    it('should validate inputs at runtime', async () => {
      class TestClass {
        @tool('Test tool', z.object({ param: z.string() }))
        async testTool(params: { param: string }) {
          return params.param;
        }
      }

      const instance = new TestClass();
      // Test valid input
      await expect(instance.testTool({ param: 'test' })).resolves.toBe('test');

      // Test invalid input - expect Zod validation error
      try {
        await instance.testTool({ param: 123 as any });
        fail('Should have thrown a validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
        expect((error as z.ZodError).errors[0].message).toBe(
          'Expected string, received number',
        );
      }
    });

    it('should throw when applied to a property', () => {
      class TestClass {}
      const decorator = tool('Test tool');
      expect(() => {
        decorator(TestClass.prototype, 'toolProperty', {
          configurable: true,
          enumerable: true,
          writable: true,
          value: undefined,
        } as PropertyDescriptor);
      }).toThrow('@tool can only be applied to methods');
    });

    it('should throw when tool has multiple parameters', () => {
      expect(() => {
        class TestClass {
          @tool('Test tool')
          async testTool(param1: string, param2: string) {
            return param1 + param2;
          }
        }
      }).toThrow('Expected a single parameter');
    });

    it('should support primitive number parameters', async () => {
      class TestClass {
        @tool('Test tool')
        async testTool(param: number) {
          return param * 2;
        }
      }

      const instance = new TestClass();
      // Primitive params are wrapped in { input: value }
      await expect(instance.testTool({ input: 5 } as any)).resolves.toBe(10);
    });

    it('should throw when parameter type is unsupported (Symbol)', () => {
      expect(() => {
        class TestClass {
          @tool('Test tool')
          async testTool(param: symbol) {
            return param;
          }
        }
      }).toThrow('is not supported');
    });

    it('should throw with properly formatted error for undecorated parameter class', () => {
      class UnDecoratedParams {
        param!: string;
      }

      expect(() => {
        class TestClass {
          @tool('Test tool')
          async myCustomTool(params: UnDecoratedParams) {
            return params.param;
          }
        }
      }).toThrow(
        '@tool decorator on myCustomTool requires an explicit Zod schema or a parameter class decorated with @schema',
      );
    });
  });
});
