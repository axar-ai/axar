import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import {
  MCPServerConfig,
  MCPTool,
  MCPClientState,
  isStdioConfig,
  isHttpConfig,
} from './types';
import { logger } from '../common';

/**
 * Wrapper around the MCP SDK client that manages connection lifecycle
 * and provides a simplified interface for tool discovery and execution.
 */
export class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | SSEClientTransport | null = null;
  private _state: MCPClientState = 'disconnected';
  private tools: MCPTool[] = [];
  private serverName: string;

  constructor(
    private config: MCPServerConfig,
    serverName?: string,
  ) {
    this.serverName = serverName ?? this.deriveServerName();
  }

  /**
   * Derives a server name from the config for identification.
   */
  private deriveServerName(): string {
    if (isStdioConfig(this.config)) {
      const args = this.config.args?.join(' ') ?? '';
      return `${this.config.command} ${args}`.trim();
    }
    if (isHttpConfig(this.config)) {
      return new URL(this.config.url).hostname;
    }
    return 'unknown-server';
  }

  /**
   * Current connection state.
   */
  get state(): MCPClientState {
    return this._state;
  }

  /**
   * Name of the connected server.
   */
  get name(): string {
    return this.serverName;
  }

  /**
   * Connect to the MCP server and discover available tools.
   */
  async connect(): Promise<void> {
    if (this._state === 'connected') {
      logger.debug(`MCP client already connected to ${this.serverName}`);
      return;
    }

    this._state = 'connecting';
    logger.debug(`Connecting to MCP server: ${this.serverName}`);

    try {
      this.client = new Client(
        {
          name: 'axar-agent',
          version: '1.0.0',
        },
        {
          capabilities: {},
        },
      );

      // Create appropriate transport based on config
      if (isStdioConfig(this.config)) {
        this.transport = new StdioClientTransport({
          command: this.config.command,
          args: this.config.args,
          env: this.config.env,
          cwd: this.config.cwd,
        });
      } else if (isHttpConfig(this.config)) {
        this.transport = new SSEClientTransport(new URL(this.config.url));
      } else {
        throw new Error('Invalid MCP server configuration');
      }

      await this.client.connect(this.transport);
      this._state = 'connected';

      // Discover tools
      await this.refreshTools();

      logger.info(
        `Connected to MCP server ${this.serverName}, discovered ${this.tools.length} tools`,
      );
    } catch (error) {
      this._state = 'error';
      logger.error(`Failed to connect to MCP server ${this.serverName}:`, error);
      throw error;
    }
  }

  /**
   * Refresh the list of available tools from the server.
   */
  async refreshTools(): Promise<MCPTool[]> {
    if (!this.client || this._state !== 'connected') {
      throw new Error('MCP client not connected');
    }

    const response = await this.client.listTools();
    this.tools = response.tools.map((tool) => ({
      ...tool,
      serverName: this.serverName,
    }));

    return this.tools;
  }

  /**
   * Get the list of discovered tools.
   */
  listTools(): MCPTool[] {
    return [...this.tools];
  }

  /**
   * Call a tool on the MCP server.
   *
   * @param name - The name of the tool to call
   * @param args - Arguments to pass to the tool
   * @returns The tool's response content
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.client || this._state !== 'connected') {
      throw new Error('MCP client not connected');
    }

    logger.debug(`Calling MCP tool ${name} on ${this.serverName}`, { args });

    const result = await this.client.callTool({
      name,
      arguments: args,
    });

    // Extract content from result
    if (result.content && Array.isArray(result.content)) {
      // If there's a single text content, return it directly
      if (
        result.content.length === 1 &&
        result.content[0].type === 'text'
      ) {
        try {
          // Try to parse as JSON
          return JSON.parse(result.content[0].text);
        } catch {
          // Return as string if not JSON
          return result.content[0].text;
        }
      }
      // Return full content array for complex responses
      return result.content;
    }

    return result;
  }

  /**
   * Disconnect from the MCP server and clean up resources.
   */
  async disconnect(): Promise<void> {
    if (this._state === 'disconnected') {
      return;
    }

    logger.debug(`Disconnecting from MCP server: ${this.serverName}`);

    try {
      if (this.client) {
        await this.client.close();
      }
    } catch (error) {
      logger.warn(`Error closing MCP client for ${this.serverName}:`, error);
    } finally {
      this.client = null;
      this.transport = null;
      this.tools = [];
      this._state = 'disconnected';
    }
  }
}

/**
 * Manages multiple MCP client connections.
 */
export class MCPClientManager {
  private clients: MCPClient[] = [];

  /**
   * Add and connect to MCP servers.
   *
   * @param configs - Array of MCP server configurations
   */
  async connect(configs: MCPServerConfig[]): Promise<void> {
    const connectPromises = configs.map(async (config, index) => {
      const client = new MCPClient(config, `server-${index}`);
      await client.connect();
      this.clients.push(client);
    });

    await Promise.all(connectPromises);
  }

  /**
   * Get all tools from all connected servers.
   */
  getAllTools(): MCPTool[] {
    return this.clients.flatMap((client) => client.listTools());
  }

  /**
   * Call a tool by name, routing to the appropriate server.
   *
   * @param name - Tool name
   * @param args - Tool arguments
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    // Find the client that has this tool
    for (const client of this.clients) {
      const tools = client.listTools();
      const tool = tools.find((t) => t.name === name);
      if (tool) {
        return client.callTool(name, args);
      }
    }

    throw new Error(`Tool '${name}' not found in any connected MCP server`);
  }

  /**
   * Disconnect all clients.
   */
  async disconnectAll(): Promise<void> {
    await Promise.all(this.clients.map((client) => client.disconnect()));
    this.clients = [];
  }

  /**
   * Get connected client count.
   */
  get clientCount(): number {
    return this.clients.length;
  }
}
