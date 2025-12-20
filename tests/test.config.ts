/**
 * Test Configuration - Cost Optimized
 *
 * Controls test behavior to minimize API costs while ensuring critical path coverage
 */

export const TEST_CONFIG = {
  // Use real API calls (default: false for mocked tests)
  useRealAPI: process.env.TEST_USE_REAL_API === 'true',

  // Always use cheap model for tests (Haiku)
  cheapModel: 'claude-haiku-4-5-20250115',

  // Hard limit on real API calls per test run
  maxRealCalls: 30,

  // Skip expensive load/stress tests
  skipExpensiveTests: process.env.TEST_SKIP_EXPENSIVE !== 'false',

  // Critical path only mode (skip non-essential tests)
  criticalPathOnly: process.env.TEST_CRITICAL_PATH_ONLY === 'true',

  // Timeouts
  unitTestTimeout: 5000,
  integrationTestTimeout: 30000,
  criticalPathTimeout: 60000,

  // Test data
  testUserIds: {
    userA: 'test-user-a-' + Date.now(),
    userB: 'test-user-b-' + Date.now(),
    persistence: 'test-persist-' + Date.now(),
  },

  testAgentIds: {
    default: 'test-agent-' + Date.now(),
    isolated: 'test-isolated-' + Date.now(),
  },
};

/**
 * Track API call count to enforce limits
 */
let apiCallCount = 0;

export function trackAPICall(): void {
  apiCallCount++;
  if (apiCallCount > TEST_CONFIG.maxRealCalls) {
    throw new Error(
      `API call limit exceeded! Max: ${TEST_CONFIG.maxRealCalls}, Current: ${apiCallCount}. ` +
      'Consider using mocked tests for non-critical paths.'
    );
  }
}

export function getAPICallCount(): number {
  return apiCallCount;
}

export function resetAPICallCount(): void {
  apiCallCount = 0;
}

/**
 * Mock Logger for tests
 */
export const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

/**
 * Create a fresh mock logger instance
 */
export function createMockLogger() {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

/**
 * Default valid options for AgentRuntime
 */
export function createValidOptions(overrides: Record<string, unknown> = {}) {
  return {
    agentId: 'test-agent',
    userId: 'test-user',
    llmApiKey: 'test-api-key',
    llmProvider: 'anthropic' as const,
    agentName: 'Test Agent',
    agentPurpose: 'Testing purposes',
    ...overrides,
  };
}

/**
 * Sample memories for mocked tests
 */
export const sampleMemories = [
  {
    id: 'mem_1',
    text: 'User prefers dark mode',
    score: 0.95,
    metadata: { importance: 0.8, tags: ['preference', 'ui'] },
    created_at: new Date().toISOString(),
  },
  {
    id: 'mem_2',
    text: 'User is working on a React project',
    score: 0.85,
    metadata: { importance: 0.7, tags: ['project', 'tech'] },
    created_at: new Date().toISOString(),
  },
  {
    id: 'mem_3',
    text: 'User likes TypeScript over JavaScript',
    score: 0.75,
    metadata: { importance: 0.6, tags: ['preference', 'tech'] },
    created_at: new Date().toISOString(),
  },
];

/**
 * Sample identity for mocked tests
 */
export const sampleIdentity = {
  id: 'agent_test',
  name: 'Test Agent',
  purpose: 'A test agent for unit testing',
  traits: ['helpful', 'concise', 'accurate'],
  rules: ['Always be truthful', 'Respect user privacy'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Skip test if expensive tests are disabled
 */
export function skipIfExpensive(testFn: () => void): void {
  if (TEST_CONFIG.skipExpensiveTests) {
    it.skip('Skipped - expensive test', testFn);
  } else {
    it('', testFn);
  }
}

/**
 * Only run if using real API
 */
export function realAPIOnly(
  description: string,
  testFn: () => void | Promise<void>
): void {
  if (TEST_CONFIG.useRealAPI) {
    it(description, async () => {
      await testFn();
    });
  } else {
    it.skip(`[REAL API] ${description}`, () => {});
  }
}
