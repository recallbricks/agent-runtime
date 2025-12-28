# RecallBricks Agent Runtime - Quickstart Guide

Get started with RecallBricks Agent Runtime v1.0.0 in 5 minutes.

## What is RecallBricks?

RecallBricks is a universal cognitive runtime that turns any LLM into a persistent agent with:
- **Continuous Memory** - Automatically saves and loads conversation context
- **Stable Identity** - Maintains consistent personality across sessions
- **Self-Improving Intelligence** - Learns from every interaction
- **Autonomous Agent Support** - Working memory, goal tracking, and metacognition

## Installation

### TypeScript/JavaScript

```bash
npm install @recallbricks/runtime@1.0.0
```

### Python

```bash
pip install recallbricks
```

## 30-Second Start

### TypeScript

```typescript
import { AgentRuntime } from '@recallbricks/runtime';

const runtime = new AgentRuntime({
  agentId: 'my_bot',
  userId: 'user_123',
  llmProvider: 'anthropic',
  llmApiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await runtime.chat('Hello!');
console.log(response.response);
```

### Python

```python
from recallbricks import AgentRuntime

runtime = AgentRuntime(
    agent_id='my_bot',
    user_id='user_123',
    llm_api_key=os.getenv('ANTHROPIC_API_KEY')
)

response = runtime.chat('Hello!')
print(response.response)
```

## Complete Example with Memory

Let's build a customer support agent with persistent memory.

### 1. Setup

Create a `.env` file:
```bash
RECALLBRICKS_AGENT_ID=support_bot
RECALLBRICKS_USER_ID=customer_001
ANTHROPIC_API_KEY=your_api_key_here
RECALLBRICKS_TIER=starter
```

### 2. Create Your Agent

```typescript
import { AgentRuntime } from '@recallbricks/runtime';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Initialize runtime
  const runtime = new AgentRuntime({
    agentId: process.env.RECALLBRICKS_AGENT_ID!,
    userId: process.env.RECALLBRICKS_USER_ID!,
    llmApiKey: process.env.ANTHROPIC_API_KEY!,
    llmProvider: 'anthropic',
    tier: 'starter',
    debug: true,
  });

  console.log('Runtime initialized\n');

  // Get agent identity
  const identity = runtime.getIdentity();
  console.log(`Agent: ${identity?.name}`);
  console.log(`Purpose: ${identity?.purpose}\n`);

  // Start conversation
  const messages = [
    'I need help with my order #12345',
    'It was supposed to arrive yesterday',
    'Can you check the status?',
  ];

  for (const message of messages) {
    console.log(`User: ${message}`);
    const response = await runtime.chat(message);
    console.log(`Bot: ${response.response}\n`);
  }

  // The agent now has full context of this conversation
  // When the user returns tomorrow, it will remember everything

  await runtime.flush();
  console.log('All conversations saved');
}

main();
```

### 3. Run It

```bash
npm run build
node dist/your-script.js
```

## First Agent with Autonomous Features

RecallBricks v1.0.0 includes autonomous agent capabilities. Here's a quick example:

```typescript
import { AgentRuntime } from '@recallbricks/runtime';

async function main() {
  const runtime = new AgentRuntime({
    agentId: 'autonomous_agent',
    userId: 'user_123',
    llmProvider: 'anthropic',
    llmApiKey: process.env.ANTHROPIC_API_KEY!,
  });

  // 1. Create a working memory session
  const session = await runtime.createSession('task-001');
  await session.addEntry('objective', 'Complete user onboarding');
  await session.addEntry('step', 1);

  // 2. Track a goal
  const goal = await runtime.trackGoal('onboarding', [
    'Collect user preferences',
    'Setup initial configuration',
    'Send welcome message',
  ]);

  // 3. Process with chat
  const response = await runtime.chat('Help me get started');

  // 4. Assess the response
  const assessment = await runtime.assessResponse(response.response, 0.85);
  console.log(`Confidence: ${assessment.confidence}`);
  console.log(`Needs reflection: ${assessment.needsReflection}`);

  // 5. Mark goal step complete
  await goal.completeStep(1);
  console.log(`Progress: ${goal.progress * 100}%`);

  await runtime.shutdown();
}

main();
```

## Key Features

### Automatic Context Loading

The runtime automatically loads relevant context before each message:

```typescript
// User returns after days/weeks
const response = await runtime.chat('What was my order number again?');
// Agent: "Your order number was #12345..."
```

No manual memory management required!

### Identity Validation

The runtime ensures your agent maintains its identity:

```typescript
// Bad response from LLM: "I'm Claude, an AI assistant"
// Auto-corrected to: "I'm SupportBot, your customer support agent"
```

### Multi-User Support

Each user gets isolated memory:

```typescript
const alice = new AgentRuntime({
  agentId: 'support_bot',
  userId: 'alice',
  llmApiKey: key,
});

const bob = new AgentRuntime({
  agentId: 'support_bot',
  userId: 'bob',
  llmApiKey: key,
});

// Alice and Bob have separate conversation histories
```

### LLM Provider Flexibility

Switch providers without code changes:

```typescript
// Anthropic
const runtime1 = new AgentRuntime({
  llmProvider: 'anthropic',
  llmApiKey: anthropicKey,
  // ...
});

// OpenAI
const runtime2 = new AgentRuntime({
  llmProvider: 'openai',
  llmApiKey: openaiKey,
  // ...
});

// Gemini
const runtime3 = new AgentRuntime({
  llmProvider: 'gemini',
  llmApiKey: geminiKey,
  // ...
});

// Ollama (local)
const runtime4 = new AgentRuntime({
  llmProvider: 'ollama',
  // ...
});
```

## Configuration Options

### All Options

```typescript
import { AgentRuntime } from '@recallbricks/runtime';

const runtime = new AgentRuntime({
  // Required
  agentId: 'your_agent',
  userId: 'your_user',

  // LLM Configuration
  llmProvider: 'anthropic',           // 'anthropic' | 'openai' | 'gemini' | 'ollama' | 'cohere' | 'local'
  llmApiKey: 'your_key',
  llmModel: 'claude-sonnet-4-5-20250929',

  // RecallBricks Configuration
  apiUrl: 'https://api.recallbricks.com',
  apiKey: 'your_recallbricks_key',
  tier: 'starter',                    // 'starter' | 'professional' | 'enterprise'

  // Behavior
  autoSave: true,                     // Auto-save conversations
  validateIdentity: true,             // Validate agent identity
  cacheEnabled: true,                 // Enable context caching
  cacheTTL: 300000,                   // Cache TTL (ms) - 5 minutes
  maxContextTokens: 4000,             // Max context tokens

  // Agent Metadata
  agentName: 'My Agent',
  agentPurpose: 'Helpful assistant',

  // Debug
  debug: false,                       // Debug logging
  mcpMode: false,                     // MCP integration mode
  registerAgent: false,               // Register with RecallBricks
});
```

### Environment Variables

Alternatively, use environment variables:

```bash
RECALLBRICKS_AGENT_ID=your_agent
RECALLBRICKS_USER_ID=your_user
RECALLBRICKS_API_KEY=your_llm_key
RECALLBRICKS_LLM_PROVIDER=anthropic
RECALLBRICKS_TIER=starter
```

```typescript
import { buildConfigFromEnv, AgentRuntime } from '@recallbricks/runtime';

const config = buildConfigFromEnv();
const runtime = new AgentRuntime(config);
```

## Integration Options

### 1. TypeScript/JavaScript SDK

Direct integration in Node.js, Deno, or Bun:
```typescript
import { AgentRuntime } from '@recallbricks/runtime';
```

### 2. Python SDK

Native Python support:
```python
from recallbricks import AgentRuntime
```

### 3. REST API

Language-agnostic HTTP API:
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

Integrate with Claude Desktop via MCP:

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
        "RECALLBRICKS_API_KEY": "your_key"
      }
    }
  }
}
```

## Next Steps

1. **[API Reference](./api-reference.md)** - Complete API documentation
2. **[Autonomous Features](./autonomous-features.md)** - Working memory, goals, metacognition
3. **[Examples](./examples.md)** - Working code examples
4. **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions

## Getting Help

- **Documentation:** [/docs](.)
- **Examples:** [/examples](../examples)
- **Architecture:** [architecture.md](./architecture.md)
- **Issues:** [GitHub Issues](https://github.com/recallbricks/agent-runtime/issues)

Welcome to cognitive infrastructure for AI systems.
