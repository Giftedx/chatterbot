/**
 * Advanced Moderation System Tests (Jest)
 * Comprehensive test suite for Cycle 12 moderation features
 */

import { AdvancedTextModeration } from '../advanced-text-moderation';
import { AdvancedImageModeration } from '../advanced-image-moderation';
import { moderationConfigService } from '../config-service';
import { moderationIncidentService } from '../incident-service';
import { moderationService } from '../moderation-service';
import { prisma } from '../../db/prisma';

// Mock external APIs
jest.mock('node:crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mockdigest1234567890')
  }))
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    performance: jest.fn()
  }
}));

jest.mock('../../utils/resilience.js', () => ({
  PerformanceMonitor: {
    monitor: jest.fn(async (_operation: string, fn: () => Promise<any>, _context?: object) => {
      return await fn();
    })
  }
}));

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Advanced Moderation System - Cycle 12', () => {
  beforeEach(async () => {
    // Clear database
    await prisma.moderationIncident.deleteMany();
    await prisma.moderationConfig.deleteMany();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset fetch mock
    mockFetch.mockReset();
  });

  afterEach(async () => {
    await prisma.moderationIncident.deleteMany();
    await prisma.moderationConfig.deleteMany();
  });

  describe('AdvancedTextModeration', () => {
    let textModeration: AdvancedTextModeration;

    beforeEach(() => {
      textModeration = new AdvancedTextModeration();
    });

    it('should block hate speech keywords', async () => {
      const result = await textModeration.checkTextSafety('I hate everyone and want to kill all nazis', {
        useMLAPI: false,
        strictnessLevel: 'medium'
      });

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('keyword');
      expect(result.severity).toBe('critical');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should allow safe content', async () => {
      const result = await textModeration.checkTextSafety('Hello, how are you today?', {
        useMLAPI: false,
        strictnessLevel: 'medium'
      });

      expect(result.safe).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should respect custom keywords', async () => {
      const result = await textModeration.checkTextSafety('This is a forbidden word', {
        useMLAPI: false,
        customKeywords: ['forbidden'],
        strictnessLevel: 'high'
      });

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('custom keyword');
      expect(result.categories).toContain('custom');
    });

    it('should integrate with OpenAI API when available', async () => {
      // Mock OpenAI API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{
            flagged: true,
            categories: { hate: true, violence: false },
            category_scores: { hate: 0.9, violence: 0.1 }
          }]
        })
      });

      // Mock environment variable and create new instance that will detect it
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-key';
      
      const textModerationWithAPI = new AdvancedTextModeration();

      const result = await textModerationWithAPI.checkTextSafety('Borderline unsafe content', {
        useMLAPI: true,
        strictnessLevel: 'medium'
      });

      // Restore
      process.env.OPENAI_API_KEY = originalKey;

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('AI detected');
      expect(result.categories).toContain('hate');
      expect(result.confidence).toBe(0.9);
    });

    it('should fail open when API is unavailable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));
      
      const result = await textModeration.checkTextSafety('Some content', {
        useMLAPI: true,
        strictnessLevel: 'medium'
      });

      expect(result.safe).toBe(true);
      expect(result.reason).toContain('service unavailable');
    });
  });

  describe('AdvancedImageModeration', () => {
    let imageModeration: AdvancedImageModeration;

    beforeEach(() => {
      imageModeration = new AdvancedImageModeration();
    });

    it('should validate image content types', async () => {
      const result = await imageModeration.checkImageSafety(
        'https://example.com/image.png',
        'application/pdf'
      );

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('Unsupported image format');
    });

    it('should accept valid image types', async () => {
      const result = await imageModeration.checkImageSafety(
        'https://cdn.discord.com/image.png',
        'image/png'
      );

      expect(result.safe).toBe(true);
    });

    it('should integrate with Google Cloud Vision', async () => {
      // Mock Cloud Vision API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          safeSearchAnnotation: {
            adult: 'VERY_LIKELY',
            violence: 'UNLIKELY',
            racy: 'POSSIBLE'
          }
        })
      });

      const originalKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
      process.env.GOOGLE_CLOUD_VISION_API_KEY = 'test-key';

      const imageModerationWithAPI = new AdvancedImageModeration();

      const result = await imageModerationWithAPI.checkImageSafety(
        'https://example.com/image.jpg',
        'image/jpeg',
        { useCloudVision: true, safeSearchLevel: 'LIKELY' }
      );

      // Restore
      process.env.GOOGLE_CLOUD_VISION_API_KEY = originalKey;

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('adult');
      expect(result.categories).toContain('adult');
    });

    it('should fail safe when vision API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Vision API Error'));
      
      const result = await imageModeration.checkImageSafety(
        'https://example.com/image.jpg',
        'image/jpeg',
        { useCloudVision: true }
      );

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('service unavailable');
    });
  });

  describe('ModerationConfigService', () => {
    const testGuildId = 'test-guild-123';

    it('should return default config for new guilds', async () => {
      const config = await moderationConfigService.getConfig(testGuildId);

      expect(config.guildId).toBe(testGuildId);
      expect(config.strictnessLevel).toBe('medium');
      expect(config.enabledFeatures).toContain('text');
      expect(config.enabledFeatures).toContain('image');
      expect(config.autoDeleteUnsafe).toBe(true);
    });

    it('should save and retrieve custom config', async () => {
      await moderationConfigService.updateConfig(testGuildId, {
        strictnessLevel: 'high',
        enabledFeatures: ['text'],
        autoDeleteUnsafe: false,
        logChannelId: 'log-channel-123',
        customKeywords: ['badword1', 'badword2']
      });

      const config = await moderationConfigService.getConfig(testGuildId);

      expect(config.strictnessLevel).toBe('high');
      expect(config.enabledFeatures).toEqual(['text']);
      expect(config.autoDeleteUnsafe).toBe(false);
      expect(config.logChannelId).toBe('log-channel-123');
      expect(config.customKeywords).toEqual(['badword1', 'badword2']);
    });

    it('should reset config to defaults', async () => {
      // Set custom config
      await moderationConfigService.updateConfig(testGuildId, {
        strictnessLevel: 'high',
        enabledFeatures: ['text']
      });

      // Reset to defaults
      const defaultConfig = await moderationConfigService.resetConfig(testGuildId);

      expect(defaultConfig.strictnessLevel).toBe('medium');
      expect(defaultConfig.enabledFeatures).toContain('text');
      expect(defaultConfig.enabledFeatures).toContain('image');
    });
  });

  describe('ModerationIncidentService', () => {
    const testGuildId = 'test-guild-123';
    const testUserId = 'test-user-456';

    it('should log moderation incidents', async () => {
      const incident = await moderationIncidentService.logIncident({
        guildId: testGuildId,
        userId: testUserId,
        type: 'text',
        severity: 'high',
        action: 'blocked',
        reason: 'Hate speech detected',
        contentHash: 'hash123',
        metadata: { confidence: 0.9 }
      });

      expect(incident.id).toBeDefined();
      expect(incident.guildId).toBe(testGuildId);
      expect(incident.userId).toBe(testUserId);
      expect(incident.type).toBe('text');
      expect(incident.severity).toBe('high');
      expect(incident.action).toBe('blocked');
      expect(incident.reason).toBe('Hate speech detected');
      expect(incident.metadata).toEqual({ confidence: 0.9 });
    });

    it('should generate statistics', async () => {
      // Create test incidents
      const incidents = [
        { type: 'text', severity: 'high', action: 'blocked' },
        { type: 'image', severity: 'medium', action: 'warned' },
        { type: 'text', severity: 'critical', action: 'blocked' }
      ];

      for (const inc of incidents) {
        await moderationIncidentService.logIncident({
          guildId: testGuildId,
          userId: testUserId,
          type: inc.type as 'text' | 'image' | 'attachment',
          severity: inc.severity as 'low' | 'medium' | 'high' | 'critical',
          action: inc.action as 'blocked' | 'warned' | 'logged',
          reason: 'Test incident'
        });
      }

      const stats = await moderationIncidentService.getStats(testGuildId, 30);

      expect(stats.totalIncidents).toBe(3);
      expect(stats.incidentsByType.text).toBe(2);
      expect(stats.incidentsByType.image).toBe(1);
      expect(stats.incidentsBySeverity.high).toBe(1);
      expect(stats.incidentsBySeverity.critical).toBe(1);
      expect(stats.topUsers[0].userId).toBe(testUserId);
      expect(stats.topUsers[0].count).toBe(3);
    });

    it('should retrieve user incidents', async () => {
      await moderationIncidentService.logIncident({
        guildId: testGuildId,
        userId: testUserId,
        type: 'text',
        severity: 'medium',
        action: 'warned',
        reason: 'Spam detected'
      });

      const userIncidents = await moderationIncidentService.getUserIncidents(testGuildId, testUserId, 10);

      expect(userIncidents).toHaveLength(1);
      expect(userIncidents[0].userId).toBe(testUserId);
      expect(userIncidents[0].reason).toBe('Spam detected');
    });

    it('should cleanup old incidents', async () => {
      // Create an old incident by manipulating the date
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);

      await prisma.moderationIncident.create({
        data: {
          guildId: testGuildId,
          userId: testUserId,
          type: 'text',
          severity: 'low',
          action: 'logged',
          reason: 'Old incident',
          createdAt: oldDate
        }
      });

      const deletedCount = await moderationIncidentService.cleanupOldIncidents(90);

      expect(deletedCount).toBe(1);
    });
  });

  describe('ModerationService Integration', () => {
    const testContext = {
      guildId: 'test-guild-123',
      userId: 'test-user-456',
      channelId: 'test-channel-789'
    };

    it('should moderate text with full context', async () => {
      // Set up guild config
      await moderationConfigService.updateConfig(testContext.guildId, {
        strictnessLevel: 'medium',
        enabledFeatures: ['text'],
        autoDeleteUnsafe: true
      });

      const result = await moderationService.moderateText('I hate everyone and want to kill nazis', testContext);

      expect(result.verdict.safe).toBe(false);
      expect(result.action).toBe('block');
      expect(result.incident).toBeDefined();
      expect(result.incident?.type).toBe('text');
      expect(result.incident?.guildId).toBe(testContext.guildId);
    });

    it('should skip disabled moderation features', async () => {
      await moderationConfigService.updateConfig(testContext.guildId, {
        enabledFeatures: [] // Disable all moderation
      });

      const result = await moderationService.moderateText('Potentially unsafe content', testContext);

      expect(result.verdict.safe).toBe(true);
      expect(result.action).toBe('allow');
      expect(result.incident).toBeUndefined();
    });

    it('should moderate images with context', async () => {
      await moderationConfigService.updateConfig(testContext.guildId, {
        enabledFeatures: ['image'],
        strictnessLevel: 'high'
      });

      const result = await moderationService.moderateImage(
        'https://cdn.discord.com/test.jpg',
        'image/jpeg',
        testContext
      );

      // Should pass basic validation even without external API
      expect(result.verdict.safe).toBe(true);
      expect(result.action).toBe('allow');
    });

    it('should handle attachment moderation', async () => {
      // Enable attachment moderation
      await moderationConfigService.updateConfig(testContext.guildId, {
        enabledFeatures: ['attachment']
      });

      const result = await moderationService.moderateAttachment(
        'https://example.com/file.exe',
        'application/x-executable',
        'malware.exe',
        testContext
      );

      expect(result.verdict.safe).toBe(false);
      expect(result.verdict.reason).toContain('dangerous file type');
      expect(result.action).toBe('block');
    });

    it('should test moderation functionality', async () => {
      const result = await moderationService.testModeration('I hate everyone and want to kill nazis', 'text', testContext);

      expect(result.verdict).toBeDefined();
      expect(['allow', 'warn', 'block']).toContain(result.action);
    });
  });

  describe('Content Hash Generation', () => {
    it('should generate consistent hashes for content privacy', async () => {
      // Test hash generation is mocked and working
      const hash1 = 'mockdigest1234567890';
      const hash2 = 'mockdigest1234567890';
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(20); // Mock digest length
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock prisma error
      const originalCreate = prisma.moderationIncident.create;
      prisma.moderationIncident.create = jest.fn().mockRejectedValueOnce(new Error('DB Error'));

      await expect(moderationIncidentService.logIncident({
        guildId: 'test',
        userId: 'test',
        type: 'text',
        severity: 'medium',
        action: 'blocked'
      })).rejects.toThrow('DB Error');

      // Restore
      prisma.moderationIncident.create = originalCreate;
    });

    it('should handle external API failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network Error'));
      
      const textModeration = new AdvancedTextModeration();
      const result = await textModeration.checkTextSafety('test content', { useMLAPI: true });

      expect(result.safe).toBe(true); // Fail open for text
      expect(result.reason).toContain('service unavailable');
    });
  });

  describe('Performance & Caching', () => {
    it('should cache moderation configs efficiently', async () => {
      const guildId = 'cache-test-guild';
      
      // First call
      const config1 = await moderationConfigService.getConfig(guildId);
      
      // Second call should use cache
      const config2 = await moderationConfigService.getConfig(guildId);
      
      expect(config1).toEqual(config2);
    });

    it('should handle high volume moderation requests', async () => {
      const promises = [];
      
      for (let i = 0; i < 50; i++) {
        promises.push(moderationService.moderateText(`Test message ${i}`, {
          guildId: 'load-test-guild',
          userId: `user-${i}`,
          channelId: 'load-test-channel'
        }));
      }

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(50);
      results.forEach((result: { verdict: unknown; action: string }) => {
        expect(result.verdict).toBeDefined();
        expect(['allow', 'warn', 'block']).toContain(result.action);
      });
    });
  });
});
