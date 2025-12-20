/**
 * Input Validation Unit Tests
 *
 * Tests input sanitization, injection prevention, and edge cases
 * NO API CALLS - FREE
 */

import { ConfigBuilder } from '../../src/config';
import { ConfigurationError, RuntimeOptions } from '../../src/types';
import { createValidOptions } from '../test.config';

describe('Input Validation', () => {
  let builder: ConfigBuilder;

  beforeEach(() => {
    builder = new ConfigBuilder();
    jest.clearAllMocks();
  });

  describe('String Input Sanitization', () => {
    it('should reject empty agentId', () => {
      const options = createValidOptions({ agentId: '' });
      expect(() => builder.fromOptions(options as RuntimeOptions)).toThrow(ConfigurationError);
    });

    it('should reject empty userId', () => {
      const options = createValidOptions({ userId: '' });
      expect(() => builder.fromOptions(options as RuntimeOptions)).toThrow(ConfigurationError);
    });

    it('should reject whitespace-only agentId', () => {
      const options = createValidOptions({ agentId: '   ' });
      expect(() => builder.fromOptions(options as RuntimeOptions)).toThrow(ConfigurationError);
    });

    it('should reject whitespace-only userId', () => {
      const options = createValidOptions({ userId: '   ' });
      expect(() => builder.fromOptions(options as RuntimeOptions)).toThrow(ConfigurationError);
    });

    it('should accept valid agentId with special characters', () => {
      const options = createValidOptions({ agentId: 'agent-123_test.v1' });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.agentId).toBe('agent-123_test.v1');
    });

    it('should accept valid userId with special characters', () => {
      const options = createValidOptions({ userId: 'user@example.com' });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.userId).toBe('user@example.com');
    });

    it('should handle unicode characters in names', () => {
      const options = createValidOptions({
        agentName: 'Agent \u00e9l\u00e8ve',
        agentPurpose: '\u65e5\u672c\u8a9e\u306e\u30c6\u30b9\u30c8',
      });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.agentName).toBe('Agent \u00e9l\u00e8ve');
      expect(config.agentPurpose).toBe('\u65e5\u672c\u8a9e\u306e\u30c6\u30b9\u30c8');
    });
  });

  describe('SQL Injection Prevention', () => {
    // These test that malicious inputs are handled safely
    // The config builder should accept these strings (they're just text)
    // but they should never be used in raw SQL queries

    it('should accept but not execute SQL in agentId', () => {
      const options = createValidOptions({
        agentId: "agent'; DROP TABLE users; --",
      });
      const config = builder.fromOptions(options as RuntimeOptions);
      // String is stored as-is (it's just text), but should never be used in raw SQL
      expect(config.agentId).toBe("agent'; DROP TABLE users; --");
    });

    it('should accept but not execute SQL in userId', () => {
      const options = createValidOptions({
        userId: "user' OR '1'='1",
      });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.userId).toBe("user' OR '1'='1");
    });

    it('should accept but not execute SQL in agentName', () => {
      const options = createValidOptions({
        agentName: "Agent'; DELETE FROM memories WHERE '1'='1",
      });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.agentName).toBe("Agent'; DELETE FROM memories WHERE '1'='1");
    });
  });

  describe('XSS Prevention', () => {
    // Config builder should accept these strings
    // XSS prevention should happen at render time, not storage time

    it('should accept but not execute script tags in agentName', () => {
      const options = createValidOptions({
        agentName: '<script>alert("xss")</script>',
      });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.agentName).toBe('<script>alert("xss")</script>');
    });

    it('should accept but not execute event handlers in purpose', () => {
      const options = createValidOptions({
        agentPurpose: '<img onerror="alert(1)" src="x">',
      });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.agentPurpose).toBe('<img onerror="alert(1)" src="x">');
    });

    it('should accept JavaScript protocol handlers', () => {
      const options = createValidOptions({
        agentPurpose: 'javascript:alert(document.cookie)',
      });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.agentPurpose).toBe('javascript:alert(document.cookie)');
    });
  });

  describe('Edge Cases', () => {
    it('should handle extremely long agentId', () => {
      const longId = 'a'.repeat(10000);
      const options = createValidOptions({ agentId: longId });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.agentId).toBe(longId);
    });

    it('should handle extremely long userId', () => {
      const longId = 'u'.repeat(10000);
      const options = createValidOptions({ userId: longId });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.userId).toBe(longId);
    });

    it('should handle null-like strings', () => {
      const options = createValidOptions({ agentName: 'null' });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.agentName).toBe('null');
    });

    it('should handle undefined-like strings', () => {
      const options = createValidOptions({ agentName: 'undefined' });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.agentName).toBe('undefined');
    });

    it('should handle newlines in strings', () => {
      const options = createValidOptions({
        agentPurpose: 'Line 1\nLine 2\nLine 3',
      });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.agentPurpose).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should handle tabs in strings', () => {
      const options = createValidOptions({
        agentPurpose: 'Column1\tColumn2\tColumn3',
      });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.agentPurpose).toBe('Column1\tColumn2\tColumn3');
    });

    it('should handle JSON-like strings', () => {
      const options = createValidOptions({
        agentPurpose: '{"malicious": true, "inject": "data"}',
      });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.agentPurpose).toBe('{"malicious": true, "inject": "data"}');
    });
  });

  describe('Numeric Input Validation', () => {
    it('should reject negative cacheTTL', () => {
      const options = createValidOptions({ cacheTTL: -1000 });
      expect(() => builder.fromOptions(options as RuntimeOptions)).toThrow(ConfigurationError);
    });

    it('should handle zero cacheTTL', () => {
      const options = createValidOptions({ cacheTTL: 0 });
      // Zero may use default value - test that it doesn't throw
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.cacheTTL).toBeDefined();
    });

    it('should accept reasonable cacheTTL', () => {
      const options = createValidOptions({ cacheTTL: 300000 }); // 5 minutes
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.cacheTTL).toBe(300000);
    });

    it('should reject maxContextTokens below minimum', () => {
      const options = createValidOptions({ maxContextTokens: 50 });
      expect(() => builder.fromOptions(options as RuntimeOptions)).toThrow(ConfigurationError);
    });

    it('should reject negative maxContextTokens', () => {
      const options = createValidOptions({ maxContextTokens: -100 });
      expect(() => builder.fromOptions(options as RuntimeOptions)).toThrow(ConfigurationError);
    });

    it('should accept reasonable maxContextTokens', () => {
      const options = createValidOptions({ maxContextTokens: 4096 });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.maxContextTokens).toBe(4096);
    });

    it('should handle very large maxContextTokens', () => {
      const options = createValidOptions({ maxContextTokens: 1000000 });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.maxContextTokens).toBe(1000000);
    });
  });

  describe('Provider Validation', () => {
    const validProviders = ['anthropic', 'openai', 'gemini', 'ollama', 'cohere', 'local'];

    validProviders.forEach((provider) => {
      it(`should accept valid provider: ${provider}`, () => {
        const options = createValidOptions({ llmProvider: provider });
        const config = builder.fromOptions(options as RuntimeOptions);
        expect(config.llmConfig?.provider).toBe(provider);
      });
    });

    it('should reject invalid provider', () => {
      const options = createValidOptions({ llmProvider: 'invalid-provider' });
      expect(() => builder.fromOptions(options as RuntimeOptions)).toThrow(ConfigurationError);
    });

    it('should handle empty provider as default', () => {
      // Empty provider falls back to default (anthropic)
      const options = createValidOptions({ llmProvider: '' as any });
      const config = builder.fromOptions(options as RuntimeOptions);
      // Either throws or uses default - test actual behavior
      expect(config.llmConfig?.provider).toBeDefined();
    });

    it('should handle case-sensitive provider names', () => {
      const options = createValidOptions({ llmProvider: 'Anthropic' });
      // Should reject - providers are case-sensitive
      expect(() => builder.fromOptions(options as RuntimeOptions)).toThrow(ConfigurationError);
    });
  });

  describe('Tier Validation', () => {
    const validTiers = ['starter', 'professional', 'enterprise'];

    validTiers.forEach((tier) => {
      it(`should accept valid tier: ${tier}`, () => {
        const options = createValidOptions({ tier });
        const config = builder.fromOptions(options as RuntimeOptions);
        expect(config.tier).toBe(tier);
      });
    });

    it('should reject invalid tier', () => {
      const options = createValidOptions({ tier: 'premium' });
      expect(() => builder.fromOptions(options as RuntimeOptions)).toThrow(ConfigurationError);
    });
  });

  describe('Boolean Validation', () => {
    it('should accept true for autoSave', () => {
      const options = createValidOptions({ autoSave: true });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.autoSave).toBe(true);
    });

    it('should accept false for autoSave', () => {
      const options = createValidOptions({ autoSave: false });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.autoSave).toBe(false);
    });

    it('should accept true for validateIdentity', () => {
      const options = createValidOptions({ validateIdentity: true });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.validateIdentity).toBe(true);
    });

    it('should accept false for validateIdentity', () => {
      const options = createValidOptions({ validateIdentity: false });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.validateIdentity).toBe(false);
    });

    it('should accept true for cacheEnabled', () => {
      const options = createValidOptions({ cacheEnabled: true });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.cacheEnabled).toBe(true);
    });

    it('should accept false for cacheEnabled', () => {
      const options = createValidOptions({ cacheEnabled: false });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.cacheEnabled).toBe(false);
    });

    it('should accept true for debug', () => {
      const options = createValidOptions({ debug: true });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.debug).toBe(true);
    });

    it('should accept false for debug', () => {
      const options = createValidOptions({ debug: false });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.debug).toBe(false);
    });
  });

  describe('URL Validation', () => {
    it('should accept valid HTTPS URL', () => {
      const options = createValidOptions({ apiUrl: 'https://api.recallbricks.com' });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.apiUrl).toBe('https://api.recallbricks.com');
    });

    it('should accept valid HTTP URL (for local dev)', () => {
      const options = createValidOptions({ apiUrl: 'http://localhost:3000' });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.apiUrl).toBe('http://localhost:3000');
    });

    it('should accept URL with port', () => {
      const options = createValidOptions({ apiUrl: 'https://api.example.com:8443' });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.apiUrl).toBe('https://api.example.com:8443');
    });

    it('should accept URL with path', () => {
      const options = createValidOptions({ apiUrl: 'https://api.example.com/v1' });
      const config = builder.fromOptions(options as RuntimeOptions);
      expect(config.apiUrl).toBe('https://api.example.com/v1');
    });
  });

  describe('API Key Validation', () => {
    it('should reject missing llmApiKey', () => {
      const options = createValidOptions({ llmApiKey: undefined });
      expect(() => builder.fromOptions(options as RuntimeOptions)).toThrow(ConfigurationError);
    });

    it('should reject empty llmApiKey', () => {
      const options = createValidOptions({ llmApiKey: '' });
      expect(() => builder.fromOptions(options as RuntimeOptions)).toThrow(ConfigurationError);
    });

    it('should accept valid API key formats', () => {
      const validKeys = [
        'sk-1234567890abcdef',
        'anthropic-key-12345',
        'AIzaSy-test-key-12345',
        'some-very-long-api-key-that-is-valid-1234567890abcdef',
      ];

      validKeys.forEach((key) => {
        const options = createValidOptions({ llmApiKey: key });
        const config = builder.fromOptions(options as RuntimeOptions);
        expect(config.llmConfig?.apiKey).toBe(key);
      });
    });
  });
});
