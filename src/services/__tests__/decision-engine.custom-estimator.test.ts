import { DecisionEngine, type DecisionContext } from '../decision-engine.service.js';

describe('DecisionEngine - custom token estimator', () => {
  const baseCtx: DecisionContext = {
    optedIn: true,
    isDM: true,
    isPersonalThread: false,
    mentionedBot: false,
    repliedToBot: false,
    lastBotReplyAt: undefined,
    recentUserBurstCount: 0,
    channelRecentBurstCount: 0,
  };

  const mkMessage = (content: string) => ({
    content,
    attachments: { size: 0 },
    mentions: { everyone: false, users: { size: 0 } },
  } as any);

  test('uses custom estimator when provided', () => {
    const engine = new DecisionEngine({
      cooldownMs: 0,
      defaultModelTokenLimit: 8000,
      tokenEstimator: () => 8000, // Force at limit to trigger defer branch (> 0.9 * limit)
    });
    const res = engine.analyze(mkMessage('short text'), baseCtx);
    expect(res.strategy).toBe('defer');
    expect(res.tokenEstimate).toBeGreaterThanOrEqual(8000);
  });
});
