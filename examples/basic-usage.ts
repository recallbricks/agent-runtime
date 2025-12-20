/**
 * Basic Usage Example
 *
 * Simple example showing how to use the RecallBricks Agent Runtime
 */

import { AgentRuntime } from '../src';
import 'dotenv/config';

async function main() {
  console.log('=== RecallBricks Agent Runtime - Basic Usage ===\n');

  // Initialize the runtime
  const agent = new AgentRuntime({
    agentId: 'support-bot',
    userId: 'customer_123',
    agentName: 'SupportBot',
    agentPurpose: 'Help customers with product questions and support',
    llmProvider: 'anthropic',
    llmApiKey: process.env.ANTHROPIC_API_KEY || '',
    apiKey: process.env.RECALLBRICKS_API_KEY,
    debug: true,
  });

  console.log('Agent initialized:', agent.getIdentity().name);
  console.log('Version:', agent.getVersion());
  console.log('');

  // Conversation demonstrating memory
  const messages = [
    'My favorite color is blue',
    'What is my favorite color?',
    'I work as a software engineer',
    'What do you know about me?',
  ];

  console.log('--- Conversation ---\n');

  for (const message of messages) {
    console.log(`User: ${message}`);

    const response = await agent.chat(message);

    console.log(`Agent: ${response.response}`);
    console.log(`  [Model: ${response.metadata.model}, Tokens: ${response.metadata.tokensUsed}]\n`);
  }

  // Save all memories
  console.log('Flushing pending saves...');
  await agent.flush();

  console.log('Shutting down...');
  await agent.shutdown();

  console.log('Done!');
}

main().catch(console.error);
