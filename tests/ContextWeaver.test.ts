/**
 * Tests for ContextWeaver
 */

import { ContextWeaver } from '../src/core/ContextWeaver';
import { RecallBricksClient } from '../src/api/RecallBricksClient';
import { Logger } from '../src/types';

// Mock RecallBricksClient
jest.mock('../src/api/RecallBricksClient');

const MockedRecallBricksClient = RecallBricksClient as jest.MockedClass<typeof RecallBricksClient>;

// Mock logger
const mockLogger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('ContextWeaver', () => {
  let contextWeaver: ContextWeaver;
  let mockApiClient: jest.Mocked<RecallBricksClient>;

  beforeEach(() => {
    mockApiClient = new MockedRecallBricksClient({
      apiUrl: 'https://api.recallbricks.com',
      apiKey: 'test_key',
      userId: 'test_user',
    }) as jest.Mocked<RecallBricksClient>;

    mockApiClient.recallMemories = jest.fn().mockResolvedValue({
      memories: [
        {
          id: 'mem_1',
          text: 'User likes blue color',
          score: 0.9,
          metadata: { importance: 0.8, tags: ['preference'] },
          created_at: new Date().toISOString(),
        },
        {
          id: 'mem_2',
          text: 'User works in technology',
          score: 0.7,
          metadata: { importance: 0.6 },
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
      categories: {
        preferences: { count: 1, avg_score: 0.9, summary: 'User preferences' },
        work: { count: 1, avg_score: 0.7, summary: 'Work info' },
      },
      total: 2,
    });

    contextWeaver = new ContextWeaver({
      apiClient: mockApiClient,
      agentId: 'test_agent',
      agentName: 'TestBot',
      agentPurpose: 'Testing and validation',
      maxContextMemories: 10,
      maxContextTokens: 4000,
      logger: mockLogger,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('buildContext', () => {
    it('should build context with memories', async () => {
      const context = await contextWeaver.buildContext('What is my favorite color?');

      expect(context).toBeDefined();
      expect(context.memories.length).toBeGreaterThan(0);
      expect(context.systemPrompt).toContain('TestBot');
    });

    it('should include identity in context', async () => {
      const context = await contextWeaver.buildContext('Hello');

      expect(context.identity.id).toBe('test_agent');
      expect(context.identity.name).toBe('TestBot');
      expect(context.identity.purpose).toBe('Testing and validation');
    });

    it('should include predicted topics from categories', async () => {
      const context = await contextWeaver.buildContext('Hello');

      expect(context.predictedTopics.length).toBeGreaterThan(0);
      expect(context.predictedTopics).toContain('preferences');
    });

    it('should rank memories by relevance', async () => {
      const context = await contextWeaver.buildContext('What color do I like?');

      // Memory about color should be ranked higher
      expect(context.memories[0].content).toContain('blue');
    });

    it('should call API with correct parameters', async () => {
      await contextWeaver.buildContext('test query');

      expect(mockApiClient.recallMemories).toHaveBeenCalledWith({
        query: 'test query',
        limit: expect.any(Number),
        organized: true,
      });
    });

    it('should handle empty memories', async () => {
      mockApiClient.recallMemories = jest.fn().mockResolvedValue({
        memories: [],
        total: 0,
      });

      const context = await contextWeaver.buildContext('Hello');

      expect(context.memories.length).toBe(0);
      expect(context.systemPrompt).toContain('No previous interactions');
    });
  });

  describe('getIdentity', () => {
    it('should return agent identity', () => {
      const identity = contextWeaver.getIdentity();

      expect(identity.id).toBe('test_agent');
      expect(identity.name).toBe('TestBot');
      expect(identity.purpose).toBe('Testing and validation');
      expect(identity.traits).toContain('helpful');
    });
  });

  describe('updateIdentity', () => {
    it('should update identity properties', () => {
      contextWeaver.updateIdentity({ name: 'UpdatedBot' });

      const identity = contextWeaver.getIdentity();
      expect(identity.name).toBe('UpdatedBot');
    });

    it('should preserve other identity properties', () => {
      contextWeaver.updateIdentity({ name: 'UpdatedBot' });

      const identity = contextWeaver.getIdentity();
      expect(identity.purpose).toBe('Testing and validation');
    });
  });

  describe('getLastContext', () => {
    it('should return undefined before first build', () => {
      const context = contextWeaver.getLastContext();
      expect(context).toBeUndefined();
    });

    it('should return last built context', async () => {
      await contextWeaver.buildContext('First query');
      const lastContext = contextWeaver.getLastContext();

      expect(lastContext).toBeDefined();
      expect(lastContext?.memories.length).toBeGreaterThan(0);
    });
  });

  describe('formatContextPrompt', () => {
    it('should format context into prompt structure', async () => {
      const context = await contextWeaver.buildContext('Hello');
      const prompt = contextWeaver.formatContextPrompt(context);

      expect(prompt.systemPrompt).toBeDefined();
      expect(prompt.identitySection).toContain('TestBot');
      expect(prompt.memorySection).toBeDefined();
      expect(prompt.rulesSection).toBeDefined();
    });
  });

  describe('estimateTokenCount', () => {
    it('should estimate token count', () => {
      const text = 'This is a test string for token estimation.';
      const tokenCount = contextWeaver.estimateTokenCount(text);

      expect(tokenCount).toBeGreaterThan(0);
      // Roughly 4 chars per token
      expect(tokenCount).toBeCloseTo(text.length / 4, 0);
    });
  });

  describe('trimToTokenLimit', () => {
    it('should not trim if within limit', async () => {
      const context = await contextWeaver.buildContext('Hello');
      const trimmed = contextWeaver.trimToTokenLimit(context, 10000);

      expect(trimmed.memories.length).toBe(context.memories.length);
    });

    it('should trim memories to fit token limit', async () => {
      const context = await contextWeaver.buildContext('Hello');
      const trimmed = contextWeaver.trimToTokenLimit(context, 100);

      expect(trimmed.memories.length).toBeLessThanOrEqual(context.memories.length);
    });
  });
});
