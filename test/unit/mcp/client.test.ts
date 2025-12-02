import { MCPClient, MCPClientManager } from '../../../src/mcp/client';
import { MCPStdioConfig, MCPHttpConfig } from '../../../src/mcp/types';

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    listTools: jest.fn().mockResolvedValue({
      tools: [
        {
          name: 'test_tool',
          description: 'A test tool',
          inputSchema: { type: 'object' },
        },
      ],
    }),
    callTool: jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: '{"result": "success"}' }],
    }),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@modelcontextprotocol/sdk/client/sse.js', () => ({
  SSEClientTransport: jest.fn().mockImplementation(() => ({})),
}));

describe('MCPClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should derive server name from stdio config', () => {
      const config: MCPStdioConfig = {
        command: 'npx',
        args: ['-y', '@anthropic/mcp-server-filesystem'],
      };
      const client = new MCPClient(config);
      expect(client.name).toBe('npx -y @anthropic/mcp-server-filesystem');
    });

    it('should derive server name from http config', () => {
      const config: MCPHttpConfig = {
        url: 'http://localhost:3000/mcp',
      };
      const client = new MCPClient(config);
      expect(client.name).toBe('localhost');
    });

    it('should use custom server name when provided', () => {
      const config: MCPStdioConfig = { command: 'node' };
      const client = new MCPClient(config, 'my-custom-server');
      expect(client.name).toBe('my-custom-server');
    });
  });

  describe('state', () => {
    it('should start disconnected', () => {
      const config: MCPStdioConfig = { command: 'node' };
      const client = new MCPClient(config);
      expect(client.state).toBe('disconnected');
    });
  });

  describe('connect', () => {
    it('should connect with stdio transport', async () => {
      const config: MCPStdioConfig = {
        command: 'npx',
        args: ['server.js'],
        env: { KEY: 'value' },
        cwd: '/tmp',
      };
      const client = new MCPClient(config);

      await client.connect();

      expect(client.state).toBe('connected');
    });

    it('should connect with http transport', async () => {
      const config: MCPHttpConfig = {
        url: 'http://localhost:3000',
      };
      const client = new MCPClient(config);

      await client.connect();

      expect(client.state).toBe('connected');
    });

    it('should not reconnect if already connected', async () => {
      const config: MCPStdioConfig = { command: 'node' };
      const client = new MCPClient(config);

      await client.connect();
      await client.connect(); // Should not throw

      expect(client.state).toBe('connected');
    });

    it('should discover tools on connect', async () => {
      const config: MCPStdioConfig = { command: 'node' };
      const client = new MCPClient(config);

      await client.connect();
      const tools = client.listTools();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('test_tool');
      expect(tools[0].serverName).toBe('node');
    });
  });

  describe('listTools', () => {
    it('should return copy of tools array', async () => {
      const config: MCPStdioConfig = { command: 'node' };
      const client = new MCPClient(config);

      await client.connect();
      const tools1 = client.listTools();
      const tools2 = client.listTools();

      expect(tools1).not.toBe(tools2);
      expect(tools1).toEqual(tools2);
    });
  });

  describe('callTool', () => {
    it('should call tool and parse JSON response', async () => {
      const config: MCPStdioConfig = { command: 'node' };
      const client = new MCPClient(config);

      await client.connect();
      const result = await client.callTool('test_tool', { arg: 'value' });

      expect(result).toEqual({ result: 'success' });
    });

    it('should throw if not connected', async () => {
      const config: MCPStdioConfig = { command: 'node' };
      const client = new MCPClient(config);

      await expect(client.callTool('test', {})).rejects.toThrow(
        'MCP client not connected',
      );
    });
  });

  describe('disconnect', () => {
    it('should disconnect and reset state', async () => {
      const config: MCPStdioConfig = { command: 'node' };
      const client = new MCPClient(config);

      await client.connect();
      expect(client.state).toBe('connected');

      await client.disconnect();
      expect(client.state).toBe('disconnected');
      expect(client.listTools()).toHaveLength(0);
    });

    it('should handle disconnect when already disconnected', async () => {
      const config: MCPStdioConfig = { command: 'node' };
      const client = new MCPClient(config);

      await client.disconnect(); // Should not throw
      expect(client.state).toBe('disconnected');
    });
  });

  describe('refreshTools', () => {
    it('should throw if not connected', async () => {
      const config: MCPStdioConfig = { command: 'node' };
      const client = new MCPClient(config);

      await expect(client.refreshTools()).rejects.toThrow(
        'MCP client not connected',
      );
    });
  });
});

describe('MCPClientManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to multiple servers', async () => {
      const manager = new MCPClientManager();

      await manager.connect([
        { command: 'server1' },
        { command: 'server2' },
      ]);

      expect(manager.clientCount).toBe(2);
    });
  });

  describe('getAllTools', () => {
    it('should aggregate tools from all clients', async () => {
      const manager = new MCPClientManager();

      await manager.connect([{ command: 'server1' }]);

      const tools = manager.getAllTools();
      expect(tools.length).toBeGreaterThan(0);
    });
  });

  describe('callTool', () => {
    it('should route tool call to correct client', async () => {
      const manager = new MCPClientManager();

      await manager.connect([{ command: 'server1' }]);

      const result = await manager.callTool('test_tool', { arg: 'value' });
      expect(result).toEqual({ result: 'success' });
    });

    it('should throw if tool not found', async () => {
      const manager = new MCPClientManager();

      await manager.connect([{ command: 'server1' }]);

      await expect(manager.callTool('nonexistent', {})).rejects.toThrow(
        "Tool 'nonexistent' not found",
      );
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
  });
});
