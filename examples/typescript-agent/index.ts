/**
 * TypeScript SDK Example
 *
 * Basic usage of the RecallBricks Agent Runtime in TypeScript
 */

import { AgentRuntime } from '../../src';

async function main() {
  console.log('RecallBricks TypeScript SDK Example\n');

  // Initialize the runtime
  const runtime = new AgentRuntime({
    agentId: 'sales_assistant',
    userId: 'customer_456',
    llmProvider: 'anthropic',
    llmApiKey: process.env.ANTHROPIC_API_KEY || '',
    tier: 'starter',
    debug: true,
  });

  console.log('Runtime initialized successfully\n');

  // Get agent identity
  const identity = await runtime.getIdentity();
  console.log('Agent Identity:');
  console.log(`  Name: ${identity?.name}`);
  console.log(`  Purpose: ${identity?.purpose}`);
  console.log(`  Traits: ${identity?.traits.join(', ')}\n`);

  // Get current context
  const context = await runtime.getContext();
  console.log('Memory Context:');
  console.log(`  Total memories: ${context?.totalMemories}`);
  console.log(`  Recent memories: ${context?.recentMemories.length}\n`);

  // Chat with the agent
  console.log('Conversation:\n');

  const messages = [
    "Hi! I'm interested in your premium plan.",
    "What are the key features?",
    "How much does it cost?",
    "Can you remind me what features we just discussed?",
  ];

  for (const message of messages) {
    console.log(`User: ${message}`);

    const response = await runtime.chat(message);

    console.log(`Agent: ${response.response}`);
    console.log(`  [Model: ${response.metadata.model}]`);
    console.log(`  [Tokens: ${response.metadata.tokensUsed}]`);
    console.log(`  [Identity validated: ${response.metadata.identityValidated}]\n`);
  }

  // Flush pending saves
  console.log('Flushing pending saves...');
  await runtime.flush();
  console.log('All conversations saved!\n');

  // Get validation stats
  const stats = runtime.getValidationStats();
  if (stats) {
    console.log('Identity Validation Stats:');
    console.log(`  Total violations: ${stats.total}`);
    console.log(`  By type:`, stats.byType);
    console.log(`  By severity:`, stats.bySeverity);
  }
}

main().catch(console.error);
