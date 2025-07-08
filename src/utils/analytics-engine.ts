/**
 * Analytics Engine Export Facade
 * Maintains backwards compatibility with the modular analytics engine
 */

export { AnalyticsEngine } from './analytics/index.js';
export type {
  AnalyticsEvent,
  AnalyticsDashboard,
  MetricSnapshot,
  AlertRule,
  MetricAggregation,
  PerformanceMetrics
} from './analytics/types.js';
