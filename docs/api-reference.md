# RecallBricks Agent Runtime - API Reference

Complete API documentation for the RecallBricks Agent Runtime v1.0.0.

## Table of Contents

- [AgentRuntime](#agentruntime)
  - [Constructor](#constructor)
  - [Core Methods](#core-methods)
  - [Autonomous Properties](#autonomous-properties)
  - [Autonomous Convenience Methods](#autonomous-convenience-methods)
- [Types](#types)
- [Configuration](#configuration)
- [Error Handling](#error-handling)

## AgentRuntime

The main orchestrator class that coordinates all runtime components.

```typescript
import { AgentRuntime } from '@recallbricks/runtime';
```

### Constructor

```typescript
new AgentRuntime(options: RuntimeOptions): AgentRuntime
```

**Parameters:**
- `options` - Configuration options (see [RuntimeOptions](#runtimeoptions))

**Example:**
```typescript
const runtime = new AgentRuntime({
  agentId: 'my_bot',
  userId: 'user_123',
  llmProvider: 'anthropic',
  llmApiKey: 'sk-...',
});
```

### Core Methods

#### chat()

Send a message and get a contextual response with persistent memory.

```typescript
async chat(
  message: string,
  conversationHistory?: LLMMessage[]
): Promise<ChatResponse>
```

**Parameters:**
- `message` - The user's message
- `conversationHistory` - Optional conversation history to include

**Returns:** `ChatResponse` with agent's response and metadata

**Example:**
```typescript
const response = await runtime.chat('What did we discuss?');
console.log(response.response);
console.log(response.metadata.tokensUsed);
```

#### getIdentity()

Get the agent's identity and behavioral rules.

```typescript
getIdentity(): AgentIdentity
```

**Returns:** Agent identity object

**Example:**
```typescript
const identity = runtime.getIdentity();
console.log(identity.name);
console.log(identity.purpose);
console.log(identity.traits);
```

#### getContext()

Get the current memory context for this user.

```typescript
async getContext(): Promise<MemoryContext | undefined>
```

**Returns:** Memory context or undefined if not loaded

**Example:**
```typescript
const context = await runtime.getContext();
console.log(`Total memories: ${context?.totalMemories}`);
console.log(`Recent: ${context?.recentMemories.length}`);
```

#### refreshContext()

Refresh memory context from the API, bypassing cache.

```typescript
async refreshContext(): Promise<void>
```

**Example:**
```typescript
await runtime.refreshContext();
console.log('Context refreshed');
```

#### reflect()

Trigger a manual reflection analysis.

```typescript
async reflect(): Promise<Reflection>
```

**Returns:** Reflection with insights and suggestions

**Example:**
```typescript
const reflection = await runtime.reflect();
console.log(reflection.insights);
console.log(reflection.suggestions);
```

#### explain()

Explain reasoning for a query (Chain of Thought).

```typescript
async explain(query: string): Promise<ReasoningTrace>
```

**Parameters:**
- `query` - The query to explain reasoning for

**Returns:** ReasoningTrace with step-by-step reasoning

**Example:**
```typescript
const trace = await runtime.explain('Why did you recommend that?');
console.log(trace.steps);
console.log(trace.conclusion);
```

#### saveNow()

Immediately save the current conversation turn.

```typescript
async saveNow(): Promise<void>
```

**Example:**
```typescript
await runtime.saveNow();
```

#### flush()

Wait for all pending saves to complete. Call before shutdown.

```typescript
async flush(): Promise<void>
```

**Example:**
```typescript
await runtime.flush();
console.log('All saves completed');
```

#### shutdown()

Gracefully shutdown the runtime, flushing all pending saves.

```typescript
async shutdown(): Promise<void>
```

**Example:**
```typescript
await runtime.shutdown();
```

#### getConversationHistory()

Get the conversation history for the current session.

```typescript
getConversationHistory(): LLMMessage[]
```

**Returns:** Array of messages in this session

**Example:**
```typescript
const history = runtime.getConversationHistory();
for (const msg of history) {
  console.log(`${msg.role}: ${msg.content}`);
}
```

#### clearConversationHistory()

Clear the conversation history for this session.

```typescript
clearConversationHistory(): void
```

**Example:**
```typescript
runtime.clearConversationHistory();
```

#### getValidationStats()

Get identity validation statistics.

```typescript
getValidationStats(): { total: number; byType: Record<string, number>; bySeverity: Record<string, number> } | undefined
```

**Returns:** Validation statistics or undefined

**Example:**
```typescript
const stats = runtime.getValidationStats();
console.log(`Total violations: ${stats?.total}`);
console.log(`By type:`, stats?.byType);
```

#### getReflectionHistory()

Get the history of reflections.

```typescript
getReflectionHistory(): Reflection[]
```

**Returns:** Array of past reflections

#### getConfig()

Get the current runtime configuration.

```typescript
getConfig(): RuntimeConfig
```

**Returns:** Current configuration (copy, not mutable)

#### getVersion()

Get the runtime version.

```typescript
getVersion(): string
```

**Returns:** Version string (e.g., "1.0.0")

#### updateLLMConfig()

Update LLM configuration dynamically.

```typescript
updateLLMConfig(config: Partial<LLMConfig>): void
```

**Parameters:**
- `config` - Partial LLM configuration to update

**Example:**
```typescript
runtime.updateLLMConfig({
  temperature: 0.9,
  maxTokens: 4096,
});
```

#### getApiClient()

Get the API client for direct access.

```typescript
getApiClient(): RecallBricksClient
```

**Returns:** The underlying API client

---

### Autonomous Properties

The AgentRuntime exposes three readonly clients for autonomous agent capabilities.

#### workingMemory

Client for working memory operations.

```typescript
readonly workingMemory: WorkingMemoryClient
```

**WorkingMemoryClient Interface:**
```typescript
interface WorkingMemoryClient {
  createSession(sessionId: string): Promise<WorkingMemorySession>;
  getSession(sessionId: string): Promise<WorkingMemorySession | undefined>;
  listSessions(): Promise<string[]>;
}
```

**Example:**
```typescript
// Create a session
const session = await runtime.workingMemory.createSession('task-001');

// List all sessions
const sessions = await runtime.workingMemory.listSessions();

// Get existing session
const existing = await runtime.workingMemory.getSession('task-001');
```

#### goals

Client for goal tracking operations.

```typescript
readonly goals: GoalsClient
```

**GoalsClient Interface:**
```typescript
interface GoalsClient {
  trackGoal(goalId: string, steps: string[]): Promise<GoalTrackingResult>;
  getGoal(goalId: string): Promise<GoalTrackingResult | undefined>;
  listGoals(): Promise<GoalTrackingResult[]>;
  cancelGoal(goalId: string): Promise<boolean>;
}
```

**Example:**
```typescript
// Track a new goal
const goal = await runtime.goals.trackGoal('analysis', [
  'Gather data',
  'Process data',
  'Generate report',
]);

// List all goals
const goals = await runtime.goals.listGoals();

// Get specific goal
const existing = await runtime.goals.getGoal('analysis');

// Cancel a goal
await runtime.goals.cancelGoal('analysis');
```

#### metacognition

Client for metacognition operations.

```typescript
readonly metacognition: MetacognitionClient
```

**MetacognitionClient Interface:**
```typescript
interface MetacognitionClient {
  assessResponse(response: string, confidence: number): Promise<MetacognitionAssessment>;
  getAssessmentHistory(): Promise<MetacognitionAssessment[]>;
  getAverageConfidence(): Promise<number>;
  triggerReflection(): Promise<void>;
}
```

**Example:**
```typescript
// Assess a response
const assessment = await runtime.metacognition.assessResponse(
  'The answer is 42',
  0.85
);

// Get assessment history
const history = await runtime.metacognition.getAssessmentHistory();

// Get average confidence
const avgConfidence = await runtime.metacognition.getAverageConfidence();

// Trigger reflection
await runtime.metacognition.triggerReflection();
```

---

### Autonomous Convenience Methods

These methods provide quick access to common autonomous operations.

#### createSession()

Create a working memory session for autonomous task execution.

```typescript
async createSession(sessionId: string): Promise<WorkingMemorySession>
```

**Parameters:**
- `sessionId` - Unique identifier for the session

**Returns:** WorkingMemorySession for storing temporary task state

**Example:**
```typescript
const session = await runtime.createSession('task-001');
await session.addEntry('objective', 'Complete analysis');
await session.addEntry('data', { values: [1, 2, 3] });
```

**WorkingMemorySession Interface:**
```typescript
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
```

#### trackGoal()

Track a goal with defined steps for autonomous execution.

```typescript
async trackGoal(goalId: string, steps: string[]): Promise<GoalTrackingResult>
```

**Parameters:**
- `goalId` - Unique identifier for the goal
- `steps` - Array of step descriptions

**Returns:** GoalTrackingResult for monitoring progress

**Example:**
```typescript
const goal = await runtime.trackGoal('data-pipeline', [
  'Load dataset',
  'Clean data',
  'Transform data',
  'Export results',
]);

// Complete steps as you progress
await goal.completeStep(1);
console.log(`Progress: ${goal.progress * 100}%`);

await goal.completeStep(2);
await goal.completeStep(3);
await goal.completeStep(4);
console.log(`Status: ${goal.status}`); // 'completed'
```

**GoalTrackingResult Interface:**
```typescript
interface GoalTrackingResult {
  goalId: string;
  steps: GoalStep[];
  status: GoalStatus;  // 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  startedAt: string;
  completedAt?: string;
  progress: number;    // 0 to 1

  completeStep(stepNumber: number): Promise<void>;
  failStep(stepNumber: number, reason: string): Promise<void>;
}
```

#### assessResponse()

Assess a response with metacognitive analysis.

```typescript
async assessResponse(response: string, confidence: number): Promise<MetacognitionAssessment>
```

**Parameters:**
- `response` - The response to assess
- `confidence` - Confidence level (0-1)

**Returns:** MetacognitionAssessment with suggestions

**Example:**
```typescript
const assessment = await runtime.assessResponse(
  'Based on the data, I recommend option A',
  0.75
);

console.log(`Confidence: ${assessment.confidence}`);
console.log(`Needs reflection: ${assessment.needsReflection}`);
console.log(`Suggestions:`, assessment.suggestions);
```

**MetacognitionAssessment Interface:**
```typescript
interface MetacognitionAssessment {
  timestamp: string;
  response: string;
  confidence: number;
  needsReflection: boolean;
  suggestions: string[];
}
```

---

## Types

### RuntimeOptions

Configuration options for AgentRuntime.

```typescript
interface RuntimeOptions {
  // Required
  agentId: string;
  userId: string;

  // LLM Configuration
  llmApiKey?: string;
  llmProvider?: LLMProvider;
  llmModel?: string;

  // RecallBricks Configuration
  apiUrl?: string;
  apiKey?: string;
  tier?: RecallBricksTier;

  // Agent Metadata
  agentName?: string;
  agentPurpose?: string;

  // Behavior
  autoSave?: boolean;
  validateIdentity?: boolean;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  maxContextTokens?: number;

  // Modes
  debug?: boolean;
  mcpMode?: boolean;
  registerAgent?: boolean;
}
```

### LLMProvider

Supported LLM providers.

```typescript
type LLMProvider = 'anthropic' | 'openai' | 'gemini' | 'ollama' | 'cohere' | 'local';
```

### RecallBricksTier

RecallBricks service tiers.

```typescript
type RecallBricksTier = 'starter' | 'professional' | 'enterprise';
```

### ChatResponse

Response from the chat() method.

```typescript
interface ChatResponse {
  response: string;
  metadata: {
    provider: LLMProvider;
    model: string;
    contextLoaded: boolean;
    identityValidated: boolean;
    autoSaved: boolean;
    tokensUsed?: number;
  };
}
```

### AgentIdentity

Agent identity and behavioral rules.

```typescript
interface AgentIdentity {
  id: string;
  name: string;
  purpose: string;
  traits: string[];
  rules: string[];
  createdAt: string;
  updatedAt: string;
}
```

### MemoryContext

Memory context for an agent.

```typescript
interface MemoryContext {
  recentMemories: Memory[];
  relevantMemories: Memory[];
  predictedContext: string[];
  totalMemories: number;
  lastUpdated: string;
}
```

### Memory

A single memory entry.

```typescript
interface Memory {
  id: string;
  content: string;
  type: 'conversation' | 'fact' | 'observation' | 'insight';
  importance: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}
```

### LLMMessage

A message in the conversation.

```typescript
interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
```

### WorkingMemoryEntry

Entry in working memory.

```typescript
interface WorkingMemoryEntry {
  key: string;
  value: unknown;
  timestamp: string;
  expiresAt?: string;
}
```

### GoalStep

Individual step in a goal.

```typescript
interface GoalStep {
  stepNumber: number;
  description: string;
  status: GoalStepStatus;
  completedAt?: string;
  failureReason?: string;
}

type GoalStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
type GoalStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
```

---

## Configuration

### buildConfigFromEnv()

Build configuration from environment variables.

```typescript
function buildConfigFromEnv(): RuntimeConfig
```

**Environment Variables:**
```bash
RECALLBRICKS_AGENT_ID=required
RECALLBRICKS_USER_ID=required
RECALLBRICKS_API_KEY=required
RECALLBRICKS_API_URL=optional
RECALLBRICKS_LLM_PROVIDER=optional
RECALLBRICKS_LLM_MODEL=optional
RECALLBRICKS_TIER=optional
```

**Example:**
```typescript
import { buildConfigFromEnv, AgentRuntime } from '@recallbricks/runtime';

const config = buildConfigFromEnv();
const runtime = new AgentRuntime(config);
```

### buildConfigFromOptions()

Build configuration from options object.

```typescript
function buildConfigFromOptions(options: RuntimeOptions): RuntimeConfig
```

### createLogger()

Create a logger instance.

```typescript
function createLogger(debug?: boolean): Logger
```

### ConfigBuilder

Fluent configuration builder.

```typescript
import { ConfigBuilder } from '@recallbricks/runtime';

const config = new ConfigBuilder()
  .agentId('my_bot')
  .userId('user_123')
  .llmProvider('anthropic')
  .llmApiKey('sk-...')
  .tier('starter')
  .build();

const runtime = new AgentRuntime(config);
```

---

## Error Handling

### Error Types

```typescript
class RecallBricksError extends Error {
  code: string;
  statusCode?: number;
  details?: unknown;
}

class APIError extends RecallBricksError {
  // HTTP API errors
}

class ConfigurationError extends RecallBricksError {
  // Configuration validation errors
}

class LLMError extends RecallBricksError {
  // LLM provider errors
}
```

### Error Handling Example

```typescript
import { APIError, ConfigurationError, LLMError } from '@recallbricks/runtime';

try {
  const response = await runtime.chat('Hello');
} catch (error) {
  if (error instanceof APIError) {
    console.error(`API Error: ${error.message}`);
    console.error(`Status: ${error.statusCode}`);
  } else if (error instanceof ConfigurationError) {
    console.error(`Config Error: ${error.message}`);
  } else if (error instanceof LLMError) {
    console.error(`LLM Error: ${error.message}`);
  } else {
    console.error(`Unknown Error: ${error}`);
  }
}
```

---

## Exports

All public exports from the package:

```typescript
// Core
export { AgentRuntime } from './core/AgentRuntime';
export { LLMAdapter } from './core/LLMAdapter';
export { ContextLoader } from './core/ContextLoader';
export { ContextWeaver } from './core/ContextWeaver';
export { AutoSaver } from './core/AutoSaver';
export { IdentityValidator } from './core/IdentityValidator';
export { ReflectionEngine } from './core/ReflectionEngine';

// API
export { RecallBricksClient } from './api/RecallBricksClient';

// Configuration
export { buildConfigFromEnv, buildConfigFromOptions, createLogger, ConfigBuilder } from './config';

// Types
export * from './types';
```

---

## License

MIT License - See [LICENSE](../LICENSE) for details.
