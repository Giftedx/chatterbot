/**
 * Adaptive Rate Limiting and Connection Management
 * Provides intelligent rate limiting with real-time adaptation,
 * connection pooling, and performance-based throttling optimization.
 */

// import { logger } from '../utils/logger.js';
import { PerformanceMonitor } from '../utils/resilience.js';

export interface RateLimitConfiguration {
  global: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    burstLimit: number;
    adaptiveThrottling: boolean;
  };
  perUser: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    burstLimit: number;
  };
  adaptive: {
    performanceThreshold: number; // Response time threshold in ms
    successRateThreshold: number; // Success rate threshold (0-1)
    adaptationFactor: number; // How aggressively to adapt (0-1)
    recoveryFactor: number; // How quickly to recover (0-1)
  };
  connectionPool: {
    maxConnections: number;
    connectionTimeout: number;
    idleTimeout: number;
    keepAliveInterval: number;
  };
}

export interface RateLimitWindow {
  timestamp: number;
  requests: number;
  tokens: number;
  errors: number;
  avgResponseTime: number;
  successRate: number;
}

export interface ConnectionMetrics {
  activeConnections: number;
  totalConnectionsCreated: number;
  connectionErrors: number;
  avgConnectionTime: number;
  poolUtilization: number;
}

export interface AdaptiveMetrics {
  currentLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    burstLimit: number;
  };
  adaptationHistory: Array<{
    timestamp: number;
    reason: string;
    oldLimits: Record<string, unknown>;
    newLimits: Record<string, unknown>;
    performanceMetrics: {
      avgResponseTime: number;
      successRate: number;
      throughput: number;
    };
  }>;
  performanceState: 'optimal' | 'degraded' | 'critical' | 'recovering';
}

/**
 * Advanced adaptive rate limiting with intelligent performance optimization
 */
export class AdaptiveRateLimiter {
  private readonly defaultConfig: RateLimitConfiguration = {
    global: {
      requestsPerMinute: 1500, // Gemini free tier
      tokensPerMinute: 1000000,
      burstLimit: 50,
      adaptiveThrottling: true
    },
    perUser: {
      requestsPerMinute: 100,
      tokensPerMinute: 50000,
      burstLimit: 10
    },
    adaptive: {
      performanceThreshold: 2000, // 2 seconds
      successRateThreshold: 0.95, // 95%
      adaptationFactor: 0.2, // 20% adjustment
      recoveryFactor: 0.1 // 10% recovery rate
    },
    connectionPool: {
      maxConnections: 20,
      connectionTimeout: 10000,
      idleTimeout: 300000, // 5 minutes
      keepAliveInterval: 60000 // 1 minute
    }
  };

  private globalWindows = new Map<number, RateLimitWindow>();
  private userWindows = new Map<string, Map<number, RateLimitWindow>>();
  private currentLimits: RateLimitConfiguration['global'];
  private connectionPool = new Map<string, Connection>();
  private connectionMetrics: ConnectionMetrics = {
    activeConnections: 0,
    totalConnectionsCreated: 0,
    connectionErrors: 0,
    avgConnectionTime: 0,
    poolUtilization: 0
  };

  private adaptiveMetrics: AdaptiveMetrics;
  private performanceHistory: Array<{ timestamp: number; responseTime: number; success: boolean }> = [];
  private lastAdaptation = Date.now();

  constructor(private config: Partial<RateLimitConfiguration> = {}) {
    this.config = this.mergeConfig(this.defaultConfig, config);
    this.currentLimits = { ...this.config.global } as { requestsPerMinute: number; tokensPerMinute: number; burstLimit: number; adaptiveThrottling: boolean; };
    
    this.adaptiveMetrics = {
      currentLimits: { ...this.currentLimits },
      adaptationHistory: [],
      performanceState: 'optimal'
    };

    // Start background tasks
    this.startWindowCleanup();
    this.startConnectionMaintenance();
    this.startAdaptiveOptimization();

    // logger.info('AdaptiveRateLimiter initialized', {
    //   operation: 'rate-limiter-init',
    //   metadata: {
    //     globalLimits: this.currentLimits,
    //     perUserLimits: this.config.perUser,
    //     adaptiveEnabled: this.config.global?.adaptiveThrottling,
    //     connectionPoolSize: this.config.connectionPool?.maxConnections
    //   }
    // });
  }

  /**
   * Check if request is allowed under current rate limits
   */
  async checkRateLimit(
  userId: string,
  estimatedTokens: number = 1000,
  requestType: 'standard' | 'burst' = 'standard'
): Promise<{ allowed: boolean; retryAfter?: number; reason?: string }> {
  const innerCheck = async (): Promise<{ allowed: boolean; retryAfter?: number; reason?: string }> => {
    // DEBUG: Rate limit monitor wrapper executed
    console.log('[DEBUG] AdaptiveRateLimiter.checkRateLimit: innerCheck executed');
    const currentMinute = Math.floor(Date.now() / 60000);

    // Check global limits
    const globalCheck = await this.checkGlobalLimit(currentMinute, estimatedTokens, requestType);
    console.log('[DEBUG] AdaptiveRateLimiter.checkRateLimit: globalCheck result', globalCheck);
    if (!globalCheck.allowed) {
      console.log('[DEBUG] AdaptiveRateLimiter.checkRateLimit: early return - globalCheck not allowed');
      return globalCheck;
    }

    // Check user-specific limits
    const userCheck = await this.checkUserLimit(userId, currentMinute, estimatedTokens, requestType);
    console.log('[DEBUG] AdaptiveRateLimiter.checkRateLimit: userCheck result', userCheck);
    if (!userCheck.allowed) {
      console.log('[DEBUG] AdaptiveRateLimiter.checkRateLimit: early return - userCheck not allowed');
      return userCheck;
    }

    // Check connection availability
    const connectionCheck = await this.checkConnectionLimit();
    console.log('[DEBUG] AdaptiveRateLimiter.checkRateLimit: connectionCheck result', connectionCheck);
    if (!connectionCheck.allowed) {
      console.log('[DEBUG] AdaptiveRateLimiter.checkRateLimit: early return - connectionCheck not allowed');
      return connectionCheck;
    }

    // All checks passed
    this.recordRequestAttempt(userId, currentMinute, estimatedTokens, true);
    console.log('[DEBUG] AdaptiveRateLimiter.checkRateLimit: all checks passed, returning allowed');
    return { allowed: true };
  };

  // Decide which monitor function to use
  const monitorFn = (PerformanceMonitor && typeof PerformanceMonitor.monitor === 'function')
    ? PerformanceMonitor.monitor.bind(PerformanceMonitor)
    : async (_op: string, fn: () => Promise<unknown>) => fn();

  let result: unknown;
  try {
    result = await monitorFn('rate-limit-check', innerCheck);
  } catch (err) {
    // If monitor threw, log and fall back to direct execution
    console.warn('[WARN] AdaptiveRateLimiter.checkRateLimit: monitor threw, falling back', err);
  }

  if (result === undefined) {
    console.warn('[WARN] AdaptiveRateLimiter.checkRateLimit: monitor returned undefined, using fallback');
    result = await innerCheck();
  }

  return result as { allowed: boolean; retryAfter?: number; reason?: string };
}

      

  /**
   * Check global rate limits with adaptive adjustments
   */
  private async checkGlobalLimit(
    minute: number,
    tokens: number,
    requestType: string
  ): Promise<{ allowed: boolean; retryAfter?: number; reason?: string }> {
    
    const window = this.globalWindows.get(minute) || this.createNewWindow(minute);
    
    // Apply adaptive limits
    const effectiveLimits = this.getEffectiveLimits();
    
    // Check burst limit for immediate requests
    if (requestType === 'burst' && window.requests >= effectiveLimits.burstLimit) {
      return {
        allowed: false,
        retryAfter: 60,
        reason: 'burst limit exceeded'
      };
    }

    // Check minute-based limits
    if (window.requests >= effectiveLimits.requestsPerMinute) {
      return {
        allowed: false,
        retryAfter: 60 - (Date.now() % 60000) / 1000,
        reason: 'Global request rate limit exceeded'
      };
    }

    if (window.tokens + tokens >= effectiveLimits.tokensPerMinute) {
      return {
        allowed: false,
        retryAfter: 60 - (Date.now() % 60000) / 1000,
        reason: 'Global token rate limit exceeded'
      };
    }

    return { allowed: true };
  }

  /**
   * Check user-specific rate limits
   */
  private async checkUserLimit(
    userId: string,
    minute: number,
    tokens: number,
    requestType: string
  ): Promise<{ allowed: boolean; retryAfter?: number; reason?: string }> {
    
    let userWindows = this.userWindows.get(userId);
    if (!userWindows) {
      userWindows = new Map();
      this.userWindows.set(userId, userWindows);
    }

    const window = userWindows.get(minute) || this.createNewWindow(minute);
    userWindows.set(minute, window);

    // Check user limits
    if (window.requests >= (this.config.perUser?.requestsPerMinute ?? 100)) {
      return {
        allowed: false,
        retryAfter: 60 - (Date.now() % 60000) / 1000,
        reason: 'User request rate limit exceeded'
      };
    }

    if (window.tokens + tokens >= (this.config.perUser?.tokensPerMinute ?? 10000)) {
      return {
        allowed: false,
        retryAfter: 60 - (Date.now() % 60000) / 1000,
        reason: 'User token rate limit exceeded'
      };
    }

    if (requestType === 'burst' && window.requests >= (this.config.perUser?.burstLimit ?? 10)) {
      return {
        allowed: false,
        retryAfter: 10, // Shorter retry for user burst limits
        reason: 'User burst limit exceeded'
      };
    }

    return { allowed: true };
  }

  /**
   * Check connection pool availability
   */
  private async checkConnectionLimit(): Promise<{ allowed: boolean; retryAfter?: number; reason?: string }> {
    if (this.connectionMetrics.activeConnections >= (this.config.connectionPool?.maxConnections ?? 100)) {
      return {
        allowed: false,
        retryAfter: 5, // Short retry for connection limits
        reason: 'Connection pool exhausted'
      };
    }

    return { allowed: true };
  }

  /**
   * Record request attempt and update metrics
   */
  private recordRequestAttempt(
    userId: string,
    minute: number,
    tokens: number,
    allowed: boolean
  ): void {
    if (allowed) {
      // Update global window
      const globalWindow = this.globalWindows.get(minute) || this.createNewWindow(minute);
      globalWindow.requests++;
      globalWindow.tokens += tokens;
      this.globalWindows.set(minute, globalWindow);

      // Update user window
      const userWindows = this.userWindows.get(userId) || new Map();
      const userWindow = userWindows.get(minute) || this.createNewWindow(minute);
      userWindow.requests++;
      userWindow.tokens += tokens;
      userWindows.set(minute, userWindow);
      this.userWindows.set(userId, userWindows);
    }
  }

  /**
   * Record request completion for adaptive optimization
   */
  recordRequestCompletion(
    userId: string,
    responseTime: number,
    success: boolean,
    tokens: number = 1000
  ): void {
    const currentMinute = Math.floor(Date.now() / 60000);
    
    // Reference tokens param to satisfy linting
    void tokens;

    // Update performance history
    this.performanceHistory.push({
      timestamp: Date.now(),
      responseTime,
      success
    });

    // Keep only recent history
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory.shift();
    }

    // Update window metrics
    this.updateWindowMetrics(currentMinute, responseTime, success);
    this.updateUserWindowMetrics(userId, currentMinute, responseTime, success);

    // Trigger adaptive optimization if needed
    if (this.config.global?.adaptiveThrottling) {
      this.triggerAdaptiveOptimization();
    }
  }

  /**
   * Update window metrics with performance data
   */
  private updateWindowMetrics(minute: number, responseTime: number, success: boolean): void {
    const window = this.globalWindows.get(minute) || this.createNewWindow(minute);
    
    // Update running averages
    const totalRequests = Math.max(window.requests, 1);
    window.avgResponseTime = (window.avgResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
    window.successRate = (window.successRate * (totalRequests - 1) + (success ? 1 : 0)) / totalRequests;
    
    if (!success) {
      window.errors++;
    }

    this.globalWindows.set(minute, window);
  }

  /**
   * Update user-specific window metrics
   */
  private updateUserWindowMetrics(userId: string, minute: number, responseTime: number, success: boolean): void {
    const userWindows = this.userWindows.get(userId);
    if (!userWindows) return;

    const window = userWindows.get(minute);
    if (!window) return;

    const totalRequests = Math.max(window.requests, 1);
    window.avgResponseTime = (window.avgResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
    window.successRate = (window.successRate * (totalRequests - 1) + (success ? 1 : 0)) / totalRequests;
    
    if (!success) {
      window.errors++;
    }
  }

  /**
   * Get effective limits with adaptive adjustments
   */
  private getEffectiveLimits(): RateLimitConfiguration['global'] {
    return this.currentLimits;
  }

  /**
   * Trigger adaptive optimization based on performance
   */
  private triggerAdaptiveOptimization(): void {
    const now = Date.now();
    
    // Don't adapt too frequently
    if (now - this.lastAdaptation < 30000) { // 30 seconds minimum
      return;
    }

    const recentPerformance = this.analyzeRecentPerformance();
    const shouldAdapt = this.shouldAdaptLimits(recentPerformance);

    if (shouldAdapt.adapt) {
      this.adaptRateLimits(shouldAdapt.direction, shouldAdapt.reason, recentPerformance);
      this.lastAdaptation = now;
    }
  }

  /**
   * Analyze recent performance for adaptation decisions
   */
  private analyzeRecentPerformance(): {
    avgResponseTime: number;
    successRate: number;
    throughput: number;
    trend: 'improving' | 'degrading' | 'stable';
  } {
    const recentData = this.performanceHistory.slice(-50); // Last 50 requests
    
    if (recentData.length === 0) {
      return {
        avgResponseTime: 0,
        successRate: 1,
        throughput: 0,
        trend: 'stable'
      };
    }

    const avgResponseTime = recentData.reduce((sum, d) => sum + d.responseTime, 0) / recentData.length;
    const successRate = recentData.filter(d => d.success).length / recentData.length;
    const timeSpan = (recentData[recentData.length - 1].timestamp - recentData[0].timestamp) / 1000;
    const throughput = recentData.length / Math.max(timeSpan, 1);

    // Determine trend
    const firstHalf = recentData.slice(0, Math.floor(recentData.length / 2));
    const secondHalf = recentData.slice(Math.floor(recentData.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.responseTime, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.responseTime, 0) / secondHalf.length;
    
    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (secondHalfAvg < firstHalfAvg * 0.9) {
      trend = 'improving';
    } else if (secondHalfAvg > firstHalfAvg * 1.1) {
      trend = 'degrading';
    }

    return { avgResponseTime, successRate, throughput, trend };
  }

  /**
   * Determine if rate limits should be adapted
   */
  private shouldAdaptLimits(performance: { avgResponseTime: number; successRate: number; throughput: number; trend?: 'improving' | 'degrading' | 'stable' }): {
    adapt: boolean;
    direction: 'increase' | 'decrease';
    reason: string;
  } {
    const { avgResponseTime, successRate, trend = 'stable' } = performance;

    // Performance is degraded - decrease limits
    if (avgResponseTime > (this.config.adaptive?.performanceThreshold ?? 2000) ||
        successRate < (this.config.adaptive?.successRateThreshold ?? 0.95)) {
      return {
        adapt: true,
        direction: 'decrease',
        reason: 'Performance degradation detected'
      };
    }

    // Performance is good and improving - can increase limits
    if (avgResponseTime < (this.config.adaptive?.performanceThreshold ?? 2000) * 0.5 &&
        successRate > 0.98 &&
        trend === 'improving') {
      return {
        adapt: true,
        direction: 'increase',
        reason: 'Excellent performance, increasing capacity'
      };
    }

    return { adapt: false, direction: 'increase', reason: 'No adaptation needed' };
  }

  /**
   * Adapt rate limits based on performance analysis
   */
  private adaptRateLimits(
    direction: 'increase' | 'decrease',
    reason: string,
    performance: { avgResponseTime: number; successRate: number; throughput: number }
  ): void {
    const oldLimits = { ...this.currentLimits };
    const factor = direction === 'increase' 
      ? (1 + (this.config.adaptive?.recoveryFactor ?? 0.1))
      : (1 - (this.config.adaptive?.adaptationFactor ?? 0.2));

    // Adapt limits
    // Apply factor and ensure limits never drop below 1
    this.currentLimits.requestsPerMinute = Math.max(1, Math.floor(this.currentLimits.requestsPerMinute * factor));
    this.currentLimits.tokensPerMinute = Math.max(1, Math.floor(this.currentLimits.tokensPerMinute * factor));
    this.currentLimits.burstLimit = Math.max(1, Math.floor(this.currentLimits.burstLimit * factor));

    // Ensure limits don't go below/above reasonable bounds
    this.currentLimits.requestsPerMinute = Math.max(100, Math.min(this.currentLimits.requestsPerMinute, 3000));
    this.currentLimits.tokensPerMinute = Math.max(50000, Math.min(this.currentLimits.tokensPerMinute, 2000000));
    this.currentLimits.burstLimit = Math.max(10, Math.min(this.currentLimits.burstLimit, 100));

    // Update performance state
    this.adaptiveMetrics.performanceState = 
      direction === 'decrease' ? 'degraded' : 
      direction === 'increase' ? 'optimal' : 'recovering';

    // Record adaptation
    this.adaptiveMetrics.adaptationHistory.push({
      timestamp: Date.now(),
      reason,
      oldLimits,
      newLimits: { ...this.currentLimits },
      performanceMetrics: performance
    });

    // Keep adaptation history manageable
    if (this.adaptiveMetrics.adaptationHistory.length > 100) {
      this.adaptiveMetrics.adaptationHistory.shift();
    }

    this.adaptiveMetrics.currentLimits = { ...this.currentLimits };

    // logger.info('Rate limits adapted', {
    //   operation: 'rate-limit-adaptation',
    //   metadata: {
    //     direction,
    //     reason,
    //     oldLimits,
    //     newLimits: this.currentLimits,
    //     performanceState: this.adaptiveMetrics.performanceState,
    //     avgResponseTime: performance.avgResponseTime,
    //     successRate: performance.successRate
    //   }
    // });
  }

  /**
   * Create a new rate limit window
   */
  private createNewWindow(minute: number): RateLimitWindow {
    return {
      timestamp: minute * 60000,
      requests: 0,
      tokens: 0,
      errors: 0,
      avgResponseTime: 0,
      successRate: 1
    };
  }

  /**
   * Start window cleanup process
   */
  private startWindowCleanup(): void {
    setInterval(() => {
      const cutoff = Math.floor(Date.now() / 60000) - 5; // Keep 5 minutes of data
      
      // Cleanup global windows
      for (const minute of this.globalWindows.keys()) {
        if (minute < cutoff) {
          this.globalWindows.delete(minute);
        }
      }
      
      // Cleanup user windows
      for (const [userId, userWindows] of this.userWindows.entries()) {
        for (const minute of userWindows.keys()) {
          if (minute < cutoff) {
            userWindows.delete(minute);
          }
        }
        
        // Remove empty user maps
        if (userWindows.size === 0) {
          this.userWindows.delete(userId);
        }
      }
    }, 60000).unref(); // Run every minute
  }

  /**
   * Start connection pool maintenance
   */
  private startConnectionMaintenance(): void {
    setInterval(() => {
      this.maintainConnectionPool();
    }, this.config.connectionPool?.keepAliveInterval ?? 30000).unref();
  }

  /**
   * Start adaptive optimization monitoring
   */
  private startAdaptiveOptimization(): void {
    if (this.config.global?.adaptiveThrottling) {
      setInterval(() => {
        this.triggerAdaptiveOptimization();
      }, 10000).unref(); // Check every 10 seconds
    }
  }

  /**
   * Maintain connection pool health
   */
  private maintainConnectionPool(): void {
    const now = Date.now();
    const idleTimeout = this.config.connectionPool?.idleTimeout ?? 300000;
    
    for (const [connectionId, connection] of this.connectionPool.entries()) {
      if (now - connection.lastUsed > idleTimeout) {
        connection.close();
        this.connectionPool.delete(connectionId);
        this.connectionMetrics.activeConnections--;
      }
    }
    
    this.connectionMetrics.poolUtilization = 
      this.connectionMetrics.activeConnections / (this.config.connectionPool?.maxConnections ?? 100);
  }

  /**
   * Get current rate limiting metrics
   */
  getMetrics(): {
    currentLimits: RateLimitConfiguration['global'];
    globalUsage: { requests: number; tokens: number; minute: number };
    adaptiveMetrics: AdaptiveMetrics;
    connectionMetrics: ConnectionMetrics;
    recentPerformance: { avgResponseTime: number; successRate: number; throughput: number; trend: string };
  } {
    const currentMinute = Math.floor(Date.now() / 60000);
    const globalWindow = this.globalWindows.get(currentMinute) || this.createNewWindow(currentMinute);
    
    return {
      currentLimits: { ...this.currentLimits },
      globalUsage: {
        requests: globalWindow.requests,
        tokens: globalWindow.tokens,
        minute: currentMinute
      },
      adaptiveMetrics: {
        ...this.adaptiveMetrics,
        currentLimits: { ...this.currentLimits }
      },
      connectionMetrics: { ...this.connectionMetrics },
      recentPerformance: this.analyzeRecentPerformance()
    };
  }
  
  /**
   * Force adaptation trigger for testing purposes
   */
  public forceAdaptationCheck(): void {
    const recentPerformance = this.analyzeRecentPerformance();
    const shouldAdapt = this.shouldAdaptLimits(recentPerformance);

    if (shouldAdapt.adapt) {
      this.adaptRateLimits(shouldAdapt.direction, shouldAdapt.reason, recentPerformance);
      this.lastAdaptation = Date.now();
    }
  }

  /**
   * Deep merge configuration objects
   */
  private mergeConfig(
    defaultConfig: RateLimitConfiguration,
    userConfig: Partial<RateLimitConfiguration>
  ): RateLimitConfiguration {
    return {
      global: { ...defaultConfig.global, ...userConfig.global },
      perUser: { ...defaultConfig.perUser, ...userConfig.perUser },
      adaptive: { ...defaultConfig.adaptive, ...userConfig.adaptive },
      connectionPool: { ...defaultConfig.connectionPool, ...userConfig.connectionPool }
    };
  }
}

/**
 * Connection interface for pool management
 */
interface Connection {
  id: string;
  created: number;
  lastUsed: number;
  requestCount: number;
  close: () => void;
}

export { AdaptiveRateLimiter as default };
