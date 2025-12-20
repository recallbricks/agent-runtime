/**
 * RecallBricks Agent Runtime - Rate Limiter
 *
 * Enterprise-grade rate limiting with multiple strategies
 */

import { Logger } from '../types';

// ============================================================================
// Rate Limiter Configuration
// ============================================================================

export interface RateLimiterConfig {
  maxRequests: number;           // Max requests per window
  windowMs: number;              // Time window in milliseconds
  strategy: 'sliding-window' | 'token-bucket' | 'fixed-window';
  keyGenerator?: (context: unknown) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// ============================================================================
// Rate Limit Error
// ============================================================================

export class RateLimitExceededError extends Error {
  constructor(
    public info: RateLimitInfo,
    key?: string
  ) {
    super(
      `Rate limit exceeded for ${key || 'default'}. ` +
        `Limit: ${info.limit}, Remaining: ${info.remaining}, ` +
        `Reset at: ${new Date(info.resetTime).toISOString()}`
    );
    this.name = 'RateLimitExceededError';
  }
}

// ============================================================================
// Sliding Window Rate Limiter
// ============================================================================

class SlidingWindowLimiter {
  private requests = new Map<string, number[]>();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  tryAcquire(key: string): { allowed: boolean; info: RateLimitInfo } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get and clean old requests
    const requestTimes = this.requests.get(key) || [];
    const validRequests = requestTimes.filter((time) => time > windowStart);

    const allowed = validRequests.length < this.maxRequests;
    const resetTime = validRequests.length > 0
      ? validRequests[0] + this.windowMs
      : now + this.windowMs;

    if (allowed) {
      validRequests.push(now);
      this.requests.set(key, validRequests);
    }

    return {
      allowed,
      info: {
        limit: this.maxRequests,
        remaining: Math.max(0, this.maxRequests - validRequests.length),
        resetTime,
        retryAfter: allowed ? undefined : resetTime - now,
      },
    };
  }

  reset(key: string): void {
    this.requests.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, times] of this.requests) {
      const validRequests = times.filter((time) => time > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

// ============================================================================
// Token Bucket Rate Limiter
// ============================================================================

class TokenBucketLimiter {
  private buckets = new Map<
    string,
    { tokens: number; lastRefill: number }
  >();

  constructor(
    private maxTokens: number,
    private refillRate: number, // tokens per second
    private refillInterval: number = 1000 // ms
  ) {}

  tryAcquire(key: string): { allowed: boolean; info: RateLimitInfo } {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on time passed
    const timePassed = now - bucket.lastRefill;
    const intervalsPasssed = Math.floor(timePassed / this.refillInterval);
    const tokensToAdd = intervalsPasssed * this.refillRate;

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    const allowed = bucket.tokens >= 1;

    if (allowed) {
      bucket.tokens -= 1;
    }

    const resetTime = bucket.lastRefill + this.refillInterval;

    return {
      allowed,
      info: {
        limit: this.maxTokens,
        remaining: Math.floor(bucket.tokens),
        resetTime,
        retryAfter: allowed ? undefined : resetTime - now,
      },
    };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    const maxAge = 60000; // 1 minute

    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(key);
      }
    }
  }
}

// ============================================================================
// Fixed Window Rate Limiter
// ============================================================================

class FixedWindowLimiter {
  private windows = new Map<string, { count: number; resetTime: number }>();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  tryAcquire(key: string): { allowed: boolean; info: RateLimitInfo } {
    const now = Date.now();
    let window = this.windows.get(key);

    // Create new window or reset if expired
    if (!window || now >= window.resetTime) {
      window = {
        count: 0,
        resetTime: now + this.windowMs,
      };
      this.windows.set(key, window);
    }

    const allowed = window.count < this.maxRequests;

    if (allowed) {
      window.count++;
    }

    return {
      allowed,
      info: {
        limit: this.maxRequests,
        remaining: Math.max(0, this.maxRequests - window.count),
        resetTime: window.resetTime,
        retryAfter: allowed ? undefined : window.resetTime - now,
      },
    };
  }

  reset(key: string): void {
    this.windows.delete(key);
  }

  cleanup(): void {
    const now = Date.now();

    for (const [key, window] of this.windows) {
      if (now >= window.resetTime + this.windowMs) {
        this.windows.delete(key);
      }
    }
  }
}

// ============================================================================
// Rate Limiter
// ============================================================================

export class RateLimiter {
  private limiter:
    | SlidingWindowLimiter
    | TokenBucketLimiter
    | FixedWindowLimiter;
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private config: RateLimiterConfig,
    private logger: Logger
  ) {
    // Initialize appropriate limiter based on strategy
    switch (config.strategy) {
      case 'sliding-window':
        this.limiter = new SlidingWindowLimiter(
          config.maxRequests,
          config.windowMs
        );
        break;
      case 'token-bucket':
        const refillRate = config.maxRequests / (config.windowMs / 1000);
        this.limiter = new TokenBucketLimiter(config.maxRequests, refillRate);
        break;
      case 'fixed-window':
        this.limiter = new FixedWindowLimiter(
          config.maxRequests,
          config.windowMs
        );
        break;
    }

    // Setup cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.limiter.cleanup();
    }, config.windowMs);

    this.logger.info('Rate limiter initialized', {
      strategy: config.strategy,
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
    });
  }

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(
    fn: () => Promise<T>,
    context?: unknown
  ): Promise<T> {
    const key = this.config.keyGenerator
      ? this.config.keyGenerator(context)
      : 'default';

    const { allowed, info } = this.limiter.tryAcquire(key);

    if (!allowed) {
      this.logger.warn('Rate limit exceeded', { key, info });
      throw new RateLimitExceededError(info, key);
    }

    this.logger.debug('Rate limit check passed', {
      key,
      remaining: info.remaining,
    });

    try {
      const result = await fn();

      // Skip counting successful requests if configured
      if (this.config.skipSuccessfulRequests) {
        this.reset(key);
      }

      return result;
    } catch (error) {
      // Skip counting failed requests if configured
      if (this.config.skipFailedRequests) {
        this.reset(key);
      }

      throw error;
    }
  }

  /**
   * Check if a request would be allowed without consuming quota
   */
  check(context?: unknown): RateLimitInfo {
    const key = this.config.keyGenerator
      ? this.config.keyGenerator(context)
      : 'default';

    const { info } = this.limiter.tryAcquire(key);
    return info;
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.limiter.reset(key);
    this.logger.debug('Rate limit reset', { key });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.logger.debug('Rate limiter destroyed');
  }
}

// ============================================================================
// Rate Limiter Manager
// ============================================================================

export class RateLimiterManager {
  private limiters = new Map<string, RateLimiter>();

  constructor(private logger: Logger) {}

  /**
   * Create or get a rate limiter
   */
  getOrCreate(
    name: string,
    config: Partial<RateLimiterConfig>
  ): RateLimiter {
    if (this.limiters.has(name)) {
      return this.limiters.get(name)!;
    }

    const defaultConfig: RateLimiterConfig = {
      maxRequests: 100,
      windowMs: 60000, // 1 minute
      strategy: 'sliding-window',
      ...config,
    };

    const limiter = new RateLimiter(defaultConfig, this.logger);
    this.limiters.set(name, limiter);
    return limiter;
  }

  /**
   * Get all rate limiters
   */
  getAll(): Map<string, RateLimiter> {
    return new Map(this.limiters);
  }

  /**
   * Destroy all rate limiters
   */
  destroyAll(): void {
    for (const limiter of this.limiters.values()) {
      limiter.destroy();
    }
    this.limiters.clear();
    this.logger.info('All rate limiters destroyed');
  }
}
