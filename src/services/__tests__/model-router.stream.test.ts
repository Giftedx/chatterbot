import { ModelRouterService } from '../model-router.service.js';
import { modelRegistry } from '../model-registry.service.js';

describe('ModelRouterService - stream() guardrails/fallback', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a usable generator that yields non-streamed text via generateWithMeta', async () => {
    const router = new ModelRouterService({ defaultProvider: 'gemini' });

    // Make generateWithMeta deterministic
    const meta = { text: 'stream-fallback-text', provider: 'openai', model: 'gpt-4o-mini' };
    const spy = jest.spyOn(router as any, 'generateWithMeta').mockResolvedValue(meta);

    const gen = await router.stream('hello', [], 'sys');

    const chunks: string[] = [];
    for await (const chunk of gen) chunks.push(chunk);

    expect(chunks.join('')).toBe('stream-fallback-text');
    expect(spy).toHaveBeenCalled();
  });

  it('gracefully handles when preferred provider cannot stream by delegating to generateWithMeta', async () => {
    const router = new ModelRouterService({ defaultProvider: 'gemini' });

    // Force selection of gemini as preferred
    jest.spyOn(modelRegistry, 'selectBestModel').mockReturnValue({ provider: 'gemini', model: 'gemini-1.5-flash' } as any);

    // Ensure generateWithMeta still works and returns text
    const meta = { text: 'fallback-to-non-streaming', provider: 'gemini', model: 'gemini-1.5-flash' };
    jest.spyOn(router as any, 'generateWithMeta').mockResolvedValue(meta);

    const gen = await router.stream('need streaming', [], undefined);
    const out: string[] = [];
    for await (const c of gen) out.push(c);

    expect(out.join('')).toBe('fallback-to-non-streaming');
  });
});
