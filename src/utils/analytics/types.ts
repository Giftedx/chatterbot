/**
 * Analytics Types
 * Common interfaces and types used across analytics modules
 */

export interface AnalyticsEvent {
  id: string;
  timestamp: number;
  type: 'request' | 'response' | 'error' | 'performance' | 'user' | 'system';
  category: string;
  userId?: string;
  guildId?: string;
  data: Record<string, unknown>;
  metadata: {
    source: string;
    version: string;
    sessionId?: string;
    userAgent?: string;
    location?: string;
  };
}

export interface MetricSnapshot {
  timestamp: number;
  category: string;
  metrics: Record<string, number>;
  aggregations: {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    percentiles: Record<string, number>;
  };
}

export interface AnalyticsDashboard {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    errorRate: number;
  };
  performance: {
    throughput: number;
    latency: {
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
    cacheHitRate: number;
    resourceUtilization: {
      memory: number;
      cpu: number;
      connections: number;
    };
  };
  usage: {
    requestsByType: Record<string, number>;
    userDistribution: Record<string, number>;
    timeBasedMetrics: Array<{
      hour: number;
      requests: number;
      users: number;
    }>;
    topGuilds: Array<{
      guildId: string;
      requests: number;
      users: number;
    }>;
  };
  realTime: {
    currentRPS: number;
    activeConnections: number;
    queueSize: number;
    processingTime: number;
    alerts: Array<{
      type: string;
      message: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      timestamp: number;
    }>;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  type: 'threshold' | 'anomaly' | 'trend';
  metric: string;
  condition: {
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    value: number;
    window?: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  actions: Array<{
    type: 'notification' | 'webhook' | 'auto_scale';
    config: Record<string, unknown>;
  }>;
}

export interface MetricAggregation {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  percentiles: Record<string, number>;
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  cacheHitRate: number;
  resourceUsage: {
    memory: number;
    cpu: number;
    connections: number;
  };
}
