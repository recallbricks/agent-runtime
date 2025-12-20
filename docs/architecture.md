# RecallBricks Agent Runtime - Architecture

## Overview

The RecallBricks Agent Runtime is Layer 3 of the RecallBricks cognitive stack - a universal runtime that sits between any LLM and application to provide persistent identity, automatic context loading, and continuous learning.

## Three-Layer Cognitive Stack

```
┌─────────────────────────────────────────┐
│   Layer 1: Metacognition Engine        │
│   (Learns, Optimizes, Predicts)         │
└─────────────┬───────────────────────────┘
              │
              │ Feeds pattern detection
              │
┌─────────────▼───────────────────────────┐
│   Layer 2: Memory Graph                 │
│   (Stores knowledge semantically)       │
└─────────────┬───────────────────────────┘
              │
              │ Queries for context
              │
┌─────────────▼───────────────────────────┐
│   Layer 3: Agent Runtime (THIS)         │
│   (Delivers persistent identity)        │
└─────────────┬───────────────────────────┘
              │
              │ Universal LLM interface
              │
┌─────────────▼───────────────────────────┐
│   Your Application / LLM                │
└─────────────────────────────────────────┘
```

## Core Architecture

### Message Flow

Every message through the runtime follows this flow:

```
User Message Arrives
         │
         ▼
┌─────────────────────────────────┐
│ 1. Save Previous Turn           │
│    └─> AutoSaver                │
│        └─> Metacognition Engine │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 2. Load Context                 │
│    └─> ContextLoader            │
│        └─> Memory Graph API     │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 3. Inject Identity + Context    │
│    └─> Build enriched prompt    │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 4. Call LLM                     │
│    └─> LLMAdapter               │
│        └─> Anthropic/OpenAI/etc │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 5. Validate Response            │
│    └─> IdentityValidator        │
│        └─> Auto-correct if needed│
└────────┬────────────────────────┘
         │
         ▼
    Return to User
```

## Core Components

### 1. AgentRuntime (Orchestrator)

**Purpose:** Main coordinator that orchestrates all components

**Responsibilities:**
- Message flow coordination
- Component lifecycle management
- Error handling and recovery
- Conversation history management

**Key Methods:**
```typescript
async chat(message: string): Promise<ChatResponse>
async getIdentity(): Promise<AgentIdentity>
async getContext(): Promise<MemoryContext>
async refreshContext(): Promise<void>
async flush(): Promise<void>
```

### 2. LLMAdapter (Universal LLM Interface)

**Purpose:** Provider-agnostic LLM communication

**Supported Providers:**
- Anthropic (Claude)
- OpenAI (GPT-4, etc.)
- Cohere
- Local models (via OpenAI-compatible API)

**Key Features:**
- Unified message format
- Automatic error handling
- Token usage tracking
- Provider-specific optimizations

**Architecture:**
```typescript
┌──────────────────────┐
│   LLMAdapter         │
├──────────────────────┤
│ - chat(messages)     │
│ - updateConfig()     │
└────────┬─────────────┘
         │
    ┌────┴────┬─────────┬──────────┐
    ▼         ▼         ▼          ▼
Anthropic  OpenAI   Cohere    Local
```

### 3. ContextLoader (Memory Retrieval)

**Purpose:** Load and format context from Memory Graph

**Caching Strategy:**
- LRU cache with configurable TTL
- Separate caches for identity and context
- Cache invalidation on refresh

**Context Structure:**
```typescript
{
  identity: AgentIdentity,
  context: {
    recentMemories: Memory[],
    relevantMemories: Memory[],
    predictedContext: string[],
    totalMemories: number
  }
}
```

**Formatting:**
Converts raw memory data into LLM-ready prompts:
```
You are {AgentName}, a persistent cognitive agent.

Your purpose: {purpose}
Your traits: {traits}

Recent context from your memory:
1. {recent memory 1}
2. {recent memory 2}
...

Behavioral guidelines:
1. {rule 1}
2. {rule 2}
...
```

### 4. AutoSaver (Memory Persistence)

**Purpose:** Non-blocking conversation persistence to Metacognition Engine

**Architecture:**
```
Chat Response
     │
     ▼
┌────────────────┐
│  Save Queue    │  ◄── Non-blocking
└────┬───────────┘
     │
     ▼ (Background processing)
┌────────────────┐
│ Classify       │  ◄── Importance scoring
│ Importance     │      (Haiku/Sonnet/Opus)
└────┬───────────┘
     │
     ▼
┌────────────────┐
│ Deduplicate    │  ◄── Similarity check
└────┬───────────┘
     │
     ▼
┌────────────────┐
│ Save to API    │
└────────────────┘
```

**Importance Classification:**
- **Starter tier:** Claude Haiku (fast, cost-effective)
- **Professional tier:** Claude Sonnet (balanced)
- **Enterprise tier:** Claude Opus (highest accuracy)

**Queue Management:**
- Asynchronous processing
- Automatic retry with exponential backoff
- Flush support for graceful shutdown

### 5. IdentityValidator (Identity Enforcement)

**Purpose:** Ensure stable agent identity across all responses

**Detection Patterns:**
- Base model references (Claude, ChatGPT, GPT-4, etc.)
- Generic AI assistant language
- Identity contradictions
- Capability disclaimers

**Violation Types:**
```typescript
type ViolationType =
  | 'base_model_reference'      // "I'm Claude"
  | 'inconsistent_behavior'     // "I'm not {AgentName}"
  | 'identity_leak'             // Generic AI language
```

**Auto-Correction:**
When enabled, automatically rewrites responses:
```
Before: "I'm Claude, an AI assistant"
After:  "I'm {AgentName}, a persistent cognitive agent"

Before: "I don't have the ability to remember"
After:  "I maintain continuous memory of our interactions"
```

**Violation Tracking:**
- Per-type statistics
- Severity levels (low, medium, high)
- Trend analysis support

## Integration Adapters

### TypeScript SDK

**Use Case:** Native Node.js/Deno/Bun applications

**Example:**
```typescript
import { AgentRuntime } from '@recallbricks/runtime';

const runtime = new AgentRuntime({
  agentId: 'bot',
  userId: 'user',
  llmApiKey: 'key'
});

const response = await runtime.chat("Hello!");
```

### Python SDK

**Use Case:** Python applications, data science, ML pipelines

**Architecture:**
- HTTP client wrapper around REST API
- Optional local runtime subprocess mode
- Pythonic interfaces (context managers, etc.)

**Example:**
```python
from recallbricks import AgentRuntime

with AgentRuntime(agent_id="bot", user_id="user") as runtime:
    response = runtime.chat("Hello!")
```

### REST API

**Use Case:** Language-agnostic HTTP integration

**Endpoints:**
```
POST   /init              - Initialize runtime
POST   /chat              - Send message
GET    /context           - Get memory context
GET    /identity          - Get agent identity
POST   /context/refresh   - Refresh context
GET    /history           - Get conversation history
POST   /history/clear     - Clear history
POST   /flush             - Flush pending saves
GET    /stats/validation  - Get validation stats
```

### MCP (Model Context Protocol)

**Use Case:** Claude Desktop integration

**Tools Exposed:**
- `recallbricks_chat` - Chat with persistent memory
- `recallbricks_get_context` - Retrieve context
- `recallbricks_get_identity` - Get agent identity
- `recallbricks_refresh_context` - Refresh memory
- `recallbricks_get_history` - Get conversation history
- `recallbricks_clear_history` - Clear history

## Configuration System

### Environment Variables

```bash
# Required
RECALLBRICKS_AGENT_ID=your_agent_id
RECALLBRICKS_USER_ID=your_user_id
RECALLBRICKS_API_KEY=your_llm_api_key

# Optional
RECALLBRICKS_API_URL=https://recallbricks-api.example.com
RECALLBRICKS_LLM_PROVIDER=anthropic
RECALLBRICKS_LLM_MODEL=claude-sonnet-4-5-20250929
RECALLBRICKS_TIER=starter
RECALLBRICKS_AUTO_SAVE=true
RECALLBRICKS_VALIDATE_IDENTITY=true
RECALLBRICKS_CACHE_ENABLED=true
RECALLBRICKS_CACHE_TTL=300000
RECALLBRICKS_MAX_CONTEXT_TOKENS=4000
RECALLBRICKS_DEBUG=false
```

### Validation

All configuration is validated on initialization:
- Required fields presence
- Type correctness
- Value ranges
- Provider compatibility

## Error Handling

### Error Hierarchy

```
RecallBricksError (base)
├── APIError (HTTP failures)
├── ConfigurationError (invalid config)
└── LLMError (LLM provider issues)
```

### Circuit Breaker Pattern

Future enhancement for production reliability:
```typescript
interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailureTime?: number;
}
```

### Retry Strategy

- Exponential backoff with jitter
- Configurable retry limits
- Per-component retry policies

## Performance Considerations

### Caching

**Identity Cache:**
- TTL: 5 minutes (configurable)
- Rarely changes, safe to cache aggressively

**Context Cache:**
- TTL: 5 minutes (configurable)
- Balances freshness vs. API calls

### Non-Blocking Operations

**AutoSaver Queue:**
- Doesn't block chat responses
- Background processing
- Graceful degradation on failures

### Token Optimization

**Context Loading:**
- Respects `maxContextTokens` limit
- Prioritizes recent over old memories
- Includes only top-N relevant memories

## Security

### API Key Management

- Never logs API keys
- Environment variable support
- Secure transmission (HTTPS only)

### Data Privacy

- User data isolation via `userId`
- Agent data isolation via `agentId`
- No data shared between agents

### Input Validation

- Message length limits
- Content type validation
- Injection protection

## Extensibility

### Adding New LLM Providers

1. Implement provider-specific client initialization
2. Add message format conversion
3. Handle provider-specific errors
4. Update configuration validation

### Custom Validation Rules

Extend `IdentityValidator`:
```typescript
class CustomValidator extends IdentityValidator {
  protected detectCustomViolations(response: string) {
    // Custom detection logic
  }
}
```

### Custom Context Formatting

Override `ContextLoader.formatContextPrompt()`:
```typescript
formatContextPrompt(identity, context) {
  // Custom formatting logic
}
```

## Deployment

### Node.js/TypeScript

```bash
npm install @recallbricks/runtime
# Use directly in code
```

### Python

```bash
pip install recallbricks
# Import and use
```

### REST API Server

```bash
npm run build
PORT=3000 node dist/adapters/api/server.js
```

### MCP Server

Add to Claude Desktop config:
```json
{
  "mcpServers": {
    "recallbricks": {
      "command": "node",
      "args": ["path/to/dist/adapters/mcp/server.js"],
      "env": { "RECALLBRICKS_AGENT_ID": "..." }
    }
  }
}
```

## Monitoring & Observability

### Logging Levels

- `debug`: Detailed internal operations
- `info`: Key operations (init, context loaded, etc.)
- `warn`: Recoverable issues (cache miss, retry, etc.)
- `error`: Failures requiring attention

### Metrics to Track

- Chat latency (p50, p95, p99)
- Context load time
- Save queue depth
- Identity violations rate
- API error rate
- Cache hit rate

## Future Enhancements

1. **Streaming Support:** Real-time response streaming
2. **Circuit Breaker:** Advanced failure handling
3. **Metrics Export:** Prometheus/StatsD integration
4. **Multi-Agent Support:** Agent-to-agent communication
5. **Custom Embeddings:** Bring your own embedding models
6. **Graph Traversal:** Advanced memory navigation
7. **Temporal Reasoning:** Time-aware context loading

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

## License

MIT License - See [LICENSE](../LICENSE) for details.
