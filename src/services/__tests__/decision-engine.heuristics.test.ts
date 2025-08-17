import { DecisionEngine, type DecisionContext } from '../decision-engine.service.js';

describe('DecisionEngine - heuristics coverage', () => {
  const mkBaseCtx = (): DecisionContext => ({
    optedIn: true,
    isDM: false,
    isPersonalThread: false,
    mentionedBot: false,
    repliedToBot: false,
    lastBotReplyAt: undefined,
    recentUserBurstCount: 0,
  });

  const mkMessage = (content: string, extra?: Partial<{ everyone: boolean; usersSize: number; rolesSize: number; channelsSize: number }>) => ({
    content,
    attachments: { size: 0 },
    mentions: {
      everyone: extra?.everyone ?? false,
      users: { size: extra?.usersSize ?? 0 },
      roles: { size: extra?.rolesSize ?? 0 },
      channels: { size: extra?.channelsSize ?? 0 },
    },
  } as any);

  test('ambient: too-short interjection is ignored', () => {
    const engine = new DecisionEngine();
    const res = engine.analyze(mkMessage('ok'), mkBaseCtx());
    expect(res.shouldRespond).toBe(false);
    expect(res.reason).toContain('too-short');
    expect(res.strategy).toBe('ignore');
  });

  test('mention: short interjection still gets a response', () => {
    const engine = new DecisionEngine();
    const res = engine.analyze(mkMessage('ok'), { ...mkBaseCtx(), mentionedBot: true });
    expect(res.shouldRespond).toBe(true);
    expect(res.reason).toContain('mention-bot');
    // ensure the short-message penalty was not applied when directly addressed
    expect(res.reason).not.toContain('too-short');
  });

  test('ambient: burst penalty can drop below threshold', () => {
    // Configure to make the threshold slightly higher (30) for clearer separation
    const engine = new DecisionEngine({ ambientThreshold: 30 });
    // question (+25) alone would be below threshold 30; add small bonus with code to reach 40 then apply burst (-15) => 25 < 30
    const res = engine.analyze(
      mkMessage('can you help? function'),
      { ...mkBaseCtx(), recentUserBurstCount: 5 }
    );
    expect(res.shouldRespond).toBe(false);
    expect(res.reason).toContain('user-burst');
  });

  test('mention: too many mentions across users+roles+channels is blocked', () => {
    const engine = new DecisionEngine();
    // default maxMentionsAllowed is 6; here total = 2 users + 3 roles + 3 channels = 8
    const res = engine.analyze(
      mkMessage('ping @bot with many mentions', { usersSize: 2, rolesSize: 3, channelsSize: 3 }),
      { ...mkBaseCtx(), mentionedBot: true }
    );
    expect(res.shouldRespond).toBe(false);
    expect(res.reason).toContain('too-many-mentions');
  });
});
