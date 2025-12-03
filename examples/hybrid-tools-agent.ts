/**
 * Hybrid Tools Agent Example
 *
 * This example demonstrates combining local @tool methods with @agentTool
 * for agent composition. The agent has access to both:
 * 1. Local tools (defined as methods)
 * 2. Other agents as tools (via @agentTool)
 *
 * Run with: npx ts-node examples/hybrid-tools-agent.ts
 * Requires: OPENAI_API_KEY environment variable
 */

import { z } from 'zod';
import {
  Agent,
  model,
  systemPrompt,
  tool,
  agentTool,
  output,
  schema,
  property,
  arrayItems,
} from '../src';

// ============================================
// Schema Definitions
// ============================================

@schema('Weather information')
class WeatherInfo {
  @property('City name')
  city!: string;

  @property('Temperature in Celsius')
  temperature!: number;

  @property('Weather condition')
  condition!: string;
}

@schema('Task result with metadata')
class TaskResult {
  @property('The result of the task')
  result!: string;

  @property('Tools that were used')
  @arrayItems(() => String)
  toolsUsed!: string[];

  @property('Timestamp of completion')
  timestamp!: string;
}

// ============================================
// Specialized Agent
// ============================================

/**
 * A fact-checking agent that verifies information.
 */
@model('openai:gpt-4o-mini')
@systemPrompt(`You are a fact-checker. When given a claim:
1. Analyze whether it's likely true, false, or uncertain
2. Provide a brief explanation
3. Give a confidence level (high, medium, low)
Be objective and evidence-based.`)
export class FactCheckerAgent extends Agent<string, string> {}

// ============================================
// Hybrid Agent with Local Tools + Agent Tools
// ============================================

/**
 * An assistant with both local tools and agent tools.
 * Demonstrates the hybrid approach.
 */
@model('openai:gpt-4o-mini', { maxSteps: 5 })
@systemPrompt(`You are a helpful assistant with various capabilities:

LOCAL TOOLS:
- getCurrentTime: Get the current date and time
- getWeather: Get weather for a city (simulated)
- calculateTip: Calculate tip amount for a bill

AGENT TOOLS:
- FactCheckerAgent: Verify claims and check facts

Use the appropriate tools based on the user's request.
Always report which tools you used in your response.`)
@agentTool(FactCheckerAgent, 'Verify claims and check facts')
@output(TaskResult)
export class HybridAssistant extends Agent<string, TaskResult> {
  /**
   * Get current date and time
   */
  @tool('Get the current date and time in ISO format')
  getCurrentTime(): string {
    return new Date().toISOString();
  }

  /**
   * Get weather for a city (simulated)
   */
  @tool(
    'Get current weather for a city',
    z.object({
      city: z.string().describe('The city name'),
    }),
  )
  getWeather(params: { city: string }): WeatherInfo {
    // Simulated weather data
    const weatherData: Record<string, WeatherInfo> = {
      'new york': { city: 'New York', temperature: 22, condition: 'Sunny' },
      london: { city: 'London', temperature: 15, condition: 'Cloudy' },
      tokyo: { city: 'Tokyo', temperature: 28, condition: 'Humid' },
      paris: { city: 'Paris', temperature: 18, condition: 'Partly Cloudy' },
      sydney: { city: 'Sydney', temperature: 25, condition: 'Clear' },
    };

    const cityLower = params.city.toLowerCase();
    return (
      weatherData[cityLower] || {
        city: params.city,
        temperature: 20,
        condition: 'Unknown',
      }
    );
  }

  /**
   * Calculate tip for a bill
   */
  @tool(
    'Calculate tip amount for a restaurant bill',
    z.object({
      billAmount: z.number().describe('The bill amount in dollars'),
      tipPercentage: z
        .number()
        .optional()
        .describe('Tip percentage (default 18%)'),
    }),
  )
  calculateTip(params: { billAmount: number; tipPercentage?: number }): string {
    const percentage = params.tipPercentage ?? 18;
    const tipAmount = (params.billAmount * percentage) / 100;
    const total = params.billAmount + tipAmount;

    return `Bill: $${params.billAmount.toFixed(2)}, Tip (${percentage}%): $${tipAmount.toFixed(2)}, Total: $${total.toFixed(2)}`;
  }
}

// ============================================
// Main Function
// ============================================

async function main() {
  console.log('=== Hybrid Tools Agent Example ===\n');

  const assistant = new HybridAssistant();

  try {
    // Test 1: Local tool - Get time
    console.log('Test 1: Local Tool (Time)');
    console.log('Question: What time is it?');
    const timeResult = await assistant.run('What time is it right now?');
    console.log('Result:', JSON.stringify(timeResult, null, 2));
    console.log();

    // Test 2: Local tool - Weather
    console.log('Test 2: Local Tool (Weather)');
    console.log('Question: What is the weather in Tokyo?');
    const weatherResult = await assistant.run(
      "What's the weather like in Tokyo?",
    );
    console.log('Result:', JSON.stringify(weatherResult, null, 2));
    console.log();

    // Test 3: Local tool - Tip calculator
    console.log('Test 3: Local Tool (Tip Calculator)');
    console.log('Question: Calculate 20% tip on a $85 bill');
    const tipResult = await assistant.run(
      'I have a restaurant bill of $85. Calculate a 20% tip.',
    );
    console.log('Result:', JSON.stringify(tipResult, null, 2));
    console.log();

    // Test 4: Agent tool - Fact checking
    console.log('Test 4: Agent Tool (Fact Checker)');
    console.log('Question: Is it true that water boils at 100°C at sea level?');
    const factResult = await assistant.run(
      'Please verify: Water boils at 100 degrees Celsius at sea level.',
    );
    console.log('Result:', JSON.stringify(factResult, null, 2));
    console.log();

    // Test 5: Multiple tools
    console.log('Test 5: Multiple Tools');
    console.log(
      'Question: What time is it, and what is the weather in London?',
    );
    const multiResult = await assistant.run(
      'Tell me the current time and the weather in London.',
    );
    console.log('Result:', JSON.stringify(multiResult, null, 2));

  } finally {
    await assistant.cleanup();
  }

  console.log('\n=== Done ===');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
