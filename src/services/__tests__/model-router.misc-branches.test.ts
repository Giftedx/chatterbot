import { ModelRouterService } from '../model-router.service.js';
import { modelRegistry as realRegistry } from '../model-registry.service.js';
import { providerHealthStore } from '../advanced-capabilities/index.js';

describe('ModelRouterService - misc branch coverage', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('respects DISALLOW_PROVIDERS CSV when selecting preferred model', async () => {
    // Ensure both providers appear available in registry listing
    const models = [
      { provider: 'gemini', model: 'gemini-1.5-flash' },
      { provider: 'openai', model: 'gpt-4o-mini' },
    ] as any[];

  // Spy on the live singleton used by router
  const listSpy = jest.spyOn(realRegistry as any, 'listAvailableModels').mockReturnValue(models);
  const selectSpy = jest.spyOn(realRegistry as any, 'selectBestModel').mockReturnValue(undefined);

    // Disallow gemini via CSV (with extra spacing and unknown entries tolerated)
    process.env.DISALLOW_PROVIDERS = '  gemini , unknown , openai_compat  ';

    const router = new ModelRouterService({ defaultProvider: 'gemini' });

    // Make openai succeed to verify selection fell through to openai (not disallowed)
    (router as any).openai = { generate: jest.fn(async () => 'ok-openai') };

    const meta = await router.generateWithMeta('pick model', [], undefined);
    expect(meta.provider).toBe('openai');
    expect(meta.text).toBe('ok-openai');
  expect(selectSpy).toHaveBeenCalled();
  expect(listSpy).toHaveBeenCalled();
  });

  it('short-circuits unhealthy provider in callProvider()', async () => {
    const router = new ModelRouterService({ defaultProvider: 'openai' });

    // Pretend openai provider is wired (won't be called due to short-circuit)
    (router as any).openai = { generate: jest.fn(async () => 'should-not-run') };

    // Mark provider as recently unhealthy (errorCount >= 5 and > 2x successes)
    providerHealthStore.update({ provider: 'openai', model: 'x', latencyMs: 100, success: false });
    providerHealthStore.update({ provider: 'openai', model: 'x', latencyMs: 100, success: false });
    providerHealthStore.update({ provider: 'openai', model: 'x', latencyMs: 100, success: false });
    providerHealthStore.update({ provider: 'openai', model: 'x', latencyMs: 100, success: false });
    providerHealthStore.update({ provider: 'openai', model: 'x', latencyMs: 100, success: false });
    providerHealthStore.update({ provider: 'openai', model: 'x', latencyMs: 100, success: true });

    const card = { provider: 'openai', model: 'gpt-4o-mini' } as any;
    await expect((router as any).callProvider(card, 'hi', [], undefined)).rejects.toThrow(
      /temporarily unhealthy/i,
    );
    expect((router as any).openai.generate).not.toHaveBeenCalled();
  });

  it('default branch uses gemini when provider is unknown and FEATURE_VERCEL_AI is off', async () => {
    const router = new ModelRouterService({ defaultProvider: 'gemini' });

    // Spy on gemini.generateResponse to assert default path is used
    const spy = jest
      .spyOn((router as any).gemini, 'generateResponse')
      .mockResolvedValue('ok-from-default');

    // FEATURE_VERCEL_AI is false by default; pass an unknown provider
    const card = { provider: 'unknown' as any, model: 'x' };
    const out = await (router as any).callProvider(card, 'hello', [], undefined);

    expect(out).toBe('ok-from-default');
    expect(spy).toHaveBeenCalled();
  });
});
