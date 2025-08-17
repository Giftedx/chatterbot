import { PerformanceAwareRoutingSystem } from '../services/performance-aware-routing.service';

async function main() {
  const router = new PerformanceAwareRoutingSystem();

  const contexts = [
    { content: 'Quick reply please', complexity: 0.2 },
    { content: 'Deep analysis required', complexity: 0.9 },
    { content: 'Medium complexity', complexity: 0.5 }
  ];

  for (const ctx of contexts) {
    const decision = await router.makePerformanceAwareRoutingDecision(ctx, {
      maxResponseTime: ctx.complexity > 0.8 ? 8000 : 3000,
      qualityThreshold: ctx.complexity > 0.6 ? 0.9 : 0.8
    });
    console.log('\nDecision:', {
      ctx,
      provider: decision.selectedProvider,
      model: decision.selectedModel,
      service: decision.selectedService,
      score: +decision.performanceScore.toFixed(3),
      estMs: Math.round(decision.responseTimeEstimate),
      reliability: +decision.reliabilityScore.toFixed(3)
    });
  }

  const metrics = router.getCurrentMetrics();
  console.log('\nCurrent Metrics:', {
    avgMs: Math.round(metrics.overall.avgResponseTime),
    errRate: +(metrics.overall.errorRate * 100).toFixed(1) + '%',
    alerts: metrics.alerts.length
  });

  router.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
