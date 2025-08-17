# Performance-Aware Routing Troubleshooting

Common issues, diagnostics, and fixes.

## Symptoms and Fixes

### 1) Unexpected single-provider selection
- Symptom: All requests route to the same provider
- Causes:
  - Load balancing algorithm set to `weighted` with skewed weights
  - Health status marks other providers degraded/unhealthy
  - Strict requirements filter eliminates others
- Diagnostics:
  - Check config `loadBalancing.algorithm` and `weights`
  - Inspect `getCurrentMetrics().providers` for error rates and response times
  - Log `decision.alternativeProviders` to see near-miss providers
- Fixes:
  - Switch to `performance_based` or `least_connections`
  - Relax `qualityThreshold` or `maxResponseTime`
  - Re-enable providers; verify API keys and provider health

### 2) High response time estimates
- Symptom: `decision.responseTimeEstimate` > expectations
- Causes:
  - Provider metrics not warmed; using conservative defaults
  - Service adds extra processing time
- Diagnostics:
  - Pre-warm by running small number of requests; monitor averages
  - Inspect `serviceMetrics.avgResponseTime`
- Fixes:
  - Increase metrics window or pre-warm at startup
  - Choose simpler service for low-complexity tasks

### 3) Frequent failovers or alerts
- Symptom: Alerts indicate high error rate or timeouts
- Causes:
  - Provider rate limits or intermittent outages
  - Aggressive retrying at higher layers
- Diagnostics:
  - Inspect `systemMetrics.alerts` and `providerMetrics.rateLimitRate`
  - Check logs for error types on `trackRequestComplete`
- Fixes:
  - Add backoff/jitter; reduce concurrency
  - Prefer providers with lower error rates temporarily

### 4) Metrics not updating
- Symptom: Metrics remain static
- Causes:
  - `trackRequestStart/Complete` not called
  - Timers cleared via `destroy()`
- Diagnostics:
  - Confirm lifecycle calls; check `activeRequests` size
  - Verify timers by logging collection/analysis intervals
- Fixes:
  - Ensure lifecycle hooks wrap all routed requests
  - Do not call `destroy()` until shutdown

## Best Practices
- Use `performance_based` as default for balanced results
- Pass realistic `requirements` for each request
- Track lifecycle for every routed call for accurate metrics
- Periodically review `getPerformanceRecommendations()` output
- Consider cost-aware weighting if budget is a constraint

## Diagnostics Snippets
```ts
const router = new PerformanceAwareRoutingSystem();
const metrics = router.getCurrentMetrics();
console.table(Array.from(metrics.providers.values()).map(p => ({
  provider: p.providerId,
  avgMs: Math.round(p.avgResponseTime),
  err: +(p.errorRate * 100).toFixed(1) + '%',
  success: +(p.successRate * 100).toFixed(1) + '%',
  quality: +(p.qualityScore * 100).toFixed(1) + '%'
})));
```
