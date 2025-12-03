import { MCPClientManager } from '../../../src/mcp/client';
import { MCPStdioConfig, MCPHttpConfig } from '../../../src/mcp/types';
import { z } from 'zod';

// Create mock functions
const mockClose = jest.fn().mockResolvedValue(undefined);
const mockToolsReturn = {
  test_tool: {
    description: 'A test tool',
    inputSchema: z.object({}),
    execute: jest.fn().mockResolvedValue('success'),
  },
};
const mockTools = jest.fn().mockResolvedValue(mockToolsReturn);

// Mock the AI SDK MCP module
jest.mock('@ai-sdk/mcp', () => ({
  experimental_createMCPClient: jest.fn().mockImplementation(() =>
    Promise.resolve({
      tools: jest.fn().mockResolvedValue({
        test_tool: {
          description: 'A test tool',
          inputSchema: {},
          execute: jest.fn().mockResolvedValue('success'),
        },
      }),
      close: jest.fn().mockResolvedValue(undefined),
    }),
  ),
}));

jest.mock('@ai-sdk/mcp/mcp-stdio', () => ({
  Experimental_StdioMCPTransport: jest.fn().mockImplementation((config) => ({
    type: 'stdio',
    command: config.command,
    args: config.args,
  })),
}));

describe('MCPClientManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to a single stdio server', async () => {
      const manager = new MCPClientManager();
      const config: MCPStdioConfig = {
        command: 'npx',
        args: ['-y', '@anthropic/mcp-server-filesystem'],
      };

      await manager.connect([config]);

      expect(manager.clientCount).toBe(1);
    });

    it('should connect to a single http server', async () => {
      const manager = new MCPClientManager();
      const config: MCPHttpConfig = {
        url: 'http://localhost:3000/mcp',
      };

      await manager.connect([config]);

      expect(manager.clientCount).toBe(1);
    });

    it('should connect to multiple servers', async () => {
      const manager = new MCPClientManager();

      await manager.connect([
        { command: 'server1' },
        { command: 'server2' },
      ]);

      expect(manager.clientCount).toBe(2);
    });

    it('should handle empty config array', async () => {
      const manager = new MCPClientManager();

      await manager.connect([]);

      expect(manager.clientCount).toBe(0);
    });
  });

  describe('getAllTools', () => {
    it('should return tools from all connected servers', async () => {
      const manager = new MCPClientManager();

      await manager.connect([{ command: 'server1' }]);

      const tools = await manager.getAllTools();
      expect(Object.keys(tools).length).toBeGreaterThan(0);
    });

    it('should prefix tool names with server identifier', async () => {
      const manager = new MCPClientManager();

      await manager.connect([{ command: 'server1' }]);

      const tools = await manager.getAllTools();
      const toolNames = Object.keys(tools);

      // Tool names should be prefixed with mcp_ and server name
      expect(toolNames.some((name) => name.startsWith('mcp_'))).toBe(true);
    });

    it('should return empty object when no servers connected', async () => {
      const manager = new MCPClientManager();

      const tools = await manager.getAllTools();

      expect(Object.keys(tools)).toHaveLength(0);
    });
  });

  describe('disconnectAll', () => {
    it('should disconnect all clients', async () => {
      const manager = new MCPClientManager();

      await manager.connect([
        { command: 'server1' },
        { command: 'server2' },
      ]);

      expect(manager.clientCount).toBe(2);

      await manager.disconnectAll();

      expect(manager.clientCount).toBe(0);
    });

    it('should handle disconnect when no clients connected', async () => {
      const manager = new MCPClientManager();

      await manager.disconnectAll(); // Should not throw

      expect(manager.clientCount).toBe(0);
    });

    it('should call close on each client', async () => {
      const manager = new MCPClientManager();

      await manager.connect([{ command: 'server1' }]);
      expect(manager.clientCount).toBe(1);

      await manager.disconnectAll();

      // After disconnectAll, clients should be cleared
      expect(manager.clientCount).toBe(0);
    });
  });

  describe('clientCount', () => {
    it('should return the number of connected clients', async () => {
      const manager = new MCPClientManager();

      expect(manager.clientCount).toBe(0);

      await manager.connect([{ command: 'server1' }]);
      expect(manager.clientCount).toBe(1);

      await manager.connect([{ command: 'server2' }]);
      expect(manager.clientCount).toBe(2);
    });
  });
});
