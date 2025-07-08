import { getDetailedStats, getUsageMetrics } from '../analytics';

// Mock Prisma
jest.mock('../../db/prisma', () => ({
  prisma: {
    analyticsEvent: {
      findMany: jest.fn(),
      create: jest.fn()
    }
  }
}));

// Import after mocking
import { prisma } from '../../db/prisma';

describe('Enhanced Analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDetailedStats', () => {
    it('calculates comprehensive statistics', async () => {
      const mockEvents = [
        {
          userId: 'user1',
          guildId: 'guild1',
          command: 'gemini',
          isSuccess: true,
          timestamp: new Date()
        },
        {
          userId: 'user2',
          guildId: 'guild1',
          command: 'persona',
          isSuccess: true,
          timestamp: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
        },
        {
          userId: 'user1',
          guildId: 'guild2',
          command: 'gemini',
          isSuccess: false,
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25) // 25 hours ago
        }
      ];

      (prisma.analyticsEvent.findMany as jest.Mock).mockResolvedValue(mockEvents);

      const stats = await getDetailedStats();

      expect(stats.total).toBe(3);
      expect(stats.commandsToday).toBe(2);
      expect(stats.successRate).toBe(66.67);
      expect(stats.perCommand).toEqual({ gemini: 2, persona: 1 });
      expect(stats.topUsers).toHaveLength(2);
    });
  });

  describe('getUsageMetrics', () => {
    it('calculates metrics for different time ranges', async () => {
      const today = new Date();
      const mockEvents = [
        {
          userId: 'user1',
          guildId: 'guild1',
          command: 'gemini',
          isSuccess: true,
          timestamp: today
        }
      ];

      (prisma.analyticsEvent.findMany as jest.Mock).mockResolvedValue(mockEvents);

      const metrics = await getUsageMetrics('today');

      expect(metrics.timeRange).toBe('today');
      expect(metrics.totalCommands).toBe(1);
      expect(metrics.successfulCommands).toBe(1);
      expect(metrics.uniqueUsers).toBe(1);
    });

    it('handles empty data gracefully', async () => {
      (prisma.analyticsEvent.findMany as jest.Mock).mockResolvedValue([]);

      const metrics = await getUsageMetrics('all');

      expect(metrics.totalCommands).toBe(0);
      expect(metrics.uniqueUsers).toBe(0);
      expect(metrics.averageCommandsPerUser).toBe(0);
    });
  });
});
