import {
  MCPServerConfig,
  MCPStdioConfig,
  MCPHttpConfig,
  isStdioConfig,
  isHttpConfig,
  MCPTool,
  AgentToolConfig,
} from '../../../src/mcp/types';

describe('MCP Types', () => {
  describe('isStdioConfig', () => {
    it('should return true for stdio config with command', () => {
      const config: MCPStdioConfig = {
        command: 'npx',
        args: ['-y', '@anthropic/mcp-server-filesystem'],
      };
      expect(isStdioConfig(config)).toBe(true);
    });

    it('should return true for stdio config with only command', () => {
      const config: MCPStdioConfig = {
        command: 'node',
      };
      expect(isStdioConfig(config)).toBe(true);
    });

    it('should return true for stdio config with all options', () => {
      const config: MCPStdioConfig = {
        command: 'python',
        args: ['server.py'],
        env: { API_KEY: 'test' },
        cwd: '/tmp',
      };
      expect(isStdioConfig(config)).toBe(true);
    });

    it('should return false for http config', () => {
      const config: MCPHttpConfig = {
        url: 'http://localhost:3000',
      };
      expect(isStdioConfig(config)).toBe(false);
    });
  });

  describe('isHttpConfig', () => {
    it('should return true for http config with url', () => {
      const config: MCPHttpConfig = {
        url: 'http://localhost:3000/mcp',
      };
      expect(isHttpConfig(config)).toBe(true);
    });

    it('should return true for http config with headers', () => {
      const config: MCPHttpConfig = {
        url: 'https://api.example.com/mcp',
        headers: { Authorization: 'Bearer token' },
      };
      expect(isHttpConfig(config)).toBe(true);
    });

    it('should return false for stdio config', () => {
      const config: MCPStdioConfig = {
        command: 'npx',
      };
      expect(isHttpConfig(config)).toBe(false);
    });
  });

  describe('Type definitions', () => {
    it('should allow MCPServerConfig as union type', () => {
      const stdioConfig: MCPServerConfig = { command: 'node' };
      const httpConfig: MCPServerConfig = { url: 'http://localhost' };

      expect(isStdioConfig(stdioConfig)).toBe(true);
      expect(isHttpConfig(httpConfig)).toBe(true);
    });

    it('should define MCPTool with serverName', () => {
      const tool: MCPTool = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: { type: 'object', properties: {} },
        serverName: 'test-server',
      };

      expect(tool.name).toBe('test-tool');
      expect(tool.serverName).toBe('test-server');
    });

    it('should define AgentToolConfig', () => {
      class TestAgent {}

      const config: AgentToolConfig = {
        agentClass: TestAgent as any,
        description: 'Test agent',
        name: 'custom-name',
      };

      expect(config.agentClass).toBe(TestAgent);
      expect(config.description).toBe('Test agent');
      expect(config.name).toBe('custom-name');
    });
  });
});
