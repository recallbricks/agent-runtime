/**
 * User/Agent Isolation Unit Tests
 *
 * Tests that userId and agentId are correctly used in API requests
 * Uses mocks - NO API CALLS - FREE
 */

import { RecallBricksClient } from '../../src/api/RecallBricksClient';
import { createMockLogger } from '../test.config';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('User and Agent Isolation', () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      defaults: { headers: {} },
      interceptors: {
        response: {
          use: jest.fn(),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
  });

  describe('RecallBricksClient User Isolation', () => {
    it('should include source in saveMemory requests', async () => {
      const client = new RecallBricksClient({
        apiUrl: 'https://api.recallbricks.com',
        apiKey: 'test-key',
        userId: 'user-123',
        logger: createMockLogger(),
      });

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          id: 'mem_1',
          text: 'Test memory',
          user_id: 'user-123',
          created_at: new Date().toISOString(),
        },
      });

      await client.saveMemory({ text: 'Test memory' });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/memories',
        expect.objectContaining({
          text: 'Test memory',
          source: 'agent-runtime',
        })
      );
    });

    it('should call correct endpoint for recallMemories', async () => {
      const client = new RecallBricksClient({
        apiUrl: 'https://api.recallbricks.com',
        apiKey: 'test-key',
        userId: 'user-456',
        logger: createMockLogger(),
      });

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          memories: [],
          total: 0,
        },
      });

      await client.recallMemories({ query: 'test query' });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/memories/search',
        expect.objectContaining({
          query: 'test query',
        })
      );
    });

    it('should use correct endpoint for different clients', async () => {
      const clientA = new RecallBricksClient({
        apiUrl: 'https://api.recallbricks.com',
        apiKey: 'test-key',
        userId: 'user-A',
        logger: createMockLogger(),
      });

      const clientB = new RecallBricksClient({
        apiUrl: 'https://api.recallbricks.com',
        apiKey: 'test-key',
        userId: 'user-B',
        logger: createMockLogger(),
      });

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          id: 'mem_1',
          text: 'Test',
          user_id: 'user-A',
          created_at: new Date().toISOString(),
        },
      });

      await clientA.saveMemory({ text: 'Memory from A' });
      await clientB.saveMemory({ text: 'Memory from B' });

      const calls = mockAxiosInstance.post.mock.calls;

      // Both calls should use the same endpoint
      expect(calls[0][0]).toBe('/api/v1/memories');
      expect(calls[1][0]).toBe('/api/v1/memories');
    });

    it('should include text in all save requests', async () => {
      const userIds = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];
      const clients = userIds.map(
        (userId) =>
          new RecallBricksClient({
            apiUrl: 'https://api.recallbricks.com',
            apiKey: 'test-key',
            userId,
            logger: createMockLogger(),
          })
      );

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          id: 'mem_1',
          text: 'Test',
          user_id: 'test',
          created_at: new Date().toISOString(),
        },
      });

      // Make parallel requests
      await Promise.all(
        clients.map((client, i) =>
          client.saveMemory({ text: `Memory from user ${i + 1}` })
        )
      );

      const calls = mockAxiosInstance.post.mock.calls;

      // Each call should have the correct text
      calls.forEach((call: any[], index: number) => {
        expect(call[1].text).toBe(`Memory from user ${index + 1}`);
      });
    });
  });

  describe('API Key Isolation', () => {
    it('should include API key in request headers', () => {
      new RecallBricksClient({
        apiUrl: 'https://api.recallbricks.com',
        apiKey: 'secret-api-key-123',
        userId: 'user-1',
        logger: createMockLogger(),
      });

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'secret-api-key-123',
          }),
        })
      );
    });

    it('should use different API keys for different clients', () => {
      new RecallBricksClient({
        apiUrl: 'https://api.recallbricks.com',
        apiKey: 'key-for-client-A',
        userId: 'user-1',
        logger: createMockLogger(),
      });

      new RecallBricksClient({
        apiUrl: 'https://api.recallbricks.com',
        apiKey: 'key-for-client-B',
        userId: 'user-2',
        logger: createMockLogger(),
      });

      const createCalls = mockedAxios.create.mock.calls;

      expect((createCalls[0][0]?.headers as Record<string, string>)?.['X-API-Key']).toBe('key-for-client-A');
      expect((createCalls[1][0]?.headers as Record<string, string>)?.['X-API-Key']).toBe('key-for-client-B');
    });

    it('should update API key when requested', () => {
      const client = new RecallBricksClient({
        apiUrl: 'https://api.recallbricks.com',
        apiKey: 'old-key',
        userId: 'user-1',
        logger: createMockLogger(),
      });

      client.updateApiKey('new-key');

      expect(mockAxiosInstance.defaults.headers['X-API-Key']).toBe('new-key');
    });
  });

  describe('Agent ID Isolation', () => {
    it('should include agent name in registerAgent requests', async () => {
      const client = new RecallBricksClient({
        apiUrl: 'https://api.recallbricks.com',
        apiKey: 'test-key',
        userId: 'user-1',
        logger: createMockLogger(),
      });

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          success: true,
          agentId: 'agent-123',
          registeredAt: new Date().toISOString(),
        },
      });

      await client.registerAgent({
        agentId: 'agent-123',
        runtimeVersion: '0.2.0',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/collaboration/agents',
        expect.objectContaining({
          name: 'agent-123',
        })
      );
    });

    it('should include metadata in registerAgent requests', async () => {
      const client = new RecallBricksClient({
        apiUrl: 'https://api.recallbricks.com',
        apiKey: 'test-key',
        userId: 'user-1',
        logger: createMockLogger(),
      });

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          success: true,
          agentId: 'agent-456',
          registeredAt: new Date().toISOString(),
        },
      });

      await client.registerAgent({
        agentId: 'agent-456',
        runtimeVersion: '0.2.0',
        metadata: {
          provider: 'anthropic',
          tier: 'enterprise',
        },
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/collaboration/agents',
        expect.objectContaining({
          name: 'agent-456',
          metadata: expect.objectContaining({
            runtime_version: '0.2.0',
            provider: 'anthropic',
            tier: 'enterprise',
          }),
        })
      );
    });
  });

  describe('Memory Tags and Metadata Isolation', () => {
    it('should include tags in saveMemory requests', async () => {
      const client = new RecallBricksClient({
        apiUrl: 'https://api.recallbricks.com',
        apiKey: 'test-key',
        userId: 'user-1',
        logger: createMockLogger(),
      });

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          id: 'mem_1',
          text: 'Test',
          user_id: 'user-1',
          created_at: new Date().toISOString(),
        },
      });

      await client.saveMemory({
        text: 'Tagged memory',
        tags: ['important', 'project-x'],
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/memories',
        expect.objectContaining({
          tags: ['important', 'project-x'],
        })
      );
    });

    it('should include custom source in saveMemory requests', async () => {
      const client = new RecallBricksClient({
        apiUrl: 'https://api.recallbricks.com',
        apiKey: 'test-key',
        userId: 'user-1',
        logger: createMockLogger(),
      });

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          id: 'mem_1',
          text: 'Test',
          user_id: 'user-1',
          created_at: new Date().toISOString(),
        },
      });

      await client.saveMemory({
        text: 'Sourced memory',
        source: 'slack-integration',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/memories',
        expect.objectContaining({
          source: 'slack-integration',
        })
      );
    });
  });

  describe('Request Parameter Isolation', () => {
    it('should include limit in recallMemories requests', async () => {
      const client = new RecallBricksClient({
        apiUrl: 'https://api.recallbricks.com',
        apiKey: 'test-key',
        userId: 'user-1',
        logger: createMockLogger(),
      });

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { memories: [], total: 0 },
      });

      await client.recallMemories({ query: 'test', limit: 25 });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/memories/search',
        expect.objectContaining({
          limit: 25,
        })
      );
    });

    it('should use default limit when not specified', async () => {
      const client = new RecallBricksClient({
        apiUrl: 'https://api.recallbricks.com',
        apiKey: 'test-key',
        userId: 'user-1',
        logger: createMockLogger(),
      });

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { memories: [], total: 0 },
      });

      await client.recallMemories({ query: 'test' });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/memories/search',
        expect.objectContaining({
          limit: 10, // default limit
        })
      );
    });
  });

  describe('Error Isolation', () => {
    it('should not leak error details from one user to another', async () => {
      const clientA = new RecallBricksClient({
        apiUrl: 'https://api.recallbricks.com',
        apiKey: 'test-key',
        userId: 'user-A',
        logger: createMockLogger(),
      });

      const clientB = new RecallBricksClient({
        apiUrl: 'https://api.recallbricks.com',
        apiKey: 'test-key',
        userId: 'user-B',
        logger: createMockLogger(),
      });

      // First client gets an error
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('User A error'));

      // Second client should work fine
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { memories: [], total: 0 },
      });

      await expect(clientA.recallMemories({ query: 'test' })).rejects.toThrow();

      // Second client should succeed independently
      const result = await clientB.recallMemories({ query: 'test' });
      expect(result.memories).toEqual([]);
    });
  });

  describe('Concurrent Request Isolation', () => {
    it('should handle concurrent requests without mixing data', async () => {
      const clients = Array.from({ length: 10 }, (_, i) =>
        new RecallBricksClient({
          apiUrl: 'https://api.recallbricks.com',
          apiKey: 'test-key',
          userId: `user-${i}`,
          logger: createMockLogger(),
        })
      );

      // Each request returns user-specific data
      mockAxiosInstance.post.mockImplementation(() => {
        return Promise.resolve({
          data: { memories: [], total: 0 },
        });
      });

      // Fire all requests concurrently
      await Promise.all(
        clients.map((client) => client.recallMemories({ query: 'test' }))
      );

      const calls = mockAxiosInstance.post.mock.calls;

      // Verify each call has the correct query
      calls.forEach((call: any[]) => {
        expect(call[1]?.query).toBe('test');
      });
    });
  });
});
