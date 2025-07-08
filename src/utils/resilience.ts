/**
 * Resilience utilities for robust error handling and retry logic
 */

import { logger } from './logger.js';
import { ErrorHandler } from './errors.js';

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBackoff: boolean;
  retryCondition?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  monitoringWindowMs: number;
}

/**
 * Retry utility with exponential backoff and configurable conditions
 */
export class RetryUtility {
  private static readonly DEFAULT_OPTIONS: RetryOptions = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 16000,
    exponentialBackoff: true,
    retryCondition: ErrorHandler.isRetryable
  };

  /**
   * Execute operation with retry logic
   */
  public static async withRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const config = { ...RetryUtility.DEFAULT_OPTIONS, ...options };
    let lastError: unknown;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          logger.info(`Operation succeeded after ${attempt} attempts`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Check if we should retry
        const shouldRetry = attempt < config.maxAttempts && 
                           (config.retryCondition ? config.retryCondition(error) : true);
        
        if (!shouldRetry) {
          logger.error(`Operation failed after ${attempt} attempts`, error);
          throw error;
        }

        // Calculate delay
        const delay = config.exponentialBackoff
          ? Math.min(config.baseDelayMs * Math.pow(2, attempt - 1), config.maxDelayMs)
          : config.baseDelayMs;

        logger.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempt}/${config.maxAttempts})`, { 
          metadata: { attempt, delay, error: String(error) }
        });

        // Notify retry callback
        if (config.onRetry) {
          config.onRetry(attempt, error);
        }

        // Wait before retry
        await RetryUtility.delay(delay);
      }
    }

    throw lastError;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Circuit breaker pattern for external service protection
 */
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions
  ) {}

  /**
   * Execute operation through circuit breaker
   */
  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.options.resetTimeoutMs) {
        throw new Error(`Circuit breaker '${this.name}' is OPEN`);
      } else {
        // Transition to half-open for testing
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        logger.info(`Circuit breaker '${this.name}' transitioning to HALF_OPEN`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      
      // Require some successful calls before closing
      if (this.successCount >= 3) {
        this.state = 'CLOSED';
        logger.info(`Circuit breaker '${this.name}' CLOSED after successful recovery`);
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN' || this.failures >= this.options.failureThreshold) {
      this.state = 'OPEN';
      logger.warn(`Circuit breaker '${this.name}' OPENED after ${this.failures} failures`);
    }
  }

  public getState(): string {
    return this.state;
  }

  public getMetrics(): object {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount
    };
  }
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private static readonly metrics = new Map<string, number[]>();

  /**
   * Clear all performance metrics (useful for testing)
   */
  public static clearMetrics(): void {
    PerformanceMonitor.metrics.clear();
  }

  /**
   * Execute operation with performance monitoring
   */
  public  static async monitor<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: object
  ): Promise<T> {
    console.log('[DEBUG] PerformanceMonitor.monitor: entered');
    const startTime = Date.now();
    
    try {
      console.log('[DEBUG] PerformanceMonitor.monitor: before await fn()');
      const result = await fn();
      console.log('[DEBUG] PerformanceMonitor.monitor: after await fn()', result);
      const duration = Date.now() - startTime;
      
      PerformanceMonitor.recordMetric(operation, duration);
      try {
        logger.performance(operation, duration, context ? { metadata: { ...context } } : undefined);
      } catch (logError) {
        if (process.env.NODE_ENV !== 'test') {
          console.warn('Logger error in PerformanceMonitor:', logError);
        }
      }
      console.log('[DEBUG] PerformanceMonitor.monitor: returning result', result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      PerformanceMonitor.recordMetric(`${operation}_error`, duration);
      try {
        logger.error(`Operation '${operation}' failed after ${duration}ms`, error, {
          operation: 'operation-error',
          metadata: { 
            operation,
            duration,
            ...(context || {})
          }
        });
      } catch (logError) {
        if (process.env.NODE_ENV !== 'test') {
          console.warn('Logger error in PerformanceMonitor:', logError);
        }
      }
      throw error;
    }
  }

  /**
   * Record performance metric
   */
  private static recordMetric(operation: string, duration: number): void {
    if (!PerformanceMonitor.metrics.has(operation)) {
      PerformanceMonitor.metrics.set(operation, []);
    }
    
    const metrics = PerformanceMonitor.metrics.get(operation)!;
    metrics.push(duration);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  /**
   * Get performance statistics
   */
  public static getStats(operation?: string): object {
    if (operation) {
      const metrics = PerformanceMonitor.metrics.get(operation) || [];
      return PerformanceMonitor.calculateStats(operation, metrics);
    }

    const allStats: Record<string, object> = {};
    for (const [op, metrics] of PerformanceMonitor.metrics.entries()) {
      allStats[op] = PerformanceMonitor.calculateStats(op, metrics);
    }
    
    return allStats;
  }

  private static calculateStats(operation: string, metrics: number[]): object {
    if (metrics.length === 0) {
      return { operation, count: 0 };
    }

    const sorted = [...metrics].sort((a, b) => a - b);
    const count = metrics.length;
    const sum = metrics.reduce((a, b) => a + b, 0);
    
    return {
      operation,
      count,
      avg: Math.round(sum / count),
      min: sorted[0],
      max: sorted[count - 1],
      p50: sorted[Math.floor(count * 0.5)],
      p90: sorted[Math.floor(count * 0.9)],
      p99: sorted[Math.floor(count * 0.99)]
    };
  }
}

/**
 * Health check utility for system monitoring
 */
export class HealthChecker {
  private static checks = new Map<string, () => Promise<boolean>>();

  /**
   * Clear all registered health checks (useful for testing)
   */
  public static clearChecks(): void {
    HealthChecker.checks.clear();
  }

  /**
   * Register health check
   */
  public static register(name: string, check: () => Promise<boolean>): void {
    HealthChecker.checks.set(name, check);
  }

  /**
   * Run all health checks
   */
  public static async checkAll(): Promise<object> {
    const results: Record<string, { status: string; timestamp: string; error?: string }> = {};
    
    for (const [name, check] of HealthChecker.checks.entries()) {
      try {
        const healthy = await check();
        results[name] = {
          status: healthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        results[name] = {
          status: 'error',
          timestamp: new Date().toISOString(),
          error: String(error)
        };
      }
    }

    return {
      status: Object.values(results).every(r => r.status === 'healthy') ? 'healthy' : 'unhealthy',
      checks: results,
      timestamp: new Date().toISOString()
    };
  }
}
