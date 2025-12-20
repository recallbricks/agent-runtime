/**
 * Multi-Provider Example
 *
 * Shows how to use different LLM providers with the RecallBricks Runtime
 */

import { AgentRuntime, LLMProvider } from '../src';
import 'dotenv/config';

async function createAgent(provider: LLMProvider, apiKey: string, model?: string) {
  return new AgentRuntime({
    agentId: `demo-agent-${provider}`,
    userId: 'demo_user',
    agentName: `DemoBot (${provider})`,
    agentPurpose: 'Demonstrate multi-provider support',
    llmProvider: provider,
    llmApiKey: apiKey,
    llmModel: model,
    apiKey: process.env.RECALLBRICKS_API_KEY,
    debug: false,
  });
}

async function testProvider(agent: AgentRuntime, name: string) {
  console.log(`\n--- Testing ${name} ---`);

  try {
    const response = await agent.chat('Hello! What model are you?');
    console.log(`Response: ${response.response.slice(0, 200)}...`);
    console.log(`Model: ${response.metadata.model}`);
    console.log(`Tokens: ${response.metadata.tokensUsed}`);
    await agent.shutdown();
    console.log('Success!');
  } catch (error: any) {
    console.log(`Error: ${error.message}`);
  }
}

async function main() {
  console.log('=== RecallBricks Agent Runtime - Multi-Provider Demo ===');

  // Anthropic (Claude)
  if (process.env.ANTHROPIC_API_KEY) {
    const agent = await createAgent('anthropic', process.env.ANTHROPIC_API_KEY);
    await testProvider(agent, 'Anthropic Claude');
  } else {
    console.log('\nSkipping Anthropic: ANTHROPIC_API_KEY not set');
  }

  // OpenAI (GPT)
  if (process.env.OPENAI_API_KEY) {
    const agent = await createAgent('openai', process.env.OPENAI_API_KEY);
    await testProvider(agent, 'OpenAI GPT');
  } else {
    console.log('\nSkipping OpenAI: OPENAI_API_KEY not set');
  }

  // Google Gemini
  if (process.env.GOOGLE_API_KEY) {
    const agent = await createAgent('gemini', process.env.GOOGLE_API_KEY);
    await testProvider(agent, 'Google Gemini');
  } else {
    console.log('\nSkipping Gemini: GOOGLE_API_KEY not set');
  }

  // Ollama (local)
  if (process.env.TEST_OLLAMA === 'true') {
    const agent = await createAgent('ollama', 'ollama', 'llama3.2');
    await testProvider(agent, 'Ollama (local)');
  } else {
    console.log('\nSkipping Ollama: TEST_OLLAMA not set to true');
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
