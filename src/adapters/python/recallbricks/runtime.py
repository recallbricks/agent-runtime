"""
RecallBricks Python SDK - Agent Runtime

Python wrapper for the RecallBricks Agent Runtime
"""

import os
import requests
import subprocess
import time
import atexit
from typing import List, Optional, Dict, Any
from .types import (
    RuntimeOptions,
    ChatResponse,
    ChatMetadata,
    LLMMessage,
    AgentIdentity,
    MemoryContext,
    ValidationStats,
    Memory,
)


class RecallBricksError(Exception):
    """Base exception for RecallBricks errors"""
    pass


class APIError(RecallBricksError):
    """API request error"""
    def __init__(self, message: str, status_code: int = 500, details: Optional[Dict] = None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details or {}


class AgentRuntime:
    """
    RecallBricks Agent Runtime - Python SDK

    Universal cognitive runtime for AI systems with persistent memory
    and stable identity.
    """

    def __init__(
        self,
        agent_id: str,
        user_id: str,
        api_url: str = "https://recallbricks-api-clean.onrender.com",
        llm_provider: str = "anthropic",
        llm_api_key: Optional[str] = None,
        llm_model: Optional[str] = None,
        tier: str = "starter",
        auto_save: bool = True,
        validate_identity: bool = True,
        cache_enabled: bool = True,
        cache_ttl: int = 300000,
        max_context_tokens: int = 4000,
        debug: bool = False,
        use_local_runtime: bool = False,
    ):
        """
        Initialize the AgentRuntime

        Args:
            agent_id: Unique identifier for the agent
            user_id: Unique identifier for the user
            api_url: RecallBricks API URL
            llm_provider: LLM provider (anthropic, openai, cohere, local)
            llm_api_key: API key for the LLM provider
            llm_model: Model to use (optional, defaults based on provider)
            tier: RecallBricks tier (starter, professional, enterprise)
            auto_save: Automatically save conversations
            validate_identity: Validate agent identity in responses
            cache_enabled: Enable context caching
            cache_ttl: Cache time-to-live in milliseconds
            max_context_tokens: Maximum context tokens
            debug: Enable debug logging
            use_local_runtime: Use local TypeScript runtime via subprocess
        """
        self.agent_id = agent_id
        self.user_id = user_id
        self.api_url = api_url
        self.debug = debug
        self.use_local_runtime = use_local_runtime

        self.options = RuntimeOptions(
            agent_id=agent_id,
            user_id=user_id,
            api_url=api_url,
            llm_provider=llm_provider,  # type: ignore
            llm_api_key=llm_api_key or os.getenv("RECALLBRICKS_API_KEY"),
            llm_model=llm_model,
            tier=tier,  # type: ignore
            auto_save=auto_save,
            validate_identity=validate_identity,
            cache_enabled=cache_enabled,
            cache_ttl=cache_ttl,
            max_context_tokens=max_context_tokens,
            debug=debug,
        )

        self._runtime_process: Optional[subprocess.Popen] = None
        self._runtime_url: Optional[str] = None

        if use_local_runtime:
            self._start_local_runtime()
        else:
            self._runtime_url = api_url
            self._initialize_remote_runtime()

    def _start_local_runtime(self) -> None:
        """Start a local TypeScript runtime server"""
        if self.debug:
            print("[RecallBricks] Starting local runtime server...")

        # Find available port
        port = 3000
        self._runtime_url = f"http://localhost:{port}"

        # Start the server process
        env = os.environ.copy()
        env["PORT"] = str(port)

        self._runtime_process = subprocess.Popen(
            ["node", "dist/adapters/api/server.js"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        # Wait for server to start
        max_retries = 30
        for _ in range(max_retries):
            try:
                response = requests.get(f"{self._runtime_url}/health", timeout=1)
                if response.status_code == 200:
                    if self.debug:
                        print(f"[RecallBricks] Local runtime started on port {port}")
                    break
            except requests.exceptions.RequestException:
                time.sleep(0.1)
        else:
            raise RecallBricksError("Failed to start local runtime server")

        # Register cleanup
        atexit.register(self._stop_local_runtime)

        # Initialize the runtime
        self._initialize_remote_runtime()

    def _stop_local_runtime(self) -> None:
        """Stop the local runtime server"""
        if self._runtime_process:
            if self.debug:
                print("[RecallBricks] Stopping local runtime server...")
            self._runtime_process.terminate()
            self._runtime_process.wait(timeout=5)

    def _initialize_remote_runtime(self) -> None:
        """Initialize the remote runtime"""
        response = requests.post(
            f"{self._runtime_url}/init",
            json=self._options_to_dict(),
            timeout=30,
        )

        if response.status_code != 200:
            raise APIError(
                f"Failed to initialize runtime: {response.text}",
                response.status_code,
            )

    def _options_to_dict(self) -> Dict[str, Any]:
        """Convert RuntimeOptions to dict"""
        return {
            "agentId": self.options.agent_id,
            "userId": self.options.user_id,
            "apiUrl": self.options.api_url,
            "llmProvider": self.options.llm_provider,
            "llmApiKey": self.options.llm_api_key,
            "llmModel": self.options.llm_model,
            "tier": self.options.tier,
            "autoSave": self.options.auto_save,
            "validateIdentity": self.options.validate_identity,
            "cacheEnabled": self.options.cache_enabled,
            "cacheTTL": self.options.cache_ttl,
            "maxContextTokens": self.options.max_context_tokens,
            "debug": self.options.debug,
        }

    def chat(
        self,
        message: str,
        conversation_history: Optional[List[LLMMessage]] = None,
    ) -> ChatResponse:
        """
        Send a chat message and get a contextual response

        Args:
            message: The message to send
            conversation_history: Optional conversation history

        Returns:
            ChatResponse with the agent's response and metadata
        """
        payload: Dict[str, Any] = {"message": message}

        if conversation_history:
            payload["conversationHistory"] = [
                {"role": msg.role, "content": msg.content}
                for msg in conversation_history
            ]

        response = requests.post(
            f"{self._runtime_url}/chat",
            json=payload,
            timeout=60,
        )

        if response.status_code != 200:
            raise APIError(
                f"Chat request failed: {response.text}",
                response.status_code,
            )

        data = response.json()

        return ChatResponse(
            response=data["response"],
            metadata=ChatMetadata(**data["metadata"]),
        )

    def get_context(self) -> Optional[MemoryContext]:
        """Get the current memory context"""
        response = requests.get(f"{self._runtime_url}/context", timeout=30)

        if response.status_code != 200:
            raise APIError(
                f"Failed to get context: {response.text}",
                response.status_code,
            )

        data = response.json()
        if not data.get("context"):
            return None

        ctx = data["context"]
        return MemoryContext(
            recent_memories=[Memory(**m) for m in ctx.get("recentMemories", [])],
            relevant_memories=[Memory(**m) for m in ctx.get("relevantMemories", [])],
            predicted_context=ctx.get("predictedContext", []),
            total_memories=ctx.get("totalMemories", 0),
            last_updated=ctx.get("lastUpdated", ""),
        )

    def get_identity(self) -> Optional[AgentIdentity]:
        """Get the agent identity"""
        response = requests.get(f"{self._runtime_url}/identity", timeout=30)

        if response.status_code != 200:
            raise APIError(
                f"Failed to get identity: {response.text}",
                response.status_code,
            )

        data = response.json()
        if not data.get("identity"):
            return None

        return AgentIdentity(**data["identity"])

    def refresh_context(self) -> None:
        """Refresh memory context from the API (bypasses cache)"""
        response = requests.post(
            f"{self._runtime_url}/context/refresh",
            timeout=30,
        )

        if response.status_code != 200:
            raise APIError(
                f"Failed to refresh context: {response.text}",
                response.status_code,
            )

    def get_conversation_history(self) -> List[LLMMessage]:
        """Get the conversation history for this session"""
        response = requests.get(f"{self._runtime_url}/history", timeout=30)

        if response.status_code != 200:
            raise APIError(
                f"Failed to get history: {response.text}",
                response.status_code,
            )

        data = response.json()
        return [LLMMessage(**msg) for msg in data.get("history", [])]

    def clear_conversation_history(self) -> None:
        """Clear the conversation history for this session"""
        response = requests.post(
            f"{self._runtime_url}/history/clear",
            timeout=30,
        )

        if response.status_code != 200:
            raise APIError(
                f"Failed to clear history: {response.text}",
                response.status_code,
            )

    def flush(self) -> None:
        """Wait for all pending saves to complete"""
        response = requests.post(f"{self._runtime_url}/flush", timeout=60)

        if response.status_code != 200:
            raise APIError(
                f"Failed to flush: {response.text}",
                response.status_code,
            )

    def get_validation_stats(self) -> Optional[ValidationStats]:
        """Get identity validation statistics"""
        response = requests.get(
            f"{self._runtime_url}/stats/validation",
            timeout=30,
        )

        if response.status_code != 200:
            raise APIError(
                f"Failed to get validation stats: {response.text}",
                response.status_code,
            )

        data = response.json()
        if not data.get("stats"):
            return None

        stats = data["stats"]
        return ValidationStats(
            total=stats["total"],
            by_type=stats["byType"],
            by_severity=stats["bySeverity"],
        )

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        if self.use_local_runtime:
            self._stop_local_runtime()

    def __del__(self):
        """Cleanup on deletion"""
        if self.use_local_runtime:
            self._stop_local_runtime()
