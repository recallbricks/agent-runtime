# RecallBricks Agent Runtime - Examples

Working code examples for the RecallBricks Agent Runtime v1.0.0.

## Table of Contents

- [Basic Agent with Runtime](#basic-agent-with-runtime)
- [Using Working Memory](#using-working-memory)
- [Goal Tracking](#goal-tracking)
- [Response Assessment](#response-assessment)
- [Complete Autonomous Agent](#complete-autonomous-agent)
- [Multi-User Support](#multi-user-support)
- [Self-Reflection](#self-reflection)

---

## Basic Agent with Runtime

The simplest way to use the AgentRuntime with persistent memory.

```typescript
import { AgentRuntime } from '@recallbricks/runtime';

async function main() {
  // Initialize the runtime
  const runtime = new AgentRuntime({
    agentId: 'support_bot',
    userId: 'customer_001',
    llmProvider: 'anthropic',
    llmApiKey: process.env.ANTHROPIC_API_KEY!,
    tier: 'starter',
    debug: true,
  });

  console.log(`Runtime version: ${runtime.getVersion()}`);

  // Get agent identity
  const identity = runtime.getIdentity();
  console.log(`Agent: ${identity?.name}`);
  console.log(`Purpose: ${identity?.purpose}`);

  // Chat with memory
  const response1 = await runtime.chat('Hi! My order #12345 is late.');
  console.log(`Bot: ${response1.response}`);

  const response2 = await runtime.chat('What was my order number again?');
  console.log(`Bot: ${response2.response}`);
  // The agent remembers the order number!

  // Ensure all conversations are saved
  await runtime.shutdown();
}

main().catch(console.error);
```

---

## Using Working Memory

Store temporary task state during autonomous operations.

```typescript
import { AgentRuntime } from '@recallbricks/runtime';

async function workingMemoryExample() {
  const runtime = new AgentRuntime({
    agentId: 'task_agent',
    userId: 'user_123',
    llmProvider: 'anthropic',
    llmApiKey: process.env.ANTHROPIC_API_KEY!,
  });

  // Create a working memory session
  const session = await runtime.createSession('data-analysis-001');

  // Store task context
  await session.addEntry('task_type', 'data_analysis');
  await session.addEntry('dataset', {
    name: 'sales_q4_2024.csv',
    rows: 10000,
    columns: ['date', 'product', 'amount', 'region'],
  });

  // Store temporary calculations with TTL (5 minutes)
  await session.addEntry('intermediate_results', {
    total_sales: 1500000,
    avg_order: 150,
  }, 300000);

  // Retrieve entries
  const dataset = await session.getEntry('dataset');
  console.log(`Analyzing: ${dataset?.value.name}`);

  const results = await session.getEntry('intermediate_results');
  console.log(`Total sales: $${results?.value.total_sales}`);

  // Use with chat for context
  const response = await runtime.chat(
    `Summarize the analysis for ${dataset?.value.name}`
  );
  console.log(response.response);

  // Persist session to long-term memory
  await session.persist();

  // Clean up
  await session.clear();

  await runtime.shutdown();
}

workingMemoryExample().catch(console.error);
```

### Session Management

```typescript
import { AgentRuntime } from '@recallbricks/runtime';

async function sessionManagement() {
  const runtime = new AgentRuntime({
    agentId: 'task_agent',
    userId: 'user_123',
    llmProvider: 'anthropic',
    llmApiKey: process.env.ANTHROPIC_API_KEY!,
  });

  // Create multiple sessions
  await runtime.createSession('task-001');
  await runtime.createSession('task-002');
  await runtime.createSession('task-003');

  // List all sessions
  const sessions = await runtime.workingMemory.listSessions();
  console.log('Active sessions:', sessions);
  // ['task-001', 'task-002', 'task-003']

  // Get a specific session
  const task1 = await runtime.workingMemory.getSession('task-001');
  if (task1) {
    await task1.addEntry('status', 'in_progress');
  }

  // Access sessions from different parts of code
  const sameSession = await runtime.workingMemory.getSession('task-001');
  const status = await sameSession?.getEntry('status');
  console.log(`Task 1 status: ${status?.value}`);

  await runtime.shutdown();
}
```

---

## Goal Tracking

Track multi-step goals with automatic progress calculation.

```typescript
import { AgentRuntime } from '@recallbricks/runtime';

async function goalTrackingExample() {
  const runtime = new AgentRuntime({
    agentId: 'project_manager',
    userId: 'pm_001',
    llmProvider: 'anthropic',
    llmApiKey: process.env.ANTHROPIC_API_KEY!,
  });

  // Create a goal with steps
  const goal = await runtime.trackGoal('user-onboarding', [
    'Send welcome email',
    'Collect user preferences',
    'Setup workspace',
    'Complete tutorial',
  ]);

  console.log(`Goal: ${goal.goalId}`);
  console.log(`Status: ${goal.status}`);
  console.log(`Progress: ${goal.progress * 100}%`);
  console.log(`Steps: ${goal.steps.length}`);

  // Complete steps one by one
  console.log('\n--- Executing steps ---\n');

  // Step 1
  console.log('Sending welcome email...');
  await simulateWork(500);
  await goal.completeStep(1);
  console.log(`Progress: ${goal.progress * 100}%`);

  // Step 2
  console.log('Collecting preferences...');
  await simulateWork(300);
  await goal.completeStep(2);
  console.log(`Progress: ${goal.progress * 100}%`);

  // Step 3
  console.log('Setting up workspace...');
  await simulateWork(400);
  await goal.completeStep(3);
  console.log(`Progress: ${goal.progress * 100}%`);

  // Step 4
  console.log('Completing tutorial...');
  await simulateWork(600);
  await goal.completeStep(4);
  console.log(`Progress: ${goal.progress * 100}%`);

  // Check final status
  console.log(`\nFinal status: ${goal.status}`);
  console.log(`Completed at: ${goal.completedAt}`);

  await runtime.shutdown();
}

function simulateWork(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

goalTrackingExample().catch(console.error);
```

### Handling Failures

```typescript
import { AgentRuntime } from '@recallbricks/runtime';

async function goalWithFailureHandling() {
  const runtime = new AgentRuntime({
    agentId: 'task_agent',
    userId: 'user_123',
    llmProvider: 'anthropic',
    llmApiKey: process.env.ANTHROPIC_API_KEY!,
  });

  const goal = await runtime.trackGoal('data-pipeline', [
    'Load data from source',
    'Validate data format',
    'Transform data',
    'Save to destination',
  ]);

  try {
    // Step 1: Success
    await goal.completeStep(1);
    console.log('Data loaded');

    // Step 2: Simulate failure
    throw new Error('Invalid data format: missing required columns');

  } catch (error) {
    // Mark current step as failed
    await goal.failStep(2, error.message);

    console.log(`Goal failed at step 2`);
    console.log(`Status: ${goal.status}`);
    console.log(`Reason: ${goal.steps[1].failureReason}`);
  }

  // List all goals to see status
  const allGoals = await runtime.goals.listGoals();
  for (const g of allGoals) {
    console.log(`${g.goalId}: ${g.status} (${g.progress * 100}%)`);
  }

  await runtime.shutdown();
}
```

### Cancelling Goals

```typescript
import { AgentRuntime } from '@recallbricks/runtime';

async function cancelGoalExample() {
  const runtime = new AgentRuntime({
    agentId: 'task_agent',
    userId: 'user_123',
    llmProvider: 'anthropic',
    llmApiKey: process.env.ANTHROPIC_API_KEY!,
  });

  // Start a long-running goal
  const goal = await runtime.trackGoal('long-task', [
    'Step 1',
    'Step 2',
    'Step 3',
    'Step 4',
    'Step 5',
  ]);

  await goal.completeStep(1);
  await goal.completeStep(2);

  // User decides to cancel
  console.log('User requested cancellation...');
  const cancelled = await runtime.goals.cancelGoal('long-task');

  if (cancelled) {
    console.log(`Goal cancelled at ${goal.progress * 100}% progress`);
    console.log(`Final status: ${goal.status}`);
  }

  await runtime.shutdown();
}
```

---

## Response Assessment

Use metacognition to assess response quality and trigger improvements.

```typescript
import { AgentRuntime } from '@recallbricks/runtime';

async function responseAssessmentExample() {
  const runtime = new AgentRuntime({
    agentId: 'advisor_bot',
    userId: 'client_001',
    llmProvider: 'anthropic',
    llmApiKey: process.env.ANTHROPIC_API_KEY!,
  });

  // Get a response
  const response = await runtime.chat(
    'Should I invest in cryptocurrency right now?'
  );

  console.log(`Response: ${response.response}\n`);

  // Assess the response (in practice, derive confidence from response)
  const assessment = await runtime.assessResponse(
    response.response,
    0.65 // Moderate confidence
  );

  console.log('--- Assessment ---');
  console.log(`Confidence: ${assessment.confidence}`);
  console.log(`Needs reflection: ${assessment.needsReflection}`);
  console.log(`Suggestions:`);
  for (const suggestion of assessment.suggestions) {
    console.log(`  - ${suggestion}`);
  }

  // Track assessment history
  await runtime.assessResponse('Another response', 0.85);
  await runtime.assessResponse('Third response', 0.45);

  const history = await runtime.metacognition.getAssessmentHistory();
  console.log(`\nTotal assessments: ${history.length}`);

  const avgConfidence = await runtime.metacognition.getAverageConfidence();
  console.log(`Average confidence: ${(avgConfidence * 100).toFixed(1)}%`);

  // Trigger reflection if needed
  if (avgConfidence < 0.7) {
    console.log('\nLow average confidence - triggering reflection...');
    await runtime.metacognition.triggerReflection();
  }

  await runtime.shutdown();
}

responseAssessmentExample().catch(console.error);
```

### Confidence-Based Decision Making

```typescript
import { AgentRuntime, ChatResponse } from '@recallbricks/runtime';

async function confidenceBasedChat() {
  const runtime = new AgentRuntime({
    agentId: 'smart_agent',
    userId: 'user_123',
    llmProvider: 'anthropic',
    llmApiKey: process.env.ANTHROPIC_API_KEY!,
  });

  async function smartChat(message: string): Promise<string> {
    const response = await runtime.chat(message);

    // Estimate confidence (simplified - use NLP in production)
    const confidence = estimateConfidence(response);

    const assessment = await runtime.assessResponse(
      response.response,
      confidence
    );

    // Enhance response based on confidence
    if (confidence < 0.5) {
      return `${response.response}\n\n(Note: I'm not entirely certain about this. Please verify independently.)`;
    } else if (confidence < 0.7) {
      return `${response.response}\n\n(I believe this is correct, but you may want to double-check.)`;
    }

    return response.response;
  }

  // Example usage
  const answer1 = await smartChat('What is 2 + 2?');
  console.log(answer1);

  const answer2 = await smartChat('What will the stock market do tomorrow?');
  console.log(answer2);

  await runtime.shutdown();
}

function estimateConfidence(response: ChatResponse): number {
  const text = response.response.toLowerCase();

  // Check for uncertainty indicators
  if (text.includes('not sure') || text.includes("don't know")) return 0.3;
  if (text.includes('might') || text.includes('perhaps')) return 0.5;
  if (text.includes('likely') || text.includes('probably')) return 0.7;

  // Check response length (very short might indicate uncertainty)
  if (text.length < 50) return 0.6;

  return 0.85;
}
```

---

## Complete Autonomous Agent

Combining all features for a fully autonomous agent.

```typescript
import { AgentRuntime } from '@recallbricks/runtime';

async function autonomousAgent() {
  const runtime = new AgentRuntime({
    agentId: 'research_agent',
    userId: 'researcher_001',
    llmProvider: 'anthropic',
    llmApiKey: process.env.ANTHROPIC_API_KEY!,
    debug: true,
  });

  const taskId = `research-${Date.now()}`;

  // Initialize session
  const session = await runtime.createSession(taskId);
  await session.addEntry('task_type', 'research');
  await session.addEntry('started_at', new Date().toISOString());

  // Define and track goal
  const goal = await runtime.trackGoal(taskId, [
    'Define research question',
    'Gather sources',
    'Analyze information',
    'Synthesize findings',
    'Generate report',
  ]);

  console.log(`Starting research task: ${taskId}`);
  console.log(`Steps: ${goal.steps.length}`);

  // Execute each step with metacognition
  for (let i = 1; i <= goal.steps.length; i++) {
    const stepDesc = goal.steps[i - 1].description;
    console.log(`\n--- Step ${i}: ${stepDesc} ---`);

    await session.addEntry('current_step', i);
    await session.addEntry('step_started', new Date().toISOString());

    try {
      // Execute step via chat
      const prompt = `Execute research step: ${stepDesc}`;
      const response = await runtime.chat(prompt);

      console.log(`Response: ${response.response.substring(0, 200)}...`);

      // Assess the response
      const confidence = 0.7 + Math.random() * 0.3; // Simulate varying confidence
      const assessment = await runtime.assessResponse(
        response.response,
        confidence
      );

      console.log(`Confidence: ${(confidence * 100).toFixed(0)}%`);

      // Store step results
      await session.addEntry(`step_${i}_result`, {
        response: response.response.substring(0, 500),
        confidence: assessment.confidence,
        needsReview: assessment.needsReflection,
      });

      // Handle low confidence
      if (assessment.needsReflection) {
        console.log('Low confidence - flagging for review');
        await session.addEntry(`step_${i}_needs_review`, true);
      }

      // Mark step complete
      await goal.completeStep(i);
      console.log(`Progress: ${(goal.progress * 100).toFixed(0)}%`);

    } catch (error) {
      console.error(`Step ${i} failed: ${error.message}`);
      await goal.failStep(i, error.message);
      await session.addEntry('error', error.message);
      break;
    }
  }

  // Finalize
  await session.addEntry('completed_at', new Date().toISOString());
  await session.addEntry('final_status', goal.status);

  // Report metrics
  const avgConfidence = await runtime.metacognition.getAverageConfidence();
  console.log(`\n--- Task Complete ---`);
  console.log(`Status: ${goal.status}`);
  console.log(`Progress: ${(goal.progress * 100).toFixed(0)}%`);
  console.log(`Average confidence: ${(avgConfidence * 100).toFixed(0)}%`);

  // Persist session for future reference
  await session.persist();

  await runtime.shutdown();
}

autonomousAgent().catch(console.error);
```

---

## Multi-User Support

Handle multiple users with isolated memory.

```typescript
import { AgentRuntime } from '@recallbricks/runtime';

async function multiUserExample() {
  // Create separate runtimes for each user
  const alice = new AgentRuntime({
    agentId: 'support_bot',
    userId: 'alice',
    llmProvider: 'anthropic',
    llmApiKey: process.env.ANTHROPIC_API_KEY!,
  });

  const bob = new AgentRuntime({
    agentId: 'support_bot',
    userId: 'bob',
    llmProvider: 'anthropic',
    llmApiKey: process.env.ANTHROPIC_API_KEY!,
  });

  // Alice's conversation
  await alice.chat('My order #A123 is delayed');
  const aliceResponse = await alice.chat('What is my order number?');
  console.log(`Alice: ${aliceResponse.response}`);
  // References order #A123

  // Bob's conversation (completely isolated)
  await bob.chat('I need to return product #B456');
  const bobResponse = await bob.chat('What product did I mention?');
  console.log(`Bob: ${bobResponse.response}`);
  // References product #B456

  // They don't see each other's data
  const aliceContext = await alice.getContext();
  const bobContext = await bob.getContext();
  console.log(`Alice memories: ${aliceContext?.totalMemories}`);
  console.log(`Bob memories: ${bobContext?.totalMemories}`);

  await alice.shutdown();
  await bob.shutdown();
}

multiUserExample().catch(console.error);
```

---

## Self-Reflection

Trigger and use reflection for self-improvement.

```typescript
import { AgentRuntime } from '@recallbricks/runtime';

async function selfReflectionExample() {
  const runtime = new AgentRuntime({
    agentId: 'learning_agent',
    userId: 'user_123',
    llmProvider: 'anthropic',
    llmApiKey: process.env.ANTHROPIC_API_KEY!,
  });

  // Have some conversations
  await runtime.chat('I prefer detailed explanations');
  await runtime.chat('Can you explain machine learning?');
  await runtime.chat('What about deep learning?');
  await runtime.chat('How do neural networks work?');
  await runtime.chat('Keep it technical please');

  // Trigger manual reflection
  console.log('Triggering reflection...');
  const reflection = await runtime.reflect();

  console.log('\n--- Reflection Results ---');
  console.log('Type:', reflection.type);
  console.log('Trigger:', reflection.triggerCondition);
  console.log('Timestamp:', reflection.timestamp);
  console.log('\nInsights:');
  for (const insight of reflection.insights) {
    console.log(`  - ${insight}`);
  }
  console.log('\nSuggestions:');
  for (const suggestion of reflection.suggestions) {
    console.log(`  - ${suggestion}`);
  }

  // Get reflection history
  const history = runtime.getReflectionHistory();
  console.log(`\nTotal reflections: ${history.length}`);

  // Explain reasoning
  const trace = await runtime.explain('Why do you think I prefer technical content?');
  console.log('\n--- Reasoning Trace ---');
  for (const step of trace.steps) {
    console.log(`Step ${step.stepNumber}: ${step.description}`);
    console.log(`  Reasoning: ${step.reasoning}`);
  }
  console.log(`Conclusion: ${trace.conclusion}`);

  await runtime.shutdown();
}

selfReflectionExample().catch(console.error);
```

---

## Running the Examples

1. **Setup environment:**
   ```bash
   # Create .env file
   echo "ANTHROPIC_API_KEY=your_key_here" > .env
   ```

2. **Install dependencies:**
   ```bash
   npm install @recallbricks/runtime@1.0.0 dotenv
   ```

3. **Create example file:**
   ```typescript
   // example.ts
   import 'dotenv/config';
   import { AgentRuntime } from '@recallbricks/runtime';

   async function main() {
     // Your code here
   }

   main().catch(console.error);
   ```

4. **Run:**
   ```bash
   npx ts-node example.ts
   # or
   npm run build && node dist/example.js
   ```

---

## Additional Resources

- [API Reference](./api-reference.md) - Complete API documentation
- [Autonomous Features](./autonomous-features.md) - Deep dive into autonomous capabilities
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
- [Architecture](./architecture.md) - System design and internals
