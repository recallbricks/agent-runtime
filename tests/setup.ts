/**
 * Jest Setup File
 *
 * Global setup for all tests
 */

import { TEST_CONFIG, resetAPICallCount } from './test.config';

// Increase timeout for integration tests
if (process.env.TEST_USE_REAL_API === 'true') {
  jest.setTimeout(TEST_CONFIG.criticalPathTimeout);
} else {
  jest.setTimeout(TEST_CONFIG.integrationTestTimeout);
}

// Reset API call counter before each test file
beforeEach(() => {
  // Individual test setup if needed
});

// Global setup
beforeAll(() => {
  // Suppress console output during tests unless debugging
  if (!process.env.DEBUG) {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  }

  // Always show warnings and errors
  // jest.spyOn(console, 'warn').mockImplementation(() => {});
  // jest.spyOn(console, 'error').mockImplementation(() => {});

  if (process.env.TEST_USE_REAL_API === 'true') {
    console.warn('Running tests with REAL API calls - this will cost money!');
    resetAPICallCount();
  }
});

// Global teardown
afterAll(() => {
  jest.restoreAllMocks();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  console.error('Unhandled Rejection:', reason);
});

// Export for use in tests
export {};
