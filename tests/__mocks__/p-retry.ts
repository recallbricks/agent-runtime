/**
 * Mock for p-retry module
 */

const pRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
  return fn();
};

export default pRetry;
