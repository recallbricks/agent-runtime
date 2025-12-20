/**
 * Tests for AgentRuntime
 */

import { AgentRuntime } from '../src/core/AgentRuntime';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock LLM SDK clients
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Hello, I am TestBot!' }],
        model: 'claude-3-sonnet',
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    },
  }));
});

describe('AgentRuntime', () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn().mockResolvedValue({
        data: {
          memories: [],
          total: 0,
        },
      }),
      post: jest.fn().mockResolvedValue({
        data: {
          id: 'mem_123',
          text: 'Test memory',
          user_id: 'test_user',
          created_at: new Date().toISOString(),
        },
      }),
      defaults: { headers: {} },
      interceptors: {
        response: {
          use: jest.fn(),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    (mockedAxios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with required options', () => {
      const runtime = new AgentRuntime({
        agentId: 'test_agent',
        userId: 'test_user',
        llmProvider: 'anthropic',
        llmApiKey: 'test_key',
        apiKey: 'rb_test',
        debug: true,
      });

      expect(runtime).toBeDefined();
      expect(runtime.getConfig().agentId).toBe('test_agent');
      expect(runtime.getConfig().userId).toBe('test_user');
    });

    it('should initialize in MCP mode without LLM key', () => {
      const runtime = new AgentRuntime({
        agentId: 'test_agent',
        userId: 'test_user',
        mcpMode: true,
        apiKey: 'rb_test',
      });

      expect(runtime).toBeDefined();
      expect(runtime.getConfig().mcpMode).toBe(true);
    });

    it('should set default values', () => {
      const runtime = new AgentRuntime({
        agentId: 'test_agent',
        userId: 'test_user',
        llmProvider: 'anthropic',
        llmApiKey: 'test_key',
        debug: true,
      });

      const config = runtime.getConfig();
      expect(config.autoSave).toBe(true);
      expect(config.validateIdentity).toBe(true);
      expect(config.cacheEnabled).toBe(true);
    });
  });

  describe('chat', () => {
    it('should process a chat message and return response', async () => {
      const runtime = new AgentRuntime({
        agentId: 'test_agent',
        userId: 'test_user',
        agentName: 'TestBot',
        llmProvider: 'anthropic',
        llmApiKey: 'test_key',
        apiKey: 'rb_test',
        debug: true,
        autoSave: false,
      });

      const response = await runtime.chat('Hello!');

      expect(response.response).toBeDefined();
      expect(response.metadata.contextLoaded).toBe(true);
    });

    it('should return context in MCP mode', async () => {
      const runtime = new AgentRuntime({
        agentId: 'test_agent',
        userId: 'test_user',
        agentName: 'TestBot',
        mcpMode: true,
        apiKey: 'rb_test',
        debug: true,
      });

      const response = await runtime.chat('Hello!');

      expect(response.response).toContain('TestBot');
      expect(response.metadata.provider).toBe('none');
      expect(response.metadata.model).toBe('mcp-mode');
    });

    it('should update conversation history', async () => {
      const runtime = new AgentRuntime({
        agentId: 'test_agent',
        userId: 'test_user',
        agentName: 'TestBot',
        llmProvider: 'anthropic',
        llmApiKey: 'test_key',
        apiKey: 'rb_test',
        debug: true,
        autoSave: false,
      });

      await runtime.chat('First message');
      const history = runtime.getConversationHistory();

      expect(history.length).toBe(2);
      expect(history[0].role).toBe('user');
      expect(history[0].content).toBe('First message');
      expect(history[1].role).toBe('assistant');
    });
  });

  describe('getIdentity', () => {
    it('should return agent identity', () => {
      const runtime = new AgentRuntime({
        agentId: 'test_agent',
        userId: 'test_user',
        agentName: 'TestBot',
        agentPurpose: 'Testing purposes',
        llmProvider: 'anthropic',
        llmApiKey: 'test_key',
        apiKey: 'rb_test',
        debug: true,
      });

      const identity = runtime.getIdentity();

      expect(identity.id).toBe('test_agent');
      expect(identity.name).toBe('TestBot');
      expect(identity.purpose).toBe('Testing purposes');
    });
  });

  describe('clearConversationHistory', () => {
    it('should clear conversation history', async () => {
      const runtime = new AgentRuntime({
        agentId: 'test_agent',
        userId: 'test_user',
        agentName: 'TestBot',
        llmProvider: 'anthropic',
        llmApiKey: 'test_key',
        apiKey: 'rb_test',
        debug: true,
        autoSave: false,
      });

      await runtime.chat('Hello');
      expect(runtime.getConversationHistory().length).toBe(2);

      runtime.clearConversationHistory();
      expect(runtime.getConversationHistory().length).toBe(0);
    });
  });

  describe('getVersion', () => {
    it('should return runtime version', () => {
      const runtime = new AgentRuntime({
        agentId: 'test_agent',
        userId: 'test_user',
        llmProvider: 'anthropic',
        llmApiKey: 'test_key',
        debug: true,
      });

      const version = runtime.getVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('updateLLMConfig', () => {
    it('should update LLM configuration', () => {
      const runtime = new AgentRuntime({
        agentId: 'test_agent',
        userId: 'test_user',
        llmProvider: 'anthropic',
        llmApiKey: 'test_key',
        debug: true,
      });

      runtime.updateLLMConfig({ temperature: 0.5 });

      const config = runtime.getConfig();
      expect(config.llmConfig?.temperature).toBe(0.5);
    });

    it('should not update in MCP mode', () => {
      const runtime = new AgentRuntime({
        agentId: 'test_agent',
        userId: 'test_user',
        mcpMode: true,
        debug: true,
      });

      runtime.updateLLMConfig({ temperature: 0.5 });

      // Should warn but not crash
      expect(runtime.getConfig().mcpMode).toBe(true);
    });
  });

  describe('getApiClient', () => {
    it('should return the API client', () => {
      const runtime = new AgentRuntime({
        agentId: 'test_agent',
        userId: 'test_user',
        llmProvider: 'anthropic',
        llmApiKey: 'test_key',
        apiKey: 'rb_test',
        debug: true,
      });

      const apiClient = runtime.getApiClient();
      expect(apiClient).toBeDefined();
    });
  });

  describe('flush', () => {
    it('should flush pending saves', async () => {
      const runtime = new AgentRuntime({
        agentId: 'test_agent',
        userId: 'test_user',
        llmProvider: 'anthropic',
        llmApiKey: 'test_key',
        apiKey: 'rb_test',
        debug: true,
      });

      await runtime.flush();
      // Should complete without error
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      const runtime = new AgentRuntime({
        agentId: 'test_agent',
        userId: 'test_user',
        llmProvider: 'anthropic',
        llmApiKey: 'test_key',
        apiKey: 'rb_test',
        debug: true,
      });

      await runtime.shutdown();
      // Should complete without error
    });
  });
});
