import { ModelRouterService } from '../model-router.service.js';
import { modelRegistry } from '../model-registry.service.js';

// Utility to build long text
function repeat(str: string, n: number): string {
  return new Array(n + 1).join(str);
}

describe('ModelRouterService - token guardrails (feature-flagged)', () => {
  const ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ENV };
    process.env.FEATURE_TOKEN_GUARDRAILS = 'true';
    process.env.FEATURE_PRECISE_TOKENIZER = 'false';
  });
  afterEach(() => {
    process.env = ENV;
  });

  it('trims history when input exceeds budget', async () => {
    // Force a tiny context window to trigger trimming, and deterministic selection
    jest.spyOn(modelRegistry, 'selectBestModel').mockReturnValue({ provider: 'openai', model: 'gpt-4o-mini', contextWindowK: 1 } as any);

  const router = new ModelRouterService({ defaultProvider: 'openai' });

  // Inject a stub OpenAI provider to intercept inputs
  const callSpy = jest.fn(async (_prompt: string, _mapped: any) => 'ok');
  (router as any).openai = { generate: callSpy };

    const long = repeat('A', 5000);
    const history = [
      { role: 'user', parts: [{ text: repeat('H', 4000) }] },
      { role: 'assistant', parts: [{ text: repeat('R', 4000) }] },
      { role: 'user', parts: [{ text: repeat('H', 4000) }] },
    ] as any;

    const out = await (router as any).callProvider({ provider: 'openai', model: 'gpt-4o-mini', contextWindowK: 1 }, long, history, 'sys');
  expect(out).toBe('ok');
  // Ensures provider was invoked (no throw)
  expect(callSpy).toHaveBeenCalled();
  });

  it('truncates prompt when history cannot be reduced further', async () => {
    jest.spyOn(modelRegistry, 'selectBestModel').mockReturnValue({ provider: 'openai', model: 'gpt-4o-mini', contextWindowK: 1 } as any);

    const router = new ModelRouterService({ defaultProvider: 'openai' });

    const callSpy = jest.fn(async (_prompt: string) => {
      // Ensure we mark that prompt contains truncation tag
      expect(String(_prompt)).toContain('[truncated for length]');
      return 'ok';
    });
    (router as any).openai = { generate: callSpy };

    const minimalHistory = [
      { role: 'user', parts: [{ text: 'short' }] },
      { role: 'assistant', parts: [{ text: 'short' }] },
    ] as any;

    const megatext = repeat('Z', 20000);
    const out = await (router as any).callProvider({ provider: 'openai', model: 'gpt-4o-mini', contextWindowK: 1 }, megatext, minimalHistory, 'sys');
  expect(out).toBe('ok');
  expect(callSpy).toHaveBeenCalled();
  });
});
