/**
 * Cache Performance Metrics
 * Tracks cache performance, efficiency, and health for optimization
 */

import { Logger } from './logger.js';

export interface CacheSnapshot {
  timestamp: number;
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  size: number;
  memoryUsage: number;
  avgResponseTime: number;
}

export interface PerformanceReport {
  hitRate: number;
  missRate: number;
  efficiency: number;
  avgResponseTime: number;
  memoryUtilization: number;
  evictionRate: number;
  healthScore: number;
  recommendations: string[];
}

export interface MetricsTrend {
  period: string;
  snapshots: CacheSnapshot[];
  summary: {
    avgHitRate: number;
    peakMemoryUsage: number;
    totalOperations: number;
    healthTrend: 'improving' | 'stable' | 'declining';
  };
}

/**
 * Tracks and analyzes cache performance metrics
 */
export class CacheMetrics {
  private snapshots: CacheSnapshot[] = [];
  private currentMetrics: Partial<CacheSnapshot> = {};
  private responseTimeSamples: number[] = [];
  private readonly maxSnapshots = 1000;
  private readonly maxResponseSamples = 100;
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
    this.resetCurrentMetrics();
  }

  /**
   * Record a cache hit
   */
  recordHit(responseTime?: number): void {
    this.currentMetrics.hits = (this.currentMetrics.hits || 0) + 1;
    if (responseTime !== undefined) {
      this.recordResponseTime(responseTime);
    }
  }

  /**
   * Record a cache miss
   */
  recordMiss(responseTime?: number): void {
    this.currentMetrics.misses = (this.currentMetrics.misses || 0) + 1;
    if (responseTime !== undefined) {
      this.recordResponseTime(responseTime);
    }
  }

  /**
   * Record a cache set operation
   */
  recordSet(): void {
    this.currentMetrics.sets = (this.currentMetrics.sets || 0) + 1;
  }

  /**
   * Record a cache delete operation
   */
  recordDelete(): void {
    this.currentMetrics.deletes = (this.currentMetrics.deletes || 0) + 1;
  }

  /**
   * Record a cache eviction
   */
  recordEviction(): void {
    this.currentMetrics.evictions = (this.currentMetrics.evictions || 0) + 1;
  }

  /**
   * Update cache size and memory usage
   */
  updateCacheStats(size: number, memoryUsage: number): void {
    this.currentMetrics.size = size;
    this.currentMetrics.memoryUsage = memoryUsage;
  }

  /**
   * Record response time for performance tracking
   */
  private recordResponseTime(responseTime: number): void {
    this.responseTimeSamples.push(responseTime);
    
    // Keep only recent samples
    if (this.responseTimeSamples.length > this.maxResponseSamples) {
      this.responseTimeSamples.shift();
    }
  }

  /**
   * Calculate average response time from samples
   */
  private calculateAvgResponseTime(): number {
    if (this.responseTimeSamples.length === 0) {
      return 0;
    }
    
    const sum = this.responseTimeSamples.reduce((acc, time) => acc + time, 0);
    return sum / this.responseTimeSamples.length;
  }

  /**
   * Take a snapshot of current metrics
   */
  takeSnapshot(): CacheSnapshot {
    const snapshot: CacheSnapshot = {
      timestamp: Date.now(),
      hits: this.currentMetrics.hits || 0,
      misses: this.currentMetrics.misses || 0,
      sets: this.currentMetrics.sets || 0,
      deletes: this.currentMetrics.deletes || 0,
      evictions: this.currentMetrics.evictions || 0,
      size: this.currentMetrics.size || 0,
      memoryUsage: this.currentMetrics.memoryUsage || 0,
      avgResponseTime: this.calculateAvgResponseTime()
    };

    this.snapshots.push(snapshot);

    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    this.logger.debug('Cache metrics snapshot taken', {
      operation: 'cache-metrics',
      metadata: {
        hitRate: this.calculateHitRate(snapshot),
        size: snapshot.size,
        memoryUsage: snapshot.memoryUsage,
        avgResponseTime: snapshot.avgResponseTime
      }
    });

    return snapshot;
  }

  /**
   * Get current performance report
   */
  getPerformanceReport(): PerformanceReport {
    const snapshot = this.takeSnapshot();
    
    const hitRate = this.calculateHitRate(snapshot);
    const missRate = 1 - hitRate;
    const efficiency = this.calculateEfficiency(snapshot);
    const memoryUtilization = this.calculateMemoryUtilization(snapshot);
    const evictionRate = this.calculateEvictionRate(snapshot);
    const healthScore = this.calculateHealthScore(snapshot);
    const recommendations = this.generateRecommendations(snapshot);

    return {
      hitRate,
      missRate,
      efficiency,
      avgResponseTime: snapshot.avgResponseTime,
      memoryUtilization,
      evictionRate,
      healthScore,
      recommendations
    };
  }

  /**
   * Get metrics trend over time
   */
  getMetricsTrend(periodMinutes: number = 60): MetricsTrend {
    const periodMs = periodMinutes * 60 * 1000;
    const cutoffTime = Date.now() - periodMs;
    
    const periodSnapshots = this.snapshots.filter(
      snapshot => snapshot.timestamp >= cutoffTime
    );

    if (periodSnapshots.length === 0) {
      return {
        period: `${periodMinutes} minutes`,
        snapshots: [],
        summary: {
          avgHitRate: 0,
          peakMemoryUsage: 0,
          totalOperations: 0,
          healthTrend: 'stable'
        }
      };
    }

    const summary = this.calculateTrendSummary(periodSnapshots);

    return {
      period: `${periodMinutes} minutes`,
      snapshots: periodSnapshots,
      summary
    };
  }

  /**
   * Calculate hit rate from snapshot
   */
  private calculateHitRate(snapshot: CacheSnapshot): number {
    const totalRequests = snapshot.hits + snapshot.misses;
    return totalRequests > 0 ? snapshot.hits / totalRequests : 0;
  }

  /**
   * Calculate cache efficiency (hits per operation)
   */
  private calculateEfficiency(snapshot: CacheSnapshot): number {
    const totalOperations = snapshot.hits + snapshot.misses + snapshot.sets + snapshot.deletes;
    return totalOperations > 0 ? snapshot.hits / totalOperations : 0;
  }

  /**
   * Calculate memory utilization (0-1 scale, assuming max 100MB)
   */
  private calculateMemoryUtilization(snapshot: CacheSnapshot): number {
    const maxMemory = 100 * 1024 * 1024; // 100MB
    return Math.min(snapshot.memoryUsage / maxMemory, 1);
  }

  /**
   * Calculate eviction rate
   */
  private calculateEvictionRate(snapshot: CacheSnapshot): number {
    const totalSets = snapshot.sets;
    return totalSets > 0 ? snapshot.evictions / totalSets : 0;
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(snapshot: CacheSnapshot): number {
    const hitRate = this.calculateHitRate(snapshot);
    const efficiency = this.calculateEfficiency(snapshot);
    const memoryUtil = this.calculateMemoryUtilization(snapshot);
    const evictionRate = this.calculateEvictionRate(snapshot);

    // Weighted scoring
    const hitRateScore = hitRate * 40; // 40% weight
    const efficiencyScore = efficiency * 30; // 30% weight
    const memoryScore = (1 - memoryUtil) * 20; // 20% weight (lower is better)
    const evictionScore = (1 - evictionRate) * 10; // 10% weight (lower is better)

    return Math.round(hitRateScore + efficiencyScore + memoryScore + evictionScore);
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(snapshot: CacheSnapshot): string[] {
    const recommendations: string[] = [];
    const hitRate = this.calculateHitRate(snapshot);
    const memoryUtil = this.calculateMemoryUtilization(snapshot);
    const evictionRate = this.calculateEvictionRate(snapshot);

    if (hitRate < 0.5) {
      recommendations.push('Low hit rate detected. Consider adjusting TTL settings or cache size.');
    }

    if (memoryUtil > 0.8) {
      recommendations.push('High memory usage. Consider increasing cache size limit or reducing TTL.');
    }

    if (evictionRate > 0.3) {
      recommendations.push('High eviction rate. Cache size may be too small for workload.');
    }

    if (snapshot.avgResponseTime > 100) {
      recommendations.push('High response times detected. Check cache lookup performance.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Cache performance is optimal.');
    }

    return recommendations;
  }

  /**
   * Calculate trend summary for a period
   */
  private calculateTrendSummary(snapshots: CacheSnapshot[]): MetricsTrend['summary'] {
    if (snapshots.length === 0) {
      return {
        avgHitRate: 0,
        peakMemoryUsage: 0,
        totalOperations: 0,
        healthTrend: 'stable'
      };
    }

    const hitRates = snapshots.map(s => this.calculateHitRate(s));
    const avgHitRate = hitRates.reduce((sum, rate) => sum + rate, 0) / hitRates.length;
    const peakMemoryUsage = Math.max(...snapshots.map(s => s.memoryUsage));
    const totalOperations = snapshots.reduce(
      (sum, s) => sum + s.hits + s.misses + s.sets + s.deletes, 0
    );

    // Determine health trend
    let healthTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (snapshots.length >= 3) {
      const recentHitRates = hitRates.slice(-3);
      const trend = recentHitRates[2] - recentHitRates[0];
      
      if (trend > 0.05) {
        healthTrend = 'improving';
      } else if (trend < -0.05) {
        healthTrend = 'declining';
      }
    }

    return {
      avgHitRate,
      peakMemoryUsage,
      totalOperations,
      healthTrend
    };
  }

  /**
   * Reset current metrics
   */
  private resetCurrentMetrics(): void {
    this.currentMetrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      size: 0,
      memoryUsage: 0
    };
  }

  /**
   * Export metrics data for external analysis
   */
  exportMetrics(): {
    snapshots: CacheSnapshot[];
    summary: PerformanceReport;
  } {
    return {
      snapshots: [...this.snapshots],
      summary: this.getPerformanceReport()
    };
  }

  /**
   * Clear all metrics data
   */
  clearMetrics(): void {
    this.snapshots = [];
    this.responseTimeSamples = [];
    this.resetCurrentMetrics();
    
    this.logger.info('Cache metrics cleared', {
      operation: 'cache-metrics',
      metadata: { action: 'clear' }
    });
  }
}

// Default export
export default CacheMetrics;
