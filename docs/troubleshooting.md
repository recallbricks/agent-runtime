# RecallBricks Agent Runtime - Troubleshooting

Common issues and solutions for the RecallBricks Agent Runtime v1.0.0.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Configuration Errors](#configuration-errors)
- [Runtime Initialization](#runtime-initialization)
- [Chat and Memory Issues](#chat-and-memory-issues)
- [Autonomous Features](#autonomous-features)
- [LLM Provider Issues](#llm-provider-issues)
- [Performance Issues](#performance-issues)
- [Debugging Tips](#debugging-tips)

---

## Installation Issues

### Package not found

**Error:**
```
npm ERR! 404 Not Found - GET https://registry.npmjs.org/@recallbricks/runtime
```

**Solution:**
```bash
# Ensure you're using the correct package name
npm install @recallbricks/runtime@1.0.0

# Or check if it's a private registry issue
npm config set registry https://registry.npmjs.org/
```

### TypeScript type errors

**Error:**
```
Cannot find module '@recallbricks/runtime' or its corresponding type declarations
```

**Solution:**
```bash
# Ensure TypeScript is installed
npm install --save-dev typescript @types/node

# Check tsconfig.json includes node_modules types
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

### Version conflicts

**Error:**
```
ERESOLVE unable to resolve dependency tree
```

**Solution:**
```bash
# Force resolution
npm install --legacy-peer-deps

# Or update conflicting packages
npm update
```

---

## Configuration Errors

### Missing required fields

**Error:**
```
ConfigurationError: agentId is required
```

**Solution:**
```typescript
// Ensure all required fields are provided
const runtime = new AgentRuntime({
  agentId: 'my_bot',      // Required
  userId: 'user_123',     // Required
  llmProvider: 'anthropic',
  llmApiKey: 'sk-...',
});
```

### Invalid LLM provider

**Error:**
```
ConfigurationError: Invalid LLM provider: 'gpt4'
```

**Solution:**
```typescript
// Use valid provider names
type LLMProvider = 'anthropic' | 'openai' | 'gemini' | 'ollama' | 'cohere' | 'local';

const runtime = new AgentRuntime({
  agentId: 'my_bot',
  userId: 'user_123',
  llmProvider: 'openai',  // Not 'gpt4'
  llmApiKey: 'sk-...',
});
```

### Environment variables not loading

**Error:**
```
TypeError: Cannot read properties of undefined (reading 'ANTHROPIC_API_KEY')
```

**Solution:**
```typescript
// Ensure dotenv is configured first
import 'dotenv/config';
// Or
import * as dotenv from 'dotenv';
dotenv.config();

// Then use environment variables
const runtime = new AgentRuntime({
  agentId: process.env.AGENT_ID!,
  userId: process.env.USER_ID!,
  llmApiKey: process.env.ANTHROPIC_API_KEY!,
});
```

---

## Runtime Initialization

### LLM adapter not initialized

**Error:**
```
Error: LLM adapter not initialized. This should not happen in non-MCP mode.
```

**Solution:**
```typescript
// Ensure llmApiKey is provided (not empty)
const runtime = new AgentRuntime({
  agentId: 'my_bot',
  userId: 'user_123',
  llmProvider: 'anthropic',
  llmApiKey: process.env.ANTHROPIC_API_KEY || '',  // Don't use empty string
});

// Check if key exists
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is required');
}
```

### MCP mode issues

**Error:**
```
No LLM response in MCP mode
```

**Solution:**
```typescript
// MCP mode doesn't call LLM - it returns context only
const runtime = new AgentRuntime({
  agentId: 'my_bot',
  userId: 'user_123',
  mcpMode: true,  // No LLM key needed
});

const response = await runtime.chat('Hello');
// response.response contains context, not LLM output
// This is expected behavior in MCP mode
```

### Reflection engine not available

**Error:**
```
Error: Reflection engine not initialized (requires LLM adapter)
```

**Solution:**
```typescript
// Reflection requires LLM adapter
const runtime = new AgentRuntime({
  agentId: 'my_bot',
  userId: 'user_123',
  llmProvider: 'anthropic',
  llmApiKey: 'sk-...',  // Required for reflection
});

// Now reflect() will work
const reflection = await runtime.reflect();
```

---

## Chat and Memory Issues

### Context not loading

**Error:**
```
Empty context returned
```

**Solution:**
```typescript
// Enable debug mode to see what's happening
const runtime = new AgentRuntime({
  agentId: 'my_bot',
  userId: 'user_123',
  debug: true,  // Enable logging
});

// Manually refresh context
await runtime.refreshContext();
const context = await runtime.getContext();
console.log('Context:', context);
```

### Conversations not saving

**Error:**
```
Previous conversation not remembered
```

**Solution:**
```typescript
// Ensure autoSave is enabled (default: true)
const runtime = new AgentRuntime({
  agentId: 'my_bot',
  userId: 'user_123',
  autoSave: true,
});

// Always flush before exit
await runtime.flush();
// Or use shutdown which flushes automatically
await runtime.shutdown();
```

### Identity validation failing

**Error:**
```
High number of identity violations
```

**Solution:**
```typescript
// Check validation stats
const stats = runtime.getValidationStats();
console.log('Violations:', stats?.total);
console.log('By type:', stats?.byType);

// If too aggressive, disable temporarily
const runtime = new AgentRuntime({
  agentId: 'my_bot',
  userId: 'user_123',
  validateIdentity: false,  // Disable validation
});
```

### Rate limiting

**Error:**
```
APIError: Too many requests (429)
```

**Solution:**
```typescript
// Implement exponential backoff
import pRetry from 'p-retry';

async function chatWithRetry(runtime: AgentRuntime, message: string) {
  return pRetry(
    () => runtime.chat(message),
    {
      retries: 3,
      minTimeout: 1000,
      maxTimeout: 10000,
    }
  );
}
```

---

## Autonomous Features

### Working memory session not found

**Error:**
```
Cannot find session 'task-001'
```

**Solution:**
```typescript
// Sessions are in-memory - create before accessing
const session = await runtime.createSession('task-001');

// Or check if exists first
const existing = await runtime.workingMemory.getSession('task-001');
if (!existing) {
  const session = await runtime.createSession('task-001');
}
```

### Working memory entry expired

**Error:**
```
Entry returns undefined even though it was added
```

**Solution:**
```typescript
// Check if TTL expired
await session.addEntry('temp', 'value', 1000);  // 1 second TTL

await new Promise(r => setTimeout(r, 2000));  // Wait 2 seconds

const entry = await session.getEntry('temp');
console.log(entry);  // undefined - TTL expired

// Use longer TTL or no TTL for persistent entries
await session.addEntry('permanent', 'value');  // No TTL
```

### Goal step number invalid

**Error:**
```
Cannot complete step - step not found
```

**Solution:**
```typescript
// Steps are 1-indexed
const goal = await runtime.trackGoal('task', ['Step 1', 'Step 2']);

// Correct
await goal.completeStep(1);  // First step
await goal.completeStep(2);  // Second step

// Incorrect
await goal.completeStep(0);  // No step 0
await goal.completeStep(3);  // Only 2 steps
```

### Metacognition reflection fails

**Error:**
```
Reflection engine not available
```

**Solution:**
```typescript
// Ensure LLM is configured
const runtime = new AgentRuntime({
  agentId: 'my_bot',
  userId: 'user_123',
  llmProvider: 'anthropic',
  llmApiKey: 'sk-...',  // Required for reflection
});

// Now this works
await runtime.metacognition.triggerReflection();
```

---

## LLM Provider Issues

### Anthropic API errors

**Error:**
```
LLMError: Invalid API key
```

**Solution:**
```typescript
// Verify key format
console.log('Key starts with:', process.env.ANTHROPIC_API_KEY?.substring(0, 10));
// Should start with 'sk-ant-'

// Check key is not expired
// Go to console.anthropic.com to verify
```

### OpenAI API errors

**Error:**
```
LLMError: Model 'gpt-4' not found
```

**Solution:**
```typescript
// Use correct model name
const runtime = new AgentRuntime({
  agentId: 'my_bot',
  userId: 'user_123',
  llmProvider: 'openai',
  llmModel: 'gpt-4',  // or 'gpt-3.5-turbo'
  llmApiKey: 'sk-...',
});
```

### Ollama connection issues

**Error:**
```
LLMError: ECONNREFUSED 127.0.0.1:11434
```

**Solution:**
```bash
# Ensure Ollama is running
ollama serve

# Check it's accessible
curl http://localhost:11434/api/version
```

```typescript
// Configure base URL if needed
const runtime = new AgentRuntime({
  agentId: 'my_bot',
  userId: 'user_123',
  llmProvider: 'ollama',
  // Custom Ollama URL if not default
  // baseUrl: 'http://localhost:11434',
});
```

### Token limits exceeded

**Error:**
```
LLMError: Maximum context length exceeded
```

**Solution:**
```typescript
// Reduce context tokens
const runtime = new AgentRuntime({
  agentId: 'my_bot',
  userId: 'user_123',
  maxContextTokens: 2000,  // Reduce from default 4000
});

// Or clear history periodically
runtime.clearConversationHistory();
```

---

## Performance Issues

### Slow response times

**Solutions:**

```typescript
// 1. Enable caching
const runtime = new AgentRuntime({
  cacheEnabled: true,
  cacheTTL: 300000,  // 5 minutes
});

// 2. Reduce context size
const runtime = new AgentRuntime({
  maxContextTokens: 2000,
});

// 3. Use faster models
const runtime = new AgentRuntime({
  llmModel: 'claude-3-haiku-20240307',  // Faster than Sonnet
});
```

### Memory usage high

**Solutions:**

```typescript
// 1. Clear conversation history periodically
setInterval(() => {
  runtime.clearConversationHistory();
}, 60000);

// 2. Clear working memory sessions
const sessions = await runtime.workingMemory.listSessions();
for (const id of sessions) {
  const session = await runtime.workingMemory.getSession(id);
  await session?.clear();
}

// 3. Limit goal tracking
const goals = await runtime.goals.listGoals();
for (const goal of goals) {
  if (goal.status === 'completed' || goal.status === 'failed') {
    await runtime.goals.cancelGoal(goal.goalId);
  }
}
```

### Save queue backing up

**Solutions:**

```typescript
// 1. Flush more frequently
await runtime.flush();

// 2. Use sync save for critical data
await runtime.saveNow();

// 3. Monitor queue (internal access)
// Note: This accesses internal state
const queueSize = (runtime as any).autoSaver?.getQueueSize?.();
if (queueSize > 100) {
  console.warn('Save queue is backing up');
  await runtime.flush();
}
```

---

## Debugging Tips

### Enable debug logging

```typescript
const runtime = new AgentRuntime({
  agentId: 'my_bot',
  userId: 'user_123',
  debug: true,  // Enable verbose logging
});
```

### Check configuration

```typescript
const config = runtime.getConfig();
console.log('Configuration:', JSON.stringify(config, null, 2));
```

### Monitor runtime state

```typescript
// Get identity
const identity = runtime.getIdentity();
console.log('Identity:', identity);

// Get context
const context = await runtime.getContext();
console.log('Context:', context);

// Get conversation history
const history = runtime.getConversationHistory();
console.log('History length:', history.length);

// Get validation stats
const stats = runtime.getValidationStats();
console.log('Validation stats:', stats);

// Get version
console.log('Version:', runtime.getVersion());
```

### Inspect autonomous state

```typescript
// Working memory
const sessions = await runtime.workingMemory.listSessions();
console.log('Active sessions:', sessions);

// Goals
const goals = await runtime.goals.listGoals();
for (const g of goals) {
  console.log(`Goal ${g.goalId}: ${g.status} (${g.progress * 100}%)`);
}

// Metacognition
const avgConfidence = await runtime.metacognition.getAverageConfidence();
console.log('Average confidence:', avgConfidence);
```

### Graceful error handling

```typescript
import { APIError, ConfigurationError, LLMError, RecallBricksError } from '@recallbricks/runtime';

async function safeChat(runtime: AgentRuntime, message: string) {
  try {
    return await runtime.chat(message);
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error('Configuration issue:', error.message);
      // Check config and restart
    } else if (error instanceof APIError) {
      console.error('API error:', error.statusCode, error.message);
      // Retry or fallback
    } else if (error instanceof LLMError) {
      console.error('LLM error:', error.message);
      // Try different provider or model
    } else if (error instanceof RecallBricksError) {
      console.error('RecallBricks error:', error.code, error.message);
    } else {
      console.error('Unknown error:', error);
    }
    throw error;
  }
}
```

### Cleanup on shutdown

```typescript
async function gracefulShutdown(runtime: AgentRuntime) {
  console.log('Shutting down...');

  try {
    // Persist any working memory
    const sessions = await runtime.workingMemory.listSessions();
    for (const id of sessions) {
      const session = await runtime.workingMemory.getSession(id);
      await session?.persist();
    }

    // Flush saves
    await runtime.flush();

    // Shutdown
    await runtime.shutdown();

    console.log('Shutdown complete');
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => gracefulShutdown(runtime));
process.on('SIGTERM', () => gracefulShutdown(runtime));
```

---

## Getting Help

If you're still experiencing issues:

1. **Check the documentation:**
   - [API Reference](./api-reference.md)
   - [Autonomous Features](./autonomous-features.md)
   - [Examples](./examples.md)

2. **Enable debug mode** to get detailed logs

3. **Check GitHub Issues:**
   - [Open Issues](https://github.com/recallbricks/agent-runtime/issues)

4. **Contact Support:**
   - support@recallbricks.com

When reporting issues, include:
- Runtime version (`runtime.getVersion()`)
- LLM provider and model
- Error message and stack trace
- Minimal reproduction code
