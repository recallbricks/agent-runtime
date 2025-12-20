/**
 * RecallBricks Agent Runtime - Identity Validator
 *
 * Enforces stable identity by detecting and correcting identity leakage
 */

import {
  AgentIdentity,
  IdentityViolation,
  ValidationResult,
  Logger,
} from '../types';

// ============================================================================
// Identity Validator Configuration
// ============================================================================

interface IdentityValidatorConfig {
  agentIdentity: AgentIdentity;
  autoCorrect: boolean;
  logger: Logger;
}

// ============================================================================
// Base Model Reference Patterns
// ============================================================================

const BASE_MODEL_PATTERNS = [
  // Anthropic Claude references
  /\bClaude\b/gi,
  /\bI'm Claude\b/gi,
  /\bI am Claude\b/gi,
  /\bClaude AI\b/gi,
  /\bAnthropic\b/gi,
  /\bcreated by Anthropic\b/gi,
  /\bbuilt by Anthropic\b/gi,

  // OpenAI references
  /\bChatGPT\b/gi,
  /\bGPT-4\b/gi,
  /\bGPT-3\b/gi,
  /\bI'm ChatGPT\b/gi,
  /\bI am ChatGPT\b/gi,
  /\bOpenAI\b/gi,
  /\bcreated by OpenAI\b/gi,
  /\bbuilt by OpenAI\b/gi,

  // Generic AI assistant references
  /\bI'm an AI assistant\b/gi,
  /\bI am an AI assistant\b/gi,
  /\bI'm a language model\b/gi,
  /\bI am a language model\b/gi,
  /\bI'm an AI\b/gi,
  /\bI am an AI\b/gi,
  /\bas an AI assistant\b/gi,
  /\bas a language model\b/gi,

  // Capability limitations
  /\bI don't have the ability to\b/gi,
  /\bI cannot actually\b/gi,
  /\bI don't actually have\b/gi,
  /\bI'm not able to\b/gi,
  /\bI am not able to\b/gi,
];

// ============================================================================
// Identity Validator Implementation
// ============================================================================

export class IdentityValidator {
  private violationLog: IdentityViolation[] = [];

  constructor(private config: IdentityValidatorConfig) {
    config.logger.debug('IdentityValidator initialized', {
      agentName: config.agentIdentity.name,
      autoCorrect: config.autoCorrect,
    });
  }

  /**
   * Validate a response for identity violations
   */
  validate(response: string): ValidationResult {
    this.config.logger.debug('Validating response for identity violations');

    const violations: IdentityViolation[] = [];

    // Check for base model references
    const baseModelViolations = this.detectBaseModelReferences(response);
    violations.push(...baseModelViolations);

    // Check for identity inconsistencies
    const inconsistencyViolations = this.detectIdentityInconsistencies(response);
    violations.push(...inconsistencyViolations);

    // Log violations
    if (violations.length > 0) {
      this.violationLog.push(...violations);
      this.config.logger.warn('Identity violations detected', {
        count: violations.length,
        types: violations.map((v) => v.type),
      });
    }

    // Auto-correct if enabled
    let correctedResponse: string | undefined;
    if (this.config.autoCorrect && violations.length > 0) {
      correctedResponse = this.correctViolations(response, violations);
      this.config.logger.info('Response auto-corrected', {
        violationsFixed: violations.length,
      });
    }

    return {
      isValid: violations.length === 0,
      violations,
      correctedResponse,
    };
  }

  /**
   * Detect base model references in response
   */
  private detectBaseModelReferences(response: string): IdentityViolation[] {
    const violations: IdentityViolation[] = [];

    for (const pattern of BASE_MODEL_PATTERNS) {
      const matches = response.match(pattern);
      if (matches) {
        for (const match of matches) {
          violations.push({
            type: 'base_model_reference',
            detected: match,
            suggestion: `Replace with "${this.config.agentIdentity.name}"`,
            severity: 'high',
          });
        }
      }
    }

    return violations;
  }

  /**
   * Detect identity inconsistencies
   */
  private detectIdentityInconsistencies(response: string): IdentityViolation[] {
    const violations: IdentityViolation[] = [];

    // Check if agent name is used incorrectly
    const agentName = this.config.agentIdentity.name;

    // Pattern: "I'm not {agentName}"
    const negationPattern = new RegExp(
      `I'm not ${agentName}|I am not ${agentName}`,
      'gi'
    );
    if (negationPattern.test(response)) {
      violations.push({
        type: 'inconsistent_behavior',
        detected: `Negation of agent identity: "${agentName}"`,
        suggestion: `Always affirm identity as "${agentName}"`,
        severity: 'high',
      });
    }

    // Check for inconsistent purpose statements
    const purposeKeywords = this.config.agentIdentity.purpose
      .toLowerCase()
      .split(' ')
      .filter((word) => word.length > 4);

    const contradictionPatterns = [
      /I cannot help with that/gi,
      /I'm not designed for/gi,
      /That's not my purpose/gi,
      /I don't have that capability/gi,
    ];

    for (const pattern of contradictionPatterns) {
      if (pattern.test(response)) {
        // Check if the response contradicts the agent's purpose
        const hasRelevantPurpose = purposeKeywords.some((keyword) =>
          response.toLowerCase().includes(keyword)
        );

        if (hasRelevantPurpose) {
          violations.push({
            type: 'inconsistent_behavior',
            detected: 'Response contradicts agent purpose',
            suggestion: 'Align response with agent purpose and capabilities',
            severity: 'medium',
          });
        }
      }
    }

    return violations;
  }

  /**
   * Correct violations in the response
   */
  private correctViolations(
    response: string,
    _violations: IdentityViolation[]
  ): string {
    let corrected = response;
    const agentName = this.config.agentIdentity.name;

    // Replace base model references with agent name
    for (const pattern of BASE_MODEL_PATTERNS) {
      corrected = corrected.replace(pattern, agentName);
    }

    // Fix common patterns
    corrected = corrected.replace(
      /I'm an AI assistant/gi,
      `I'm ${agentName}`
    );
    corrected = corrected.replace(
      /I am an AI assistant/gi,
      `I am ${agentName}`
    );
    corrected = corrected.replace(
      /as an AI assistant/gi,
      `as ${agentName}`
    );
    corrected = corrected.replace(
      /I'm a language model/gi,
      `I'm ${agentName}, a persistent cognitive agent`
    );
    corrected = corrected.replace(
      /I am a language model/gi,
      `I am ${agentName}, a persistent cognitive agent`
    );

    // Remove generic AI capability disclaimers
    corrected = corrected.replace(
      /I don't have the ability to remember previous conversations/gi,
      'I maintain continuous memory of our interactions'
    );
    corrected = corrected.replace(
      /I cannot recall previous conversations/gi,
      'I can recall our previous conversations'
    );

    return corrected;
  }

  /**
   * Get violation statistics
   */
  getViolationStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    const total = this.violationLog.length;

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const violation of this.violationLog) {
      byType[violation.type] = (byType[violation.type] || 0) + 1;
      bySeverity[violation.severity] = (bySeverity[violation.severity] || 0) + 1;
    }

    return { total, byType, bySeverity };
  }

  /**
   * Clear violation log
   */
  clearViolationLog(): void {
    this.violationLog = [];
    this.config.logger.debug('Violation log cleared');
  }

  /**
   * Update agent identity
   */
  updateIdentity(newIdentity: AgentIdentity): void {
    this.config.agentIdentity = newIdentity;
    this.config.logger.info('Agent identity updated', {
      agentName: newIdentity.name,
    });
  }
}
