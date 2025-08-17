/**
 * Integration test for control intents on free-form messages (pause/resume export/delete move)
 * Focus on exercising shouldRespond → control intent handling paths.
 */

import { jest } from '@jest/globals';
import type { Message } from 'discord.js';
import { CoreIntelligenceService } from '../../src/services/core-intelligence.service.js';
import { UserConsentService } from '../../src/services/user-consent.service.js';

const mkMessage = (over: Partial<Message> = {}): Message => {
  return {
    id: 'm1',
    content: 'please pause for 5 minutes',
    author: { id: 'u1', bot: false, toString: () => '<@u1>' } as any,
    channelId: 'c1',
    guildId: 'g1' as any,
    client: { user: { id: 'bot1' } } as any,
    attachments: new Map() as any,
    channel: {
      sendTyping: async () => {},
      isTextBased: () => true,
      send: jest.fn(),
      awaitMessages: jest.fn(),
    } as any,
    reply: jest.fn(async () => {}),
    mentions: { users: { has: () => true } } as any,
    reference: undefined,
    ...over,
  } as any;
};

describe('CoreIntelligenceService - message control intents', () => {
  let service: CoreIntelligenceService;
  const consent = UserConsentService.getInstance();

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    jest.restoreAllMocks();

    // Consent and opt-in
    jest.spyOn(consent, 'isUserOptedIn').mockResolvedValue(true);
    jest
      .spyOn(consent, 'getUserConsent')
      .mockResolvedValue({ privacyAccepted: true, optedOut: false } as any);
    jest.spyOn(consent, 'isUserPaused').mockResolvedValue(false);
    jest
      .spyOn(consent, 'getRouting')
      .mockResolvedValue({ dmPreferred: false, lastThreadId: null } as any);
    jest.spyOn(consent, 'updateUserActivity').mockResolvedValue();
    jest.spyOn(consent, 'pauseUser').mockResolvedValue(new Date(Date.now() + 5 * 60 * 1000));
  });

  test('handles PAUSE control intent and replies', async () => {
    service = new CoreIntelligenceService({
      enableAgenticFeatures: false,
      enablePersonalization: false,
      enableEnhancedMemory: false,
      enableEnhancedUI: false,
      enableResponseCache: false,
    });

    const msg = mkMessage();
    await service.handleMessage(msg);

    // Should respond with pause confirmation
    expect((msg.reply as jest.Mock).mock.calls.length).toBeGreaterThan(0);
  const calledWith = (msg.reply as jest.Mock).mock.calls.map((c: unknown[]) => c[0]);
    expect(JSON.stringify(calledWith)).toMatch(/Paused for/i);
  });
});
