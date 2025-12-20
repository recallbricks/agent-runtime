# RecallBricks Agent Runtime

**Universal cognitive runtime for AI systems - persistent identity, continuous memory, and self-improving intelligence.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-yellow)](https://www.python.org/)

## What is RecallBricks Runtime?

RecallBricks is **Layer 3 of the RecallBricks cognitive stack** - a universal runtime that sits between any LLM and your application to provide:

- **Persistent Identity** - Stable personality and behavior across all sessions
- **Continuous Memory** - Automatic context loading with zero manual management
- **Self-Improving Intelligence** - Learns from every interaction via the Metacognition Engine
- **Universal Compatibility** - Works with Anthropic, OpenAI, Gemini, Ollama, and local models
- **Self-Reflection** - Built-in metacognition with automatic reflection and reasoning

This is not just memory infrastructure. This is **cognitive infrastructure**.

## The Three-Layer Cognitive Stack

```
┌─────────────────────────────────────────┐
│   Layer 1: Metacognition Engine        │
│   Learns, optimizes, predicts patterns  │
└─────────────┬───────────────────────────┘
              │
              ▼ Feeds pattern detection
┌─────────────────────────────────────────┐
│   Layer 2: Memory Graph                 │
│   Stores knowledge semantically         │
└─────────────┬───────────────────────────┘
              │
              ▼ Queries for context
┌─────────────────────────────────────────┐
│   Layer 3: Agent Runtime (THIS)         │ ◄─ YOU ARE HERE
│   Delivers persistent identity          │
└─────────────┬───────────────────────────┘
              │
              ▼ Universal LLM interface
         Your Application
```

## Quick Start

### Installation

```bash
# TypeScript/JavaScript
npm install @recallbricks/runtime

# Python
pip install recallbricks
```

### 30-Second Example

```typescript
import { AgentRuntime } from '@recallbricks/runtime';

const agent = new AgentRuntime({
  agentId: 'sales_bot',
  userId: 'customer_123',
  llmProvider: 'anthropic',
  llmApiKey: process.env.ANTHROPIC_API_KEY,
  apiKey: process.env.RECALLBRICKS_API_KEY,
});

// Chat with automatic context loading
const response = await agent.chat("What did we discuss last time?");
console.log(response.response);
// Agent remembers everything - no manual memory management!

// Optional: Trigger self-reflection
const reflection = await agent.reflect();
console.log(reflection.insights);
```

**That's it.** The runtime handles:
- Loading relevant context from past conversations
- Injecting agent identity and behavioral rules
- Calling the LLM with enriched context
- Validating response for identity leakage
- Saving conversation for future reference

## Key Features

### 1. Automatic Context Loading

No manual memory management required:

```typescript
// Day 1
await runtime.chat("I'm working on a machine learning project");

// Day 30 - different session
await runtime.chat("Can you remind me what I was working on?");
// Agent: "You were working on a machine learning project..."
```

The runtime automatically:
- Loads recent conversations
- Retrieves relevant memories
- Includes predicted context
- Optimizes token usage

### 2. Persistent Identity

Your agent maintains stable identity across all sessions:

```typescript
// Bad: "I'm Claude, an AI assistant made by Anthropic"
// Auto-corrected: "I'm SalesBot, your sales assistant"
```

Identity validation detects and corrects:
- Base model references (Claude, ChatGPT, etc.)
- Generic AI assistant language
- Inconsistent behavior
- Identity contradictions

### 3. Universal LLM Support

Switch providers without code changes:

```typescript
// Anthropic Claude
llmProvider: 'anthropic'

// OpenAI GPT
llmProvider: 'openai'

// Google Gemini
llmProvider: 'gemini'

// Ollama (local)
llmProvider: 'ollama'

// Custom local models
llmProvider: 'local'
```

### 4. Multi-User Isolation

Each user gets separate memory and context:

```typescript
const alice = new AgentRuntime({ userId: 'alice', ... });
const bob = new AgentRuntime({ userId: 'bob', ... });

// Alice and Bob have completely isolated conversations
```

### 5. Self-Reflection & Metacognition

Agents can analyze their own behavior and improve:

```typescript
// Trigger manual reflection
const reflection = await agent.reflect();
console.log(reflection.insights);
// ["User prefers concise answers", "Topic focus: machine learning"]

// Explain reasoning (Chain of Thought)
const trace = await agent.explain("Why did you recommend that?");
console.log(trace.steps);
console.log(trace.conclusion);
```

### 6. Continuous Learning

Every interaction feeds the Metacognition Engine:

```
User interaction
      ↓
Auto-save to API
      ↓
Metacognition Engine
      ↓
Pattern detection
      ↓
Improved predictions
```

## Integration Options

### 1. TypeScript/JavaScript SDK

```typescript
import { AgentRuntime } from '@recallbricks/runtime';

const runtime = new AgentRuntime({
  agentId: 'my_bot',
  userId: 'user_123',
  llmApiKey: 'sk-...',
});

const response = await runtime.chat('Hello!');
```

### 2. Python SDK

```python
from recallbricks import AgentRuntime

runtime = AgentRuntime(
    agent_id='my_bot',
    user_id='user_123',
    llm_api_key='sk-...'
)

response = runtime.chat('Hello!')
```

### 3. REST API

```bash
# Start server
npm run build
PORT=3000 node dist/adapters/api/server.js

# Use from any language
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```

### 4. MCP (Claude Desktop)

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "recallbricks": {
      "command": "node",
      "args": ["/path/to/dist/adapters/mcp/server.js"],
      "env": {
        "RECALLBRICKS_AGENT_ID": "my_bot",
        "RECALLBRICKS_USER_ID": "user_123",
        "RECALLBRICKS_API_URL": "https://recallbricks-api-clean.onrender.com"
      }
    }
  }
}
```

**Note:** No Anthropic API key needed! Claude Desktop already has Claude running. The MCP server only loads/saves context from RecallBricks API.

## Architecture

```
User Message
     │
     ▼
┌────────────────────┐
│ Save Previous Turn │ ──► Metacognition Engine (Layer 1)
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Load Context       │ ◄── Memory Graph (Layer 2)
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Inject Identity +  │
│ Context            │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Call LLM           │ ──► Anthropic/OpenAI/etc.
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Validate Response  │
│ (Identity Check)   │
└────────┬───────────┘
         │
         ▼
   Return to User
```

## Use Cases

### Customer Support

```typescript
const support = new AgentRuntime({
  agentId: 'support_bot',
  userId: customerId,
  llmApiKey: key,
});

// Remembers customer issues, preferences, history
const response = await support.chat("Status of my order?");
```

### Sales Assistant

```typescript
const sales = new AgentRuntime({
  agentId: 'sales_assistant',
  userId: leadId,
  llmApiKey: key,
});

// Tracks leads, conversations, deal status
const response = await sales.chat("Can you remind me of our last call?");
```

### Personal AI Assistant

```typescript
const assistant = new AgentRuntime({
  agentId: 'personal_assistant',
  userId: userId,
  llmApiKey: key,
});

// Remembers tasks, preferences, context
const response = await assistant.chat("What's on my agenda?");
```

## Configuration

### All Options

```typescript
const runtime = new AgentRuntime({
  // Required
  agentId: 'your_agent',
  userId: 'your_user',
  llmApiKey: 'your_key',

  // Optional
  apiUrl: 'https://recallbricks-api.example.com',
  llmProvider: 'anthropic',          // anthropic, openai, cohere, local
  llmModel: 'claude-sonnet-4-5-20250929',
  tier: 'starter',                   // starter, professional, enterprise
  autoSave: true,                    // Auto-save conversations
  validateIdentity: true,            // Validate agent identity
  cacheEnabled: true,                // Enable context caching
  cacheTTL: 300000,                  // Cache TTL (5 min)
  maxContextTokens: 4000,            // Max context tokens
  debug: false,                      // Debug logging
});
```

### Environment Variables

```bash
RECALLBRICKS_AGENT_ID=your_agent
RECALLBRICKS_USER_ID=your_user
RECALLBRICKS_API_KEY=your_llm_key
RECALLBRICKS_LLM_PROVIDER=anthropic
RECALLBRICKS_TIER=starter
```

## API Reference

### Core Methods

```typescript
// Send a message
const response = await agent.chat(message);

// Get agent identity
const identity = agent.getIdentity();

// Get memory context
const context = await agent.getContext();

// Refresh context (bypass cache)
await agent.refreshContext();

// Trigger self-reflection
const reflection = await agent.reflect();

// Explain reasoning for a query
const trace = await agent.explain("Why?");

// Get conversation history
const history = agent.getConversationHistory();

// Clear session history
agent.clearConversationHistory();

// Flush pending saves
await agent.flush();

// Graceful shutdown
await agent.shutdown();

// Get validation stats
const stats = agent.getValidationStats();

// Get reflection history
const reflections = agent.getReflectionHistory();

// Get runtime version
const version = agent.getVersion();
```

See [API Reference](./docs/api-reference.md) for complete documentation.

## Examples

Check the `/examples` directory for:
- **basic-usage.ts** - Simple quickstart example
- **multi-provider.ts** - Using different LLM providers
- **reflection-demo.ts** - Self-reflection and Chain of Thought
- **typescript-agent/** - Full TypeScript integration example
- **python-agent/** - Python SDK usage example
- **api-integration/** - REST API usage example
- **mcp-quickstart/** - Claude Desktop integration guide

## Documentation

- **[Quickstart Guide](./docs/quickstart.md)** - Get started in 5 minutes
- **[Architecture](./docs/architecture.md)** - Deep dive into system design
- **[API Reference](./docs/api-reference.md)** - Complete API documentation

## Testing

```bash
# Install dependencies
npm install

# Run tests
npm test

# Coverage report
npm run test:coverage
```

## Building from Source

```bash
# Clone repository
git clone https://github.com/recallbricks/agent-runtime.git
cd agent-runtime

# Install dependencies
npm install

# Build
npm run build

# Run examples
npm run build
node dist/examples/typescript-agent/index.js
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Roadmap

- [x] Core runtime with identity validation
- [x] TypeScript/JavaScript SDK
- [x] Python SDK
- [x] REST API adapter
- [x] MCP adapter for Claude Desktop
- [x] Google Gemini support
- [x] Ollama (local models) support
- [x] ReflectionEngine for self-analysis
- [x] ContextWeaver for advanced context building
- [ ] Streaming support
- [ ] Telemetry and usage analytics
- [ ] Advanced circuit breaker patterns
- [ ] Metrics export (Prometheus/StatsD)
- [ ] Multi-agent communication
- [ ] Custom embedding models
- [ ] Advanced graph traversal
- [ ] Temporal reasoning

## License

MIT License - See [LICENSE](./LICENSE) for details.

## Product Positioning

**"RecallBricks Agent Runtime - The universal cognitive runtime for AI systems. Turn any LLM into a persistent agent with continuous memory, stable identity, and self-improving intelligence."**

This is not just memory infrastructure.

This is not just a wrapper around LLMs.

This is **cognitive infrastructure for the AI era**.

---

**Built by [RecallBricks](https://recallbricks.com)**

Questions? Issues? [Open an issue](https://github.com/recallbricks/agent-runtime/issues) or reach out to support@recallbricks.com
