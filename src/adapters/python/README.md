# RecallBricks Python SDK

Universal cognitive runtime for AI systems with persistent memory and stable identity.

## Installation

```bash
pip install recallbricks
```

## Quick Start

```python
from recallbricks import AgentRuntime

# Initialize runtime
runtime = AgentRuntime(
    agent_id="sales_bot",
    user_id="customer_123",
    llm_api_key="your-api-key"  # or set RECALLBRICKS_API_KEY env var
)

# Chat with automatic context loading
response = runtime.chat("What did we discuss last time?")
print(response.response)

# Get agent identity
identity = runtime.get_identity()
print(f"Agent: {identity.name}")
print(f"Purpose: {identity.purpose}")

# Get memory context
context = runtime.get_context()
print(f"Total memories: {context.total_memories}")
```

## Features

- **Persistent Memory**: Automatically saves and loads conversation context
- **Stable Identity**: Maintains consistent agent personality across sessions
- **Universal LLM Support**: Works with Anthropic, OpenAI, Cohere, and local models
- **Auto-Save**: Non-blocking conversation persistence
- **Identity Validation**: Prevents model identity leakage
- **Smart Caching**: Optimizes context loading performance

## API Reference

### AgentRuntime

```python
runtime = AgentRuntime(
    agent_id: str,              # Required: Agent identifier
    user_id: str,               # Required: User identifier
    api_url: str = "...",       # RecallBricks API URL
    llm_provider: str = "anthropic",  # anthropic, openai, cohere, local
    llm_api_key: str = None,    # LLM API key
    llm_model: str = None,      # Model override
    tier: str = "starter",      # starter, professional, enterprise
    auto_save: bool = True,     # Auto-save conversations
    validate_identity: bool = True,  # Validate identity
    debug: bool = False         # Debug logging
)
```

### Methods

```python
# Send a message
response = runtime.chat("Hello!")

# Get conversation history
history = runtime.get_conversation_history()

# Refresh context (bypasses cache)
runtime.refresh_context()

# Clear conversation history
runtime.clear_conversation_history()

# Wait for all saves to complete
runtime.flush()

# Get validation statistics
stats = runtime.get_validation_stats()
```

## Context Manager

```python
with AgentRuntime(agent_id="bot", user_id="user") as runtime:
    response = runtime.chat("Hello!")
    print(response.response)
# Automatic cleanup
```

## License

MIT
