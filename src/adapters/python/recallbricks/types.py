"""
RecallBricks Python SDK - Type Definitions
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Literal, Any


# LLM Provider Types
LLMProvider = Literal["anthropic", "openai", "cohere", "local"]
RecallBricksTier = Literal["starter", "professional", "enterprise"]


@dataclass
class LLMMessage:
    """A message in the conversation"""
    role: Literal["user", "assistant", "system"]
    content: str


@dataclass
class RuntimeOptions:
    """Configuration options for the AgentRuntime"""
    agent_id: str
    user_id: str
    api_url: str = "https://recallbricks-api-clean.onrender.com"
    llm_provider: LLMProvider = "anthropic"
    llm_api_key: Optional[str] = None
    llm_model: Optional[str] = None
    tier: RecallBricksTier = "starter"
    auto_save: bool = True
    validate_identity: bool = True
    cache_enabled: bool = True
    cache_ttl: int = 300000  # 5 minutes in milliseconds
    max_context_tokens: int = 4000
    debug: bool = False


@dataclass
class ChatMetadata:
    """Metadata about a chat response"""
    provider: str
    model: str
    context_loaded: bool
    identity_validated: bool
    auto_saved: bool
    tokens_used: Optional[int] = None


@dataclass
class ChatResponse:
    """Response from the chat method"""
    response: str
    metadata: ChatMetadata


@dataclass
class Memory:
    """A memory entry"""
    id: str
    content: str
    type: Literal["conversation", "fact", "observation", "insight"]
    importance: float
    timestamp: str
    metadata: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None


@dataclass
class MemoryContext:
    """Memory context for an agent"""
    recent_memories: List[Memory] = field(default_factory=list)
    relevant_memories: List[Memory] = field(default_factory=list)
    predicted_context: List[str] = field(default_factory=list)
    total_memories: int = 0
    last_updated: str = ""


@dataclass
class AgentIdentity:
    """Agent identity and behavioral rules"""
    id: str
    name: str
    purpose: str
    traits: List[str] = field(default_factory=list)
    rules: List[str] = field(default_factory=list)
    created_at: str = ""
    updated_at: str = ""


@dataclass
class ValidationStats:
    """Identity validation statistics"""
    total: int
    by_type: Dict[str, int]
    by_severity: Dict[str, int]
