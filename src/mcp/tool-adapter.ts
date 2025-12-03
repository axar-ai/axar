import { Tool } from 'ai';
import { z } from 'zod';
import { AgentToolConfig } from './types';

/**
 * Converts an agent to a Tool that can be used by other agents.
 *
 * @param config - Agent tool configuration
 * @returns A Tool that wraps the agent
 */
export function agentToCoreTool(config: AgentToolConfig): Tool {
  const { agentClass, description } = config;

  return {
    description,
    inputSchema: z.object({
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
 * Converts multiple agent configs to Tools.
 *
 * @param configs - Array of agent tool configurations
 * @returns Record of tool name to Tool
 */
export function agentToolsToCore(configs: AgentToolConfig[]): Record<string, Tool> {
  const coreTools: Record<string, Tool> = {};

  for (const config of configs) {
    const toolName = config.name || config.agentClass.name;
    coreTools[toolName] = agentToCoreTool(config);
  }

  return coreTools;
}
