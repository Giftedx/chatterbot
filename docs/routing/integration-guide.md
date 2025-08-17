# Integration Guide: Performance-Aware Routing + Fallback + Model Router

This guide shows how to wire the Performance-Aware Routing System alongside Intelligent Fallback and the existing Model Router within the Core Intelligence pipeline.

## Pipeline Overview
1. Analyze message → complexity/requirements
2. Performance-aware decision → provider/model/service suggestion
3. Execute call → track start/complete for metrics
4. On failure → Intelligent Fallback with alternative providers

## Example Wiring (pseudo)
```ts
import { PerformanceAwareRoutingSystem } from '../services/performance-aware-routing.service';
import { IntelligentFallbackSystem } from '../services/intelligent-fallback-system.service';
import { ModelRouterService } from '../services/model-router.service';

const perf = new PerformanceAwareRoutingSystem();
const fallback = new IntelligentFallbackSystem();
const modelRouter = new ModelRouterService();

async function handleMessage(message) {
  const analysis = await unifiedMessageAnalysis.analyze(message);

  // 1) Performance-aware routing (provider/model/service)
  const decision = await perf.makePerformanceAwareRoutingDecision(analysis, {
    maxResponseTime: analysis.responseSpeed === 'immediate' ? 2000 : 5000,
    qualityThreshold: analysis.reasoningLevel === 'deep' ? 0.9 : 0.8,
    preferredProviders: analysis.preferredProviders
  });

  const { selectedProvider, selectedModel, selectedService } = decision;
  const requestId = `req-${Date.now()}`;

  // 2) Track request
  perf.trackRequestStart(requestId, selectedProvider, selectedModel, selectedService);

  try {
    // 3) Execute via model router (or direct provider client)
    const result = await modelRouter.execute(selectedProvider, selectedModel, analysis);
    perf.trackRequestComplete(requestId, true, undefined, result.qualityScore);
    return result;
  } catch (err) {
    // 4) Fallback path
    perf.trackRequestComplete(requestId, false, 'error');
    const alt = await fallback.execute({
      primaryProvider: selectedProvider,
      excludeProviders: [selectedProvider],
      context: analysis
    });
    return alt;
  }
}
```

## Tips
- Always call `trackRequestStart/Complete` for accurate metrics
- Feed message complexity to choose appropriate service
- Use fallback’s `excludeProviders` to avoid flapping to the same provider
- Periodically check `getPerformanceRecommendations()` for tuning
