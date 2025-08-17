# Performance-Aware Routing

A high-level guide for integrating and operating the Performance-Aware Routing System.

- Source: `src/services/performance-aware-routing.service.ts`
- Tests: `src/tests/performance-aware-routing.test.ts`
- Overview doc: `AI-PERFORMANCE-AWARE-ROUTING-COMPLETE.md`

## What it does
- Monitors real-time provider performance (latency, error rate, throughput, quality)
- Selects provider/model/service using 4 algorithms: performance-based, weighted, least-connections, round-robin
- Adapts decisions based on historical success and current system load
- Provides alerts, trends, and recommendations

## Quickstart

```ts
import { PerformanceAwareRoutingSystem } from "../services/performance-aware-routing.service";

const router = new PerformanceAwareRoutingSystem();

const decision = await router.makePerformanceAwareRoutingDecision(
  { content: "Summarize this file", complexity: 0.5 },
  { maxResponseTime: 3000, qualityThreshold: 0.85, preferredProviders: ["openai", "anthropic"] }
);

console.log(decision.selectedProvider, decision.selectedModel, decision.selectedService);

// Track lifecycle
const requestId = `req-${Date.now()}`;
router.trackRequestStart(requestId, decision.selectedProvider, decision.selectedModel, decision.selectedService);
// ... do work ...
router.trackRequestComplete(requestId, true, undefined, 0.92);
```

## Configuration

```ts
const router = new PerformanceAwareRoutingSystem({
  thresholds: {
    responseTime: { warning: 3000, critical: 10000 },
    errorRate: { warning: 0.05, critical: 0.15 },
    throughput: { minimum: 10, target: 100 },
    quality: { minimum: 0.7, target: 0.9 },
  },
  loadBalancing: {
    algorithm: "performance_based", // or 'weighted' | 'least_connections' | 'round_robin'
    weights: { openai: 1.0, anthropic: 1.0, google: 0.8, local: 0.6 },
    healthCheckInterval: 30_000,
    failoverThreshold: 0.8,
  },
  adaptiveRouting: {
    enabled: true,
    learningRate: 0.1,
    adaptationThreshold: 0.05,
    historicalWindowSize: 1000,
  },
});
```

## Key APIs
- `makePerformanceAwareRoutingDecision(context, requirements)` → returns decision with provider, model, service, and performance scores
- `trackRequestStart(id, provider, model, service)` / `trackRequestComplete(id, success, errorType?, quality?)`
- `getCurrentMetrics()` → system-wide metrics with trends, alerts, and anomalies
- `getProviderMetrics(id)` / `getServiceMetrics(id)`
- `getPerformanceRecommendations()` → optimization suggestions
- `destroy()` → cleanup timers

## Integration Tips
- Use alongside Intelligent Fallback: when a call fails, re-route with `excludeProviders` and retry
- Feed message complexity from your analysis service to improve service selection
- Surface `alerts` and `recommendations` in your ops dashboard
- Export metrics to your APM/observability stack if available

## Testing
- Comprehensive suite: 37 tests covering routing, balancing, tracking, analytics
- Run: `npm test -- --testPathPattern=performance-aware-routing`

## Next Steps
- Add cost-aware dimensions to decisions
- Integrate with centralized metrics (OTel) and dashboards
- Enable A/B testing of algorithms via config
