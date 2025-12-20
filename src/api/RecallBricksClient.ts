/**
 * RecallBricks Agent Runtime - API Client
 *
 * HTTP client for RecallBricks Cloud API with retry logic
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import pRetry from 'p-retry';
import {
  SaveResponse,
  RecallResponse,
  RecallMemory,
  Logger,
} from '../types';

// ============================================================================
// API Client Configuration
// ============================================================================

export interface RecallBricksClientConfig {
  apiUrl: string;
  apiKey: string;
  userId: string;
  timeout?: number;
  retries?: number;
  logger?: Logger;
}

export interface SaveMemoryRequest {
  text: string;
  tags?: string[];
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface RecallMemoriesRequest {
  query: string;
  limit?: number;
  organized?: boolean;
}

export interface RegisterAgentRequest {
  agentId: string;
  runtimeVersion: string;
  metadata?: Record<string, unknown>;
}

export interface RegisterAgentResponse {
  success: boolean;
  agentId: string;
  registeredAt: string;
}

export interface RuntimeHeuristics {
  reflectionInterval: number;
  confidenceThreshold: number;
  maxContextMemories: number;
  batchFlushInterval: number;
}

// ============================================================================
// RecallBricks API Client Implementation
// ============================================================================

export class RecallBricksClient {
  private client: AxiosInstance;
  private retries: number;
  private logger?: Logger;

  constructor(private config: RecallBricksClientConfig) {
    this.retries = config.retries ?? 3;
    this.logger = config.logger;

    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout ?? 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
      },
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        this.logger?.debug('API response received', {
          url: response.config.url,
          status: response.status,
        });
        return response;
      },
      (error: AxiosError) => {
        this.logger?.error('API request failed', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
        });
        throw error;
      }
    );

    this.logger?.debug('RecallBricksClient initialized', {
      apiUrl: config.apiUrl,
    });
  }

  /**
   * Save a memory to RecallBricks
   * POST /api/v1/memories
   */
  async saveMemory(request: SaveMemoryRequest): Promise<SaveResponse> {
    this.logger?.debug('Saving memory', { textLength: request.text.length });

    return this.withRetry(async () => {
      const response = await this.client.post<SaveResponse>(
        '/api/v1/memories',
        {
          text: request.text,
          tags: request.tags,
          source: request.source || 'agent-runtime',
          metadata: request.metadata,
        }
      );
      return response.data;
    });
  }

  /**
   * Recall memories from RecallBricks (semantic search)
   * POST /api/v1/memories/search
   */
  async recallMemories(request: RecallMemoriesRequest): Promise<RecallResponse> {
    this.logger?.debug('Recalling memories', { query: request.query });

    return this.withRetry(async () => {
      const response = await this.client.post<RecallResponse>(
        '/api/v1/memories/search',
        {
          query: request.query,
          limit: request.limit ?? 10,
        }
      );
      return response.data;
    });
  }

  /**
   * Register an agent with RecallBricks
   * POST /api/v1/collaboration/agents
   */
  async registerAgent(request: RegisterAgentRequest): Promise<RegisterAgentResponse> {
    this.logger?.debug('Registering agent', { agentId: request.agentId });

    return this.withRetry(async () => {
      const response = await this.client.post<RegisterAgentResponse>(
        '/api/v1/collaboration/agents',
        {
          name: request.agentId,
          capabilities: ['memory', 'conversation'],
          metadata: {
            runtime_version: request.runtimeVersion,
            ...request.metadata,
          },
        }
      );
      return response.data;
    });
  }

  /**
   * Get runtime heuristics from RecallBricks
   * GET /api/v1/runtime/heuristics
   */
  async getHeuristics(): Promise<RuntimeHeuristics> {
    this.logger?.debug('Fetching runtime heuristics');

    try {
      return await this.withRetry(async () => {
        const response = await this.client.get<RuntimeHeuristics>(
          '/api/v1/runtime/heuristics'
        );
        return response.data;
      });
    } catch {
      // Return defaults if endpoint doesn't exist yet
      this.logger?.warn('Heuristics endpoint not available, using defaults');
      return {
        reflectionInterval: 3,
        confidenceThreshold: 0.7,
        maxContextMemories: 10,
        batchFlushInterval: 5000,
      };
    }
  }

  /**
   * Get top memories by relevance
   */
  async getTopMemories(query: string, limit: number = 10): Promise<RecallMemory[]> {
    const response = await this.recallMemories({ query, limit, organized: false });
    return response.memories
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Check API health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Execute with retry logic
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    return pRetry(fn, {
      retries: this.retries,
      minTimeout: 1000,
      maxTimeout: 10000,
      onFailedAttempt: (error) => {
        this.logger?.warn(
          `API attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`,
          { error: error.message }
        );
      },
    });
  }

  /**
   * Update API key
   */
  updateApiKey(apiKey: string): void {
    this.client.defaults.headers['X-API-Key'] = apiKey;
    this.logger?.info('API key updated');
  }

  /**
   * Update user ID
   */
  updateUserId(userId: string): void {
    this.config.userId = userId;
    this.logger?.info('User ID updated', { userId });
  }
}
