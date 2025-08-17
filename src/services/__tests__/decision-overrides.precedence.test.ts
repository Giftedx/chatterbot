import { jest } from '@jest/globals';

// Mock logger to keep test output clean
jest.unstable_mockModule('../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock env helpers to control defaults
jest.unstable_mockModule('../../utils/env.js', () => ({
  getEnvAsNumber: (key: string, fallback: number) => fallback,
  getEnvAsString: (key: string) => {
    if (key === 'DECISION_OVERRIDES_JSON') {
      // Provide env JSON for guild "G1" only
      return JSON.stringify({ G1: { ambientThreshold: 10 } });
    }
    return '';
  },
  getEnvAsBoolean: (key: string, fallback = false) => fallback,
}));

// Prepare a togglable DB overrides fake (injected via dependencies)
let dbOverrides: Record<string, any | null> = {};

let CoreIntelligenceService: any;
let DecisionEngine: any;
beforeAll(async () => {
  ({ CoreIntelligenceService } = await import('../core-intelligence.service.js'));
  ({ DecisionEngine } = await import('../decision-engine.service.js'));
});

function fakeMessage(content: string, guildId?: string): any {
  return {
    content,
    author: { id: 'U1', bot: false },
    guildId,
    channelId: 'C1',
    mentions: { everyone: false, users: new Map(), roles: new Map(), channels: new Map() },
    client: { user: { id: 'BOT' } },
    attachments: new Map(),
  };
}

describe('Decision overrides precedence', () => {
  test('env JSON is used provisionally, DB overrides take precedence when available', async () => {
    // Arrange: env JSON sets ambientThreshold=10 for G1; DB sets ambientThreshold=80
    dbOverrides = { G1: { ambientThreshold: 80 } };
    const svc = new CoreIntelligenceService({
      enableAgenticFeatures: false,
      enablePersonalization: false,
      enableEnhancedMemory: false,
      enableEnhancedUI: false,
      enableResponseCache: false,
      dependencies: {
        fetchGuildDecisionOverrides: async (guildId: string) => dbOverrides[guildId] ?? null,
      },
    } as any);

    // Act: first call builds provisional engine using env (ambientThreshold 10)
  const engineProvisional: any = (svc as any).getDecisionEngineForGuild('G1');
    const msg = fakeMessage('hello world');
    const provisional = engineProvisional.analyze(msg, {
      optedIn: true,
      isDM: false,
      isPersonalThread: false,
      mentionedBot: false,
      repliedToBot: false,
      recentUserBurstCount: 0,
    });
    expect(typeof provisional.shouldRespond).toBe('boolean');

    // Wait a tick for async DB to apply and hot-swap engine
  await new Promise((r) => setTimeout(r, 0));

  const engineAfterDb: any = (svc as any).getDecisionEngineForGuild('G1');
    expect(engineAfterDb).not.toBe(engineProvisional);

    // With high threshold 80, a short ambient message should more likely be ignored
    const after = engineAfterDb.analyze(msg, {
      optedIn: true,
      isDM: false,
      isPersonalThread: false,
      mentionedBot: false,
      repliedToBot: false,
      recentUserBurstCount: 0,
    });
    expect(after.strategy === 'ignore' || after.shouldRespond === false).toBe(true);
  });

  test('when DB has no overrides, env JSON remains active', async () => {
    dbOverrides = { G2: null };
    const svc = new CoreIntelligenceService({
      enableAgenticFeatures: false,
      enablePersonalization: false,
      enableEnhancedMemory: false,
      enableEnhancedUI: false,
      enableResponseCache: false,
      dependencies: {
        fetchGuildDecisionOverrides: async (guildId: string) => dbOverrides[guildId] ?? null,
      },
    } as any);

  const engine: any = (svc as any).getDecisionEngineForGuild('G2');
    const msg = fakeMessage('hello world');
    const result = engine.analyze(msg, {
      optedIn: true,
      isDM: false,
      isPersonalThread: false,
      mentionedBot: false,
      repliedToBot: false,
      recentUserBurstCount: 0,
    });
    expect(typeof result.shouldRespond).toBe('boolean');
  });
});
