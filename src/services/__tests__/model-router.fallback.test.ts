import { ModelRouterService } from '../model-router.service.js';
import { modelRegistry as realRegistry } from '../model-registry.service.js';

// Ensure env to make gemini available and others considered unavailable unless mocked
process.env.GEMINI_API_KEY = 'test';

// Helper to stub listAvailableModels deterministically
function stubRegistry(preferredProvider: any, fallbackProvider: any) {
  const models = [
    { provider: preferredProvider, model: 'preferred-model' },
    { provider: fallbackProvider, model: 'fallback-model' }
  ] as any[];

  const reg = { 
    ...realRegistry, 
    listAvailableModels: jest.fn(() => models),
    selectBestModel: jest.fn(() => models[0])
  } as any;
  return reg;
}

describe('ModelRouterService - fallback selection after preferred failure', () => {
  test('falls back to next provider when preferred fails', async () => {
    const router = new ModelRouterService({ defaultProvider: 'gemini' });

    // Replace modelRegistry used inside the module via property override
    const mod = await import('../model-router.service.js');
    (mod as any).modelRegistry = stubRegistry('gemini', 'openai');

    // Make gemini fail, openai succeed
    (router as any).gemini.generateResponse = jest.fn(async () => { throw new Error('boom'); });
    (router as any).openai = { generate: jest.fn(async () => 'ok-fallback') };

  const meta = await router.generateWithMeta('hello world', [], undefined);
  expect(meta.text).toBe('ok-fallback');
  // We expect a provider switch to a non-gemini fallback (e.g., openai),
  // but the exact model can vary by environment; assert provider only.
  expect(meta.provider).toBe('openai');
  });
});
