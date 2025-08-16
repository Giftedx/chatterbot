import { DecisionEngine, type DecisionContext } from '../decision-engine.service.js';

describe('DecisionEngine', () => {
  const engine = new DecisionEngine({ cooldownMs: 8000, defaultModelTokenLimit: 8000 });

  const baseCtx: DecisionContext = {
    optedIn: true,
    isDM: false,
    isPersonalThread: false,
    mentionedBot: false,
    repliedToBot: false,
    lastBotReplyAt: undefined,
    recentUserBurstCount: 0
  };

  const mkMessage = (content: string) => ({ content, attachments: { size: 0 }, mentions: { everyone: false, users: { size: 0 } } } as any);

  test('prioritizes DM responses', () => {
    const res = engine.analyze(mkMessage('hello'), { ...baseCtx, isDM: true });
    expect(res.shouldRespond).toBe(true);
    expect(res.reason).toContain('dm');
  });

  test('responds to mentions', () => {
    const res = engine.analyze(mkMessage('hey @bot'), { ...baseCtx, mentionedBot: true });
    expect(res.shouldRespond).toBe(true);
    expect(res.reason).toContain('mention-bot');
  });

  test('cooldown reduces score but not absolute block for mentions', () => {
    const res = engine.analyze(mkMessage('hey again'), { ...baseCtx, mentionedBot: true, lastBotReplyAt: Date.now() });
    expect(res.shouldRespond).toBe(true);
    expect(res.reason).toContain('cooldown');
  });

  test('ignores when not opted-in', () => {
    const res = engine.analyze(mkMessage('hello'), { ...baseCtx, optedIn: false });
    expect(res.shouldRespond).toBe(false);
    expect(res.strategy).toBe('ignore');
  });

  test('strategy deep-reason for medium-long content', () => {
    const long = 'a'.repeat(20000); // ~5000 tokens -> deep-reason
    const res = engine.analyze(mkMessage(long), { ...baseCtx, isDM: true });
    expect(res.strategy).toBe('deep-reason');
  });

  test('strategy defer for very long content', () => {
    const veryLong = 'a'.repeat(32000); // ~8000 tokens -> defer
    const res = engine.analyze(mkMessage(veryLong), { ...baseCtx, isDM: true });
    expect(res.strategy).toBe('defer');
  });
});
