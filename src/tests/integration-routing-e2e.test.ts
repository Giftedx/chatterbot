import { PerformanceAwareRoutingSystem } from '../services/performance-aware-routing.service.js';
import { modelRouterService as realModelRouterService } from '../services/model-router.service.js';

// We will mock only the provider call behavior via modelRouter, keeping its selection visible
jest.mock('../services/model-router.service.js', () => {
  const actual = jest.requireActual('../services/model-router.service.js');
  // Wrap: we will stub callProvider by making generateWithMeta deterministic by provider
  const outputs: Record<string, string> = {
    openai: 'openai:ok',
    anthropic: 'anthropic:ok',
    gemini: 'gemini:ok',
    groq: 'groq:ok',
    mistral: 'mistral:ok',
    openai_compat: 'openai_compat:ok',
  };
  return {
    ...actual,
    modelRouterService: {
      ...actual.modelRouterService,
      generateWithMeta: jest.fn(async (prompt: string) => {
        // Infer selected provider from prompt hint when provided by test
        const hinted = /__force_provider:(\w+)/.exec(prompt)?.[1] as keyof typeof outputs | undefined;
        const provider = hinted && outputs[hinted] ? hinted : 'openai';
        const text = outputs[provider] || 'openai:ok';
        return { text, provider: provider as any, model: 'test-model' };
      }),
      generate: jest.fn(async (prompt: string) => {
        const hinted = /__force_provider:(\w+)/.exec(prompt)?.[1] as keyof typeof outputs | undefined;
        const provider = hinted && outputs[hinted] ? hinted : 'openai';
        return outputs[provider] || 'openai:ok';
      }),
    },
  };
});

describe('Integration: Performance-Aware Routing x Model Router', () => {
  let perfRouter: PerformanceAwareRoutingSystem;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    perfRouter = new PerformanceAwareRoutingSystem({
      loadBalancing: { algorithm: 'performance_based', weights: {}, healthCheckInterval: 50, failoverThreshold: 0.8 },
      adaptiveRouting: { enabled: true, learningRate: 0.1, adaptationThreshold: 0.05, historicalWindowSize: 50 },
      metricsCollectionInterval: 1_000,
      performanceAnalysisInterval: 5_000,
      alertCheckInterval: 2_000,
      thresholds: {
        responseTime: { warning: 2_000, critical: 10_000 },
        errorRate: { warning: 0.05, critical: 0.2 },
        throughput: { minimum: 5, target: 50 },
        quality: { minimum: 0.6, target: 0.9 },
      },
    });
  });

  afterEach(() => {
    perfRouter.destroy();
    jest.clearAllMocks();
  });

  test('selects a performant provider and routes generation accordingly', async () => {
    const messageContext = { content: 'hello world', complexity: 0.3 };
    const decision = await perfRouter.makePerformanceAwareRoutingDecision(messageContext, {
      maxResponseTime: 3_000,
      qualityThreshold: 0.7,
      reliabilityRequirement: 0.9,
      preferredProviders: ['openai', 'anthropic'],
    });

    expect(decision.selectedProvider).toBeDefined();
    expect(typeof decision.performanceScore).toBe('number');

    // Use the provider decision as a hint to our mocked router
    const { modelRouterService } = await import('../services/model-router.service.js');
    const result = await modelRouterService.generateWithMeta(
      `${messageContext.content} __force_provider:${decision.selectedProvider}`,
      [],
    );

    expect(result.provider).toBe(decision.selectedProvider);
    expect(result.text).toContain(`${decision.selectedProvider}:ok`);
  });

  test('switches to a different provider when current becomes degraded', async () => {
    const messageContext = { content: 'need fast response', complexity: 0.4 };

    const first = await perfRouter.makePerformanceAwareRoutingDecision(messageContext, {
      urgency: 'high',
      maxResponseTime: 2_500,
    });

    // Simulate poor health for initially selected provider by injecting bad request history
    // Track a few failed requests to push error rate up
    for (let i = 0; i < 8; i++) {
      perfRouter.trackRequestStart(`r${i}`, first.selectedProvider, first.selectedModel, first.selectedService);
      perfRouter.trackRequestComplete(`r${i}`, false, 'rate_limit');
    }

    const second = await perfRouter.makePerformanceAwareRoutingDecision(messageContext, {
      urgency: 'high',
      maxResponseTime: 2_500,
      preferredProviders: ['openai', 'anthropic', 'google', 'local'],
    });

    // Provider should change due to degraded health scenario in metrics
    expect(second.selectedProvider).not.toBe(first.selectedProvider);

    const { modelRouterService } = await import('../services/model-router.service.js');
    const gen = await modelRouterService.generateWithMeta(
      `${messageContext.content} __force_provider:${second.selectedProvider}`,
      [],
    );
    expect(gen.provider).toBe(second.selectedProvider);
  });
});
