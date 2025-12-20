/**
 * RecallBricks Agent Runtime - Main Orchestrator
 *
 * The universal cognitive runtime that coordinates all components
 * Provides automatic memory, reflection, and identity for any LLM
 */

import {
  RuntimeConfig,
  RuntimeOptions,
  LLMMessage,
  ChatResponse,
  ConversationTurn,
  AgentIdentity,
  MemoryContext,
  Logger,
  LLMProvider,
} from '../types';
import { buildConfigFromOptions, createLogger } from '../config';
import { LLMAdapter } from './LLMAdapter';
import { ContextLoader } from './ContextLoader';
import { ContextWeaver, Context } from './ContextWeaver';
import { AutoSaver } from './AutoSaver';
import { IdentityValidator } from './IdentityValidator';
import { ReflectionEngine, Reflection, ReasoningTrace } from './ReflectionEngine';
import { RecallBricksClient } from '../api/RecallBricksClient';

// ============================================================================
// Runtime Version
// ============================================================================

const RUNTIME_VERSION = '0.2.0';

// ============================================================================
// Agent Runtime Implementation
// ============================================================================

export class AgentRuntime {
  private config: RuntimeConfig;
  private logger: Logger;
  private llmAdapter?: LLMAdapter;
  private contextLoader: ContextLoader;
  private contextWeaver?: ContextWeaver;
  private autoSaver: AutoSaver;
  private identityValidator?: IdentityValidator;
  private reflectionEngine?: ReflectionEngine;
  private apiClient: RecallBricksClient;

  private currentIdentity?: AgentIdentity;
  private currentContext?: MemoryContext;
  private weavedContext?: Context;
  private previousTurn?: ConversationTurn;
  private conversationHistory: LLMMessage[] = [];
  private interactionCount = 0;

  constructor(options: RuntimeOptions) {
    // Build configuration
    this.config = buildConfigFromOptions(options);
    this.logger = createLogger(this.config.debug);

    this.logger.info('Initializing RecallBricks Agent Runtime', {
      version: RUNTIME_VERSION,
      agentId: this.config.agentId,
      userId: this.config.userId,
      provider: this.config.llmConfig?.provider,
      tier: this.config.tier,
      mcpMode: this.config.mcpMode,
    });

    // Initialize API client
    this.apiClient = new RecallBricksClient({
      apiUrl: this.config.apiUrl!,
      apiKey: this.config.apiKey || '',
      userId: this.config.userId,
      logger: this.logger,
    });

    // Initialize LLM adapter only if not in MCP mode
    if (!this.config.mcpMode && this.config.llmConfig) {
      this.llmAdapter = new LLMAdapter(this.config.llmConfig, this.logger);
    }

    // Initialize ContextLoader (legacy)
    this.contextLoader = new ContextLoader({
      apiUrl: this.config.apiUrl!,
      apiKey: this.config.apiKey || '',
      agentId: this.config.agentId,
      userId: this.config.userId,
      agentName: this.config.agentName,
      agentPurpose: this.config.agentPurpose,
      cacheEnabled: this.config.cacheEnabled!,
      cacheTTL: this.config.cacheTTL!,
      maxContextTokens: this.config.maxContextTokens!,
      logger: this.logger,
    });

    // Initialize ContextWeaver (new)
    this.contextWeaver = new ContextWeaver({
      apiClient: this.apiClient,
      agentId: this.config.agentId,
      agentName: this.config.agentName || 'RecallBricks Agent',
      agentPurpose: this.config.agentPurpose || 'A persistent cognitive agent',
      maxContextMemories: 10,
      maxContextTokens: this.config.maxContextTokens!,
      logger: this.logger,
    });

    // Initialize AutoSaver
    this.autoSaver = new AutoSaver({
      apiUrl: this.config.apiUrl!,
      apiKey: this.config.apiKey || '',
      agentId: this.config.agentId,
      userId: this.config.userId,
      tier: this.config.tier!,
      logger: this.logger,
    });

    // Initialize ReflectionEngine if LLM is available
    if (this.llmAdapter) {
      this.reflectionEngine = new ReflectionEngine({
        llmAdapter: this.llmAdapter,
        apiClient: this.apiClient,
        agentId: this.config.agentId,
        agentName: this.config.agentName || 'RecallBricks Agent',
        reflectionInterval: 5, // Reflect after every 5 interactions
        confidenceThreshold: 0.6,
        logger: this.logger,
      });
    }

    // Register agent with RecallBricks (opt-in only)
    if (this.config.registerAgent === true) {
      this.registerAgent().catch((err) => {
        this.logger.debug('Agent registration skipped', { error: err.message });
      });
    }

    this.logger.info('AgentRuntime initialized successfully');
  }

  /**
   * Send a chat message and get a contextual response
   *
   * This is the main entry point for the runtime
   */
  async chat(
    message: string,
    conversationHistory?: LLMMessage[]
  ): Promise<ChatResponse> {
    this.logger.info('Processing chat message', {
      messageLength: message.length,
      mcpMode: this.config.mcpMode,
    });

    const startTime = Date.now();
    this.interactionCount++;

    try {
      // Step 1: Save previous turn (if exists)
      if (this.previousTurn && this.config.autoSave) {
        this.logger.debug('Saving previous conversation turn');
        await this.autoSaver.save(this.previousTurn);
      }

      // Step 2: Build context using ContextWeaver
      this.logger.debug('Building context from Memory Graph');
      this.weavedContext = await this.contextWeaver!.buildContext(message);
      this.currentIdentity = this.weavedContext.identity;

      // Convert to legacy MemoryContext format for compatibility
      this.currentContext = {
        recentMemories: this.weavedContext.recentMemories,
        relevantMemories: this.weavedContext.relevantMemories,
        predictedContext: this.weavedContext.predictedTopics,
        totalMemories: this.weavedContext.totalMemoriesAvailable,
        lastUpdated: new Date().toISOString(),
      };

      // Step 3: Initialize identity validator
      if (this.config.validateIdentity && this.currentIdentity) {
        this.identityValidator = new IdentityValidator({
          agentIdentity: this.currentIdentity,
          autoCorrect: true,
          logger: this.logger,
        });
      }

      // In MCP mode, return context without calling LLM
      if (this.config.mcpMode) {
        this.logger.debug('MCP mode: returning context without LLM call');

        const duration = Date.now() - startTime;
        this.logger.info('Context loaded successfully in MCP mode', {
          duration: `${duration}ms`,
        });

        return {
          response: this.weavedContext.systemPrompt,
          metadata: {
            provider: 'none' as LLMProvider,
            model: 'mcp-mode',
            contextLoaded: true,
            identityValidated: false,
            autoSaved: false,
            tokensUsed: 0,
          },
        };
      }

      // Step 4: Build enriched message with context
      const enrichedMessages = this.buildEnrichedMessages(
        message,
        conversationHistory
      );

      // Step 5: Call LLM with enriched context
      if (!this.llmAdapter) {
        throw new Error('LLM adapter not initialized. This should not happen in non-MCP mode.');
      }

      this.logger.debug('Calling LLM with enriched context');
      const llmResponse = await this.llmAdapter.chat(enrichedMessages);

      // Step 6: Validate response for identity leakage
      let finalResponse = llmResponse.content;
      let identityValidated = false;

      if (this.identityValidator) {
        this.logger.debug('Validating response for identity violations');
        const validation = this.identityValidator.validate(llmResponse.content);

        if (!validation.isValid) {
          this.logger.warn('Identity violations detected', {
            count: validation.violations.length,
          });

          if (validation.correctedResponse) {
            finalResponse = validation.correctedResponse;
            identityValidated = true;
          }
        } else {
          identityValidated = true;
        }
      }

      // Step 7: Store current turn for next save
      this.previousTurn = {
        userMessage: message,
        assistantResponse: finalResponse,
        timestamp: new Date().toISOString(),
      };

      // Record interaction for reflection engine
      if (this.reflectionEngine) {
        this.reflectionEngine.recordInteraction(this.previousTurn);
      }

      // Step 8: Update conversation history
      this.conversationHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: finalResponse }
      );

      const duration = Date.now() - startTime;

      this.logger.info('Chat message processed successfully', {
        duration: `${duration}ms`,
        tokensUsed: llmResponse.usage?.totalTokens,
      });

      // Check if we should trigger a reflection
      if (this.reflectionEngine) {
        const { shouldReflect, trigger } = this.reflectionEngine.shouldReflect();
        if (shouldReflect && trigger) {
          // Run reflection in background (don't block response)
          this.reflectionEngine.reflect(trigger).then((reflection) => {
            this.logger.info('Background reflection completed', {
              insights: reflection.insights.length,
            });
          }).catch((err) => {
            this.logger.warn('Background reflection failed', { error: err.message });
          });
        }
      }

      return {
        response: finalResponse,
        metadata: {
          provider: llmResponse.provider,
          model: llmResponse.model,
          contextLoaded: true,
          identityValidated,
          autoSaved: this.config.autoSave!,
          tokensUsed: llmResponse.usage?.totalTokens,
        },
      };
    } catch (error) {
      this.logger.error('Chat processing failed', { error });
      throw error;
    }
  }

  /**
   * Trigger a reflection analysis
   */
  async reflect(): Promise<Reflection> {
    if (!this.reflectionEngine) {
      throw new Error('Reflection engine not initialized (requires LLM adapter)');
    }

    this.logger.info('Triggering manual reflection');
    return this.reflectionEngine.reflect('manual');
  }

  /**
   * Explain reasoning for a query (Chain of Thought)
   */
  async explain(query: string): Promise<ReasoningTrace> {
    if (!this.reflectionEngine) {
      throw new Error('Reflection engine not initialized (requires LLM adapter)');
    }

    // Get relevant memories for the query
    const context = await this.contextWeaver!.buildContext(query);

    return this.reflectionEngine.explain(query, context.memories);
  }

  /**
   * Build enriched messages with identity and context
   */
  private buildEnrichedMessages(
    userMessage: string,
    conversationHistory?: LLMMessage[]
  ): LLMMessage[] {
    const messages: LLMMessage[] = [];

    // Add system prompt with identity and context from ContextWeaver
    if (this.weavedContext) {
      messages.push({
        role: 'system',
        content: this.weavedContext.systemPrompt,
      });
    } else if (this.currentIdentity && this.currentContext) {
      // Fallback to legacy ContextLoader
      const contextPrompt = this.contextLoader.formatContextPrompt(
        this.currentIdentity,
        this.currentContext
      );
      messages.push({
        role: 'system',
        content: contextPrompt.systemPrompt,
      });
    }

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    } else if (this.conversationHistory.length > 0) {
      // Use internal history (limit to last 10 messages)
      messages.push(...this.conversationHistory.slice(-10));
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    return messages;
  }

  /**
   * Register agent with RecallBricks
   */
  private async registerAgent(): Promise<void> {
    try {
      await this.apiClient.registerAgent({
        agentId: this.config.agentId,
        runtimeVersion: RUNTIME_VERSION,
        metadata: {
          provider: this.config.llmConfig?.provider,
          tier: this.config.tier,
        },
      });
      this.logger.debug('Agent registered with RecallBricks');
    } catch {
      // Non-critical - endpoint might not exist yet
    }
  }

  /**
   * Get current agent identity
   */
  getIdentity(): AgentIdentity {
    return this.contextWeaver?.getIdentity() || this.currentIdentity!;
  }

  /**
   * Get current memory context
   */
  async getContext(): Promise<MemoryContext | undefined> {
    if (!this.currentContext) {
      const contextResponse = await this.contextLoader.loadContext();
      this.currentContext = contextResponse.context;
    }
    return this.currentContext;
  }

  /**
   * Refresh context from API (bypasses cache)
   */
  async refreshContext(): Promise<void> {
    this.logger.info('Refreshing context');
    this.contextLoader.clearCache();
    const contextResponse = await this.contextLoader.loadContext();
    this.currentIdentity = contextResponse.identity;
    this.currentContext = contextResponse.context;
    this.logger.info('Context refreshed successfully');
  }

  /**
   * Save current conversation turn immediately
   */
  async saveNow(): Promise<void> {
    if (this.previousTurn) {
      this.logger.info('Saving current conversation turn');
      await this.autoSaver.saveSync(this.previousTurn);
      this.previousTurn = undefined;
    } else {
      this.logger.warn('No conversation turn to save');
    }
  }

  /**
   * Wait for all pending saves to complete
   */
  async flush(): Promise<void> {
    this.logger.info('Flushing pending saves');
    await this.autoSaver.flush();
    this.logger.info('All saves completed');
  }

  /**
   * Shutdown the runtime gracefully
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down AgentRuntime');
    await this.flush();
    this.logger.info('AgentRuntime shutdown complete');
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): LLMMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearConversationHistory(): void {
    this.conversationHistory = [];
    this.logger.debug('Conversation history cleared');
  }

  /**
   * Get identity validation statistics
   */
  getValidationStats():
    | {
        total: number;
        byType: Record<string, number>;
        bySeverity: Record<string, number>;
      }
    | undefined {
    return this.identityValidator?.getViolationStats();
  }

  /**
   * Get reflection history
   */
  getReflectionHistory(): Reflection[] {
    return this.reflectionEngine?.getReflectionHistory() || [];
  }

  /**
   * Get configuration
   */
  getConfig(): RuntimeConfig {
    return { ...this.config };
  }

  /**
   * Get runtime version
   */
  getVersion(): string {
    return RUNTIME_VERSION;
  }

  /**
   * Update LLM configuration
   */
  updateLLMConfig(newConfig: Partial<RuntimeConfig['llmConfig']>): void {
    if (this.config.mcpMode) {
      this.logger.warn('Cannot update LLM config in MCP mode');
      return;
    }

    if (!this.config.llmConfig) {
      this.logger.warn('LLM config not initialized');
      return;
    }

    this.config.llmConfig = { ...this.config.llmConfig, ...newConfig };
    this.llmAdapter?.updateConfig(this.config.llmConfig);
    this.logger.info('LLM configuration updated');
  }

  /**
   * Get the API client for direct access
   */
  getApiClient(): RecallBricksClient {
    return this.apiClient;
  }
}
