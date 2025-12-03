import { z } from 'zod';
import { Agent } from '../../../src/agent/agent';
import { model, systemPrompt, tool, mcpServers, agentTool } from '../../../src/agent';
import { MCPClientManager } from '../../../src/mcp';

// Mock the MCP module
jest.mock('../../../src/mcp/client', () => {
  const { z } = require('zod');
  const mockTools = {
    mcp_test_server_mcp_tool_1: {
      description: 'MCP Tool 1',
      inputSchema: z.object({ query: z.string() }),
      execute: jest.fn().mockResolvedValue('mcp result'),
    },
  };

  return {
    MCPClientManager: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnectAll: jest.fn().mockResolvedValue(undefined),
      getAllTools: jest.fn().mockResolvedValue(mockTools),
      clientCount: 1,
    })),
  };
});

// Mock AI SDK
jest.mock('ai', () => ({
  generateText: jest.fn().mockResolvedValue({
    text: 'test response',
    experimental_output: { value: 'test' },
  }),
  streamText: jest.fn().mockReturnValue({
    textStream: (async function* () {
      yield 'test';
    })(),
    experimental_partialOutputStream: (async function* () {
      yield { partial: true };
    })(),
  }),
  Output: {
    object: jest.fn().mockReturnValue({ schema: {} }),
  },
}));

// Mock model factory
jest.mock('../../../src/llm/model-factory', () => ({
  getModel: jest.fn().mockResolvedValue({
    modelId: 'gpt-4',
    provider: 'openai',
  }),
}));

describe('Agent with MCP', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTools', () => {
    it('should return only local tools when no MCP servers configured', async () => {
      @model('openai:gpt-4')
      @systemPrompt('Test')
      class LocalAgent extends Agent<string, string> {
        @tool('Local tool', z.object({ input: z.string() }))
        async localTool(params: { input: string }) {
          return params.input;
        }
      }

      const agent = new LocalAgent();
      const tools = await (agent as any).getAllTools();

      expect(tools).toHaveProperty('localTool');
      expect(Object.keys(tools)).toHaveLength(1);

      await agent.cleanup();
    });

    it('should merge local and MCP tools', async () => {
      @model('openai:gpt-4')
      @systemPrompt('Test')
      @mcpServers([{ command: 'node', args: ['server.js'] }])
      class HybridAgent extends Agent<string, string> {
        @tool('Local tool', z.object({ input: z.string() }))
        async localTool(params: { input: string }) {
          return params.input;
        }
      }

      const agent = new HybridAgent();
      const tools = await (agent as any).getAllTools();

      // Should have local tool
      expect(tools).toHaveProperty('localTool');
      // Should have MCP tools (prefixed with mcp_)
      const mcpToolKeys = Object.keys(tools).filter((k) => k.startsWith('mcp_'));
      expect(mcpToolKeys.length).toBeGreaterThan(0);

      await agent.cleanup();
    });

    it('should merge agent tools', async () => {
      @model('openai:gpt-4')
      @systemPrompt('Helper')
      class HelperAgent extends Agent<string, string> {}

      @model('openai:gpt-4')
      @systemPrompt('Main')
      @agentTool(HelperAgent, 'Get help from helper')
      class MainAgent extends Agent<string, string> {}

      const agent = new MainAgent();
      const tools = await (agent as any).getAllTools();

      expect(tools).toHaveProperty('HelperAgent');
      expect(tools['HelperAgent'].description).toBe('Get help from helper');

      await agent.cleanup();
    });

    it('should give precedence to local tools over MCP tools', async () => {
      @model('openai:gpt-4')
      @systemPrompt('Test')
      @mcpServers([{ command: 'node' }])
      class PrecedenceAgent extends Agent<string, string> {
        // This should take precedence if there's a collision
        @tool('Local implementation', z.object({}))
        async mcp_test_server_mcp_tool_1() {
          return 'local';
        }
      }

      const agent = new PrecedenceAgent();
      const tools = await (agent as any).getAllTools();

      // Local tool should be present
      expect(tools['mcp_test_server_mcp_tool_1'].description).toBe(
        'Local implementation',
      );

      await agent.cleanup();
    });
  });

  describe('cleanup', () => {
    it('should disconnect MCP clients on cleanup', async () => {
      @model('openai:gpt-4')
      @systemPrompt('Test')
      @mcpServers([{ command: 'node' }])
      class MCPAgent extends Agent<string, string> {}

      const agent = new MCPAgent();

      // Initialize MCP by calling getAllTools
      await (agent as any).getAllTools();

      // Get manager reference before cleanup
      const manager = (agent as any).mcpManager;

      await agent.cleanup();

      expect(manager.disconnectAll).toHaveBeenCalled();
      expect((agent as any).mcpManager).toBeNull();
    });

    it('should handle cleanup when not initialized', async () => {
      @model('openai:gpt-4')
      @systemPrompt('Test')
      class SimpleAgent extends Agent<string, string> {}

      const agent = new SimpleAgent();

      // Should not throw
      await expect(agent.cleanup()).resolves.toBeUndefined();
    });

    it('should handle multiple cleanup calls', async () => {
      @model('openai:gpt-4')
      @systemPrompt('Test')
      @mcpServers([{ command: 'node' }])
      class MCPAgent extends Agent<string, string> {}

      const agent = new MCPAgent();
      await (agent as any).getAllTools();

      await agent.cleanup();
      await agent.cleanup(); // Should not throw

      expect((agent as any).mcpManager).toBeNull();
    });
  });

  describe('MCP initialization', () => {
    it('should only initialize MCP once', async () => {
      const mockConnect = jest.fn().mockResolvedValue(undefined);
      (MCPClientManager as jest.Mock).mockImplementation(() => ({
        connect: mockConnect,
        disconnectAll: jest.fn(),
        getAllTools: jest.fn().mockReturnValue([]),
        clientCount: 1,
      }));

      @model('openai:gpt-4')
      @systemPrompt('Test')
      @mcpServers([{ command: 'node' }])
      class MCPAgent extends Agent<string, string> {}

      const agent = new MCPAgent();

      // Call getAllTools multiple times
      await (agent as any).getAllTools();
      await (agent as any).getAllTools();
      await (agent as any).getAllTools();

      // Connect should only be called once
      expect(mockConnect).toHaveBeenCalledTimes(1);

      await agent.cleanup();
    });

    it('should not initialize MCP when no servers configured', async () => {
      const mockConnect = jest.fn();
      (MCPClientManager as jest.Mock).mockImplementation(() => ({
        connect: mockConnect,
        disconnectAll: jest.fn(),
        getAllTools: jest.fn().mockReturnValue([]),
        clientCount: 0,
      }));

      @model('openai:gpt-4')
      @systemPrompt('Test')
      class NoMCPAgent extends Agent<string, string> {}

      const agent = new NoMCPAgent();
      await (agent as any).getAllTools();

      // MCPClientManager should not be instantiated
      expect((agent as any).mcpManager).toBeNull();
    });
  });

  describe('run with MCP tools', () => {
    it('should use getAllTools in createConfig', async () => {
      const generateText = require('ai').generateText;

      @model('openai:gpt-4')
      @systemPrompt('Test')
      @mcpServers([{ command: 'node' }])
      class MCPAgent extends Agent<string, string> {}

      const agent = new MCPAgent();
      await agent.run('test input');

      // generateText should have been called with tools
      expect(generateText).toHaveBeenCalled();
      const callArgs = generateText.mock.calls[0][0];
      expect(callArgs.tools).toBeDefined();

      await agent.cleanup();
    });
  });

  describe('getMCPServerConfigs', () => {
    it('should return empty array when no MCP servers', () => {
      @model('openai:gpt-4')
      class NoMCPAgent extends Agent<string, string> {}

      const agent = new NoMCPAgent();
      const configs = (agent as any).getMCPServerConfigs();

      expect(configs).toEqual([]);
    });

    it('should return configured servers', () => {
      const servers = [
        { command: 'node', args: ['server.js'] },
        { url: 'http://localhost:3000' },
      ];

      @model('openai:gpt-4')
      @mcpServers(servers)
      class MCPAgent extends Agent<string, string> {}

      const agent = new MCPAgent();
      const configs = (agent as any).getMCPServerConfigs();

      expect(configs).toEqual(servers);
    });
  });

  describe('getAgentToolConfigs', () => {
    it('should return empty array when no agent tools', () => {
      @model('openai:gpt-4')
      class NoAgentToolsAgent extends Agent<string, string> {}

      const agent = new NoAgentToolsAgent();
      const configs = (agent as any).getAgentToolConfigs();

      expect(configs).toEqual([]);
    });

    it('should return configured agent tools', () => {
      @model('openai:gpt-4')
      class Helper1 extends Agent<string, string> {}

      @model('openai:gpt-4')
      class Helper2 extends Agent<string, string> {}

      @model('openai:gpt-4')
      @agentTool(Helper1, 'Helper 1')
      @agentTool(Helper2, 'Helper 2', 'custom_name')
      class MainAgent extends Agent<string, string> {}

      const agent = new MainAgent();
      const configs = (agent as any).getAgentToolConfigs();

      expect(configs).toHaveLength(2);
    });
  });
});
