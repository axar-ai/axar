import { z } from 'zod';
import { agentToCoreTool, agentToolsToCore } from '../../../src/mcp/tool-adapter';
import { AgentToolConfig } from '../../../src/mcp';

describe('Tool Adapter', () => {
  describe('agentToCoreTool', () => {
    it('should convert agent to Tool', async () => {
      const mockRun = jest.fn().mockResolvedValue('agent result');

      class MockAgent {
        run = mockRun;
        cleanup = jest.fn();
      }

      const config: AgentToolConfig = {
        agentClass: MockAgent as any,
        description: 'A mock agent',
      };

      const tool = agentToCoreTool(config);

      expect(tool.description).toBe('A mock agent');
      expect(tool.inputSchema).toBeDefined();

      const result = await tool.execute!({ input: 'test' }, {} as any);
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

      const tool = agentToCoreTool(config);
      const result = await tool.execute!({ input: 'test' }, {} as any);

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

      const tool = agentToCoreTool(config);
      await tool.execute!({ input: 'test' }, {} as any);

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

      const tool = agentToCoreTool(config);

      // Should not throw
      await expect(tool.execute!({ input: 'test' }, {} as any)).resolves.toBe(
        'result',
      );
    });

    it('should create tool with input schema accepting string input', () => {
      class MockAgent {
        run = jest.fn();
      }

      const config: AgentToolConfig = {
        agentClass: MockAgent as any,
        description: 'Test agent',
      };

      const tool = agentToCoreTool(config);

      // The inputSchema should accept objects with an input string
      const schema = tool.inputSchema as z.ZodSchema;
      expect(schema.parse({ input: 'test' })).toEqual({ input: 'test' });
    });
  });

  describe('agentToolsToCore', () => {
    it('should convert multiple agent configs to Tools', () => {
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

      const tools = agentToolsToCore(configs);

      expect(Object.keys(tools)).toHaveLength(2);
      expect(tools['Agent1']).toBeDefined();
      expect(tools['custom']).toBeDefined();
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

      const tools = agentToolsToCore(configs);

      expect(tools['my_custom_tool']).toBeDefined();
      expect(tools['TestAgent']).toBeUndefined();
    });

    it('should use class name when no custom name provided', () => {
      class MySpecialAgent {
        run = jest.fn();
      }

      const configs: AgentToolConfig[] = [
        {
          agentClass: MySpecialAgent as any,
          description: 'Special agent',
        },
      ];

      const tools = agentToolsToCore(configs);

      expect(tools['MySpecialAgent']).toBeDefined();
    });

    it('should return empty object for empty configs', () => {
      const tools = agentToolsToCore([]);

      expect(Object.keys(tools)).toHaveLength(0);
    });
  });
});
