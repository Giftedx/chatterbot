import { CoreIntelligenceService } from '../core-intelligence.service.js';
import type { Message } from 'discord.js';

// Lightweight message mock
function makeMsg(content: string, guildId = 'G123', channelId = 'C1', userId = 'U1'): Message {
  return {
    id: 'M1',
    content,
    author: { id: userId } as any,
    guildId,
    channelId,
    reply: jest.fn(async () => undefined) as any,
  } as unknown as Message;
}

describe('Natural-language decision overrides controls', () => {
  test('parse and show overrides (admin, guild)', async () => {
    const svc = new CoreIntelligenceService({
      enableAgenticFeatures: false,
      enablePersonalization: false,
      enableEnhancedMemory: false,
      enableEnhancedUI: false,
      enableResponseCache: false,
      dependencies: {
        fetchGuildDecisionOverrides: async () => ({ ambientThreshold: 10 }),
      },
    });
    // Mock permission as admin
    (svc as any).permissionService = {
      hasAdminCommandPermission: async () => true,
    };

    const msg = makeMsg('show decision overrides');
    const handled = await (svc as any).handleControlIntent('OVERRIDES_SHOW', {}, msg);
    expect(handled).toBe(true);
    expect((msg as any).reply).toHaveBeenCalled();
    const replyArg = ((msg as any).reply as jest.Mock).mock.calls[0][0] as string;
    expect(replyArg).toContain('ambientThreshold');
  });

  test('set override refreshes engine and replies', async () => {
    const refreshSpy = jest.fn(async () => undefined);
    const svc = new CoreIntelligenceService({
      enableAgenticFeatures: false,
      enablePersonalization: false,
      enableEnhancedMemory: false,
      enableEnhancedUI: false,
      enableResponseCache: false,
      dependencies: {
        fetchGuildDecisionOverrides: async () => ({ ambientThreshold: 10 }),
      },
    });
    (svc as any).permissionService = { hasAdminCommandPermission: async () => true };
    (svc as any).refreshGuildDecisionEngines = refreshSpy;
    const msg = makeMsg('set override ambientThreshold 35');
    const handled = await (svc as any).handleControlIntent('OVERRIDES_SET', { key: 'ambientThreshold', value: 35 }, msg);
    expect(handled).toBe(true);
    expect(refreshSpy).toHaveBeenCalled();
    expect((msg as any).reply).toHaveBeenCalled();
  });

  test('clear all overrides replies', async () => {
    const svc = new CoreIntelligenceService({
      enableAgenticFeatures: false,
      enablePersonalization: false,
      enableEnhancedMemory: false,
      enableEnhancedUI: false,
      enableResponseCache: false,
    });
    (svc as any).permissionService = { hasAdminCommandPermission: async () => true };
    (svc as any).refreshGuildDecisionEngines = jest.fn(async () => undefined);
    const msg = makeMsg('clear all overrides');
    const handled = await (svc as any).handleControlIntent('OVERRIDES_CLEAR', { all: true }, msg);
    expect(handled).toBe(true);
    expect((msg as any).reply).toHaveBeenCalled();
  });
});
