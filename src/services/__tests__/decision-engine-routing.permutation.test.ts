import { DecisionEngine, type DecisionContext } from '../decision-engine.service.js';

describe('DecisionEngine - routing permutations', () => {
  const engine = new DecisionEngine({ cooldownMs: 8000, defaultModelTokenLimit: 8000 });

  const baseCtx: DecisionContext = {
    optedIn: true,
    isDM: false,
    isPersonalThread: false,
    mentionedBot: false,
    repliedToBot: false,
    lastBotReplyAt: undefined,
    recentUserBurstCount: 0,
  };

  const mkMessage = (content: string, extra?: Partial<{ everyone: boolean; usersSize: number }>) => ({
    content,
    attachments: { size: 0 },
    mentions: {
      everyone: extra?.everyone ?? false,
      users: { size: extra?.usersSize ?? 0 },
    },
  } as any);

  test('DM prioritized even under cooldown', () => {
    const res = engine.analyze(
      mkMessage('hello from dm'),
      { ...baseCtx, isDM: true, lastBotReplyAt: Date.now() }
    );
    expect(res.shouldRespond).toBe(true);
    expect(res.reason).toContain('dm');
    expect(res.reason).toContain('cooldown');
  });

  test('Channel cooldown suppresses otherwise eligible ambient', () => {
    // question (+25) + code mention (+15) = +40; cooldown (-30) -> net 10 < threshold 25 => ignore
    const res = engine.analyze(
      mkMessage('can you help? here is a function example'),
      { ...baseCtx, lastBotReplyAt: Date.now() }
    );
    expect(res.shouldRespond).toBe(false);
    expect(res.reason).toContain('cooldown');
    expect(res.reason).toContain('question');
  });

  test('Mention but too many mentions is blocked', () => {
    const res = engine.analyze(
      mkMessage('hey @bot and others', { usersSize: 7 }),
      { ...baseCtx, mentionedBot: true }
    );
    expect(res.shouldRespond).toBe(false);
    expect(res.reason).toContain('too-many-mentions');
  });

  test('Mentions @everyone is blocked even if bot is mentioned', () => {
    const res = engine.analyze(
      mkMessage('@everyone ping @bot', { everyone: true }),
      { ...baseCtx, mentionedBot: true }
    );
    expect(res.shouldRespond).toBe(false);
    expect(res.reason).toContain('mentions-everyone');
  });

  test('Personal thread boosts short interjection over threshold', () => {
    const res = engine.analyze(
      mkMessage('ok'),
      { ...baseCtx, isPersonalThread: true }
    );
    // even with 'too-short' penalty, personal-thread boost yields response
    expect(res.shouldRespond).toBe(true);
    expect(res.reason).toContain('personal-thread');
    expect(res.reason).toContain('too-short');
  });

  test('Burst does not prevent direct responses (mention)', () => {
    const res = engine.analyze(
      mkMessage('hey @bot, quick check'),
      { ...baseCtx, mentionedBot: true, recentUserBurstCount: 5 }
    );
    expect(res.shouldRespond).toBe(true);
    expect(res.reason).toContain('user-burst');
  });

  test('Quick reply strategy for short DM', () => {
    const res = engine.analyze(
      mkMessage('hello'),
      { ...baseCtx, isDM: true }
    );
    expect(res.strategy).toBe('quick-reply');
  });
});
