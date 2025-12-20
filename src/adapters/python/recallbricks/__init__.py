"""
RecallBricks Python SDK

Universal cognitive runtime for AI systems - Python adapter
"""

from .runtime import AgentRuntime
from .types import (
    ChatResponse,
    RuntimeOptions,
    AgentIdentity,
    MemoryContext,
    LLMMessage,
)

__version__ = "0.1.0"

__all__ = [
    "AgentRuntime",
    "ChatResponse",
    "RuntimeOptions",
    "AgentIdentity",
    "MemoryContext",
    "LLMMessage",
]
