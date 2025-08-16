import { CoreIntelligenceService } from '../core-intelligence.service.js';

jest.mock('../user-consent.service.js', () => {
  const actual = jest.requireActual('../user-consent.service.js');
  class MockUserConsentService {
    static instance: any;
    static getInstance() { return this.instance || (this.instance = new MockUserConsentService()); }
    async getUserConsent(userId: string) { return { userId, optedOut: false, privacyAccepted: true, dmPreferred: false, lastThreadId: null, lastActivity: new Date() }; }
    async isUserOptedIn() { return true; }
    async isUserPaused() { return false; }
    async getRouting() { return { dmPreferred: false, lastThreadId: null }; }
    async updateUserActivity() { /* no-op */ }
    async setLastThreadId() { /* no-op */ }
  }
  return { ...actual, UserConsentService: MockUserConsentService };
});

jest.mock('../../db/prisma.js', () => ({ prisma: { messageLog: { create: jest.fn() } }, getPrisma: async () => ({ user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', privacyAccepted: true, optedOut: false, lastActivity: new Date(), dataRetentionDays: 90, dmPreferred: false }) } }) }));

jest.mock('../model-router.service.js', () => ({
  modelRouterService: {
    generateWithMeta: jest.fn().mockResolvedValue({ text: 'ok', provider: 'gemini', model: 'fake' })
  }
}));

jest.mock('../core/mcp-orchestrator.service.js', () => ({
  UnifiedMCPOrchestratorService: class { async initialize() {}; async orchestrateIntelligentResponse() { return { success: true, phase: 0, toolsExecuted: [], results: new Map(), fallbacksUsed: [], executionTime: 0, confidence: 0, recommendations: [] }; } }
}));

jest.mock('../core/unified-analytics.service.js', () => ({ UnifiedAnalyticsService: class { logInteraction() { return { catch: () => {} }; } } }));

describe('CoreIntelligenceService - cooldown bypass for mentions', () => {
  const makeMessage = () => {
    const clientUser = { id: 'bot1' };
    const msg: any = {
      id: 'm1',
      content: '<@bot1> hey there',
      author: { id: 'u1', bot: false, username: 'alice' },
      channelId: 'c1',
      guildId: 'g1',
      client: { user: clientUser },
      attachments: new Map(),
      mentions: { users: { has: (id: string) => id === clientUser.id }, everyone: false },
      reference: undefined,
      fetchReference: jest.fn(),
      channel: { isTextBased: () => true, sendTyping: jest.fn() },
      reply: jest.fn()
    };
    return msg;
  };

  beforeAll(() => { process.env.NODE_ENV = 'development'; });

  test('replies even when cooldown is active due to mention', async () => {
    const svc = new CoreIntelligenceService({
      enableAgenticFeatures: false,
      enablePersonalization: false,
      enableEnhancedMemory: false,
      enableEnhancedUI: false,
      enableResponseCache: false,
      enableAdvancedCapabilities: false
    });

    const m = makeMessage();
    // Simulate recent bot reply to set cooldown active
    (svc as any).lastReplyAt.set('u1', Date.now());

    await svc.handleMessage(m as any);

    expect(m.reply).toHaveBeenCalled();
    const payload = m.reply.mock.calls[0][0];
    expect(typeof payload.content === 'string' || payload.embeds || payload.files).toBeTruthy();
  });
});
