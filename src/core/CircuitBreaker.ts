/**
 * RecallBricks Agent Runtime - Circuit Breaker
 *
 * Enterprise-grade circuit breaker for fault tolerance
 */

import { Logger } from '../types';

// ============================================================================
// Circuit Breaker Configuration
// ============================================================================

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  resetTimeout: number;          // Time in ms before attempting reset
  monitorInterval: number;       // Time window for counting failures
  halfOpenMaxAttempts: number;   // Max attempts in half-open state
  name: string;                  // Circuit breaker name for logging
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  stateChanges: number;
  uptime: number;
}

// ============================================================================
// Circuit Breaker Errors
// ============================================================================

export class CircuitBreakerOpenError extends Error {
  constructor(circuitName: string, nextRetryTime?: number) {
    super(
      `Circuit breaker "${circuitName}" is OPEN. ${
        nextRetryTime
          ? `Next retry at ${new Date(nextRetryTime).toISOString()}`
          : 'Service unavailable'
      }`
    );
    this.name = 'CircuitBreakerOpenError';
  }
}

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private totalRequests = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private stateChanges = 0;
  private createdAt = Date.now();
  private nextRetryTime?: number;
  private halfOpenAttempts = 0;

  constructor(
    private config: CircuitBreakerConfig,
    private logger: Logger
  ) {
    this.logger.info(`Circuit breaker "${config.name}" initialized`, {
      config,
    });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        this.logger.warn(`Circuit breaker "${this.config.name}" is OPEN`, {
          nextRetryTime: this.nextRetryTime,
        });
        throw new CircuitBreakerOpenError(this.config.name, this.nextRetryTime);
      }
    }

    // Execute the function
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.successes++;
    this.lastSuccessTime = Date.now();

    if (this.state === 'half-open') {
      this.halfOpenAttempts++;

      if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        this.transitionToClosed();
      }

      this.logger.debug(
        `Circuit breaker "${this.config.name}" half-open success`,
        {
          attempts: this.halfOpenAttempts,
          max: this.config.halfOpenMaxAttempts,
        }
      );
    }

    // Reset failure count on success in closed state
    if (this.state === 'closed' && this.failures > 0) {
      this.failures = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: unknown): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    this.logger.warn(`Circuit breaker "${this.config.name}" failure`, {
      error: error instanceof Error ? error.message : String(error),
      failures: this.failures,
      threshold: this.config.failureThreshold,
      state: this.state,
    });

    if (this.state === 'half-open') {
      // Any failure in half-open state reopens the circuit
      this.transitionToOpen();
    } else if (this.state === 'closed') {
      // Check if we've exceeded the failure threshold
      if (this.failures >= this.config.failureThreshold) {
        this.transitionToOpen();
      }
    }
  }

  /**
   * Check if we should attempt to reset from open state
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextRetryTime) {
      return false;
    }
    return Date.now() >= this.nextRetryTime;
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    this.logger.info(`Circuit breaker "${this.config.name}" transitioning to CLOSED`);
    this.state = 'closed';
    this.failures = 0;
    this.halfOpenAttempts = 0;
    this.nextRetryTime = undefined;
    this.stateChanges++;
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    this.logger.error(`Circuit breaker "${this.config.name}" transitioning to OPEN`, {
      failures: this.failures,
      threshold: this.config.failureThreshold,
    });
    this.state = 'open';
    this.halfOpenAttempts = 0;
    this.nextRetryTime = Date.now() + this.config.resetTimeout;
    this.stateChanges++;
  }

  /**
   * Transition to HALF-OPEN state
   */
  private transitionToHalfOpen(): void {
    this.logger.info(
      `Circuit breaker "${this.config.name}" transitioning to HALF-OPEN`
    );
    this.state = 'half-open';
    this.halfOpenAttempts = 0;
    this.stateChanges++;
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateChanges: this.stateChanges,
      uptime: Date.now() - this.createdAt,
    };
  }

  /**
   * Force circuit to closed state (use with caution)
   */
  forceClose(): void {
    this.logger.warn(`Circuit breaker "${this.config.name}" force closed`);
    this.transitionToClosed();
  }

  /**
   * Force circuit to open state (for maintenance)
   */
  forceOpen(): void {
    this.logger.warn(`Circuit breaker "${this.config.name}" force opened`);
    this.transitionToOpen();
  }

  /**
   * Reset all statistics
   */
  resetStats(): void {
    this.failures = 0;
    this.successes = 0;
    this.totalRequests = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.logger.debug(`Circuit breaker "${this.config.name}" stats reset`);
  }
}

// ============================================================================
// Circuit Breaker Manager
// ============================================================================

export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();

  constructor(private logger: Logger) {}

  /**
   * Create or get a circuit breaker
   */
  getOrCreate(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (this.breakers.has(name)) {
      return this.breakers.get(name)!;
    }

    const defaultConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 60000, // 60 seconds
      monitorInterval: 120000, // 2 minutes
      halfOpenMaxAttempts: 3,
      name,
      ...config,
    };

    const breaker = new CircuitBreaker(defaultConfig, this.logger);
    this.breakers.set(name, breaker);
    return breaker;
  }

  /**
   * Get all circuit breakers
   */
  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Get statistics for all circuit breakers
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  /**
   * Force close all circuits (emergency recovery)
   */
  forceCloseAll(): void {
    this.logger.warn('Force closing all circuit breakers');
    for (const breaker of this.breakers.values()) {
      breaker.forceClose();
    }
  }

  /**
   * Get health status
   */
  getHealth(): {
    healthy: boolean;
    openCircuits: string[];
    totalCircuits: number;
  } {
    const openCircuits: string[] = [];

    for (const [name, breaker] of this.breakers) {
      if (breaker.getState() === 'open') {
        openCircuits.push(name);
      }
    }

    return {
      healthy: openCircuits.length === 0,
      openCircuits,
      totalCircuits: this.breakers.size,
    };
  }
}
