# RecallBricks Agent Runtime - API Reference

Complete API documentation for the RecallBricks Agent Runtime.

## Table of Contents

- [AgentRuntime](#agentruntime)
- [Types](#types)
- [Configuration](#configuration)
- [Adapters](#adapters)
- [Error Handling](#error-handling)

## AgentRuntime

The main orchestrator class that coordinates all runtime components.

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
  llmApiKey: 'sk-...',
});
```

### Methods

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
async getIdentity(): Promise<AgentIdentity | undefined>
```

**Returns:** Agent identity or undefined if not loaded

**Example:**
```typescript
const identity = await runtime.getIdentity();
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
console.log(`Total memories: ${context.totalMemories}`);
console.log(`Recent: ${context.recentMemories.length}`);
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

#### saveNow()

Immediately save the current conversation turn (normally done automatically).

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

Clear the conversation history for this session (doesn't affect long-term memory).

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
getValidationStats(): ValidationStats | undefined
```

**Returns:** Validation statistics or undefined

**Example:**
```typescript
const stats = runtime.getValidationStats();
console.log(`Total violations: ${stats.total}`);
console.log(`By type:`, stats.byType);
```

#### getConfig()

Get the current runtime configuration.

```typescript
getConfig(): RuntimeConfig
```

**Returns:** Current configuration (copy, not mutable)

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
  llmProvider?: LLMProvider;      // 'anthropic' | 'openai' | 'cohere' | 'local'
  llmModel?: string;

  // RecallBricks Configuration
  apiUrl?: string;
  tier?: RecallBricksTier;        // 'starter' | 'professional' | 'enterprise'

  // Behavior
  autoSave?: boolean;             // Default: true
  validateIdentity?: boolean;     // Default: true
  cacheEnabled?: boolean;         // Default: true
  cacheTTL?: number;              // Default: 300000 (5 min)
  maxContextTokens?: number;      // Default: 4000

  // Debug
  debug?: boolean;                // Default: false
}
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
  importance: number;             // 0-1
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

### ValidationStats

Identity validation statistics.

```typescript
interface ValidationStats {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
}
```

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
RECALLBRICKS_AUTO_SAVE=optional
RECALLBRICKS_VALIDATE_IDENTITY=optional
RECALLBRICKS_CACHE_ENABLED=optional
RECALLBRICKS_CACHE_TTL=optional
RECALLBRICKS_MAX_CONTEXT_TOKENS=optional
RECALLBRICKS_DEBUG=optional
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

**Example:**
```typescript
import { buildConfigFromOptions } from '@recallbricks/runtime';

const config = buildConfigFromOptions({
  agentId: 'my_bot',
  userId: 'user_123',
  llmApiKey: 'sk-...',
});
```

### createLogger()

Create a logger instance.

```typescript
function createLogger(debug?: boolean): Logger
```

**Example:**
```typescript
import { createLogger } from '@recallbricks/runtime';

const logger = createLogger(true);
logger.info('Hello');
logger.debug('Debug message');
```

## Adapters

### REST API Server

Express.js server that wraps the AgentRuntime.

```typescript
import { RecallBricksAPIServer } from '@recallbricks/runtime/adapters/api';

const server = new RecallBricksAPIServer(3000);
server.start();
```

**Endpoints:**

```
POST   /init                   Initialize runtime
POST   /chat                   Send message
GET    /context                Get memory context
GET    /identity               Get agent identity
POST   /context/refresh        Refresh context
GET    /history                Get conversation history
POST   /history/clear          Clear history
POST   /flush                  Flush pending saves
GET    /stats/validation       Get validation stats
GET    /health                 Health check
```

### MCP Server

MCP server for Claude Desktop integration.

```typescript
import { RecallBricksMCPServer } from '@recallbricks/runtime/adapters/mcp';

const server = new RecallBricksMCPServer();
await server.initialize({
  agentId: 'my_bot',
  userId: 'user_123',
  llmApiKey: 'sk-...',
});

await server.startStdio();
```

**MCP Tools:**
- `recallbricks_chat`
- `recallbricks_get_context`
- `recallbricks_get_identity`
- `recallbricks_refresh_context`
- `recallbricks_get_history`
- `recallbricks_clear_history`

### Python SDK

Python wrapper for the runtime.

```python
from recallbricks import AgentRuntime

runtime = AgentRuntime(
    agent_id='my_bot',
    user_id='user_123',
    llm_api_key='sk-...'
)

response = runtime.chat('Hello!')
```

**Methods:**
- `chat(message, conversation_history=None) -> ChatResponse`
- `get_identity() -> AgentIdentity`
- `get_context() -> MemoryContext`
- `refresh_context() -> None`
- `get_conversation_history() -> List[LLMMessage]`
- `clear_conversation_history() -> None`
- `flush() -> None`
- `get_validation_stats() -> ValidationStats`

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

## Advanced Usage

### Custom Context Loading

```typescript
// Load context manually
const context = await runtime.getContext();

// Process memories
for (const memory of context.recentMemories) {
  console.log(`[${memory.type}] ${memory.content}`);
  console.log(`Importance: ${memory.importance}`);
}
```

### Monitoring Identity Violations

```typescript
setInterval(() => {
  const stats = runtime.getValidationStats();
  if (stats && stats.total > 100) {
    console.warn(`High violation count: ${stats.total}`);
    console.warn('Consider reviewing agent prompt or identity settings');
  }
}, 60000); // Check every minute
```

### Graceful Shutdown

```typescript
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await runtime.flush();
  console.log('All conversations saved');
  process.exit(0);
});
```

### Multi-Agent System

```typescript
const agents = {
  support: new AgentRuntime({
    agentId: 'support_bot',
    userId: customerId,
    llmApiKey: key,
  }),
  sales: new AgentRuntime({
    agentId: 'sales_bot',
    userId: customerId,
    llmApiKey: key,
  }),
};

// Route to appropriate agent
const response = await agents[botType].chat(message);
```

## Performance Tips

1. **Enable Caching:**
   ```typescript
   cacheEnabled: true,
   cacheTTL: 300000  // 5 minutes
   ```

2. **Optimize Context Tokens:**
   ```typescript
   maxContextTokens: 4000  // Adjust based on your needs
   ```

3. **Use Auto-Save:**
   ```typescript
   autoSave: true  // Non-blocking background saves
   ```

4. **Monitor Queue Depth:**
   ```typescript
   const queueSize = runtime['autoSaver'].getQueueSize();
   if (queueSize > 100) {
     console.warn('Save queue is backed up');
   }
   ```

## License

MIT License - See [LICENSE](../LICENSE) for details.
