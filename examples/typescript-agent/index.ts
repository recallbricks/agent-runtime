/**
 * TypeScript SDK Example
 *
 * Basic usage of the RecallBricks Agent Runtime in TypeScript
 * Including autonomous agent features (v1.3.0+)
 */

import { AgentRuntime } from '../../src';

async function main() {
  console.log('RecallBricks TypeScript SDK Example\n');
  console.log('Version: 1.3.0 with Autonomous Agent Integration\n');

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

  // ============================================================================
  // Autonomous Agent Features (v1.3.0)
  // ============================================================================

  console.log('=== Autonomous Agent Features ===\n');

  // 1. Working Memory Session
  console.log('1. Working Memory Session:\n');
  const session = await runtime.createSession('sales-demo-session');
  console.log(`  Created session: ${session.sessionId}`);

  await session.addEntry('customer_interest', 'premium plan', 60000);
  await session.addEntry('budget_range', '$100-$500/month');
  console.log('  Added entries: customer_interest, budget_range');

  const interest = await session.getEntry('customer_interest');
  console.log(`  Retrieved: customer_interest = ${interest?.value}\n`);

  // 2. Goal Tracking
  console.log('2. Goal Tracking:\n');
  const goal = await runtime.trackGoal('complete-sale', [
    'Identify customer needs',
    'Present relevant features',
    'Address objections',
    'Close the sale',
  ]);
  console.log(`  Goal: ${goal.goalId}`);
  console.log(`  Steps: ${goal.steps.length}`);
  console.log(`  Status: ${goal.status}`);

  // Complete first step
  await goal.completeStep(1);
  console.log(`  Completed step 1 - Progress: ${(goal.progress * 100).toFixed(0)}%\n`);

  // 3. Metacognition Assessment
  console.log('3. Metacognition Assessment:\n');
  const assessment = await runtime.assessResponse(
    'Based on your requirements, I recommend our Premium Plan at $299/month.',
    0.85
  );
  console.log(`  Confidence: ${assessment.confidence}`);
  console.log(`  Needs reflection: ${assessment.needsReflection}`);
  console.log(`  Suggestions: ${assessment.suggestions.length > 0 ? assessment.suggestions.join(', ') : 'None'}\n`);

  // ============================================================================
  // Standard Chat Flow
  // ============================================================================

  console.log('=== Standard Conversation ===\n');

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

    // Autonomous: Assess each response
    const responseAssessment = await runtime.metacognition.assessResponse(
      response.response,
      0.8
    );
    if (responseAssessment.needsReflection) {
      console.log('  [Metacognition: Reflection recommended]\n');
    }
  }

  // Persist working memory session
  console.log('Persisting working memory session...');
  await session.persist();
  console.log('Session persisted!\n');

  // Complete remaining goal steps
  await goal.completeStep(2);
  await goal.completeStep(3);
  await goal.completeStep(4);
  console.log(`Goal completed! Final status: ${goal.status}\n`);

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

  // Get metacognition stats
  const avgConfidence = await runtime.metacognition.getAverageConfidence();
  console.log(`\nMetacognition Stats:`);
  console.log(`  Average confidence: ${(avgConfidence * 100).toFixed(1)}%`);
}

main().catch(console.error);
