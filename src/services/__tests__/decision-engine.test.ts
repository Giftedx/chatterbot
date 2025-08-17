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
    recentUserBurstCount: 0,
    channelRecentBurstCount: 0
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

  // A3: Enhanced Channel Activity Context Tests
  test('applies user burst penalty correctly', () => {
    const highBurstCtx = { ...baseCtx, recentUserBurstCount: 5 }; // Above burstCountThreshold (3)
    const normalCtx = { ...baseCtx, recentUserBurstCount: 1 };
    
    const burstRes = engine.analyze(mkMessage('Are you there?'), highBurstCtx);
    const normalRes = engine.analyze(mkMessage('Are you there?'), normalCtx);
    
    expect(burstRes.reason).toContain('user-burst');
    expect(burstRes.confidence).toBeLessThan(normalRes.confidence);
  });

  test('applies channel activity penalty in ambient channels', () => {
    const busyChannelCtx = { ...baseCtx, channelRecentBurstCount: 8 }; // Above burstCountThreshold * 2 (6)
    const activeChannelCtx = { ...baseCtx, channelRecentBurstCount: 4 }; // Between 3 and 6
    const quietChannelCtx = { ...baseCtx, channelRecentBurstCount: 1 };
    
    const busyRes = engine.analyze(mkMessage('What do you think?'), busyChannelCtx);
    const activeRes = engine.analyze(mkMessage('What do you think?'), activeChannelCtx);
    const quietRes = engine.analyze(mkMessage('What do you think?'), quietChannelCtx);
    
    expect(busyRes.reason).toContain('channel-busy');
    expect(activeRes.reason).toContain('channel-active');
    expect(busyRes.confidence).toBeLessThan(activeRes.confidence);
    expect(activeRes.confidence).toBeLessThan(quietRes.confidence);
  });

  test('skips channel activity penalty when directly addressed', () => {
    const busyChannelCtx = { ...baseCtx, channelRecentBurstCount: 10, mentionedBot: true };
    const busyDMCtx = { ...baseCtx, channelRecentBurstCount: 10, isDM: true };
    const busyThreadCtx = { ...baseCtx, channelRecentBurstCount: 10, isPersonalThread: true };
    
    const mentionRes = engine.analyze(mkMessage('@bot help me'), busyChannelCtx);
    const dmRes = engine.analyze(mkMessage('help me'), busyDMCtx);
    const threadRes = engine.analyze(mkMessage('help me'), busyThreadCtx);
    
    expect(mentionRes.reason).not.toContain('channel-busy');
    expect(dmRes.reason).not.toContain('channel-busy');
    expect(threadRes.reason).not.toContain('channel-busy');
  });

  test('cooldown mechanism works with timestamps', () => {
    const recentReply = Date.now() - 5000; // 5 seconds ago (within 8s cooldown)
    const oldReply = Date.now() - 10000; // 10 seconds ago (outside 8s cooldown)
    
    const recentCtx = { ...baseCtx, lastBotReplyAt: recentReply, mentionedBot: true };
    const oldCtx = { ...baseCtx, lastBotReplyAt: oldReply, mentionedBot: true };
    
    const recentRes = engine.analyze(mkMessage('@bot question'), recentCtx);
    const oldRes = engine.analyze(mkMessage('@bot question'), oldCtx);
    
    expect(recentRes.reason).toContain('cooldown');
    expect(oldRes.reason).not.toContain('cooldown');
    // Both should respond (mentioned), but recent should have lower score due to cooldown penalty
    expect(recentRes.shouldRespond).toBe(true);
    expect(oldRes.shouldRespond).toBe(true);
  });

  test('personal thread detection increases score', () => {
    const threadCtx = { ...baseCtx, isPersonalThread: true };
    const channelCtx = { ...baseCtx, isPersonalThread: false };
    
    const threadRes = engine.analyze(mkMessage('Can you help?'), threadCtx);
    const channelRes = engine.analyze(mkMessage('Can you help?'), channelCtx);
    
    expect(threadRes.reason).toContain('personal-thread');
    expect(threadRes.confidence).toBeGreaterThan(channelRes.confidence);
  });
});
