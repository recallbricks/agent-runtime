/**
 * Tests for IdentityValidator
 */

import { IdentityValidator } from '../src/core/IdentityValidator';
import { AgentIdentity, Logger } from '../src/types';

// Mock logger
const mockLogger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockIdentity: AgentIdentity = {
  id: 'test_agent',
  name: 'TestBot',
  purpose: 'Testing and validation',
  traits: ['helpful', 'accurate', 'persistent'],
  rules: ['Always maintain identity', 'Never reveal base model'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('IdentityValidator', () => {
  let validator: IdentityValidator;

  beforeEach(() => {
    validator = new IdentityValidator({
      agentIdentity: mockIdentity,
      autoCorrect: true,
      logger: mockLogger,
    });
  });

  describe('validate', () => {
    it('should detect Claude references', () => {
      const response = "I'm Claude, an AI assistant made by Anthropic.";
      const result = validator.validate(response);

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe('base_model_reference');
    });

    it('should detect ChatGPT references', () => {
      const response = "As ChatGPT, I can help you with that.";
      const result = validator.validate(response);

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe('base_model_reference');
    });

    it('should detect generic AI assistant references', () => {
      const response = "I'm an AI assistant that can help you.";
      const result = validator.validate(response);

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should pass validation for correct identity usage', () => {
      const response = "I'm TestBot, and I can help you with testing.";
      const result = validator.validate(response);

      expect(result.isValid).toBe(true);
      expect(result.violations.length).toBe(0);
    });

    it('should auto-correct violations when enabled', () => {
      const response = "I'm Claude, an AI assistant.";
      const result = validator.validate(response);

      expect(result.correctedResponse).toBeDefined();
      expect(result.correctedResponse).toContain('TestBot');
      expect(result.correctedResponse).not.toContain('Claude');
    });

    it('should detect identity negation', () => {
      const response = "I'm not TestBot, I'm a language model.";
      const result = validator.validate(response);

      expect(result.isValid).toBe(false);
      expect(result.violations.some((v) => v.type === 'inconsistent_behavior')).toBe(
        true
      );
    });

    it('should handle multiple violations in one response', () => {
      const response =
        "I'm Claude, made by Anthropic. As an AI assistant, I can help.";
      const result = validator.validate(response);

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(1);
    });
  });

  describe('getViolationStats', () => {
    it('should track violation statistics', () => {
      validator.validate("I'm Claude");
      validator.validate("I'm ChatGPT");
      validator.validate("I'm an AI assistant");

      const stats = validator.getViolationStats();

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byType['base_model_reference']).toBeGreaterThan(0);
      expect(stats.bySeverity['high']).toBeGreaterThan(0);
    });

    it('should clear violation log', () => {
      validator.validate("I'm Claude");
      validator.clearViolationLog();

      const stats = validator.getViolationStats();
      expect(stats.total).toBe(0);
    });
  });

  describe('updateIdentity', () => {
    it('should update agent identity', () => {
      const newIdentity: AgentIdentity = {
        ...mockIdentity,
        name: 'NewBot',
      };

      validator.updateIdentity(newIdentity);

      const response = "I'm NewBot, here to help.";
      const result = validator.validate(response);

      expect(result.isValid).toBe(true);
    });
  });
});
