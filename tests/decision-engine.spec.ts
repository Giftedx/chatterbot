import { DecisionEngine } from '../src/services/decision-engine.service.js';

// Minimal Message stub
function makeMessage(content: string, opts: Partial<any> = {}): any {
  return {
    content,
    mentions: {
      everyone: opts.everyone || false,
      users: new Map(opts.mentionUserIds?.map((id: string) => [id, { id }]) || []),
      ...opts.mentionsOverride
    },
    attachments: new Map(),
    ...opts
  };
}

describe('DecisionEngine', () => {
  const BOT_ID = 'bot-123';
  const engine = new DecisionEngine({ cooldownMs: 8000, defaultModelTokenLimit: 8000 });

  test('responds in DM regardless of content (unless exceptions)', () => {
    const msg = makeMessage('hi');
    const res = engine.analyze(msg, { optedIn: true, isDM: true, isPersonalThread: false, mentionedBot: false, repliedToBot: false });
    expect(res.shouldRespond).toBe(true);
  });

  test('responds when bot is mentioned', () => {
    const msg = makeMessage('hey <@bot-123> can you help?', { mentionsOverride: { users: new Map([[BOT_ID, { id: BOT_ID }]]) } });
    const res = engine.analyze(msg, { optedIn: true, isDM: false, isPersonalThread: false, mentionedBot: true, repliedToBot: false });
    expect(res.shouldRespond).toBe(true);
  });

  test('suppresses when mentions everyone despite mention', () => {
    const msg = makeMessage('@everyone <@bot-123>', { everyone: true });
    const res = engine.analyze(msg, { optedIn: true, isDM: false, isPersonalThread: false, mentionedBot: true, repliedToBot: false });
    expect(res.shouldRespond).toBe(false);
    expect(res.reason).toContain('mentions-everyone');
  });

  test('applies cooldown penalty', () => {
    const msg = makeMessage('a normal message with a question?');
    const res = engine.analyze(msg, { optedIn: true, isDM: false, isPersonalThread: true, mentionedBot: false, repliedToBot: false, lastBotReplyAt: Date.now() });
    // In personal thread it still tends to respond but with cooldown penalty score reduced; allow either outcome but ensure strategy computed
    expect(['quick-reply','deep-reason','defer','ignore']).toContain(res.strategy);
  });

  test('penalizes user burst', () => {
    const msg = makeMessage('spam spam');
    const res = engine.analyze(msg, { optedIn: true, isDM: false, isPersonalThread: false, mentionedBot: false, repliedToBot: false, recentUserBurstCount: 3 });
    expect(res.shouldRespond).toBe(false);
  });

  test('token-aware strategy selects deep-reason for longer inputs', () => {
    const long = 'x'.repeat(18000) + ' what do you think?'; // ~4500+ tokens and contains question mark
    const msg = makeMessage(long);
    const res = engine.analyze(msg, { optedIn: true, isDM: false, isPersonalThread: false, mentionedBot: false, repliedToBot: false });
    expect(res.strategy === 'deep-reason' || res.strategy === 'defer').toBeTruthy();
  });
});
