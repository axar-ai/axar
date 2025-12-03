/**
 * Configuration for connecting to an MCP server via stdio transport.
 * Used when the MCP server is a subprocess that communicates via stdin/stdout.
 */
export interface MCPStdioConfig {
  /** The command to run (e.g., 'npx', 'node', 'python') */
  command: string;
  /** Arguments to pass to the command */
  args?: string[];
  /** Environment variables for the subprocess */
  env?: Record<string, string>;
  /** Working directory for the subprocess */
  cwd?: string;
}

/**
 * Configuration for connecting to an MCP server via HTTP/SSE transport.
 * Used when the MCP server exposes an HTTP endpoint.
 */
export interface MCPHttpConfig {
  /** The URL of the MCP server */
  url: string;
  /** Optional headers to include in requests */
  headers?: Record<string, string>;
}

/**
 * Union type for MCP server configuration.
 * Supports both stdio (subprocess) and HTTP transports.
 */
export type MCPServerConfig = MCPStdioConfig | MCPHttpConfig;

/**
 * Type guard to check if config is for stdio transport.
 */
export function isStdioConfig(config: MCPServerConfig): config is MCPStdioConfig {
  return 'command' in config;
}

/**
 * Type guard to check if config is for HTTP transport.
 */
export function isHttpConfig(config: MCPServerConfig): config is MCPHttpConfig {
  return 'url' in config;
}

/**
 * Configuration for an agent used as a tool via @agentTool decorator.
 */
export interface AgentToolConfig {
  /** The agent class constructor */
  agentClass: new (...args: any[]) => any;
  /** Description of what this agent does (shown to LLM) */
  description: string;
  /** Optional name override (defaults to class name) */
  name?: string;
}
