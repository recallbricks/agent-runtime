/**
 * RecallBricks Agent Runtime - Context Loader
 *
 * Retrieves and formats context from the RecallBricks Memory Graph
 */

import axios, { AxiosInstance } from 'axios';
import { LRUCache } from 'lru-cache';
import pRetry from 'p-retry';
import {
  AgentIdentity,
  MemoryContext,
  ContextPrompt,
  GetContextResponse,
  RecallResponse,
  RecallMemory,
  Memory,
  APIError,
  Logger,
  CacheEntry,
} from '../types';

// ============================================================================
// Context Loader Configuration
// ============================================================================

interface ContextLoaderConfig {
  apiUrl: string;
  apiKey: string;
  agentId: string;
  userId: string;
  agentName?: string;
  agentPurpose?: string;
  cacheEnabled: boolean;
  cacheTTL: number;
  maxContextTokens: number;
  logger: Logger;
}

// ============================================================================
// Context Loader Implementation
// ============================================================================

export class ContextLoader {
  private apiClient: AxiosInstance;
  private identityCache?: LRUCache<string, CacheEntry<AgentIdentity>>;
  private contextCache?: LRUCache<string, CacheEntry<MemoryContext>>;

  constructor(private config: ContextLoaderConfig) {
    this.apiClient = axios.create({
      baseURL: config.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
      },
    });

    if (config.cacheEnabled) {
      this.identityCache = new LRUCache<string, CacheEntry<AgentIdentity>>({
        max: 100,
        ttl: config.cacheTTL,
      });

      this.contextCache = new LRUCache<string, CacheEntry<MemoryContext>>({
        max: 500,
        ttl: config.cacheTTL,
      });

      config.logger.debug('Context caching enabled', {
        cacheTTL: config.cacheTTL,
      });
    }
  }

  /**
   * Load full context (identity + memories) from RecallBricks API v1
   * Uses GET /api/v1/memories/recall endpoint
   */
  async loadContext(): Promise<GetContextResponse> {
    this.config.logger.debug('Loading context', {
      agentId: this.config.agentId,
      userId: this.config.userId,
    });

    try {
      const response = await pRetry(
        async () => {
          const result = await this.apiClient.get<RecallResponse>(
            '/api/v1/memories/recall',
            {
              params: {
                query: 'recent interactions and context',
                limit: 20,
                organized: true,
                user_id: this.config.userId,
              },
            }
          );
          return result.data;
        },
        {
          retries: 3,
          minTimeout: 1000,
          onFailedAttempt: (error) => {
            this.config.logger.warn(
              `Context load attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`
            );
          },
        }
      );

      // Transform RecallResponse to MemoryContext
      const context: MemoryContext = this.transformRecallToContext(response);

      // Get identity (from config or default)
      const identity = await this.loadIdentity();

      // Cache the results
      if (this.identityCache) {
        this.identityCache.set(this.config.agentId, {
          data: identity,
          timestamp: Date.now(),
          ttl: this.config.cacheTTL,
        });
      }

      if (this.contextCache) {
        const cacheKey = `${this.config.agentId}:${this.config.userId}`;
        this.contextCache.set(cacheKey, {
          data: context,
          timestamp: Date.now(),
          ttl: this.config.cacheTTL,
        });
      }

      this.config.logger.info('Context loaded successfully', {
        memoryCount: context.totalMemories,
        recentCount: context.recentMemories.length,
      });

      return { identity, context };
    } catch (error) {
      this.config.logger.error('Failed to load context', { error });
      throw this.handleAPIError(error);
    }
  }

  /**
   * Transform RecallResponse to MemoryContext format
   */
  private transformRecallToContext(response: RecallResponse): MemoryContext {
    const memories: Memory[] = response.memories.map((mem: RecallMemory) => ({
      id: mem.id,
      content: mem.text,
      type: 'conversation' as const,
      importance: mem.metadata?.importance ?? 0.5,
      timestamp: mem.created_at,
      metadata: mem.metadata,
      tags: mem.metadata?.tags,
    }));

    // Split memories into recent (first 10) and relevant (rest by score)
    const recentMemories = memories.slice(0, 10);
    const relevantMemories = memories
      .slice(10)
      .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
      .slice(0, 5);

    // Extract predicted context from categories if available
    const predictedContext: string[] = response.categories
      ? Object.keys(response.categories).slice(0, 5)
      : [];

    return {
      recentMemories,
      relevantMemories,
      predictedContext,
      totalMemories: response.total,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Load agent identity from config (no API call needed)
   * Identity is constructed from environment variables / config
   */
  async loadIdentity(): Promise<AgentIdentity> {
    // Check cache first
    if (this.identityCache) {
      const cached = this.identityCache.get(this.config.agentId);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        this.config.logger.debug('Identity loaded from cache');
        return cached.data;
      }
    }

    this.config.logger.debug('Building identity from config', {
      agentId: this.config.agentId,
    });

    // Build identity from config (no API call needed)
    const identity: AgentIdentity = {
      id: this.config.agentId,
      name: this.config.agentName || 'RecallBricks Agent',
      purpose: this.config.agentPurpose || 'A persistent cognitive agent with continuous memory',
      traits: ['helpful', 'knowledgeable', 'consistent'],
      rules: [
        'Maintain consistency with your identity and purpose',
        'Reference your continuous memory when relevant',
        'Never claim to be a base model like Claude or GPT',
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Cache the result
    if (this.identityCache) {
      this.identityCache.set(this.config.agentId, {
        data: identity,
        timestamp: Date.now(),
        ttl: this.config.cacheTTL,
      });
    }

    this.config.logger.info('Identity built successfully', {
      agentName: identity.name,
    });

    return identity;
  }

  /**
   * Format context into a prompt for LLM injection
   */
  formatContextPrompt(
    identity: AgentIdentity,
    context: MemoryContext
  ): ContextPrompt {
    this.config.logger.debug('Formatting context prompt');

    // Identity section
    const identitySection = this.formatIdentitySection(identity);

    // Memory section
    const memorySection = this.formatMemorySection(context);

    // Rules section
    const rulesSection = this.formatRulesSection(identity);

    // Combine into system prompt
    const systemPrompt = `${identitySection}\n\n${memorySection}\n\n${rulesSection}`;

    return {
      systemPrompt,
      identitySection,
      memorySection,
      rulesSection,
    };
  }

  /**
   * Format identity section
   */
  private formatIdentitySection(identity: AgentIdentity): string {
    const traits = identity.traits.join(', ');

    return `You are ${identity.name}, a persistent cognitive agent built on RecallBricks.

Your purpose: ${identity.purpose}
Your traits: ${traits}

CRITICAL: Never refer to yourself as the base model (Claude, ChatGPT, GPT, Assistant, etc.).
You are ${identity.name} with continuous memory and persistent identity across all conversations.`;
  }

  /**
   * Format memory section
   */
  private formatMemorySection(context: MemoryContext): string {
    if (
      context.recentMemories.length === 0 &&
      context.relevantMemories.length === 0
    ) {
      return 'Recent context from your memory:\nNo previous interactions found. This is a new conversation.';
    }

    let memoryText = 'Recent context from your memory:\n\n';

    // Add recent memories
    if (context.recentMemories.length > 0) {
      memoryText += 'Recent interactions:\n';
      context.recentMemories.slice(0, 5).forEach((memory, index) => {
        memoryText += `${index + 1}. ${memory.content}\n`;
      });
      memoryText += '\n';
    }

    // Add relevant memories
    if (context.relevantMemories.length > 0) {
      memoryText += 'Relevant context:\n';
      context.relevantMemories.slice(0, 5).forEach((memory, index) => {
        memoryText += `${index + 1}. ${memory.content}\n`;
      });
      memoryText += '\n';
    }

    // Add predicted context
    if (context.predictedContext.length > 0) {
      memoryText += 'Predicted relevant topics:\n';
      memoryText += context.predictedContext.slice(0, 3).join(', ');
      memoryText += '\n';
    }

    return memoryText.trim();
  }

  /**
   * Format behavioral rules section
   */
  private formatRulesSection(identity: AgentIdentity): string {
    if (identity.rules.length === 0) {
      return 'Behavioral guidelines:\n- Maintain consistency with your identity and purpose\n- Reference your continuous memory when relevant';
    }

    let rulesText = 'Behavioral guidelines:\n';
    identity.rules.forEach((rule, index) => {
      rulesText += `${index + 1}. ${rule}\n`;
    });

    return rulesText.trim();
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    if (this.identityCache) {
      this.identityCache.clear();
    }
    if (this.contextCache) {
      this.contextCache.clear();
    }
    this.config.logger.debug('Context caches cleared');
  }

  /**
   * Handle API errors
   */
  private handleAPIError(error: unknown): APIError {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message =
        error.response?.data?.message ||
        error.message ||
        'Unknown API error';

      return new APIError(message, status, {
        url: error.config?.url,
        method: error.config?.method,
      });
    }

    if (error instanceof Error) {
      return new APIError(error.message, 500);
    }

    return new APIError('Unknown error occurred', 500, { error });
  }
}
