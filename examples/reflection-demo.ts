/**
 * Reflection Engine Demo
 *
 * Demonstrates the agent's self-reflection and metacognition capabilities
 */

import { AgentRuntime } from '../src';
import 'dotenv/config';

async function main() {
  console.log('=== RecallBricks Agent Runtime - Reflection Demo ===\n');

  const agent = new AgentRuntime({
    agentId: 'reflective-agent',
    userId: 'demo_user',
    agentName: 'ReflectiveBot',
    agentPurpose: 'Demonstrate self-reflection and metacognition',
    llmProvider: 'anthropic',
    llmApiKey: process.env.ANTHROPIC_API_KEY || '',
    apiKey: process.env.RECALLBRICKS_API_KEY,
    debug: true,
  });

  console.log('Agent initialized\n');

  // Have a conversation to give the agent something to reflect on
  const messages = [
    "I need help planning a vacation to Japan",
    "What's the best time to visit?",
    "What about the budget? How much should I plan for?",
    "Any specific places you'd recommend?",
    "Thanks, that's helpful!",
  ];

  console.log('--- Conversation ---\n');

  for (const message of messages) {
    console.log(`User: ${message}`);
    const response = await agent.chat(message);
    console.log(`Agent: ${response.response.slice(0, 200)}...`);
    console.log('');
  }

  // Trigger manual reflection
  console.log('--- Triggering Reflection ---\n');

  try {
    const reflection = await agent.reflect();

    console.log('Reflection completed!');
    console.log(`Type: ${reflection.type}`);
    console.log(`Confidence: ${(reflection.confidence * 100).toFixed(1)}%`);
    console.log('\nInsights:');
    reflection.insights.forEach((insight, i) => {
      console.log(`  ${i + 1}. ${insight}`);
    });
    console.log('\nFull reflection:');
    console.log(reflection.content.slice(0, 500) + '...');
  } catch (error: any) {
    console.log(`Reflection error: ${error.message}`);
  }

  // Get explanation for a query (Chain of Thought)
  console.log('\n--- Explain Query (Chain of Thought) ---\n');

  try {
    const explanation = await agent.explain('What vacation recommendations did I give?');

    console.log('Reasoning Trace:');
    explanation.steps.forEach((step, i) => {
      console.log(`  Step ${i + 1}: ${step.thought}`);
    });
    console.log(`\nConclusion: ${explanation.conclusion}`);
    console.log(`Confidence: ${(explanation.confidence * 100).toFixed(1)}%`);
    console.log(`Memory references: ${explanation.memoryReferences.join(', ') || 'none'}`);
  } catch (error: any) {
    console.log(`Explain error: ${error.message}`);
  }

  // Check reflection history
  console.log('\n--- Reflection History ---\n');
  const history = agent.getReflectionHistory();
  console.log(`Total reflections: ${history.length}`);

  // Cleanup
  await agent.shutdown();
  console.log('\nDone!');
}

main().catch(console.error);
