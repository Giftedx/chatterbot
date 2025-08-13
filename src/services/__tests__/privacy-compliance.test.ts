/**
 * Privacy and Consent Management Tests
 * Tests for Discord data privacy compliance features
 */

import { UserConsentService } from '../user-consent.service.js';
import { CoreIntelligenceService } from '../core-intelligence.service.js';
import { handlePrivacyButtonInteraction } from '../../commands/privacy-commands.js';
import { privacyCommands } from '../../commands/privacy-commands.js';

// Mock prisma
jest.mock('../../db/prisma.js', () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    messageLog: { create: jest.fn() }
  }
}));

// Mock logger first before any imports
jest.mock('../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  Logger: {
    getInstance: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    })),
  },
}));

// Mock other services that may cause issues
jest.mock('../../services/cache.service.js', () => ({
  CacheService: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
  })),
}));

jest.mock('../../services/gemini.service.js', () => ({
  GeminiService: jest.fn().mockImplementation(() => ({
    generateResponse: jest.fn().mockResolvedValue({ content: 'Mock response' }),
  })),
}));

jest.mock('../../services/agentic-intelligence.service.js', () => ({
  AgenticIntelligenceService: {
    getInstance: jest.fn(() => ({
      handleQuery: jest.fn().mockResolvedValue({}),
    })),
  },
}));

describe('Privacy and Consent Management', () => {
  let userConsentService: UserConsentService;
  const mockUserId = 'test-user-123';
  const mockUsername = 'testuser';

  beforeEach(() => {
    userConsentService = UserConsentService.getInstance();
    jest.clearAllMocks();
  });

  describe('UserConsentService', () => {
    test('should allow user to opt in with privacy consent', async () => {
      const { prisma } = require('../../db/prisma.js');
      prisma.user.upsert.mockResolvedValue({
        id: mockUserId,
        username: mockUsername,
        optedInAt: new Date(),
        privacyAccepted: true,
      });

      const success = await userConsentService.optInUser(mockUserId, mockUsername, {
        consentToStore: true,
        consentToAnalyze: false,
        consentToPersonalize: false,
      });

      expect(success).toBe(true);
      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUserId },
          update: expect.objectContaining({
            privacyAccepted: true,
            consentToStore: true,
            consentToAnalyze: false,
            consentToPersonalize: false,
          }),
          create: expect.objectContaining({
            id: mockUserId,
            privacyAccepted: true,
            consentToStore: true,
            consentToAnalyze: false,
            consentToPersonalize: false,
          }),
        })
      );
    });

    test('should allow user to opt out', async () => {
      const { prisma } = require('../../db/prisma.js');
      prisma.user.update.mockResolvedValue({
        id: mockUserId,
        optedOut: true,
        optedOutAt: new Date(),
      });

      const success = await userConsentService.optOutUser(mockUserId);

      expect(success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          optedOut: true,
          optedOutAt: expect.any(Date),
        }),
      });
    });

    test('should check if user is opted in correctly', async () => {
      const { prisma } = require('../../db/prisma.js');
      
      // Test opted-in user
      prisma.user.findUnique.mockResolvedValue({
        id: mockUserId,
        optedOut: false,
        privacyAccepted: true,
      });

      const isOptedIn = await userConsentService.isUserOptedIn(mockUserId);
      expect(isOptedIn).toBe(true);

      // Test opted-out user
      prisma.user.findUnique.mockResolvedValue({
        id: mockUserId,
        optedOut: true,
        privacyAccepted: true,
      });

      const isOptedOut = await userConsentService.isUserOptedIn(mockUserId);
      expect(isOptedOut).toBe(false);

      // Test user without privacy acceptance
      prisma.user.findUnique.mockResolvedValue({
        id: mockUserId,
        optedOut: false,
        privacyAccepted: false,
      });

      const noPrivacy = await userConsentService.isUserOptedIn(mockUserId);
      expect(noPrivacy).toBe(false);
    });

    test('should pause and resume user interactions', async () => {
      const { prisma } = require('../../db/prisma.js');
      prisma.user.update.mockResolvedValue({});

      // Test pause
      const resumeTime = await userConsentService.pauseUser(mockUserId, 60);
      expect(resumeTime).toBeInstanceOf(Date);
      expect(resumeTime?.getTime()).toBeGreaterThan(Date.now());

      // Test resume
      const resumed = await userConsentService.resumeUser(mockUserId);
      expect(resumed).toBe(true);
    });

    test('should export user data correctly', async () => {
      const { prisma } = require('../../db/prisma.js');
      
      // Mock user consent data
      prisma.user.findUnique.mockResolvedValue({
        id: mockUserId,
        username: mockUsername,
        optedInAt: new Date(),
        privacyAccepted: true,
        dataRetentionDays: 90,
      });

      // Mock memories
      prisma.userMemory.findMany.mockResolvedValue([
        {
          id: 1,
          userId: mockUserId,
          memories: JSON.stringify({ name: 'Test User' }),
          preferences: JSON.stringify({ style: 'formal' }),
          memoryEmbeddings: [],
        },
      ]);

      // Mock conversations
      prisma.conversationMessage.findMany.mockResolvedValue([
        {
          id: 1,
          userId: mockUserId,
          content: 'Hello',
          role: 'user',
          mediaFiles: [],
        },
      ]);

      // Mock analytics
      prisma.analyticsEvent.findMany.mockResolvedValue([
        {
          id: 1,
          userId: mockUserId,
          command: 'chat',
          timestamp: new Date(),
        },
      ]);

      prisma.user.update.mockResolvedValue({});

      const exportData = await userConsentService.exportUserData(mockUserId);

      expect(exportData).toBeDefined();
      expect(exportData?.user.userId).toBe(mockUserId);
      expect(exportData?.memories).toHaveLength(1);
      expect(exportData?.conversations).toHaveLength(1);
      expect(exportData?.analytics).toHaveLength(1);
      expect(exportData?.retentionInfo.dataRetentionDays).toBe(90);
    });

    test('should delete all user data for GDPR compliance', async () => {
      const { prisma } = require('../../db/prisma.js');
      
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          userMemory: { deleteMany: jest.fn() },
          conversationMessage: { deleteMany: jest.fn() },
          userConversationThread: { deleteMany: jest.fn() },
          analyticsEvent: { deleteMany: jest.fn() },
          mediaFile: { deleteMany: jest.fn() },
          user: { delete: jest.fn() },
        };
        return callback(mockTx);
      });

      const success = await userConsentService.forgetUser(mockUserId);
      expect(success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('Privacy Commands', () => {
    test('should have all required privacy commands', () => {
      const commandNames = privacyCommands.map(cmd => cmd.data.name);
      
      expect(commandNames).toContain('privacy');
      expect(commandNames).toContain('optout');
      expect(commandNames).toContain('pause');
      expect(commandNames).toContain('resume');
      expect(commandNames).toContain('data-export');
      expect(commandNames).toContain('forget-me');
    });

    test('should handle privacy command execution', async () => {
      const { prisma } = require('../../db/prisma.js');
      prisma.user.findUnique.mockResolvedValue({
        id: mockUserId,
        optedInAt: new Date(),
        privacyAccepted: true,
        dataRetentionDays: 90,
      });

      const mockInteraction = {
        user: { id: mockUserId },
        reply: jest.fn().mockResolvedValue({}),
      };

      const privacyCommand = privacyCommands.find(cmd => cmd.data.name === 'privacy');
      await privacyCommand?.execute(mockInteraction as any);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
          ephemeral: true,
        })
      );
    });

    test('should handle opt-out command', async () => {
      const { prisma } = require('../../db/prisma.js');
      prisma.user.update.mockResolvedValue({});

      const mockInteraction = {
        user: { id: mockUserId },
        reply: jest.fn().mockResolvedValue({}),
      };

      const optoutCommand = privacyCommands.find(cmd => cmd.data.name === 'optout');
      await optoutCommand?.execute(mockInteraction as any);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          ephemeral: true,
        })
      );
    });
  });

  describe('Core Intelligence Integration', () => {
    test('should block messages from non-consented users', async () => {
      const { prisma } = require('../../db/prisma.js');
      
      // Mock user not opted in
      prisma.user.findUnique.mockResolvedValue(null);

      const coreService = new CoreIntelligenceService({
        enableAgenticFeatures: false,
        enablePersonalization: false,
        enableEnhancedMemory: false,
        enableEnhancedUI: false,
        enableResponseCache: false,
      });

      const mockMessage = {
        author: { id: mockUserId, bot: false },
        content: 'Hello bot',
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        reply: jest.fn(),
      };

      await coreService.handleMessage(mockMessage as any);

      // Should not reply to non-consented users
      expect(mockMessage.reply).not.toHaveBeenCalled();
      expect(mockMessage.channel.sendTyping).not.toHaveBeenCalled();
    });

    test('should process messages from consented users', async () => {
      const { prisma } = require('../../db/prisma.js');
      
      // Mock user opted in
      prisma.user.findUnique.mockResolvedValue({
        id: mockUserId,
        optedOut: false,
        privacyAccepted: true,
        scheduledDeletion: null,
      });

      prisma.user.update.mockResolvedValue({});

      const coreService = new CoreIntelligenceService({
        enableAgenticFeatures: false,
        enablePersonalization: false,
        enableEnhancedMemory: false,
        enableEnhancedUI: false,
        enableResponseCache: false,
      });

      const mockMessage = {
        author: { id: mockUserId, bot: false },
        content: 'Hello bot, how are you?',
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        reply: jest.fn(),
        channelId: 'test-channel',
        guildId: 'test-guild',
      };

      await coreService.handleMessage(mockMessage as any);

      // Should process message for consented users
      expect(mockMessage.channel.sendTyping).toHaveBeenCalled();
    });
  });

  describe('Consent Flow Integration', () => {
    test('should show privacy modal for first-time chat users', async () => {
      const { prisma } = require('../../db/prisma.js');
      
      // Mock user not opted in
      prisma.user.findUnique.mockResolvedValue(null);

      const mockInteraction = {
        user: { id: mockUserId, username: mockUsername },
        options: {
          getString: jest.fn().mockReturnValue('Hello bot'),
          getAttachment: jest.fn().mockReturnValue(null),
        },
        reply: jest.fn().mockResolvedValue({}),
        channelId: 'test-channel',
        guildId: 'test-guild',
      };

      const coreService = new CoreIntelligenceService({
        enableAgenticFeatures: false,
        enablePersonalization: false,
        enableEnhancedMemory: false,
        enableEnhancedUI: false,
        enableResponseCache: false,
      });

      await coreService.handleInteraction(mockInteraction as any);

      // Should show privacy consent modal
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
          ephemeral: true,
        })
      );
    });
  });
});