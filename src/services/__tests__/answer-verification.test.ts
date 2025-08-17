import { AnswerVerificationService } from '../verification/answer-verification.service.js';

// Mock model router to avoid external calls
jest.mock('../model-router.service.js', () => ({
  modelRouterService: {
    generateWithMeta: jest.fn().mockResolvedValue({ text: 'alt answer', provider: 'gemini', model: 'fake' }),
    generate: jest.fn().mockResolvedValue('{ "agreement": 0.7, "critical_differences": [], "better_answer": "tie" }')
  }
}));

// Mock self-critique to produce a deterministic refinement
jest.mock('../self-critique.service.js', () => ({
  SelfCritiqueService: class { constructor() {}; async critiqueAndRefine(_u: string, _d: string) { return 'refined'; } }
}));

describe('AnswerVerificationService', () => {
  const history: any[] = [];
  const prompt = 'What is 2+2?';

  test('returns draft when disabled', async () => {
    const svc = new AnswerVerificationService({ enabled: false, crossModel: false });
    const out = await svc.verifyAndImprove(prompt, 'draft', history as any);
    expect(out).toBe('draft');
  });

  test('self-critique enabled, cross-model off', async () => {
    const svc = new AnswerVerificationService({ enabled: true, crossModel: false });
    const out = await svc.verifyAndImprove(prompt, 'draft', history as any);
    expect(out).toBe('refined');
  });

  test('cross-model enabled may trigger rerun when low agreement', async () => {
    // Override mock to produce low agreement and prefer alt
    const mr = (await import('../model-router.service.js')).modelRouterService as any;
    mr.generateWithMeta = jest
      .fn()
      .mockResolvedValueOnce({ text: 'alt A', provider: 'gemini', model: 'fake' })
      .mockResolvedValueOnce({ text: 'alt B', provider: 'gemini', model: 'fake' });
    mr.generate = jest.fn().mockResolvedValue('{ "agreement": 0.5, "critical_differences": ["x"], "better_answer": "B" }');

    const svc = new AnswerVerificationService({ enabled: true, crossModel: true, maxReruns: 1 });
    const out = await svc.verifyAndImprove(prompt, 'draft', history as any);
    // Since better_answer was B and agreement < 0.6, service may swap to alt and rerun; ensure non-empty string
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });
});
