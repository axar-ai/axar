/**
 * MCP Agent Example
 *
 * This example demonstrates how to use MCP (Model Context Protocol) servers
 * with AXAR agents. MCP allows agents to connect to external tool providers
 * at runtime, enabling:
 *
 * 1. Dynamic tool discovery from MCP servers
 * 2. Agent-to-agent composition via @agentTool
 * 3. Hybrid usage of local @tool methods and MCP tools
 *
 * To run this example, you'll need an MCP server running.
 * Example MCP servers:
 * - @anthropic/mcp-server-filesystem (file operations)
 * - @anthropic/mcp-server-github (GitHub API)
 * - Custom MCP servers for your specific tools
 */

import {
  Agent,
  model,
  systemPrompt,
  tool,
  mcpServers,
  agentTool,
  output,
  schema,
  property,
} from '../src';

// ============================================
// Example 1: Simple MCP Agent with Filesystem Tools
// ============================================

/**
 * An agent that can read and write files using MCP filesystem server.
 *
 * To use this, start the filesystem MCP server:
 * npx -y @anthropic/mcp-server-filesystem /path/to/allowed/directory
 */
@model('openai:gpt-4o-mini')
@systemPrompt('You are a helpful file assistant. Help users read and manage files.')
@mcpServers([
  {
    command: 'npx',
    args: ['-y', '@anthropic/mcp-server-filesystem', '/tmp'],
  },
])
export class FileAssistantAgent extends Agent<string, string> {}

// ============================================
// Example 2: Agent with Multiple MCP Servers
// ============================================

@schema('Analysis result')
class AnalysisResult {
  @property('Summary of the analysis')
  summary!: string;

  @property('Key findings')
  findings!: string[];

  @property('Recommended actions')
  recommendations!: string[];
}

/**
 * An agent that combines multiple MCP servers for comprehensive analysis.
 */
@model('openai:gpt-4o-mini', { maxSteps: 5 })
@systemPrompt(`You are a code analysis assistant.
Use the available tools to analyze code repositories and provide insights.`)
@mcpServers([
  // Filesystem tools for reading code
  {
    command: 'npx',
    args: ['-y', '@anthropic/mcp-server-filesystem', '.'],
  },
  // GitHub tools for repo analysis (if available)
  // {
  //   command: 'npx',
  //   args: ['-y', '@anthropic/mcp-server-github'],
  //   env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN || '' },
  // },
])
@output(AnalysisResult)
export class CodeAnalysisAgent extends Agent<string, AnalysisResult> {}

// ============================================
// Example 3: Agent Composition with @agentTool
// ============================================

/**
 * A specialized research agent that gathers information.
 */
@model('openai:gpt-4o-mini')
@systemPrompt('You are a research specialist. Gather comprehensive information on topics.')
export class ResearchAgent extends Agent<string, string> {}

/**
 * A specialized writing agent that creates content.
 */
@model('openai:gpt-4o-mini')
@systemPrompt('You are a technical writer. Create clear, well-structured content.')
export class WriterAgent extends Agent<string, string> {}

/**
 * An orchestrator agent that delegates to specialized agents.
 * This demonstrates agent-to-agent composition using @agentTool.
 */
@model('openai:gpt-4o-mini', { maxSteps: 5 })
@systemPrompt(`You are a project manager that coordinates specialized agents.
When asked to create content:
1. First use ResearchAgent to gather information
2. Then use WriterAgent to create the final content
Delegate appropriately based on the task.`)
@agentTool(ResearchAgent, 'Research and gather information on any topic')
@agentTool(WriterAgent, 'Write and create well-structured content')
export class OrchestratorAgent extends Agent<string, string> {}

// ============================================
// Example 4: Hybrid Agent (Local + MCP + Agent Tools)
// ============================================

@schema('Report output')
class Report {
  @property('Report title')
  title!: string;

  @property('Report content')
  content!: string;

  @property('Generated timestamp')
  timestamp!: string;
}

/**
 * A hybrid agent demonstrating all three tool types:
 * 1. Local @tool methods
 * 2. MCP server tools
 * 3. Agent tools via @agentTool
 */
@model('openai:gpt-4o-mini', { maxSteps: 5 })
@systemPrompt(`You are a comprehensive assistant with access to:
- Local utilities (timestamps, formatting)
- File system tools (via MCP)
- Research capabilities (via agent delegation)
Use the appropriate tools for each task.`)
@mcpServers([
  {
    command: 'npx',
    args: ['-y', '@anthropic/mcp-server-filesystem', '/tmp'],
  },
])
@agentTool(ResearchAgent, 'Delegate research tasks to the research agent')
@output(Report)
export class HybridAgent extends Agent<string, Report> {
  /**
   * Local tool: Get current timestamp
   */
  @tool('Get the current date and time')
  getCurrentTime(): string {
    return new Date().toISOString();
  }

  /**
   * Local tool: Format text
   */
  @tool('Format text as a title (uppercase with underlines)')
  formatAsTitle(params: { text: string }): string {
    const title = params.text.toUpperCase();
    const underline = '='.repeat(title.length);
    return `${title}\n${underline}`;
  }
}

// ============================================
// Example Usage (async main function)
// ============================================

async function main() {
  console.log('MCP Agent Examples\n');

  // Example 1: Using agent with MCP filesystem tools
  // Note: Requires MCP filesystem server to be available
  console.log('--- Example 1: File Assistant ---');
  const fileAgent = new FileAssistantAgent();
  try {
    // This would use MCP filesystem tools to list files
    // const result = await fileAgent.run('List the files in the current directory');
    // console.log(result);
    console.log('(Skipped - requires MCP server to be running)');
  } finally {
    await fileAgent.cleanup();
  }

  // Example 3: Agent composition
  console.log('\n--- Example 3: Agent Orchestration ---');
  const orchestrator = new OrchestratorAgent();
  try {
    // This delegates to ResearchAgent and WriterAgent
    // const result = await orchestrator.run(
    //   'Create a brief summary about TypeScript decorators'
    // );
    // console.log(result);
    console.log('(Skipped - requires API keys to be configured)');
  } finally {
    await orchestrator.cleanup();
  }

  // Example 4: Hybrid agent
  console.log('\n--- Example 4: Hybrid Agent ---');
  const hybrid = new HybridAgent();
  try {
    // This uses local tools, MCP tools, and agent tools
    // const report = await hybrid.run(
    //   'Create a report about the current time and files in /tmp'
    // );
    // console.log(report);
    console.log('(Skipped - requires MCP server and API keys)');
  } finally {
    await hybrid.cleanup();
  }

  console.log('\nDone!');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
