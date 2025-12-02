import { z } from 'zod';
import {
  jsonSchemaToZod,
  mcpToolToCoreTool,
  mcpToolsToCore,
  agentToCoreTool,
  agentToolsToCore,
} from '../../../src/mcp/tool-adapter';
import { MCPTool, AgentToolConfig, MCPClientManager } from '../../../src/mcp';

describe('Tool Adapter', () => {
  describe('jsonSchemaToZod', () => {
    it('should convert string type', () => {
      const schema = jsonSchemaToZod({ type: 'string' });
      expect(schema.parse('hello')).toBe('hello');
      expect(() => schema.parse(123)).toThrow();
    });

    it('should convert string with minLength/maxLength', () => {
      const schema = jsonSchemaToZod({
        type: 'string',
        minLength: 2,
        maxLength: 5,
      });
      expect(schema.parse('abc')).toBe('abc');
      expect(() => schema.parse('a')).toThrow();
      expect(() => schema.parse('toolong')).toThrow();
    });

    it('should convert string with pattern', () => {
      const schema = jsonSchemaToZod({
        type: 'string',
        pattern: '^[a-z]+$',
      });
      expect(schema.parse('abc')).toBe('abc');
      expect(() => schema.parse('ABC')).toThrow();
    });

    it('should convert string enum', () => {
      const schema = jsonSchemaToZod({
        type: 'string',
        enum: ['red', 'green', 'blue'],
      });
      expect(schema.parse('red')).toBe('red');
      expect(() => schema.parse('yellow')).toThrow();
    });

    it('should convert number type', () => {
      const schema = jsonSchemaToZod({ type: 'number' });
      expect(schema.parse(42)).toBe(42);
      expect(schema.parse(3.14)).toBe(3.14);
      expect(() => schema.parse('42')).toThrow();
    });

    it('should convert integer type', () => {
      const schema = jsonSchemaToZod({ type: 'integer' });
      expect(schema.parse(42)).toBe(42);
      expect(() => schema.parse(3.14)).toThrow();
    });

    it('should convert number with min/max', () => {
      const schema = jsonSchemaToZod({
        type: 'number',
        minimum: 0,
        maximum: 100,
      });
      expect(schema.parse(50)).toBe(50);
      expect(() => schema.parse(-1)).toThrow();
      expect(() => schema.parse(101)).toThrow();
    });

    it('should convert boolean type', () => {
      const schema = jsonSchemaToZod({ type: 'boolean' });
      expect(schema.parse(true)).toBe(true);
      expect(schema.parse(false)).toBe(false);
      expect(() => schema.parse('true')).toThrow();
    });

    it('should convert null type', () => {
      const schema = jsonSchemaToZod({ type: 'null' });
      expect(schema.parse(null)).toBe(null);
      expect(() => schema.parse(undefined)).toThrow();
    });

    it('should convert array type', () => {
      const schema = jsonSchemaToZod({
        type: 'array',
        items: { type: 'string' },
      });
      expect(schema.parse(['a', 'b'])).toEqual(['a', 'b']);
      expect(() => schema.parse([1, 2])).toThrow();
    });

    it('should convert array with minItems/maxItems', () => {
      const schema = jsonSchemaToZod({
        type: 'array',
        items: { type: 'number' },
        minItems: 1,
        maxItems: 3,
      });
      expect(schema.parse([1, 2])).toEqual([1, 2]);
      expect(() => schema.parse([])).toThrow();
      expect(() => schema.parse([1, 2, 3, 4])).toThrow();
    });

    it('should convert object type', () => {
      const schema = jsonSchemaToZod({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name'],
      });

      expect(schema.parse({ name: 'John', age: 30 })).toEqual({
        name: 'John',
        age: 30,
      });
      expect(schema.parse({ name: 'John' })).toEqual({ name: 'John' });
      expect(() => schema.parse({ age: 30 })).toThrow();
    });

    it('should convert nested object', () => {
      const schema = jsonSchemaToZod({
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
            required: ['name'],
          },
        },
        required: ['user'],
      });

      expect(schema.parse({ user: { name: 'John' } })).toEqual({
        user: { name: 'John' },
      });
    });

    it('should handle empty/undefined schema', () => {
      const schema1 = jsonSchemaToZod({});
      const schema2 = jsonSchemaToZod(null as any);

      // Should return passthrough object schema
      expect(schema1.parse({ any: 'value' })).toBeDefined();
      expect(schema2.parse({ any: 'value' })).toBeDefined();
    });

    it('should add descriptions to properties', () => {
      const schema = jsonSchemaToZod({
        type: 'object',
        properties: {
          name: { type: 'string', description: 'User name' },
        },
      });
      // Schema should be created successfully with description
      expect(schema).toBeDefined();
    });
  });

  describe('mcpToolToCoreTool', () => {
    it('should convert MCP tool to CoreTool', () => {
      const mcpTool: MCPTool = {
        name: 'get_weather',
        description: 'Get weather for a location',
        inputSchema: {
          type: 'object',
          properties: {
            city: { type: 'string', description: 'City name' },
          },
          required: ['city'],
        },
        serverName: 'weather-server',
      };

      const mockManager = {
        callTool: jest.fn().mockResolvedValue({ temperature: 72 }),
      } as unknown as MCPClientManager;

      const coreTool = mcpToolToCoreTool(mcpTool, mockManager);

      expect((coreTool as any).description).toBe('Get weather for a location');
      expect(coreTool.parameters).toBeDefined();
      expect(coreTool.execute).toBeDefined();
    });

    it('should execute tool via MCP manager', async () => {
      const mcpTool: MCPTool = {
        name: 'test_tool',
        description: 'Test tool',
        inputSchema: { type: 'object', properties: {} },
        serverName: 'test-server',
      };

      const mockManager = {
        callTool: jest.fn().mockResolvedValue('result'),
      } as unknown as MCPClientManager;

      const coreTool = mcpToolToCoreTool(mcpTool, mockManager);
      const result = await coreTool.execute!({}, {} as any);

      expect(mockManager.callTool).toHaveBeenCalledWith('test_tool', {});
      expect(result).toBe('result');
    });

    it('should use default description if not provided', () => {
      const mcpTool: MCPTool = {
        name: 'unnamed_tool',
        inputSchema: { type: 'object' },
        serverName: 'test-server',
      };

      const mockManager = {} as MCPClientManager;
      const coreTool = mcpToolToCoreTool(mcpTool, mockManager);

      expect((coreTool as any).description).toBe('MCP tool: unnamed_tool');
    });
  });

  describe('mcpToolsToCore', () => {
    it('should convert all tools from manager', () => {
      const mockManager = {
        getAllTools: jest.fn().mockReturnValue([
          {
            name: 'tool1',
            description: 'Tool 1',
            inputSchema: { type: 'object' },
            serverName: 'server-0',
          },
          {
            name: 'tool2',
            description: 'Tool 2',
            inputSchema: { type: 'object' },
            serverName: 'server-1',
          },
        ]),
        callTool: jest.fn(),
      } as unknown as MCPClientManager;

      const coreTools = mcpToolsToCore(mockManager);

      expect(Object.keys(coreTools)).toHaveLength(2);
      expect(coreTools['mcp_server_0_tool1']).toBeDefined();
      expect(coreTools['mcp_server_1_tool2']).toBeDefined();
    });

    it('should sanitize server names in tool keys', () => {
      const mockManager = {
        getAllTools: jest.fn().mockReturnValue([
          {
            name: 'my-tool',
            description: 'My Tool',
            inputSchema: { type: 'object' },
            serverName: 'my-server.example.com',
          },
        ]),
        callTool: jest.fn(),
      } as unknown as MCPClientManager;

      const coreTools = mcpToolsToCore(mockManager);

      // Non-alphanumeric chars should be replaced with underscore
      expect(coreTools['mcp_my_server_example_com_my-tool']).toBeDefined();
    });
  });

  describe('agentToCoreTool', () => {
    it('should convert agent to CoreTool', async () => {
      const mockRun = jest.fn().mockResolvedValue('agent result');

      class MockAgent {
        run = mockRun;
        cleanup = jest.fn();
      }

      const config: AgentToolConfig = {
        agentClass: MockAgent as any,
        description: 'A mock agent',
      };

      const coreTool = agentToCoreTool(config);

      expect((coreTool as any).description).toBe('A mock agent');
      expect(coreTool.parameters).toBeDefined();

      const result = await coreTool.execute!({ input: 'test' }, {} as any);
      expect(result).toBe('agent result');
      expect(mockRun).toHaveBeenCalledWith('test');
    });

    it('should stringify non-string results', async () => {
      class MockAgent {
        run = jest.fn().mockResolvedValue({ key: 'value' });
        cleanup = jest.fn();
      }

      const config: AgentToolConfig = {
        agentClass: MockAgent as any,
        description: 'JSON agent',
      };

      const coreTool = agentToCoreTool(config);
      const result = await coreTool.execute!({ input: 'test' }, {} as any);

      expect(result).toBe('{"key":"value"}');
    });

    it('should call cleanup if available', async () => {
      const cleanupMock = jest.fn();

      class MockAgent {
        run = jest.fn().mockResolvedValue('result');
        cleanup = cleanupMock;
      }

      const config: AgentToolConfig = {
        agentClass: MockAgent as any,
        description: 'Agent with cleanup',
      };

      const coreTool = agentToCoreTool(config);
      await coreTool.execute!({ input: 'test' }, {} as any);

      expect(cleanupMock).toHaveBeenCalled();
    });

    it('should handle agent without cleanup method', async () => {
      class MockAgent {
        run = jest.fn().mockResolvedValue('result');
        // No cleanup method
      }

      const config: AgentToolConfig = {
        agentClass: MockAgent as any,
        description: 'Agent without cleanup',
      };

      const coreTool = agentToCoreTool(config);

      // Should not throw
      await expect(
        coreTool.execute!({ input: 'test' }, {} as any),
      ).resolves.toBe('result');
    });
  });

  describe('agentToolsToCore', () => {
    it('should convert multiple agent configs to CoreTools', () => {
      class Agent1 {
        run = jest.fn();
      }
      class Agent2 {
        run = jest.fn();
      }

      const configs: AgentToolConfig[] = [
        { agentClass: Agent1 as any, description: 'Agent 1' },
        { agentClass: Agent2 as any, description: 'Agent 2', name: 'custom' },
      ];

      const coreTools = agentToolsToCore(configs);

      expect(Object.keys(coreTools)).toHaveLength(2);
      expect(coreTools['Agent1']).toBeDefined();
      expect(coreTools['custom']).toBeDefined();
    });

    it('should use custom name when provided', () => {
      class TestAgent {
        run = jest.fn();
      }

      const configs: AgentToolConfig[] = [
        {
          agentClass: TestAgent as any,
          description: 'Test',
          name: 'my_custom_tool',
        },
      ];

      const coreTools = agentToolsToCore(configs);

      expect(coreTools['my_custom_tool']).toBeDefined();
      expect(coreTools['TestAgent']).toBeUndefined();
    });
  });
});
