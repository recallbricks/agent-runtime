/**
 * Tests for RecallBricksClient
 */

import { RecallBricksClient } from '../src/api/RecallBricksClient';
import { Logger } from '../src/types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger
const mockLogger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('RecallBricksClient', () => {
  let client: RecallBricksClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
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

    client = new RecallBricksClient({
      apiUrl: 'https://api.recallbricks.com',
      apiKey: 'test_api_key',
      userId: 'test_user',
      logger: mockLogger,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveMemory', () => {
    it('should save a memory successfully', async () => {
      const mockResponse = {
        data: {
          id: 'mem_123',
          text: 'Test memory',
          user_id: 'test_user',
          created_at: new Date().toISOString(),
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const result = await client.saveMemory({
        text: 'Test memory',
        tags: ['test'],
      });

      expect(result.id).toBe('mem_123');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/memories/save',
        expect.objectContaining({
          text: 'Test memory',
          user_id: 'test_user',
          tags: ['test'],
        })
      );
    });

    it('should include source in request', async () => {
      const mockResponse = {
        data: {
          id: 'mem_123',
          text: 'Test memory',
          user_id: 'test_user',
          created_at: new Date().toISOString(),
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      await client.saveMemory({
        text: 'Test memory',
        source: 'test-source',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/memories/save',
        expect.objectContaining({
          source: 'test-source',
        })
      );
    });
  });

  describe('recallMemories', () => {
    it('should recall memories successfully', async () => {
      const mockResponse = {
        data: {
          memories: [
            {
              id: 'mem_123',
              text: 'Test memory',
              score: 0.9,
              metadata: { importance: 0.8 },
              created_at: new Date().toISOString(),
            },
          ],
          total: 1,
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await client.recallMemories({
        query: 'test query',
        limit: 10,
      });

      expect(result.memories.length).toBe(1);
      expect(result.memories[0].id).toBe('mem_123');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/memories/recall',
        expect.objectContaining({
          params: expect.objectContaining({
            query: 'test query',
            limit: 10,
            user_id: 'test_user',
          }),
        })
      );
    });

    it('should use default limit when not specified', async () => {
      const mockResponse = {
        data: {
          memories: [],
          total: 0,
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      await client.recallMemories({ query: 'test' });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/memories/recall',
        expect.objectContaining({
          params: expect.objectContaining({
            limit: 10,
          }),
        })
      );
    });
  });

  describe('registerAgent', () => {
    it('should register agent successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          agentId: 'agent_123',
          registeredAt: new Date().toISOString(),
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const result = await client.registerAgent({
        agentId: 'agent_123',
        runtimeVersion: '0.2.0',
      });

      expect(result.success).toBe(true);
      expect(result.agentId).toBe('agent_123');
    });
  });

  describe('getHeuristics', () => {
    it('should return heuristics from API', async () => {
      const mockResponse = {
        data: {
          reflectionInterval: 5,
          confidenceThreshold: 0.8,
          maxContextMemories: 15,
          batchFlushInterval: 3000,
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await client.getHeuristics();

      expect(result.reflectionInterval).toBe(5);
      expect(result.confidenceThreshold).toBe(0.8);
    });

    it('should return defaults when API fails', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('API error'));

      const result = await client.getHeuristics();

      expect(result.reflectionInterval).toBe(3);
      expect(result.confidenceThreshold).toBe(0.7);
      expect(result.maxContextMemories).toBe(10);
    });
  });

  describe('getTopMemories', () => {
    it('should return sorted memories by score', async () => {
      const mockResponse = {
        data: {
          memories: [
            { id: '1', text: 'Low', score: 0.5, metadata: {}, created_at: '' },
            { id: '2', text: 'High', score: 0.9, metadata: {}, created_at: '' },
            { id: '3', text: 'Med', score: 0.7, metadata: {}, created_at: '' },
          ],
          total: 3,
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await client.getTopMemories('test', 3);

      expect(result[0].score).toBe(0.9);
      expect(result[1].score).toBe(0.7);
      expect(result[2].score).toBe(0.5);
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ status: 200 });

      const result = await client.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when API is unhealthy', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('updateApiKey', () => {
    it('should update the API key in headers', () => {
      client.updateApiKey('new_api_key');

      expect(mockAxiosInstance.defaults.headers['X-API-Key']).toBe('new_api_key');
    });
  });
});
