import { DecisionEngine } from '../decision-engine.service.js';

describe('Core integration - channel activity threaded into decision', () => {
  test('CoreIntelligence should pass channel activity to DecisionEngine (smoke)', async () => {
    // Dynamic import to use the patched file
    const { CoreIntelligenceService } = await import('../core-intelligence.service.js');
    const svc: any = new CoreIntelligenceService({
      enableAgenticFeatures: false,
      enablePersonalization: false,
      enableEnhancedMemory: false,
      enableEnhancedUI: false,
      enableResponseCache: false,
      enableAdvancedCapabilities: false,
    });

    // Spy on DecisionEngine#analyze to inspect received ctx
  const engine = (svc as any).getDecisionEngineForGuild();
  const spy = jest.spyOn(engine, 'analyze');

    const message: any = {
      id: 'm1', content: 'hello there?', author: { id: 'U1', bot: false },
      channelId: 'C1', guildId: 'G1', client: { user: { id: 'B1' } },
      mentions: { everyone: false, users: new Map(), roles: new Map(), channels: new Map() },
      attachments: { size: 0 },
      reference: null,
      fetchReference: jest.fn().mockResolvedValue(null),
    };

  // Mock consent service to report opted-in and not paused
  const ucs = (svc as any).userConsentService;
  jest.spyOn(ucs, 'getUserConsent').mockResolvedValue({ privacyAccepted: true, optedOut: false });
  jest.spyOn(ucs, 'isUserPaused').mockResolvedValue(false);
  jest.spyOn(ucs, 'getRouting').mockResolvedValue({ lastThreadId: undefined, dmPreferred: false });

  // Ensure NODE_ENV doesn't trigger unconditional yes path
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'integration';
  await svc['shouldRespond'](message);
  process.env.NODE_ENV = prevEnv;

    expect(spy).toHaveBeenCalled();
    const ctxArg = spy.mock.calls[0][1];
    expect(ctxArg).toHaveProperty('channelRecentBurstCount');
  });
});
