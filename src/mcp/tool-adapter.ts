import { CoreTool } from 'ai';
import { z } from 'zod';
import { MCPTool, AgentToolConfig } from './types';
import { MCPClientManager } from './client';

/**
 * Converts a JSON Schema to a Zod schema.
 * MCP tools use JSON Schema, but Vercel AI SDK expects Zod schemas.
 *
 * @param jsonSchema - The JSON Schema to convert
 * @returns A Zod schema
 */
export function jsonSchemaToZod(jsonSchema: Record<string, unknown>): z.ZodTypeAny {
  if (!jsonSchema || typeof jsonSchema !== 'object') {
    return z.object({});
  }

  const type = jsonSchema.type as string;

  switch (type) {
    case 'string': {
      let schema = z.string();
      if (jsonSchema.enum) {
        return z.enum(jsonSchema.enum as [string, ...string[]]);
      }
      if (jsonSchema.minLength !== undefined) {
        schema = schema.min(jsonSchema.minLength as number);
      }
      if (jsonSchema.maxLength !== undefined) {
        schema = schema.max(jsonSchema.maxLength as number);
      }
      if (jsonSchema.pattern) {
        schema = schema.regex(new RegExp(jsonSchema.pattern as string));
      }
      return schema;
    }

    case 'number':
    case 'integer': {
      let schema = type === 'integer' ? z.number().int() : z.number();
      if (jsonSchema.minimum !== undefined) {
        schema = schema.min(jsonSchema.minimum as number);
      }
      if (jsonSchema.maximum !== undefined) {
        schema = schema.max(jsonSchema.maximum as number);
      }
      return schema;
    }

    case 'boolean':
      return z.boolean();

    case 'null':
      return z.null();

    case 'array': {
      const items = jsonSchema.items as Record<string, unknown> | undefined;
      const itemSchema = items ? jsonSchemaToZod(items) : z.unknown();
      let schema = z.array(itemSchema);
      if (jsonSchema.minItems !== undefined) {
        schema = schema.min(jsonSchema.minItems as number);
      }
      if (jsonSchema.maxItems !== undefined) {
        schema = schema.max(jsonSchema.maxItems as number);
      }
      return schema;
    }

    case 'object':
    default: {
      const properties = jsonSchema.properties as Record<string, unknown> | undefined;
      const required = (jsonSchema.required as string[]) || [];

      if (!properties) {
        return z.object({}).passthrough();
      }

      const shape: Record<string, z.ZodTypeAny> = {};
      for (const [key, propSchema] of Object.entries(properties)) {
        let propZod = jsonSchemaToZod(propSchema as Record<string, unknown>);

        // Add description if present
        const description = (propSchema as Record<string, unknown>).description as
          | string
          | undefined;
        if (description) {
          propZod = propZod.describe(description);
        }

        // Make optional if not required
        if (!required.includes(key)) {
          propZod = propZod.optional();
        }

        shape[key] = propZod;
      }

      return z.object(shape);
    }
  }
}

/**
 * Converts an MCP tool to a Vercel AI SDK CoreTool.
 *
 * @param tool - The MCP tool definition
 * @param mcpManager - The MCP client manager for executing the tool
 * @returns A CoreTool compatible with Vercel AI SDK
 */
export function mcpToolToCoreTool(
  tool: MCPTool,
  mcpManager: MCPClientManager,
): CoreTool {
  const inputSchema = tool.inputSchema as Record<string, unknown>;
  const zodSchema = jsonSchemaToZod(inputSchema);

  return {
    description: tool.description || `MCP tool: ${tool.name}`,
    parameters: zodSchema as z.ZodObject<any>,
    execute: async (args: Record<string, unknown>) => {
      return mcpManager.callTool(tool.name, args);
    },
  };
}

/**
 * Converts all MCP tools from a manager to CoreTools.
 *
 * @param mcpManager - The MCP client manager
 * @returns Record of tool name to CoreTool
 */
export function mcpToolsToCore(
  mcpManager: MCPClientManager,
): Record<string, CoreTool> {
  const tools = mcpManager.getAllTools();
  const coreTools: Record<string, CoreTool> = {};

  for (const tool of tools) {
    // Prefix with server name to avoid conflicts
    const toolName = `mcp_${tool.serverName.replace(/[^a-zA-Z0-9]/g, '_')}_${tool.name}`;
    coreTools[toolName] = mcpToolToCoreTool(tool, mcpManager);
  }

  return coreTools;
}

/**
 * Converts an agent to a CoreTool that can be used by other agents.
 *
 * @param config - Agent tool configuration
 * @returns A CoreTool that wraps the agent
 */
export function agentToCoreTool(config: AgentToolConfig): CoreTool {
  const { agentClass, description, name } = config;
  const toolName = name || agentClass.name;

  return {
    description,
    parameters: z.object({
      input: z.string().describe('The input to pass to the agent'),
    }),
    execute: async ({ input }: { input: string }) => {
      const agent = new agentClass();
      try {
        const result = await agent.run(input);
        // Convert result to string for the parent agent
        if (typeof result === 'string') {
          return result;
        }
        return JSON.stringify(result);
      } finally {
        // Cleanup agent if it has MCP connections
        if (typeof agent.cleanup === 'function') {
          await agent.cleanup();
        }
      }
    },
  };
}

/**
 * Converts multiple agent configs to CoreTools.
 *
 * @param configs - Array of agent tool configurations
 * @returns Record of tool name to CoreTool
 */
export function agentToolsToCore(configs: AgentToolConfig[]): Record<string, CoreTool> {
  const coreTools: Record<string, CoreTool> = {};

  for (const config of configs) {
    const toolName = config.name || config.agentClass.name;
    coreTools[toolName] = agentToCoreTool(config);
  }

  return coreTools;
}
