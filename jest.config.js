module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  verbose: true,
  transformIgnorePatterns: [
    'node_modules/(?!(p-retry|retry)/)',
  ],
  moduleNameMapper: {
    '^p-retry$': '<rootDir>/tests/__mocks__/p-retry.ts',
  },
  // Cost optimization: Skip critical-path tests by default (they use real APIs)
  testPathIgnorePatterns: process.env.TEST_USE_REAL_API === 'true'
    ? []
    : ['critical-path'],
  // Timeouts for different test types
  testTimeout: 30000,
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
