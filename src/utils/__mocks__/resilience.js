/* eslint-env jest */

// Jest manual mock for PerformanceMonitor
// Ensures monitor always executes the provided callback and returns its result

export const PerformanceMonitor = {
  /**
   * Forwarding mock that just calls the provided async function.
   * Keeping the signature compatible with the real implementation.
   */
  monitor: jest.fn(async (_operation, fn /*, _context */) => fn()),
};
