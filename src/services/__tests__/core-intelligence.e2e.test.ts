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
    async setDmPreference() { /* no-op */ }
    async pauseUser() { return new Date(Date.now() + 60_000); }
    async resumeUser() { return true; }
    async exportUserData() { return null; }
    async forgetUser() { return true; }
    async ensureOptedIn() { /* no-op */ }
  }
  return { ...actual, UserConsentService: MockUserConsentService };
});

jest.mock('../../db/prisma.js', () => ({ prisma: { messageLog: { create: jest.fn() } }, getPrisma: async () => ({ user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', privacyAccepted: true, optedOut: false, lastActivity: new Date(), dataRetentionDays: 90, dmPreferred: false }) } }) }));

// Avoid hitting external providers
jest.mock('../model-router.service.js', () => ({
  modelRouterService: {
    generateWithMeta: jest.fn().mockResolvedValue({ text: 'ok', provider: 'gemini', model: 'fake' }),
    generate: jest.fn().mockResolvedValue('ok'),
    stream: jest.fn().mockResolvedValue((async function*(){ yield 'ok'; })())
  }
}));

jest.mock('../core/mcp-orchestrator.service.js', () => ({
  UnifiedMCPOrchestratorService: class { async initialize() {}; async orchestrateIntelligentResponse() { return { success: true, phase: 0, toolsExecuted: [], results: new Map(), fallbacksUsed: [], executionTime: 0, confidence: 0, recommendations: [] }; } }
}));

jest.mock('../core/unified-analytics.service.js', () => ({ UnifiedAnalyticsService: class { logInteraction() { return { catch: () => {} }; } } }));

describe('CoreIntelligenceService - slash command defer path', () => {
  const makeInteraction = () => {
    const now = Date.now();
    const i: any = {
      id: 'interaction_mock_' + now,
      commandName: 'chat',
      isChatInputCommand: jest.fn(() => true),
      user: { id: 'u1', username: 'alice', createDM: jest.fn().mockResolvedValue({ id: 'dm1', send: jest.fn() }) },
      channelId: 'c1',
      guildId: 'g1',
      client: { channels: { fetch: jest.fn() } },
      channel: { isTextBased: () => false },
      createdTimestamp: now,
      options: {
        getString: jest.fn((_name: string, _req?: boolean) => 'x'.repeat(8000 * 4)),
        getAttachment: jest.fn(() => null)
      },
      reply: jest.fn(),
      followUp: jest.fn(),
      deferReply: jest.fn(),
      editReply: jest.fn(),
      isRepliable: jest.fn(() => true)
    };
    return i;
  };

  beforeAll(() => { process.env.NODE_ENV = 'test'; });

  test('long prompt defers with friendly message and marks cooldown', async () => {
    const svc = new CoreIntelligenceService({
      enableAgenticFeatures: false,
      enablePersonalization: false,
      enableEnhancedMemory: false,
      enableEnhancedUI: false,
      enableResponseCache: false,
      enableAdvancedCapabilities: false
    });

    const interaction = makeInteraction();
    await svc.handleInteraction(interaction as any);

    expect(interaction.reply).toHaveBeenCalled();
    expect(interaction.followUp).toHaveBeenCalled();
    const payload = interaction.followUp.mock.calls[0][0];
    expect(typeof payload.content).toBe('string');
    expect(payload.content).toMatch(/lengthy|deep dive|summary/i);

    const interaction2 = makeInteraction();
    await svc.handleInteraction(interaction2 as any);
    expect(interaction2.reply).toHaveBeenCalled();
    expect(interaction2.followUp).toHaveBeenCalled();
  });
});
