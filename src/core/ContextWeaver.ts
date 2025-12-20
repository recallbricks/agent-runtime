/**
 * RecallBricks Agent Runtime - Context Weaver
 *
 * Retrieves and weaves memories into context before each LLM call
 * Ranks by confidence, recency, and tier
 */

import { RecallBricksClient } from '../api/RecallBricksClient';
import {
  Memory,
  AgentIdentity,
  ContextPrompt,
  RecallMemory,
  Logger,
} from '../types';

// ============================================================================
// Context Weaver Configuration
// ============================================================================

export interface ContextWeaverConfig {
  apiClient: RecallBricksClient;
  agentId: string;
  agentName: string;
  agentPurpose: string;
  maxContextMemories: number;
  maxContextTokens: number;
  logger: Logger;
}

export interface Context {
  identity: AgentIdentity;
  memories: Memory[];
  recentMemories: Memory[];
  relevantMemories: Memory[];
  predictedTopics: string[];
  totalMemoriesAvailable: number;
  systemPrompt: string;
}

export interface ContextBuildOptions {
  query?: string;
  includeRecent?: boolean;
  includeRelevant?: boolean;
  maxMemories?: number;
}

// ============================================================================
// Context Weaver Implementation
// ============================================================================

export class ContextWeaver {
  private identity: AgentIdentity;
  private lastContext?: Context;

  constructor(private config: ContextWeaverConfig) {
    // Build identity from config
    this.identity = {
      id: config.agentId,
      name: config.agentName,
      purpose: config.agentPurpose,
      traits: ['helpful', 'knowledgeable', 'consistent'],
      rules: [
        'Maintain consistency with your identity and purpose',
        'Reference your continuous memory when relevant',
        'Never claim to be a base model like Claude or GPT',
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    config.logger.debug('ContextWeaver initialized', {
      agentId: config.agentId,
      maxMemories: config.maxContextMemories,
    });
  }

  /**
   * Build context for an LLM call
   * Main entry point - retrieves memories and formats them for injection
   */
  async buildContext(
    query: string,
    options: ContextBuildOptions = {}
  ): Promise<Context> {
    this.config.logger.debug('Building context', { query: query.slice(0, 50) });

    const startTime = Date.now();

    const includeRecent = options.includeRecent ?? true;
    const includeRelevant = options.includeRelevant ?? true;
    const maxMemories = options.maxMemories ?? this.config.maxContextMemories;

    // Fetch memories from API
    const recallResponse = await this.config.apiClient.recallMemories({
      query: query || 'recent interactions and context',
      limit: maxMemories * 2, // Fetch more than needed for ranking
      organized: true,
    });

    // Transform and rank memories
    const allMemories = this.transformMemories(recallResponse.memories);
    const rankedMemories = this.rankMemories(allMemories, query);

    // Split into recent and relevant
    const recentMemories = includeRecent
      ? this.getRecentMemories(rankedMemories, Math.ceil(maxMemories / 2))
      : [];

    const relevantMemories = includeRelevant
      ? this.getRelevantMemories(
          rankedMemories,
          query,
          Math.ceil(maxMemories / 2)
        )
      : [];

    // Extract predicted topics from categories
    const predictedTopics = recallResponse.categories
      ? Object.keys(recallResponse.categories).slice(0, 5)
      : [];

    // Combine memories (deduplicated)
    const combinedMemories = this.deduplicateMemories([
      ...recentMemories,
      ...relevantMemories,
    ]).slice(0, maxMemories);

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(
      this.identity,
      combinedMemories,
      predictedTopics
    );

    const context: Context = {
      identity: this.identity,
      memories: combinedMemories,
      recentMemories,
      relevantMemories,
      predictedTopics,
      totalMemoriesAvailable: recallResponse.total,
      systemPrompt,
    };

    this.lastContext = context;

    const duration = Date.now() - startTime;
    this.config.logger.info('Context built successfully', {
      duration: `${duration}ms`,
      memoriesLoaded: combinedMemories.length,
      totalAvailable: recallResponse.total,
    });

    return context;
  }

  /**
   * Get the identity
   */
  getIdentity(): AgentIdentity {
    return { ...this.identity };
  }

  /**
   * Update identity
   */
  updateIdentity(updates: Partial<AgentIdentity>): void {
    this.identity = { ...this.identity, ...updates, updatedAt: new Date().toISOString() };
    this.config.logger.info('Identity updated');
  }

  /**
   * Get last built context
   */
  getLastContext(): Context | undefined {
    return this.lastContext;
  }

  /**
   * Format context into a prompt structure
   */
  formatContextPrompt(context: Context): ContextPrompt {
    return {
      systemPrompt: context.systemPrompt,
      identitySection: this.formatIdentitySection(context.identity),
      memorySection: this.formatMemorySection(context.memories),
      rulesSection: this.formatRulesSection(context.identity),
    };
  }

  /**
   * Transform API memories to internal Memory format
   */
  private transformMemories(apiMemories: RecallMemory[]): Memory[] {
    if (!apiMemories || !Array.isArray(apiMemories)) {
      return [];
    }
    return apiMemories.map((mem) => ({
      id: mem.id,
      content: mem.text,
      type: 'conversation' as const,
      importance: mem.score || mem.metadata?.importance || 0.5,
      timestamp: mem.created_at,
      metadata: mem.metadata,
      tags: mem.metadata?.tags,
    }));
  }

  /**
   * Rank memories by multiple factors
   */
  private rankMemories(memories: Memory[], query: string): Memory[] {
    const queryWords = new Set(
      query.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
    );

    return memories
      .map((memory) => {
        let score = memory.importance || 0.5;

        // Recency bonus (within last hour = +0.2, last day = +0.1)
        const age = Date.now() - new Date(memory.timestamp).getTime();
        const hourMs = 60 * 60 * 1000;
        const dayMs = 24 * hourMs;

        if (age < hourMs) score += 0.2;
        else if (age < dayMs) score += 0.1;
        else if (age < 7 * dayMs) score += 0.05;

        // Query relevance bonus
        const contentWords = new Set(
          memory.content.toLowerCase().split(/\s+/)
        );
        const overlap = [...queryWords].filter((w) => contentWords.has(w));
        score += overlap.length * 0.1;

        // Tag relevance bonus
        if (memory.tags) {
          const tagOverlap = memory.tags.filter((t) =>
            queryWords.has(t.toLowerCase())
          );
          score += tagOverlap.length * 0.15;
        }

        return { ...memory, importance: Math.min(score, 1) };
      })
      .sort((a, b) => (b.importance || 0) - (a.importance || 0));
  }

  /**
   * Get most recent memories
   */
  private getRecentMemories(memories: Memory[], limit: number): Memory[] {
    return [...memories]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, limit);
  }

  /**
   * Get most relevant memories based on importance score
   */
  private getRelevantMemories(
    memories: Memory[],
    _query: string,
    limit: number
  ): Memory[] {
    return [...memories]
      .sort((a, b) => (b.importance || 0) - (a.importance || 0))
      .slice(0, limit);
  }

  /**
   * Deduplicate memories by ID
   */
  private deduplicateMemories(memories: Memory[]): Memory[] {
    const seen = new Set<string>();
    return memories.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }

  /**
   * Build complete system prompt
   */
  private buildSystemPrompt(
    identity: AgentIdentity,
    memories: Memory[],
    predictedTopics: string[]
  ): string {
    const identitySection = this.formatIdentitySection(identity);
    const memorySection = this.formatMemorySection(memories);
    const rulesSection = this.formatRulesSection(identity);

    let prompt = `${identitySection}\n\n${memorySection}`;

    if (predictedTopics.length > 0) {
      prompt += `\n\nPredicted relevant topics: ${predictedTopics.join(', ')}`;
    }

    prompt += `\n\n${rulesSection}`;

    return prompt;
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
  private formatMemorySection(memories: Memory[]): string {
    if (memories.length === 0) {
      return 'Recent context from your memory:\nNo previous interactions found. This is a new conversation.';
    }

    let memoryText = 'Recent context from your memory:\n\n';

    memories.slice(0, 10).forEach((memory, index) => {
      const importance = memory.importance ? ` (relevance: ${(memory.importance * 100).toFixed(0)}%)` : '';
      memoryText += `${index + 1}. ${memory.content}${importance}\n`;
    });

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
   * Estimate token count (rough approximation)
   */
  estimateTokenCount(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Trim context to fit within token limit
   */
  trimToTokenLimit(context: Context, maxTokens: number): Context {
    let currentPrompt = context.systemPrompt;
    let tokenCount = this.estimateTokenCount(currentPrompt);

    if (tokenCount <= maxTokens) {
      return context;
    }

    // Progressively remove memories until within limit
    const trimmedMemories = [...context.memories];
    while (
      tokenCount > maxTokens &&
      trimmedMemories.length > 1
    ) {
      trimmedMemories.pop();
      currentPrompt = this.buildSystemPrompt(
        context.identity,
        trimmedMemories,
        context.predictedTopics
      );
      tokenCount = this.estimateTokenCount(currentPrompt);
    }

    this.config.logger.warn('Context trimmed to fit token limit', {
      originalMemories: context.memories.length,
      trimmedMemories: trimmedMemories.length,
    });

    return {
      ...context,
      memories: trimmedMemories,
      systemPrompt: currentPrompt,
    };
  }
}
