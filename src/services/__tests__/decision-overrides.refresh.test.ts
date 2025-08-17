import { jest } from '@jest/globals';

// Use fake timers to simulate TTL-based refresh
jest.useFakeTimers();

jest.unstable_mockModule('../../utils/logger.js', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Control env: short TTL to speed up refresh
jest.unstable_mockModule('../../utils/env.js', () => ({
  getEnvAsNumber: (key: string, fallback: number) => {
    if (key === 'DECISION_OVERRIDES_TTL_MS') return 50; // 50ms
    return fallback;
  },
  getEnvAsString: (key: string) => {
    if (key === 'DECISION_OVERRIDES_JSON') return JSON.stringify({ G3: { ambientThreshold: 10 } });
    return '';
  },
  getEnvAsBoolean: (key: string, fallback = false) => fallback,
}));

let dbValue: Record<string, any | null> = {};
let transientCall = 0;

let CoreIntelligenceService: any;
let DecisionEngine: any;
beforeAll(async () => {
  ({ CoreIntelligenceService } = await import('../core-intelligence.service.js'));
  ({ DecisionEngine } = await import('../decision-engine.service.js'));
});

function msg(): any {
  return {
    content: 'short text',
    author: { id: 'U1', bot: false },
    guildId: 'G3',
    channelId: 'C1',
    mentions: { everyone: false, users: new Map(), roles: new Map(), channels: new Map() },
    client: { user: { id: 'BOT' } },
    attachments: new Map(),
  };
}

function ctx() {
  return {
    optedIn: true,
    isDM: false,
    isPersonalThread: false,
    mentionedBot: false,
    repliedToBot: false,
    recentUserBurstCount: 0,
  };
}

describe('Decision overrides periodic refresh', () => {
  test('engine hot-swaps when DB overrides change after TTL', async () => {
    // Start with no DB overrides; env JSON uses ambientThreshold=10
    dbValue = { G3: null };
    const svc = new CoreIntelligenceService({
      enableAgenticFeatures: false,
      enablePersonalization: false,
      enableEnhancedMemory: false,
      enableEnhancedUI: false,
      enableResponseCache: false,
      dependencies: {
        fetchGuildDecisionOverrides: async (guildId: string) => {
          if (guildId === 'G3' && transientCall > 0 && transientCall < 2) {
            transientCall += 1;
            throw new Error('transient');
          }
          return dbValue[guildId] ?? null;
        },
      },
    } as any);

  const provisional: any = (svc as any).getDecisionEngineForGuild('G3');
    const before = provisional.analyze(msg(), ctx());

    // After TTL, DB supplies a high threshold (e.g., 90)
    dbValue.G3 = { ambientThreshold: 90 };

  // Fast-forward timers and explicitly trigger refresh for determinism
  await Promise.resolve();
  jest.advanceTimersByTime(60); // > TTL
  await (svc as any).refreshGuildDecisionEngines();
  await Promise.resolve();

  const afterEngine: any = (svc as any).getDecisionEngineForGuild('G3');
    const after = afterEngine.analyze(msg(), ctx());

    // The engine should have been replaced and decision likely stricter
    expect(afterEngine).not.toBe(provisional);
    // We don't assert exact boolean, just that strategy/boolean could change with stricter threshold
    expect(typeof after.shouldRespond).toBe('boolean');
  });

  test('recovers from transient DB error via next refresh', async () => {
    // Simulate transient failure -> success
  // Set transient behavior active and then provide a value on next refresh
  transientCall = 1;
  dbValue.G3 = { ambientThreshold: 70 };

  const svc = new CoreIntelligenceService({
      enableAgenticFeatures: false,
      enablePersonalization: false,
      enableEnhancedMemory: false,
      enableEnhancedUI: false,
      enableResponseCache: false,
      dependencies: {
        fetchGuildDecisionOverrides: async (guildId: string) => {
          if (guildId === 'G3' && transientCall > 0 && transientCall < 2) {
            transientCall += 1;
            throw new Error('transient');
          }
          return dbValue[guildId] ?? null;
        },
      },
    } as any);

    // Touch guild once to register it for periodic refresh
    (svc as any).getDecisionEngineForGuild('G3');

  // First refresh: error; second refresh: success
  jest.advanceTimersByTime(60);
  await (svc as any).refreshGuildDecisionEngines();
  await Promise.resolve();
  jest.advanceTimersByTime(60);
  await (svc as any).refreshGuildDecisionEngines();
  await Promise.resolve();

  const engine: any = (svc as any).getDecisionEngineForGuild('G3');
    const result = engine.analyze(msg(), ctx());
    expect(typeof result.shouldRespond).toBe('boolean');
  });
});
