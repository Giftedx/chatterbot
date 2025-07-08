/**
 * Analytics Metrics Processing Service
 * Handles metric calculation, aggregation, and statistical analysis
 */

import { MetricSnapshot, MetricAggregation, PerformanceMetrics, AnalyticsEvent } from './types.js';
import { logger } from '../logger.js';

export class AnalyticsMetricsService {
  private metricsHistory: MetricSnapshot[] = [];
  private readonly maxHistorySize = 1000;

  /**
   * Calculate aggregations for a set of values
   */
  calculateAggregations(values: number[]): MetricAggregation {
    if (values.length === 0) {
      return {
        count: 0,
        sum: 0,
        avg: 0,
        min: 0,
        max: 0,
        percentiles: {}
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;

    return {
      count: values.length,
      sum,
      avg,
      min: Math.min(...values),
      max: Math.max(...values),
      percentiles: {
        p25: this.calculatePercentile(sorted, 25),
        p50: this.calculatePercentile(sorted, 50),
        p75: this.calculatePercentile(sorted, 75),
        p90: this.calculatePercentile(sorted, 90),
        p95: this.calculatePercentile(sorted, 95),
        p99: this.calculatePercentile(sorted, 99)
      }
    };
  }

  /**
   * Process performance events and generate metrics
   */
  processPerformanceEvents(events: AnalyticsEvent[]): PerformanceMetrics {
    const performanceEvents = events.filter(e => e.type === 'performance');
    
    if (performanceEvents.length === 0) {
      return this.getDefaultPerformanceMetrics();
    }

    const responseTimes = performanceEvents
      .map(e => e.data.duration as number)
      .filter(d => typeof d === 'number');

    const successfulRequests = performanceEvents.filter(e => e.data.success === true).length;
    const totalRequests = performanceEvents.length;
    const errorRate = totalRequests > 0 ? (totalRequests - successfulRequests) / totalRequests : 0;

    const responseTimeAgg = this.calculateAggregations(responseTimes);
    const throughput = this.calculateThroughput(performanceEvents);

    return {
      responseTime: responseTimeAgg.avg,
      throughput,
      errorRate,
      cacheHitRate: this.calculateCacheHitRate(performanceEvents),
      resourceUsage: this.estimateResourceUsage(performanceEvents)
    };
  }

  /**
   * Create a metric snapshot for a specific category
   */
  createMetricSnapshot(category: string, metrics: Record<string, number>): MetricSnapshot {
    const values = Object.values(metrics);
    const aggregations = this.calculateAggregations(values);

    const snapshot: MetricSnapshot = {
      timestamp: Date.now(),
      category,
      metrics,
      aggregations
    };

    // Store in history
    this.metricsHistory.push(snapshot);
    
    // Maintain history size limit
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
    }

    return snapshot;
  }

  /**
   * Get metrics history for a category
   */
  getMetricsHistory(category?: string, hours?: number): MetricSnapshot[] {
    let history = this.metricsHistory;

    if (category) {
      history = history.filter(h => h.category === category);
    }

    if (hours) {
      const cutoff = Date.now() - (hours * 60 * 60 * 1000);
      history = history.filter(h => h.timestamp >= cutoff);
    }

    return history;
  }

  /**
   * Calculate trending metrics
   */
  calculateTrends(category: string, metric: string, hours: number = 24): {
    current: number;
    previous: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  } {
    const history = this.getMetricsHistory(category, hours);
    
    if (history.length < 2) {
      return { current: 0, previous: 0, change: 0, trend: 'stable' };
    }

    const recent = history.slice(-1)[0];
    const earlier = history.slice(-2)[0];

    const current = recent.metrics[metric] || 0;
    const previous = earlier.metrics[metric] || 0;
    const change = current - previous;
    const percentChange = previous !== 0 ? (change / previous) * 100 : 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(percentChange) > 5) {
      trend = percentChange > 0 ? 'up' : 'down';
    }

    return { current, previous, change: percentChange, trend };
  }

  /**
   * Detect anomalies in metrics
   */
  detectAnomalies(category: string, metric: string, hours: number = 24): Array<{
    timestamp: number;
    value: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }> {
    const history = this.getMetricsHistory(category, hours);
    const anomalies: Array<{
      timestamp: number;
      value: number;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }> = [];

    if (history.length < 10) return anomalies; // Need enough data

    const values = history.map(h => h.metrics[metric] || 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Check for outliers (values beyond 2 standard deviations)
    history.forEach(snapshot => {
      const value = snapshot.metrics[metric] || 0;
      const zScore = Math.abs((value - mean) / stdDev);
      
      if (zScore > 2) {
        let severity: 'low' | 'medium' | 'high' = 'low';
        if (zScore > 3) severity = 'high';
        else if (zScore > 2.5) severity = 'medium';

        anomalies.push({
          timestamp: snapshot.timestamp,
          value,
          severity,
          description: `${metric} value ${value} is ${zScore.toFixed(2)} standard deviations from mean`
        });
      }
    });

    return anomalies;
  }

  /**
   * Generate summary statistics for all metrics
   */
  generateSummaryStatistics(hours: number = 24): Record<string, {
    category: string;
    metricCount: number;
    avgValue: number;
    trend: 'up' | 'down' | 'stable';
    anomalies: number;
  }> {
    const history = this.getMetricsHistory(undefined, hours);
    const summary: Record<string, any> = {};

    // Group by category
    const categories = [...new Set(history.map(h => h.category))];
    
    categories.forEach(category => {
      const categoryHistory = history.filter(h => h.category === category);
      const allMetrics = new Set<string>();
      
      categoryHistory.forEach(h => {
        Object.keys(h.metrics).forEach(m => allMetrics.add(m));
      });

      const avgValues: number[] = [];
      let totalAnomalies = 0;

      allMetrics.forEach(metric => {
        const values = categoryHistory.map(h => h.metrics[metric] || 0);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        avgValues.push(avg);

        const anomalies = this.detectAnomalies(category, metric, hours);
        totalAnomalies += anomalies.length;
      });

      const overallAvg = avgValues.reduce((a, b) => a + b, 0) / avgValues.length;
      const trend = this.calculateOverallTrend(categoryHistory);

      summary[category] = {
        category,
        metricCount: allMetrics.size,
        avgValue: overallAvg,
        trend,
        anomalies: totalAnomalies
      };
    });

    return summary;
  }

  // Private helper methods

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedValues[lower];
    }
    
    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private calculateThroughput(events: AnalyticsEvent[]): number {
    if (events.length === 0) return 0;
    
    const timestamps = events.map(e => e.timestamp);
    const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);
    
    if (timeSpan === 0) return events.length;
    
    return (events.length / timeSpan) * 1000; // requests per second
  }

  private calculateCacheHitRate(events: AnalyticsEvent[]): number {
    const cacheEvents = events.filter(e => e.data.cacheHit !== undefined);
    if (cacheEvents.length === 0) return 0;
    
    const hits = cacheEvents.filter(e => e.data.cacheHit === true).length;
    return hits / cacheEvents.length;
  }

  private estimateResourceUsage(events: AnalyticsEvent[]): { memory: number; cpu: number; connections: number } {
    // Simplified resource usage estimation
    const baseUsage = { memory: 0.3, cpu: 0.2, connections: 0.1 };
    const load = Math.min(1.0, events.length / 100);
    
    return {
      memory: baseUsage.memory + (load * 0.5),
      cpu: baseUsage.cpu + (load * 0.6),
      connections: baseUsage.connections + (load * 0.3)
    };
  }

  private getDefaultPerformanceMetrics(): PerformanceMetrics {
    return {
      responseTime: 0,
      throughput: 0,
      errorRate: 0,
      cacheHitRate: 0,
      resourceUsage: { memory: 0, cpu: 0, connections: 0 }
    };
  }

  private calculateOverallTrend(history: MetricSnapshot[]): 'up' | 'down' | 'stable' {
    if (history.length < 2) return 'stable';
    
    const recent = history.slice(-3);
    const earlier = history.slice(0, 3);
    
    const recentAvg = recent.reduce((sum, h) => sum + h.aggregations.avg, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, h) => sum + h.aggregations.avg, 0) / earlier.length;
    
    const change = (recentAvg - earlierAvg) / earlierAvg * 100;
    
    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'up' : 'down';
  }
}
