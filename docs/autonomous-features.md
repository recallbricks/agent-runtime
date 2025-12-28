# RecallBricks Agent Runtime - Autonomous Features

Documentation for the autonomous agent capabilities in RecallBricks Agent Runtime v1.0.0.

## Overview

The AgentRuntime includes three autonomous agent systems that enable agents to:
- **Working Memory** - Store and retrieve temporary task state
- **Goal Tracking** - Track multi-step goals with progress monitoring
- **Metacognition** - Self-assess responses and trigger reflections

These systems integrate seamlessly with the core chat and memory functionality.

## Architecture

```
                    AgentRuntime
                         │
     ┌───────────────────┼───────────────────┐
     │                   │                   │
     ▼                   ▼                   ▼
WorkingMemory         Goals           Metacognition
     │                   │                   │
     │                   │                   │
     ▼                   ▼                   ▼
Sessions with        Goal steps        Assessments
key-value entries    and progress      and reflections
```

## Working Memory Client

Working memory provides temporary, session-based storage for autonomous agents to track state during task execution.

### Accessing the Client

```typescript
import { AgentRuntime } from '@recallbricks/runtime';

const runtime = new AgentRuntime({
  agentId: 'my_agent',
  userId: 'user_123',
  llmProvider: 'anthropic',
  llmApiKey: process.env.ANTHROPIC_API_KEY!,
});

// Access via property
const client = runtime.workingMemory;

// Or use convenience method
const session = await runtime.createSession('session-id');
```

### Creating Sessions

```typescript
const session = await runtime.workingMemory.createSession('task-001');

console.log(session.sessionId);  // 'task-001'
console.log(session.agentId);    // 'my_agent'
console.log(session.createdAt);  // ISO timestamp
```

### Adding Entries

Store key-value pairs with optional TTL (time-to-live in milliseconds):

```typescript
// Simple value
await session.addEntry('objective', 'Complete user onboarding');

// Complex object
await session.addEntry('user_preferences', {
  theme: 'dark',
  language: 'en',
  notifications: true,
});

// With TTL (expires after 60 seconds)
await session.addEntry('temp_token', 'abc123', 60000);
```

### Retrieving Entries

```typescript
const entry = await session.getEntry('objective');
if (entry) {
  console.log(entry.key);       // 'objective'
  console.log(entry.value);     // 'Complete user onboarding'
  console.log(entry.timestamp); // ISO timestamp
}

// Expired entries return undefined
const expired = await session.getEntry('temp_token');
// undefined if TTL has passed
```

### Managing Entries

```typescript
// Remove specific entry
const removed = await session.removeEntry('objective');
console.log(removed); // true if found and removed

// Clear all entries
await session.clear();
```

### Persisting Sessions

Save session to long-term memory:

```typescript
await session.persist();
// Session data is saved to RecallBricks API
```

### Session Management

```typescript
// List all session IDs
const sessions = await runtime.workingMemory.listSessions();
console.log(sessions); // ['task-001', 'task-002']

// Get existing session
const existing = await runtime.workingMemory.getSession('task-001');
```

### Use Case: Multi-Step Task

```typescript
async function processDataPipeline(runtime: AgentRuntime, dataUrl: string) {
  // Create session for this task
  const session = await runtime.createSession(`pipeline-${Date.now()}`);

  // Track task state
  await session.addEntry('status', 'initializing');
  await session.addEntry('dataUrl', dataUrl);
  await session.addEntry('startTime', Date.now());

  // Step 1: Load data
  await session.addEntry('status', 'loading');
  const data = await loadData(dataUrl);
  await session.addEntry('rowCount', data.length);

  // Step 2: Process
  await session.addEntry('status', 'processing');
  const results = await processData(data);
  await session.addEntry('results', results);

  // Step 3: Complete
  await session.addEntry('status', 'complete');
  await session.addEntry('endTime', Date.now());

  // Persist for future reference
  await session.persist();

  return results;
}
```

---

## Goals Client

The goals client enables tracking multi-step goals with automatic progress calculation.

### Accessing the Client

```typescript
// Via property
const client = runtime.goals;

// Or convenience method
const goal = await runtime.trackGoal('goal-id', ['step1', 'step2']);
```

### Creating Goals

```typescript
const goal = await runtime.goals.trackGoal('user-onboarding', [
  'Collect user preferences',
  'Setup initial configuration',
  'Create user profile',
  'Send welcome email',
]);

console.log(goal.goalId);   // 'user-onboarding'
console.log(goal.status);   // 'in_progress'
console.log(goal.progress); // 0
console.log(goal.steps);    // Array of GoalStep objects
```

### Goal Step Structure

```typescript
interface GoalStep {
  stepNumber: number;        // 1-based index
  description: string;       // From the steps array
  status: GoalStepStatus;    // 'pending' | 'in_progress' | 'completed' | 'failed'
  completedAt?: string;      // ISO timestamp when completed
  failureReason?: string;    // Reason if failed
}
```

### Completing Steps

```typescript
// Complete step 1
await goal.completeStep(1);
console.log(goal.progress); // 0.25 (1/4 steps)

// Complete remaining steps
await goal.completeStep(2);
await goal.completeStep(3);
await goal.completeStep(4);

console.log(goal.progress);    // 1
console.log(goal.status);      // 'completed'
console.log(goal.completedAt); // ISO timestamp
```

### Failing Steps

```typescript
await goal.failStep(2, 'Configuration service unavailable');

console.log(goal.status); // 'failed'
console.log(goal.steps[1].status);        // 'failed'
console.log(goal.steps[1].failureReason); // 'Configuration service unavailable'
```

### Goal Management

```typescript
// List all active goals
const goals = await runtime.goals.listGoals();
for (const g of goals) {
  console.log(`${g.goalId}: ${g.status} (${g.progress * 100}%)`);
}

// Get specific goal
const goal = await runtime.goals.getGoal('user-onboarding');

// Cancel a goal
const cancelled = await runtime.goals.cancelGoal('user-onboarding');
console.log(cancelled); // true if found
```

### Use Case: Autonomous Task Execution

```typescript
async function executeResearchTask(runtime: AgentRuntime, topic: string) {
  // Create goal with steps
  const goal = await runtime.trackGoal(`research-${topic}`, [
    'Search for relevant sources',
    'Analyze source content',
    'Synthesize findings',
    'Generate summary report',
  ]);

  try {
    // Step 1: Search
    const sources = await searchSources(topic);
    await goal.completeStep(1);

    // Step 2: Analyze
    const analysis = await analyzeSources(sources);
    await goal.completeStep(2);

    // Step 3: Synthesize
    const findings = await synthesize(analysis);
    await goal.completeStep(3);

    // Step 4: Report
    const report = await generateReport(findings);
    await goal.completeStep(4);

    console.log(`Research completed: ${goal.status}`);
    return report;

  } catch (error) {
    // Find current step and mark as failed
    const currentStep = goal.steps.find(s => s.status === 'pending');
    if (currentStep) {
      await goal.failStep(currentStep.stepNumber, error.message);
    }
    throw error;
  }
}
```

---

## Metacognition Client

The metacognition client enables agents to self-assess their responses and trigger reflections when needed.

### Accessing the Client

```typescript
// Via property
const client = runtime.metacognition;

// Or convenience method
const assessment = await runtime.assessResponse(response, confidence);
```

### Assessing Responses

```typescript
const assessment = await runtime.metacognition.assessResponse(
  'Based on the data, I recommend investing in technology stocks.',
  0.72
);

console.log(assessment.timestamp);       // ISO timestamp
console.log(assessment.response);        // Truncated response (max 500 chars)
console.log(assessment.confidence);      // 0.72
console.log(assessment.needsReflection); // true (confidence < 0.7)
console.log(assessment.suggestions);     // Array of improvement suggestions
```

### Understanding Suggestions

The system provides suggestions based on confidence level:

```typescript
// Low confidence (< 0.5)
{
  confidence: 0.4,
  needsReflection: true,
  suggestions: [
    'Consider gathering more context before responding',
    'The response may need verification',
    'Triggering background reflection for self-improvement'
  ]
}

// Moderate confidence (0.5 - 0.7)
{
  confidence: 0.65,
  needsReflection: true,
  suggestions: [
    'Response confidence is moderate - consider follow-up clarification',
    'Triggering background reflection for self-improvement'
  ]
}

// High confidence (>= 0.7)
{
  confidence: 0.85,
  needsReflection: false,
  suggestions: []
}
```

### Assessment History

```typescript
// Get all past assessments
const history = await runtime.metacognition.getAssessmentHistory();
for (const a of history) {
  console.log(`${a.timestamp}: ${a.confidence} - ${a.needsReflection ? 'needs reflection' : 'ok'}`);
}

// Get average confidence across all assessments
const avgConfidence = await runtime.metacognition.getAverageConfidence();
console.log(`Average confidence: ${(avgConfidence * 100).toFixed(1)}%`);
```

### Triggering Reflection

```typescript
// Manually trigger reflection based on metacognition
await runtime.metacognition.triggerReflection();
```

### Use Case: Self-Improving Agent

```typescript
async function smartChat(runtime: AgentRuntime, message: string) {
  // Get response from chat
  const response = await runtime.chat(message);

  // Assess the response (estimate confidence based on context)
  const confidence = estimateConfidence(response, message);
  const assessment = await runtime.assessResponse(response.response, confidence);

  // Log assessment
  console.log(`Response confidence: ${assessment.confidence}`);

  // If low confidence, include caveat
  if (assessment.needsReflection) {
    console.log('Suggestions:', assessment.suggestions);

    // Optionally trigger reflection for future improvement
    if (confidence < 0.5) {
      await runtime.metacognition.triggerReflection();
    }
  }

  // Track metrics
  const avgConfidence = await runtime.metacognition.getAverageConfidence();
  console.log(`Session avg confidence: ${(avgConfidence * 100).toFixed(1)}%`);

  return response;
}

function estimateConfidence(response: ChatResponse, query: string): number {
  // Simple heuristic - in practice, use more sophisticated methods
  const hasUncertainty = /not sure|might|perhaps|could be/i.test(response.response);
  const isShort = response.response.length < 100;

  if (hasUncertainty) return 0.5;
  if (isShort) return 0.6;
  return 0.85;
}
```

---

## Integration Patterns

### Combining All Three Systems

```typescript
import { AgentRuntime } from '@recallbricks/runtime';

async function autonomousTask(runtime: AgentRuntime, task: string) {
  // 1. Create working memory session
  const session = await runtime.createSession(`task-${Date.now()}`);
  await session.addEntry('task', task);
  await session.addEntry('status', 'planning');

  // 2. Plan and create goal
  const steps = await planTask(task);
  const goal = await runtime.trackGoal('main-task', steps);
  await session.addEntry('goalId', goal.goalId);

  // 3. Execute with metacognition
  for (let i = 1; i <= steps.length; i++) {
    await session.addEntry('currentStep', i);

    try {
      // Execute step
      const response = await runtime.chat(`Execute step ${i}: ${steps[i-1]}`);

      // Assess execution
      const assessment = await runtime.assessResponse(response.response, 0.8);

      if (assessment.needsReflection) {
        // Store for later review
        await session.addEntry(`step${i}_needsReview`, true);
      }

      // Mark complete
      await goal.completeStep(i);
      await session.addEntry('status', `completed_step_${i}`);

    } catch (error) {
      await goal.failStep(i, error.message);
      await session.addEntry('status', 'failed');
      await session.addEntry('error', error.message);
      throw error;
    }
  }

  // 4. Finalize
  await session.addEntry('status', 'completed');
  await session.persist();

  // 5. Report metrics
  const avgConfidence = await runtime.metacognition.getAverageConfidence();
  console.log(`Task completed with ${(avgConfidence * 100).toFixed(1)}% avg confidence`);

  return goal;
}
```

### Event-Driven Pattern

```typescript
class AutonomousAgent {
  constructor(private runtime: AgentRuntime) {}

  async executeWithMonitoring(taskId: string, steps: string[]) {
    const session = await this.runtime.createSession(taskId);
    const goal = await this.runtime.trackGoal(taskId, steps);

    for (let i = 1; i <= steps.length; i++) {
      const result = await this.executeStep(i, steps[i-1]);

      // Assess and potentially course-correct
      const assessment = await this.runtime.assessResponse(
        result.response,
        result.confidence
      );

      if (assessment.needsReflection && assessment.confidence < 0.5) {
        // Low confidence - maybe retry with more context
        await this.runtime.refreshContext();
        const retry = await this.executeStep(i, steps[i-1]);
        await goal.completeStep(i);
      } else {
        await goal.completeStep(i);
      }
    }

    return goal;
  }

  private async executeStep(stepNum: number, description: string) {
    const response = await this.runtime.chat(
      `Execute step ${stepNum}: ${description}`
    );
    return {
      response: response.response,
      confidence: 0.8, // In practice, derive from response
    };
  }
}
```

---

## Best Practices

### Working Memory

1. **Use descriptive session IDs** - Include task type and timestamp
2. **Set appropriate TTLs** - For temporary data that should expire
3. **Persist important sessions** - Before task completion
4. **Clear sessions when done** - Free up memory

### Goals

1. **Break down into atomic steps** - Each step should be independently completable
2. **Handle failures gracefully** - Use try-catch and failStep()
3. **Track progress for users** - Progress is a 0-1 value
4. **Cancel abandoned goals** - Don't leave goals in limbo

### Metacognition

1. **Assess all significant responses** - Especially for critical decisions
2. **Track average confidence** - Monitor agent performance over time
3. **Trigger reflection on low confidence** - Enable self-improvement
4. **Use suggestions to improve** - Act on the feedback

---

## Type Reference

```typescript
// Working Memory
interface WorkingMemoryClient {
  createSession(sessionId: string): Promise<WorkingMemorySession>;
  getSession(sessionId: string): Promise<WorkingMemorySession | undefined>;
  listSessions(): Promise<string[]>;
}

interface WorkingMemorySession {
  sessionId: string;
  agentId: string;
  createdAt: string;
  entries: WorkingMemoryEntry[];
  addEntry(key: string, value: unknown, ttl?: number): Promise<WorkingMemoryEntry>;
  getEntry(key: string): Promise<WorkingMemoryEntry | undefined>;
  removeEntry(key: string): Promise<boolean>;
  clear(): Promise<void>;
  persist(): Promise<void>;
}

interface WorkingMemoryEntry {
  key: string;
  value: unknown;
  timestamp: string;
  expiresAt?: string;
}

// Goals
interface GoalsClient {
  trackGoal(goalId: string, steps: string[]): Promise<GoalTrackingResult>;
  getGoal(goalId: string): Promise<GoalTrackingResult | undefined>;
  listGoals(): Promise<GoalTrackingResult[]>;
  cancelGoal(goalId: string): Promise<boolean>;
}

interface GoalTrackingResult {
  goalId: string;
  steps: GoalStep[];
  status: GoalStatus;
  startedAt: string;
  completedAt?: string;
  progress: number;
  completeStep(stepNumber: number): Promise<void>;
  failStep(stepNumber: number, reason: string): Promise<void>;
}

interface GoalStep {
  stepNumber: number;
  description: string;
  status: GoalStepStatus;
  completedAt?: string;
  failureReason?: string;
}

type GoalStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
type GoalStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

// Metacognition
interface MetacognitionClient {
  assessResponse(response: string, confidence: number): Promise<MetacognitionAssessment>;
  getAssessmentHistory(): Promise<MetacognitionAssessment[]>;
  getAverageConfidence(): Promise<number>;
  triggerReflection(): Promise<void>;
}

interface MetacognitionAssessment {
  timestamp: string;
  response: string;
  confidence: number;
  needsReflection: boolean;
  suggestions: string[];
}
```
