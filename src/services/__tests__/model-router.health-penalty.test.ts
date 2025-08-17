import { ModelRouterService } from '../model-router.service.js';
import { modelRegistry } from '../model-registry.service.js';
import { providerHealthStore } from '../advanced-capabilities/index.js';

describe('ModelRouterService - health-aware fallback ordering', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('deprioritizes unhealthy providers when selecting fallback', async () => {
    const router = new ModelRouterService({ defaultProvider: 'gemini' });

    // Force preferred (gemini) to fail to trigger fallback path
    (router as any).gemini = {
      generateResponse: jest.fn(async () => {
        throw new Error('gemini down');
      })
    };

    // Provide implementations for other providers used in fallback
    (router as any).openai = { generate: jest.fn(async () => 'ok-openai') };
    (router as any).anthropic = { generate: jest.fn(async () => 'ok-anthropic') };

    // Stub registry to return preferred and two candidates for fallback
    const selectSpy = jest
      .spyOn(modelRegistry, 'selectBestModel')
      .mockReturnValue({ provider: 'gemini', model: 'gemini-1.5-flash' } as any);
    const listSpy = jest
      .spyOn(modelRegistry, 'listAvailableModels')
      .mockReturnValue([
        { provider: 'gemini', model: 'gemini-1.5-flash' },
        { provider: 'anthropic', model: 'claude-3-5-sonnet' },
        { provider: 'openai', model: 'gpt-4o-mini' },
      ] as any);

    // Make anthropic appear recently unhealthy via providerHealthStore
    const record = (p: string, success: boolean, latencyMs = 100) =>
      providerHealthStore.update({ provider: p, model: 'x', latencyMs, success });

    // Healthy openai: more successes
    record('openai', true); record('openai', true); record('openai', true);
    // Unhealthy anthropic: more errors than successes
    record('anthropic', false); record('anthropic', false); record('anthropic', true); record('anthropic', false);

    const meta = await router.generateWithMeta('please help', [], undefined);

    // Expect the router to select openai over anthropic due to health penalty
    expect(meta.text).toBe('ok-openai');
    expect(meta.provider).toBe('openai');

    // Ensure our spies were utilized
    expect(selectSpy).toHaveBeenCalled();
    expect(listSpy).toHaveBeenCalled();
  });
});
