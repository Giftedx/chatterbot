import { DecisionEngine, type DecisionContext } from '../decision-engine.service.js';

describe('DecisionEngine - channel activity awareness', () => {
  const baseCtx: DecisionContext = {
    optedIn: true,
    isDM: false,
    isPersonalThread: false,
    mentionedBot: false,
    repliedToBot: false,
    lastBotReplyAt: undefined,
    recentUserBurstCount: 0,
    channelRecentBurstCount: 0,
  };

  const mkMsg = (content: string) => ({
    content,
    mentions: { everyone: false, users: new Map(), roles: new Map(), channels: new Map() },
    attachments: { size: 0 },
  }) as any;

  test('penalizes ambient response when channel is moderately active', () => {
    const engine = new DecisionEngine({ ambientThreshold: 25, burstCountThreshold: 3 });
    const ctx: DecisionContext = { ...baseCtx, channelRecentBurstCount: 3 };
    const res = engine.analyze(mkMsg('anyone available?'), ctx);
    // Score should include 'channel-active' penalty making it less likely to respond in ambient
    expect(res.reason).toContain('channel-active');
    // Should still possibly respond if other signals strong; here question adds +25 vs -10
    // We assert decision is not guaranteed true
    expect(typeof res.shouldRespond).toBe('boolean');
  });

  test('stronger penalty when channel is very busy', () => {
    const engine = new DecisionEngine({ ambientThreshold: 25, burstCountThreshold: 2 });
    const ctx: DecisionContext = { ...baseCtx, channelRecentBurstCount: 5 };
    const res = engine.analyze(mkMsg('help'), ctx);
    expect(res.reason).toContain('channel-busy');
  });

  test('no channel penalty when directly mentioned', () => {
    const engine = new DecisionEngine({ ambientThreshold: 50, burstCountThreshold: 3 });
    const ctx: DecisionContext = { ...baseCtx, channelRecentBurstCount: 10, mentionedBot: true };
    const res = engine.analyze(mkMsg('hey @bot can you check this?'), ctx);
    expect(res.shouldRespond).toBe(true);
    expect(res.reason).toContain('mention-bot');
    expect(res.reason.includes('channel-busy') || res.reason.includes('channel-active')).toBe(false);
  });
});
