"""
Python SDK Example

Basic usage of the RecallBricks Agent Runtime in Python
"""

import os
from recallbricks import AgentRuntime


def main():
    print("RecallBricks Python SDK Example\n")

    # Initialize the runtime
    runtime = AgentRuntime(
        agent_id="sales_assistant",
        user_id="customer_456",
        llm_provider="anthropic",
        llm_api_key=os.getenv("ANTHROPIC_API_KEY"),
        tier="starter",
        debug=True,
    )

    print("Runtime initialized successfully\n")

    # Get agent identity
    identity = runtime.get_identity()
    if identity:
        print("Agent Identity:")
        print(f"  Name: {identity.name}")
        print(f"  Purpose: {identity.purpose}")
        print(f"  Traits: {', '.join(identity.traits)}\n")

    # Get current context
    context = runtime.get_context()
    if context:
        print("Memory Context:")
        print(f"  Total memories: {context.total_memories}")
        print(f"  Recent memories: {len(context.recent_memories)}\n")

    # Chat with the agent
    print("Conversation:\n")

    messages = [
        "Hi! I'm interested in your premium plan.",
        "What are the key features?",
        "How much does it cost?",
        "Can you remind me what features we just discussed?",
    ]

    for message in messages:
        print(f"User: {message}")

        response = runtime.chat(message)

        print(f"Agent: {response.response}")
        print(f"  [Model: {response.metadata.model}]")
        print(f"  [Tokens: {response.metadata.tokens_used}]")
        print(f"  [Identity validated: {response.metadata.identity_validated}]\n")

    # Flush pending saves
    print("Flushing pending saves...")
    runtime.flush()
    print("All conversations saved!\n")

    # Get validation stats
    stats = runtime.get_validation_stats()
    if stats:
        print("Identity Validation Stats:")
        print(f"  Total violations: {stats.total}")
        print(f"  By type: {stats.by_type}")
        print(f"  By severity: {stats.by_severity}")


if __name__ == "__main__":
    main()
