/**
 * Agent Composition Example
 *
 * This example demonstrates how to use @agentTool to compose agents.
 * One agent can delegate tasks to other specialized agents.
 *
 * Run with: npx ts-node examples/agent-composition.ts
 * Requires: OPENAI_API_KEY environment variable
 */

import { Agent, model, systemPrompt, agentTool } from '../src';

// ============================================
// Specialized Agents
// ============================================

/**
 * A math expert agent that performs calculations.
 */
@model('openai:gpt-4o-mini')
@systemPrompt(`You are a math expert. When given a math problem:
1. Show your work step by step
2. Provide the final answer clearly
Be concise but thorough.`)
export class MathAgent extends Agent<string, string> {}

/**
 * A translator agent that translates text.
 */
@model('openai:gpt-4o-mini')
@systemPrompt(`You are a professional translator.
Translate the given text accurately while preserving meaning and tone.
If no target language is specified, translate to Spanish.`)
export class TranslatorAgent extends Agent<string, string> {}

/**
 * A summarizer agent that creates concise summaries.
 */
@model('openai:gpt-4o-mini')
@systemPrompt(`You are an expert at summarizing content.
Create clear, concise summaries that capture the key points.
Keep summaries to 2-3 sentences unless otherwise specified.`)
export class SummarizerAgent extends Agent<string, string> {}

// ============================================
// Orchestrator Agent
// ============================================

/**
 * An orchestrator that can delegate to specialized agents.
 * This demonstrates the @agentTool decorator for agent composition.
 */
@model('openai:gpt-4o-mini', { maxSteps: 5 })
@systemPrompt(`You are a helpful assistant with access to specialized agents.

Available specialists:
- MathAgent: For math problems and calculations
- TranslatorAgent: For translating text to other languages
- SummarizerAgent: For summarizing long content

When a user's request matches a specialist's expertise, delegate to that agent.
You can chain multiple agents if needed (e.g., solve math then translate the result).
Always provide the final result to the user.`)
@agentTool(MathAgent, 'Solve math problems and perform calculations')
@agentTool(TranslatorAgent, 'Translate text to other languages')
@agentTool(SummarizerAgent, 'Summarize long content into key points')
export class AssistantAgent extends Agent<string, string> {}

// ============================================
// Main Function
// ============================================

async function main() {
  console.log('=== Agent Composition Example ===\n');

  const assistant = new AssistantAgent();

  try {
    // Test 1: Math delegation
    console.log('Test 1: Math Problem');
    console.log('Question: What is 15% of 240?');
    const mathResult = await assistant.run('What is 15% of 240?');
    console.log('Answer:', mathResult);
    console.log();

    // Test 2: Translation delegation
    console.log('Test 2: Translation');
    console.log('Request: Translate "Hello, how are you?" to French');
    const translateResult = await assistant.run(
      'Translate "Hello, how are you?" to French',
    );
    console.log('Result:', translateResult);
    console.log();

    // Test 3: Summarization delegation
    console.log('Test 3: Summarization');
    const longText = `
      The Model Context Protocol (MCP) is an open protocol that enables seamless
      integration between LLM applications and external data sources and tools.
      Whether you're building an AI-powered IDE, enhancing a chat interface, or
      creating custom AI workflows, MCP provides a standardized way to connect
      LLMs with the context they need. MCP helps you build agents and complex
      workflows on top of LLMs by providing a universal, open standard for
      connecting AI systems with data sources.
    `;
    console.log('Request: Summarize the following text about MCP');
    const summaryResult = await assistant.run(`Summarize this: ${longText}`);
    console.log('Summary:', summaryResult);
    console.log();

    // Test 4: Chained delegation (math + translate)
    console.log('Test 4: Chained Delegation');
    console.log('Request: Calculate 25 * 4 and translate the result to Spanish');
    const chainedResult = await assistant.run(
      'Calculate 25 * 4 and translate the answer to Spanish',
    );
    console.log('Result:', chainedResult);

  } finally {
    await assistant.cleanup();
  }

  console.log('\n=== Done ===');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
