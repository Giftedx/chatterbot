import { ModelRouterService } from '../model-router.service.js';
import * as retryMod from '../../utils/retry.js';

// Ensure consistent env for selection
process.env.GEMINI_API_KEY = 'test';

describe('ModelRouterService - retry and fallback behavior', () => {
  test('callProvider retries on transient failure (Gemini path)', async () => {
    const router = new ModelRouterService({ defaultProvider: 'gemini' });

    // Spy on retry to speed up test (no actual waiting)
    const retrySpy = jest.spyOn(retryMod, 'retry');

    // Monkey-patch underlying GeminiService.generateResponse used by callProvider('gemini')
    let called = 0;
    (router as any).gemini.generateResponse = jest.fn(async () => {
      called++;
      if (called === 1) throw new Error('transient');
      return 'ok-after-retry';
    });

    // Build a fake model card for gemini
    const card = { provider: 'gemini', model: 'gemini-1.5-flash' } as any;

    const out = await (router as any).callProvider(card, 'hello', [], undefined);
    expect(out).toBe('ok-after-retry');
    expect(called).toBeGreaterThanOrEqual(2);
    expect(retrySpy).toHaveBeenCalled();
  });
});
