/**
 * RecallBricks Agent Runtime - Auto Saver
 *
 * Automatically saves conversation turns to the RecallBricks Memory API v1
 * Uses POST /api/v1/memories endpoint
 * API handles tier upgrades automatically based on retrieval count
 */

import axios, { AxiosInstance } from 'axios';
import pRetry from 'p-retry';
import {
  ConversationTurn,
  SaveConversationResponse,
  SaveResponse,
  RecallBricksTier,
  APIError,
  Logger,
} from '../types';

// ============================================================================
// Auto Saver Configuration
// ============================================================================

interface AutoSaverConfig {
  apiUrl: string;
  apiKey: string;
  agentId: string;
  userId: string;
  tier: RecallBricksTier;
  logger: Logger;
}

// ============================================================================
// Auto Saver Implementation
// ============================================================================
// Note: Tier-based enrichment is handled automatically by the RecallBricks API
// - Tier 1: Basic storage (no enrichment)
// - Tier 2: Auto-enriched after 2+ retrievals (Haiku in background)
// - Tier 3: Deep analysis after 5+ retrievals (Sonnet in background)

export class AutoSaver {
  private apiClient: AxiosInstance;
  private saveQueue: Array<{
    turn: ConversationTurn;
    resolve: (value: boolean) => void;
    reject: (error: Error) => void;
  }> = [];
  private isProcessing = false;

  constructor(private config: AutoSaverConfig) {
    this.apiClient = axios.create({
      baseURL: config.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
      },
    });

    config.logger.debug('AutoSaver initialized', {
      tier: config.tier,
      apiUrl: config.apiUrl,
    });
  }

  /**
   * Save a conversation turn (non-blocking)
   */
  async save(turn: ConversationTurn): Promise<boolean> {
    this.config.logger.debug('Queuing conversation turn for save', {
      timestamp: turn.timestamp,
    });

    return new Promise((resolve, reject) => {
      this.saveQueue.push({ turn, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Save a conversation turn synchronously (blocking)
   */
  async saveSync(turn: ConversationTurn): Promise<SaveConversationResponse> {
    this.config.logger.debug('Saving conversation turn synchronously');

    const importance = turn.importance ?? (await this.classifyImportance(turn));

    // Format conversation as single text string for the save endpoint
    const conversationText = `User: ${turn.userMessage}
Assistant: ${turn.assistantResponse}`;

    try {
      const response = await pRetry(
        async () => {
          // Use /api/v1/memories endpoint
          // API handles tier upgrades automatically based on retrieval count
          const result = await this.apiClient.post<SaveResponse>(
            '/api/v1/memories',
            {
              text: conversationText,
              source: 'agent-runtime',
              metadata: {
                importance: importance,
                agent_id: this.config.agentId,
                timestamp: turn.timestamp,
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
              `Save attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`
            );
          },
        }
      );

      this.config.logger.info('Conversation saved successfully', {
        memoryId: response.id,
        importance: response.metadata?.importance ?? importance,
      });

      return {
        success: true,
        memoryId: response.id,
        importance: response.metadata?.importance ?? importance,
      };
    } catch (error) {
      this.config.logger.error('Failed to save conversation', { error });
      throw this.handleAPIError(error);
    }
  }

  /**
   * Process the save queue (async, non-blocking)
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.saveQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.saveQueue.length > 0) {
      const item = this.saveQueue.shift();
      if (!item) continue;

      try {
        await this.saveSync(item.turn);
        item.resolve(true);
      } catch (error) {
        this.config.logger.error('Queue processing error', { error });
        item.reject(
          error instanceof Error ? error : new Error('Unknown error')
        );
      }
    }

    this.isProcessing = false;
  }

  /**
   * Classify importance of a conversation turn
   */
  private async classifyImportance(
    turn: ConversationTurn
  ): Promise<number> {
    this.config.logger.debug('Classifying conversation importance');

    // For now, use a simple heuristic
    // In production, this would call the metacognition engine's classification API
    const importance = this.calculateHeuristicImportance(turn);

    this.config.logger.debug('Importance classified', { importance });

    return importance;
  }

  /**
   * Calculate importance using heuristics
   */
  private calculateHeuristicImportance(turn: ConversationTurn): number {
    let score = 0.5; // Base importance

    // Length of response (longer = potentially more important)
    const responseLength = turn.assistantResponse.length;
    if (responseLength > 1000) score += 0.2;
    else if (responseLength > 500) score += 0.1;

    // Question indicators (questions often signal important information gathering)
    const questionCount = (turn.userMessage.match(/\?/g) || []).length;
    score += Math.min(questionCount * 0.1, 0.2);

    // Exclamation points (excitement/importance)
    const exclamationCount = (turn.userMessage.match(/!/g) || []).length;
    score += Math.min(exclamationCount * 0.05, 0.1);

    // Code blocks (technical content is often important)
    const codeBlockCount = (turn.assistantResponse.match(/```/g) || []).length / 2;
    score += Math.min(codeBlockCount * 0.1, 0.2);

    // Keywords indicating importance
    const importantKeywords = [
      'important',
      'critical',
      'remember',
      'note',
      'warning',
      'error',
      'issue',
      'problem',
      'solution',
      'decision',
    ];

    const lowerMessage = turn.userMessage.toLowerCase();
    const keywordMatches = importantKeywords.filter((keyword) =>
      lowerMessage.includes(keyword)
    ).length;
    score += Math.min(keywordMatches * 0.1, 0.3);

    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Wait for all queued saves to complete
   */
  async flush(): Promise<void> {
    this.config.logger.debug('Flushing save queue', {
      queueSize: this.saveQueue.length,
    });

    while (this.saveQueue.length > 0 || this.isProcessing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.config.logger.info('Save queue flushed');
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.saveQueue.length;
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
