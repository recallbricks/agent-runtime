/**
 * Tests for Configuration System
 */

import { ConfigBuilder } from '../src/config';
import { RuntimeOptions, ConfigurationError } from '../src/types';

describe('ConfigBuilder', () => {
  let builder: ConfigBuilder;

  beforeEach(() => {
    builder = new ConfigBuilder();
    // Clear environment variables
    delete process.env.RECALLBRICKS_AGENT_ID;
    delete process.env.RECALLBRICKS_USER_ID;
    delete process.env.RECALLBRICKS_API_KEY;
  });

  describe('fromOptions', () => {
    it('should build config from valid options', () => {
      const options: RuntimeOptions = {
        agentId: 'test_agent',
        userId: 'test_user',
        llmApiKey: 'test_key',
        llmProvider: 'anthropic',
      };

      const config = builder.fromOptions(options);

      expect(config.agentId).toBe('test_agent');
      expect(config.userId).toBe('test_user');
      expect(config.llmConfig.apiKey).toBe('test_key');
      expect(config.llmConfig.provider).toBe('anthropic');
    });

    it('should use default values for optional fields', () => {
      const options: RuntimeOptions = {
        agentId: 'test_agent',
        userId: 'test_user',
        llmApiKey: 'test_key',
      };

      const config = builder.fromOptions(options);

      expect(config.tier).toBe('starter');
      expect(config.autoSave).toBe(true);
      expect(config.validateIdentity).toBe(true);
      expect(config.cacheEnabled).toBe(true);
    });

    it('should allow overriding defaults', () => {
      const options: RuntimeOptions = {
        agentId: 'test_agent',
        userId: 'test_user',
        llmApiKey: 'test_key',
        tier: 'enterprise',
        autoSave: false,
        validateIdentity: false,
        cacheEnabled: false,
      };

      const config = builder.fromOptions(options);

      expect(config.tier).toBe('enterprise');
      expect(config.autoSave).toBe(false);
      expect(config.validateIdentity).toBe(false);
      expect(config.cacheEnabled).toBe(false);
    });

    it('should throw error for missing agent ID', () => {
      const options: RuntimeOptions = {
        agentId: '',
        userId: 'test_user',
        llmApiKey: 'test_key',
      };

      expect(() => builder.fromOptions(options)).toThrow(ConfigurationError);
    });

    it('should throw error for missing user ID', () => {
      const options: RuntimeOptions = {
        agentId: 'test_agent',
        userId: '',
        llmApiKey: 'test_key',
      };

      expect(() => builder.fromOptions(options)).toThrow(ConfigurationError);
    });

    it('should throw error for missing API key', () => {
      const options: RuntimeOptions = {
        agentId: 'test_agent',
        userId: 'test_user',
      };

      expect(() => builder.fromOptions(options)).toThrow(ConfigurationError);
    });

    it('should throw error for invalid provider', () => {
      const options: RuntimeOptions = {
        agentId: 'test_agent',
        userId: 'test_user',
        llmApiKey: 'test_key',
        llmProvider: 'invalid' as any,
      };

      expect(() => builder.fromOptions(options)).toThrow(ConfigurationError);
    });

    it('should throw error for invalid tier', () => {
      const options: RuntimeOptions = {
        agentId: 'test_agent',
        userId: 'test_user',
        llmApiKey: 'test_key',
        tier: 'invalid' as any,
      };

      expect(() => builder.fromOptions(options)).toThrow(ConfigurationError);
    });

    it('should throw error for negative cache TTL', () => {
      const options: RuntimeOptions = {
        agentId: 'test_agent',
        userId: 'test_user',
        llmApiKey: 'test_key',
        cacheTTL: -1000,
      };

      expect(() => builder.fromOptions(options)).toThrow(ConfigurationError);
    });

    it('should throw error for too small max context tokens', () => {
      const options: RuntimeOptions = {
        agentId: 'test_agent',
        userId: 'test_user',
        llmApiKey: 'test_key',
        maxContextTokens: 50,
      };

      expect(() => builder.fromOptions(options)).toThrow(ConfigurationError);
    });

    it('should set correct default model per provider', () => {
      const anthropicOptions: RuntimeOptions = {
        agentId: 'test',
        userId: 'test',
        llmApiKey: 'key',
        llmProvider: 'anthropic',
      };

      const anthropicConfig = builder.fromOptions(anthropicOptions);
      expect(anthropicConfig.llmConfig.model).toBe('claude-sonnet-4-5-20250929');

      const openaiOptions: RuntimeOptions = {
        agentId: 'test',
        userId: 'test',
        llmApiKey: 'key',
        llmProvider: 'openai',
      };

      const openaiConfig = builder.fromOptions(openaiOptions);
      expect(openaiConfig.llmConfig.model).toBe('gpt-4-turbo-preview');
    });
  });

  describe('fromEnvironment', () => {
    it('should build config from environment variables', () => {
      process.env.RECALLBRICKS_AGENT_ID = 'test_agent';
      process.env.RECALLBRICKS_USER_ID = 'test_user';
      process.env.RECALLBRICKS_API_KEY = 'test_key';

      const config = builder.fromEnvironment();

      expect(config.agentId).toBe('test_agent');
      expect(config.userId).toBe('test_user');
      expect(config.llmConfig.apiKey).toBe('test_key');
    });

    it('should throw error when required env vars are missing', () => {
      expect(() => builder.fromEnvironment()).toThrow(ConfigurationError);
    });

    it('should use default values from environment', () => {
      process.env.RECALLBRICKS_AGENT_ID = 'test_agent';
      process.env.RECALLBRICKS_USER_ID = 'test_user';
      process.env.RECALLBRICKS_API_KEY = 'test_key';

      const config = builder.fromEnvironment();

      expect(config.llmConfig.provider).toBe('anthropic');
      expect(config.tier).toBe('starter');
    });

    it('should parse boolean environment variables', () => {
      process.env.RECALLBRICKS_AGENT_ID = 'test_agent';
      process.env.RECALLBRICKS_USER_ID = 'test_user';
      process.env.RECALLBRICKS_API_KEY = 'test_key';
      process.env.RECALLBRICKS_AUTO_SAVE = 'false';
      process.env.RECALLBRICKS_DEBUG = 'true';

      const config = builder.fromEnvironment();

      expect(config.autoSave).toBe(false);
      expect(config.debug).toBe(true);
    });

    it('should parse number environment variables', () => {
      process.env.RECALLBRICKS_AGENT_ID = 'test_agent';
      process.env.RECALLBRICKS_USER_ID = 'test_user';
      process.env.RECALLBRICKS_API_KEY = 'test_key';
      process.env.RECALLBRICKS_CACHE_TTL = '600000';
      process.env.RECALLBRICKS_MAX_CONTEXT_TOKENS = '8000';

      const config = builder.fromEnvironment();

      expect(config.cacheTTL).toBe(600000);
      expect(config.maxContextTokens).toBe(8000);
    });
  });
});
