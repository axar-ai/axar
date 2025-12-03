import {
  experimental_createMCPClient as createMCPClient,
  experimental_MCPClient as MCPClient,
} from '@ai-sdk/mcp';
import { Experimental_StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio';
import { Tool } from 'ai';
import { MCPServerConfig, isStdioConfig, isHttpConfig } from './types';
import { logger } from '../common';

/**
 * Manages multiple MCP client connections using AI SDK's built-in MCP support.
 */
export class MCPClientManager {
  private clients: Array<{ client: MCPClient; name: string }> = [];

  /**
   * Add and connect to MCP servers.
   *
   * @param configs - Array of MCP server configurations
   */
  async connect(configs: MCPServerConfig[]): Promise<void> {
    const connectPromises = configs.map(async (config, index) => {
      const name = this.deriveName(config, index);
      logger.debug(`Connecting to MCP server: ${name}`);

      let client: MCPClient;

      if (isStdioConfig(config)) {
        // Use stdio transport for subprocess-based MCP servers
        const transport = new Experimental_StdioMCPTransport({
          command: config.command,
          args: config.args,
          env: config.env,
          cwd: config.cwd,
        });

        client = await createMCPClient({
          transport,
          name: 'axar-mcp-client',
        });
      } else if (isHttpConfig(config)) {
        // Use SSE transport for HTTP-based MCP servers
        client = await createMCPClient({
          transport: {
            type: 'sse',
            url: config.url,
            headers: config.headers,
          },
          name: 'axar-mcp-client',
        });
      } else {
        throw new Error('Invalid MCP server configuration');
      }

      this.clients.push({ client, name });
      logger.info(`Connected to MCP server: ${name}`);
      return name;
    });

    // Use allSettled to handle partial failures gracefully
    const results = await Promise.allSettled(connectPromises);
    const failures = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );

    if (failures.length > 0) {
      for (const failure of failures) {
        logger.error('Failed to connect to MCP server:', failure.reason);
      }
      // Only throw if ALL connections failed
      if (failures.length === results.length) {
        throw new Error(
          `All ${failures.length} MCP server connections failed`,
        );
      }
      logger.warn(
        `${failures.length} of ${results.length} MCP servers failed to connect`,
      );
    }
  }

  /**
   * Derives a server name from the config for identification.
   */
  private deriveName(config: MCPServerConfig, index: number): string {
    if (isStdioConfig(config)) {
      const args = config.args?.join(' ') ?? '';
      return `stdio-${config.command}${args ? '-' + args.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) : ''}`;
    }
    if (isHttpConfig(config)) {
      try {
        return `http-${new URL(config.url).hostname}`;
      } catch {
        return `server-${index}`;
      }
    }
    return `server-${index}`;
  }

  /**
   * Get all tools from all connected servers.
   * AI SDK automatically converts MCP tools to Tool format.
   *
   * @returns Record of tool names to Tools
   */
  async getAllTools(): Promise<Record<string, Tool>> {
    const allTools: Record<string, Tool> = {};

    for (const { client, name } of this.clients) {
      try {
        const tools = await client.tools();

        // Prefix tool names with server name to avoid conflicts
        for (const [toolName, tool] of Object.entries(tools)) {
          const prefixedName = `mcp_${name.replace(/[^a-zA-Z0-9]/g, '_')}_${toolName}`;
          allTools[prefixedName] = tool as Tool;
        }

        logger.debug(
          `Discovered ${Object.keys(tools).length} tools from MCP server ${name}`,
        );
      } catch (error) {
        logger.error(`Failed to get tools from MCP server ${name}:`, error);
        // Continue with other servers instead of failing completely
      }
    }

    return allTools;
  }

  /**
   * Disconnect all clients.
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = this.clients.map(async ({ client, name }) => {
      try {
        await client.close();
        logger.debug(`Disconnected from MCP server: ${name}`);
      } catch (error) {
        logger.warn(`Error disconnecting from MCP server ${name}:`, error);
      }
    });

    await Promise.all(disconnectPromises);
    this.clients = [];
  }

  /**
   * Get connected client count.
   */
  get clientCount(): number {
    return this.clients.length;
  }
}
