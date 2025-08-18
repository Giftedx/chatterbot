/**
 * Tests for enterprise error handling and resilience utilities
 */

import { BusinessError, APIError, ValidationError, SystemError, ErrorHandler } from '../errors';
import { RetryUtility, CircuitBreaker, PerformanceMonitor, HealthChecker } from '../resilience';
import { logger } from '../logger';

// Mock logger for testing
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    performance: jest.fn(),
  },
  LogLevel: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
  },
}));

describe('Error Handling System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear static state to prevent test interference
    PerformanceMonitor.clearMetrics();
    HealthChecker.clearChecks();
  });

  describe('AppError and subclasses', () => {
    test('BusinessError should have correct properties', () => {
      const error = new BusinessError(
        'Rate limit exceeded',
        'You have exceeded the rate limit. Please try again later.',
        { userId: 'test123' },
      );

      expect(error.name).toBe('BusinessError');
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.getUserFriendlyMessage()).toBe(
        'You have exceeded the rate limit. Please try again later.',
      );
      expect(error.isOperational).toBe(true);
      expect(error.context).toEqual({ userId: 'test123' });
    });

    test('APIError should determine retryability correctly', () => {
      const retryableError = new APIError('Service unavailable', 503, true);
      const nonRetryableError = new APIError('Bad request', 400, false);

      expect(retryableError.retryable).toBe(true);
      expect(nonRetryableError.retryable).toBe(false);
      expect(APIError.isRetryableStatusCode(503)).toBe(true);
      expect(APIError.isRetryableStatusCode(400)).toBe(false);
    });

    test('ValidationError should format user message correctly', () => {
      const error = new ValidationError('Username is required', 'username');

      expect(error.field).toBe('username');
      expect(error.getUserFriendlyMessage()).toBe(
        'Invalid input for username: Username is required',
      );
    });

    test('SystemError should have correct severity', () => {
      const criticalError = new SystemError('Database connection failed', 'critical');

      expect(criticalError.severity).toBe('critical');
      expect(criticalError.name).toBe('SystemError');
    });
  });

  describe('ErrorHandler', () => {
    test('should normalize different error types', () => {
      const stringError = ErrorHandler.normalize('Something went wrong');
      const errorObject = ErrorHandler.normalize(new Error('Test error'));
      const appError = ErrorHandler.normalize(new APIError('API failed', 500));

      expect(stringError).toBeInstanceOf(Error);
      expect(stringError.message).toBe('Something went wrong');
      expect(errorObject.message).toBe('Test error');
      expect(appError).toBeInstanceOf(APIError);
    });

    test('should correctly identify retryable errors', () => {
      const retryableError = new APIError('Service unavailable', 503, true);
      const nonRetryableError = new ValidationError('Invalid input');
      const networkError = new Error('ECONNRESET');

      expect(ErrorHandler.isRetryable(retryableError)).toBe(true);
      expect(ErrorHandler.isRetryable(nonRetryableError)).toBe(false);
      expect(ErrorHandler.isRetryable(networkError)).toBe(true);
    });
  });

  describe('RetryUtility', () => {
    test('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await RetryUtility.withRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should retry on failure and eventually succeed', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new APIError('Service temporarily unavailable', 503, true))
        .mockResolvedValue('success');

      const result = await RetryUtility.withRetry(operation, { maxAttempts: 3 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should fail after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new APIError('Persistent failure', 500, true));

      await expect(RetryUtility.withRetry(operation, { maxAttempts: 2 })).rejects.toThrow(
        'Persistent failure',
      );

      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should respect retry condition', async () => {
      const operation = jest.fn().mockRejectedValue(new ValidationError('Invalid input'));
      const retryCondition = jest.fn().mockReturnValue(false);

      await expect(
        RetryUtility.withRetry(operation, { maxAttempts: 3, retryCondition }),
      ).rejects.toThrow('Invalid input');

      expect(operation).toHaveBeenCalledTimes(1);
      expect(retryCondition).toHaveBeenCalled();
    });

    test('should use exponential backoff', async () => {
      const operation = jest.fn().mockRejectedValue(new APIError('Test', 503, true));
      const delays: number[] = [];

      // Mock setTimeout to capture delays
      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((fn: (...args: any[]) => any, delay?: number) => {
          if (delay !== undefined) {
            delays.push(delay);
          }
          if (typeof fn === 'function') {
            fn();
          }
          return undefined as unknown as ReturnType<typeof setTimeout>;
        });

      await expect(
        RetryUtility.withRetry(operation, {
          maxAttempts: 3,
          baseDelayMs: 100,
          exponentialBackoff: true,
        }),
      ).rejects.toThrow();

      expect(delays).toEqual([100, 200]);

      setTimeoutSpy.mockRestore();
    });
  });

  describe('CircuitBreaker', () => {
    test('should start in CLOSED state', () => {
      const cb = new CircuitBreaker('test-service', {
        failureThreshold: 3,
        resetTimeoutMs: 5000,
        monitoringWindowMs: 60000,
      });

      expect(cb.getState()).toBe('CLOSED');
    });

    test('should open after failure threshold', async () => {
      const cb = new CircuitBreaker('test-service', {
        failureThreshold: 2,
        resetTimeoutMs: 5000,
        monitoringWindowMs: 60000,
      });

      const failingOperation = jest.fn().mockRejectedValue(new Error('Service down'));

      // First failure
      await expect(cb.execute(failingOperation)).rejects.toThrow();
      expect(cb.getState()).toBe('CLOSED');

      // Second failure - should open circuit
      await expect(cb.execute(failingOperation)).rejects.toThrow();
      expect(cb.getState()).toBe('OPEN');

      // Third attempt should fail fast
      await expect(cb.execute(failingOperation)).rejects.toThrow(
        "Circuit breaker 'test-service' is OPEN",
      );
      expect(failingOperation).toHaveBeenCalledTimes(2); // Should not call operation when open
    });

    test('should transition to HALF_OPEN after timeout', async () => {
      const cb = new CircuitBreaker('test-service', {
        failureThreshold: 1,
        resetTimeoutMs: 50, // Very short timeout for testing
        monitoringWindowMs: 60000,
      });

      const operation = jest.fn().mockRejectedValue(new Error('Failure'));

      // Trigger circuit to open
      await expect(cb.execute(operation)).rejects.toThrow();
      expect(cb.getState()).toBe('OPEN');

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Next call should transition to HALF_OPEN and execute operation
      const successOperation = jest.fn().mockResolvedValue('success');
      const result = await cb.execute(successOperation);

      expect(result).toBe('success');
      expect(successOperation).toHaveBeenCalledTimes(1);
    });

    test('should close after successful operations in HALF_OPEN', async () => {
      const cb = new CircuitBreaker('test-service', {
        failureThreshold: 1,
        resetTimeoutMs: 50,
        monitoringWindowMs: 60000,
      });

      // Open circuit
      const failingOp = jest.fn().mockRejectedValue(new Error('Failure'));
      await expect(cb.execute(failingOp)).rejects.toThrow();
      expect(cb.getState()).toBe('OPEN');

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Execute successful operations
      const successOp = jest.fn().mockResolvedValue('success');
      await cb.execute(successOp);
      await cb.execute(successOp);
      await cb.execute(successOp);

      expect(cb.getState()).toBe('CLOSED');
    });
  });

  describe('PerformanceMonitor', () => {
    test('should monitor operation performance', async () => {
      const operation = jest.fn().mockResolvedValue('result');

      const result = await PerformanceMonitor.monitor('test-op', operation);

      expect(result).toBe('result');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(logger.performance).toHaveBeenCalled();
    });

    test('should handle operation errors', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(PerformanceMonitor.monitor('test-op', operation)).rejects.toThrow(
        'Operation failed',
      );

      expect(logger.error).toHaveBeenCalled();
    });

    test('should collect performance statistics', async () => {
      const fastOp = jest.fn().mockResolvedValue('fast');
      const slowOp = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve('slow'), 50)));

      await PerformanceMonitor.monitor('test-op', fastOp);
      await PerformanceMonitor.monitor('test-op', slowOp);

      const stats = PerformanceMonitor.getStats('test-op') as Record<string, unknown>;

      expect(stats.operation).toBe('test-op');
      expect(stats.count).toBe(2);
      expect(typeof stats.avg).toBe('number');
      expect(typeof stats.min).toBe('number');
      expect(typeof stats.max).toBe('number');
    });

    test('should return all stats when no operation specified', async () => {
      const operation = jest.fn().mockResolvedValue('result');

      await PerformanceMonitor.monitor('op1', operation);
      await PerformanceMonitor.monitor('op2', operation);

      const allStats = PerformanceMonitor.getStats() as Record<string, unknown>;

      expect(allStats).toHaveProperty('op1');
      expect(allStats).toHaveProperty('op2');
    });
  });

  describe('HealthChecker', () => {
    test('should register and run health checks', async () => {
      const healthyCheck = jest.fn().mockResolvedValue(true);
      const unhealthyCheck = jest.fn().mockResolvedValue(false);

      HealthChecker.register('service1', healthyCheck);
      HealthChecker.register('service2', unhealthyCheck);

      const results = (await HealthChecker.checkAll()) as Record<string, unknown>;
      const checks = results.checks as Record<string, Record<string, unknown>>;

      expect(results.status).toBe('unhealthy');
      expect(checks.service1.status).toBe('healthy');
      expect(checks.service2.status).toBe('unhealthy');
      expect(healthyCheck).toHaveBeenCalled();
      expect(unhealthyCheck).toHaveBeenCalled();
    });

    test('should handle health check errors', async () => {
      const errorCheck = jest.fn().mockRejectedValue(new Error('Check failed'));

      HealthChecker.register('error-service', errorCheck);

      const results = (await HealthChecker.checkAll()) as Record<string, unknown>;
      const checks = results.checks as Record<string, Record<string, unknown>>;

      expect(results.status).toBe('unhealthy');
      expect(checks['error-service'].status).toBe('error');
      expect(checks['error-service'].error).toBe('Error: Check failed');
    });

    test('should report overall healthy status when all checks pass', async () => {
      const check1 = jest.fn().mockResolvedValue(true);
      const check2 = jest.fn().mockResolvedValue(true);

      HealthChecker.register('service-a', check1);
      HealthChecker.register('service-b', check2);

      const results = (await HealthChecker.checkAll()) as Record<string, unknown>;

      expect(results.status).toBe('healthy');
    });
  });

  describe('Integration Tests', () => {
    test('should work together in realistic scenario', async () => {
      const cb = new CircuitBreaker('api-service', {
        failureThreshold: 3, // Higher threshold to prevent premature opening
        resetTimeoutMs: 100,
        monitoringWindowMs: 60000,
      });

      let callCount = 0;
      const unreliableOperation = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new APIError('Service temporarily unavailable', 503, true));
        }
        return Promise.resolve('success');
      });

      // Should retry and eventually succeed
      const result = await PerformanceMonitor.monitor('api-call', async () => {
        return RetryUtility.withRetry(
          async () => {
            return cb.execute(unreliableOperation);
          },
          { maxAttempts: 3 },
        );
      });

      expect(result).toBe('success');
      expect(callCount).toBe(3);
      expect(logger.performance).toHaveBeenCalled();
    });

    test('should handle cascading failures properly', async () => {
      const cb = new CircuitBreaker('failing-service', {
        failureThreshold: 1,
        resetTimeoutMs: 1000,
        monitoringWindowMs: 60000,
      });

      const alwaysFailingOp = jest.fn().mockRejectedValue(new Error('Service down'));

      // First call should fail and open circuit
      await expect(
        RetryUtility.withRetry(() => cb.execute(alwaysFailingOp), { maxAttempts: 1 }),
      ).rejects.toThrow();

      expect(cb.getState()).toBe('OPEN');

      // Subsequent calls should fail fast without retry
      await expect(cb.execute(alwaysFailingOp)).rejects.toThrow(
        "Circuit breaker 'failing-service' is OPEN",
      );

      // Should only call the operation once (circuit prevents second call)
      expect(alwaysFailingOp).toHaveBeenCalledTimes(1);
    });
  });
});
