/**
 * Cache Policies Configuration
 * Intelligent caching policies with adaptive strategies and system load awareness
 */

import { Logger } from '../utils/logger.js';
import type { CacheableContent } from '../utils/cache-key-generator.js';

export interface CachePolicy {
  name: string;
  description: string;
  ttl: number; // Time to live in milliseconds
  priority: number; // Higher priority = less likely to be evicted
  conditions: PolicyCondition[];
  adaptive: boolean;
}

export interface PolicyCondition {
  type: 'content-type' | 'content-size' | 'user-context' | 'system-load' | 'time-of-day';
  operator: 'equals' | 'contains' | 'greater-than' | 'less-than' | 'between';
  value: unknown;
  weight: number; // Influence on policy selection (0-1)
}

export interface SystemLoadMetrics {
  cpuUsage: number; // 0-100
  memoryUsage: number; // 0-100
  cacheHitRate: number; // 0-1
  requestVolume: number; // requests per minute
}

export interface AdaptiveTTLConfig {
  baseTTL: number;
  minTTL: number;
  maxTTL: number;
  loadFactors: {
    highLoad: number; // TTL multiplier when system load is high
    lowLoad: number; // TTL multiplier when system load is low
  };
}

/**
 * Manages intelligent caching policies with adaptive strategies
 */
export class CachePolicyManager {
  private policies: Map<string, CachePolicy> = new Map();
  private adaptiveTTLConfig: AdaptiveTTLConfig;
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
    this.adaptiveTTLConfig = {
      baseTTL: 300000, // 5 minutes
      minTTL: 60000,   // 1 minute
      maxTTL: 3600000, // 1 hour
      loadFactors: {
        highLoad: 0.5,  // Reduce TTL when load is high
        lowLoad: 1.5    // Increase TTL when load is low
      }
    };
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default caching policies
   */
  private initializeDefaultPolicies(): void {
    // High priority for text responses
    this.addPolicy({
      name: 'text-response',
      description: 'Standard text responses from AI model',
      ttl: 600000, // 10 minutes
      priority: 8,
      adaptive: true,
      conditions: [
        {
          type: 'content-type',
          operator: 'equals',
          value: 'text',
          weight: 1.0
        },
        {
          type: 'content-size',
          operator: 'less-than',
          value: 10000, // Less than 10KB
          weight: 0.7
        }
      ]
    });

    // Medium priority for multimodal responses
    this.addPolicy({
      name: 'multimodal-response',
      description: 'Multimodal responses with images',
      ttl: 1200000, // 20 minutes
      priority: 6,
      adaptive: true,
      conditions: [
        {
          type: 'content-type',
          operator: 'equals',
          value: 'multimodal',
          weight: 1.0
        }
      ]
    });

    // Low priority for large content
    this.addPolicy({
      name: 'large-content',
      description: 'Large content responses',
      ttl: 300000, // 5 minutes
      priority: 4,
      adaptive: true,
      conditions: [
        {
          type: 'content-size',
          operator: 'greater-than',
          value: 50000, // Greater than 50KB
          weight: 0.9
        }
      ]
    });

    // High priority for frequently accessed content
    this.addPolicy({
      name: 'popular-content',
      description: 'Frequently requested content',
      ttl: 1800000, // 30 minutes
      priority: 9,
      adaptive: false, // Keep stable for popular content
      conditions: [
        {
          type: 'user-context',
          operator: 'contains',
          value: 'frequent-user',
          weight: 0.8
        }
      ]
    });

    // System load aware policy
    this.addPolicy({
      name: 'load-adaptive',
      description: 'Adapts based on system load',
      ttl: 600000, // 10 minutes base
      priority: 7,
      adaptive: true,
      conditions: [
        {
          type: 'system-load',
          operator: 'greater-than',
          value: 70, // High CPU usage
          weight: 0.9
        }
      ]
    });

    this.logger.info('Default cache policies initialized', {
      operation: 'cache-policy-init',
      metadata: {
        policyCount: this.policies.size,
        policies: Array.from(this.policies.keys())
      }
    });
  }

  /**
   * Add a new cache policy
   */
  addPolicy(policy: CachePolicy): void {
    this.policies.set(policy.name, policy);
    
    this.logger.debug('Cache policy added', {
      operation: 'cache-policy-add',
      metadata: {
        name: policy.name,
        ttl: policy.ttl,
        priority: policy.priority,
        adaptive: policy.adaptive
      }
    });
  }

  /**
   * Remove a cache policy
   */
  removePolicy(name: string): boolean {
    const removed = this.policies.delete(name);
    
    if (removed) {
      this.logger.debug('Cache policy removed', {
        operation: 'cache-policy-remove',
        metadata: { name }
      });
    }
    
    return removed;
  }

  /**
   * Evaluate and select the best policy for content
   */
  evaluatePolicy(
    content: CacheableContent,
    context?: Record<string, unknown>,
    systemLoad?: SystemLoadMetrics
  ): CachePolicy {
    let bestPolicy: CachePolicy | null = null;
    let highestScore = -1;

    for (const policy of this.policies.values()) {
      const score = this.calculatePolicyScore(policy, content, context, systemLoad);
      
      if (score > highestScore) {
        highestScore = score;
        bestPolicy = policy;
      }
    }

    // Fallback to default policy if no match
    if (!bestPolicy) {
      bestPolicy = this.getDefaultPolicy();
    }

    // Apply adaptive TTL if enabled
    if (bestPolicy.adaptive && systemLoad) {
      bestPolicy = this.applyAdaptiveTTL(bestPolicy, systemLoad);
    }

    this.logger.debug('Cache policy evaluated', {
      operation: 'cache-policy-evaluation',
      metadata: {
        selectedPolicy: bestPolicy.name,
        score: highestScore,
        adaptiveTTL: bestPolicy.adaptive && systemLoad ? bestPolicy.ttl : null
      }
    });

    return bestPolicy;
  }

  /**
   * Calculate policy score based on conditions
   */
  private calculatePolicyScore(
    policy: CachePolicy,
    content: CacheableContent,
    context?: Record<string, unknown>,
    systemLoad?: SystemLoadMetrics
  ): number {
    let totalScore = 0;
    let totalWeight = 0;

    for (const condition of policy.conditions) {
      const conditionScore = this.evaluateCondition(condition, content, context, systemLoad);
      totalScore += conditionScore * condition.weight;
      totalWeight += condition.weight;
    }

    // Normalize score (0-1)
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Evaluate individual policy condition
   */
  private evaluateCondition(
    condition: PolicyCondition,
    content: CacheableContent,
    context?: Record<string, unknown>,
    systemLoad?: SystemLoadMetrics
  ): number {
    let actualValue: unknown;

    // Get actual value based on condition type
    switch (condition.type) {
      case 'content-type':
        actualValue = content.type;
        break;
      case 'content-size':
        actualValue = JSON.stringify(content).length;
        break;
      case 'user-context':
        actualValue = context;
        break;
      case 'system-load':
        actualValue = systemLoad?.cpuUsage || 0;
        break;
      case 'time-of-day':
        actualValue = new Date().getHours();
        break;
      default:
        return 0;
    }

    // Evaluate condition based on operator
    return this.evaluateOperator(condition.operator, actualValue, condition.value) ? 1 : 0;
  }

  /**
   * Evaluate operator condition
   */
  private evaluateOperator(
    operator: PolicyCondition['operator'],
    actual: unknown,
    expected: unknown
  ): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'contains':
        if (typeof actual === 'string' && typeof expected === 'string') {
          return actual.includes(expected);
        }
        if (actual && typeof actual === 'object' && typeof expected === 'string') {
          return JSON.stringify(actual).includes(expected);
        }
        return false;
      case 'greater-than':
        return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
      case 'less-than':
        return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
      case 'between':
        if (typeof actual === 'number' && Array.isArray(expected) && expected.length === 2) {
          return actual >= expected[0] && actual <= expected[1];
        }
        return false;
      default:
        return false;
    }
  }

  /**
   * Apply adaptive TTL based on system load
   */
  private applyAdaptiveTTL(policy: CachePolicy, systemLoad: SystemLoadMetrics): CachePolicy {
    const loadFactor = this.calculateLoadFactor(systemLoad);
    const adaptedTTL = Math.max(
      this.adaptiveTTLConfig.minTTL,
      Math.min(
        this.adaptiveTTLConfig.maxTTL,
        policy.ttl * loadFactor
      )
    );

    return {
      ...policy,
      ttl: adaptedTTL
    };
  }

  /**
   * Calculate load factor for TTL adaptation
   */
  private calculateLoadFactor(systemLoad: SystemLoadMetrics): number {
    const { cpuUsage, memoryUsage, cacheHitRate } = systemLoad;
    const avgSystemLoad = (cpuUsage + memoryUsage) / 2;

    if (avgSystemLoad > 80) {
      // High load: reduce TTL to free up memory faster
      return this.adaptiveTTLConfig.loadFactors.highLoad;
    } else if (avgSystemLoad < 30 && cacheHitRate > 0.7) {
      // Low load and good hit rate: increase TTL to cache longer
      return this.adaptiveTTLConfig.loadFactors.lowLoad;
    }

    // Normal load: use base TTL
    return 1.0;
  }

  /**
   * Get default fallback policy
   */
  private getDefaultPolicy(): CachePolicy {
    return {
      name: 'default',
      description: 'Default fallback policy',
      ttl: this.adaptiveTTLConfig.baseTTL,
      priority: 5,
      adaptive: true,
      conditions: []
    };
  }

  /**
   * Update adaptive TTL configuration
   */
  updateAdaptiveTTLConfig(config: Partial<AdaptiveTTLConfig>): void {
    this.adaptiveTTLConfig = {
      ...this.adaptiveTTLConfig,
      ...config
    };

    this.logger.info('Adaptive TTL configuration updated', {
      operation: 'cache-policy-config',
      metadata: { config: this.adaptiveTTLConfig }
    });
  }

  /**
   * Get all policies
   */
  getAllPolicies(): CachePolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get policy by name
   */
  getPolicy(name: string): CachePolicy | undefined {
    return this.policies.get(name);
  }

  /**
   * Create custom policy for specific use case
   */
  createCustomPolicy(
    name: string,
    contentType: 'text' | 'multimodal',
    ttlMinutes: number,
    priority: number = 5
  ): CachePolicy {
    const policy: CachePolicy = {
      name,
      description: `Custom policy for ${contentType} content`,
      ttl: ttlMinutes * 60 * 1000,
      priority,
      adaptive: true,
      conditions: [
        {
          type: 'content-type',
          operator: 'equals',
          value: contentType,
          weight: 1.0
        }
      ]
    };

    this.addPolicy(policy);
    return policy;
  }

  /**
   * Analyze policy effectiveness
   */
  analyzePolicyEffectiveness(
    policyName: string,
    hitRate: number,
    avgResponseTime: number
  ): {
    effectiveness: number;
    recommendations: string[];
  } {
    const policy = this.getPolicy(policyName);
    if (!policy) {
      return {
        effectiveness: 0,
        recommendations: ['Policy not found']
      };
    }

    const effectiveness = (hitRate * 0.7) + ((1 / Math.max(avgResponseTime, 1)) * 0.3);
    const recommendations: string[] = [];

    if (hitRate < 0.5) {
      recommendations.push('Consider increasing TTL for better hit rates');
    }
    if (avgResponseTime > 100) {
      recommendations.push('Response time is high, check cache performance');
    }
    if (effectiveness < 0.6) {
      recommendations.push('Policy may need adjustment or replacement');
    }

    return { effectiveness, recommendations };
  }
}

// Default export
export default CachePolicyManager;
