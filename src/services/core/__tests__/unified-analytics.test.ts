/**
 * Unified Analytics Service Tests
 * 
 * Tests the consolidated analytics and dashboard functionality
 */

// Mock Prisma first
jest.mock('../../../db/prisma.js', () => ({
  prisma: {
    analyticsEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn()
    }
  }
}));

import { UnifiedAnalyticsService } from '../unified-analytics.service';
import { prisma } from '../../../db/prisma.js';

const mockPrisma = prisma as any;

describe('UnifiedAnalyticsService', () => {
  let service: UnifiedAnalyticsService;

  beforeEach(() => {
    service = new UnifiedAnalyticsService({
      enableDashboard: false, // Disable server for tests
      enableRealTimeMetrics: true
    });
    jest.clearAllMocks();
  });

  describe('Interaction Logging', () => {
    it('should log interaction events successfully', async () => {
      mockPrisma.analyticsEvent.create.mockResolvedValue({
        id: '1',
        guildId: 'guild123',
        userId: 'user123',
        command: '/test',
        isSuccess: true,
        timestamp: new Date()
      });

      await service.logInteraction({
        guildId: 'guild123',
        userId: 'user123',
        command: '/test',
        isSuccess: true
      });

      expect(mockPrisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: {
          guildId: 'guild123',
          userId: 'user123',
          command: '/test',
          isSuccess: true,
          timestamp: expect.any(Date)
        }
      });
    });

    it('should handle null guild IDs', async () => {
      await service.logInteraction({
        guildId: null,
        userId: 'user123',
        command: '/test',
        isSuccess: true
      });

      expect(mockPrisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: {
          guildId: undefined,
          userId: 'user123',
          command: '/test',
          isSuccess: true,
          timestamp: expect.any(Date)
        }
      });
    });

    it('should handle logging errors gracefully', async () => {
      mockPrisma.analyticsEvent.create.mockRejectedValue(new Error('Database error'));
      
      // Should not throw
      await expect(service.logInteraction({
        guildId: 'guild123',
        userId: 'user123',
        command: '/test',
        isSuccess: true
      })).resolves.toBeUndefined();
    });
  });

  describe('Detailed Statistics', () => {
    const mockEvents = [
      {
        id: '1',
        userId: 'user1',
        guildId: 'guild1',
        command: '/help',
        isSuccess: true,
        timestamp: new Date('2024-01-01T10:00:00Z')
      },
      {
        id: '2',
        userId: 'user2',
        guildId: 'guild1',
        command: '/info',
        isSuccess: false,
        timestamp: new Date('2024-01-01T15:00:00Z')
      },
      {
        id: '3',
        userId: 'user1',
        guildId: 'guild2',
        command: '/help',
        isSuccess: true,
        timestamp: new Date('2024-01-02T12:00:00Z')
      }
    ];

    beforeEach(() => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue(mockEvents);
    });

    it('should calculate detailed statistics correctly', async () => {
      const stats = await service.getDetailedStats();

      expect(stats.total).toBe(3);
      expect(stats.successRate).toBeCloseTo(66.67, 1); // 2 successful out of 3
      expect(stats.perUser).toEqual({
        user1: 2,
        user2: 1
      });
      expect(stats.perGuild).toEqual({
        guild1: 2,
        guild2: 1
      });
      expect(stats.perCommand).toEqual({
        '/help': 2,
        '/info': 1
      });
    });

    it('should calculate top users correctly', async () => {
      const stats = await service.getDetailedStats();

      expect(stats.topUsers).toEqual([
        { userId: 'user1', count: 2 },
        { userId: 'user2', count: 1 }
      ]);
    });

    it('should handle hourly distribution', async () => {
      const stats = await service.getDetailedStats();

      expect(stats.hourlyDistribution).toHaveLength(24);
      expect(stats.hourlyDistribution[10].count).toBe(1); // 10:00 hour
      expect(stats.hourlyDistribution[15].count).toBe(1); // 15:00 hour
      expect(stats.hourlyDistribution[12].count).toBe(1); // 12:00 hour
    });

    it('should use caching for performance', async () => {
      // First call
      await service.getDetailedStats();
      expect(mockPrisma.analyticsEvent.findMany).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await service.getDetailedStats();
      expect(mockPrisma.analyticsEvent.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('Usage Metrics', () => {
    const mockEvents = [
      {
        userId: 'user1',
        guildId: 'guild1',
        command: '/help',
        isSuccess: true,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        userId: 'user2',
        guildId: 'guild1',
        command: '/info',
        isSuccess: false,
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      }
    ];

    beforeEach(() => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue(mockEvents);
    });

    it('should calculate usage metrics for different time ranges', async () => {
      const weekMetrics = await service.getUsageMetrics('week');

      expect(weekMetrics.timeRange).toBe('week');
      expect(weekMetrics.totalCommands).toBe(2);
      expect(weekMetrics.successfulCommands).toBe(1);
      expect(weekMetrics.failedCommands).toBe(1);
      expect(weekMetrics.uniqueUsers).toBe(2);
      expect(weekMetrics.uniqueGuilds).toBe(1);
    });

    it('should calculate command breakdown', async () => {
      const metrics = await service.getUsageMetrics('all');

      expect(metrics.commandBreakdown).toEqual({
        '/help': 1,
        '/info': 1
      });
    });

    it('should handle time range filters', async () => {
      await service.getUsageMetrics('today');
      
      expect(mockPrisma.analyticsEvent.findMany).toHaveBeenCalledWith({
        where: {
          timestamp: { gte: expect.any(Date) }
        },
        orderBy: { timestamp: 'desc' }
      });
    });
  });

  describe('Data Cleanup', () => {
    it('should clean up old analytics data', async () => {
      const service = new UnifiedAnalyticsService({ retentionDays: 30 });
      
      mockPrisma.analyticsEvent.deleteMany.mockResolvedValue({ count: 10 });

      await service.cleanupOldData();

      expect(mockPrisma.analyticsEvent.deleteMany).toHaveBeenCalledWith({
        where: {
          timestamp: { lt: expect.any(Date) }
        }
      });
    });

    it('should skip cleanup when retention days not set', async () => {
      const service = new UnifiedAnalyticsService({ retentionDays: undefined });

      await service.cleanupOldData();

      expect(mockPrisma.analyticsEvent.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('Dashboard Server Integration', () => {
    it('should initialize with dashboard disabled in tests', () => {
      const service = new UnifiedAnalyticsService({ enableDashboard: false });
      
      expect(service).toBeDefined();
    });

    it('should handle dashboard configuration', () => {
      const customConfig = {
        port: 4000,
        host: 'localhost',
        enableCors: false
      };

      const service = new UnifiedAnalyticsService({
        enableDashboard: true,
        dashboardConfig: customConfig
      });

      expect(service).toBeDefined();
    });
  });

  describe('Cache Management', () => {
    it('should invalidate cache after logging interactions', async () => {
      // Get fresh service instance to avoid cache pollution
      const freshService = new UnifiedAnalyticsService({ enableDashboard: false });
      
      // First get stats to populate cache
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([]);
      await freshService.getDetailedStats();

      // Log interaction (should invalidate cache)
      mockPrisma.analyticsEvent.create.mockResolvedValue({});
      await freshService.logInteraction({
        guildId: 'test',
        userId: 'test',
        command: '/test',
        isSuccess: true
      });

      // Clear mock and set new return value
      mockPrisma.analyticsEvent.findMany.mockClear();
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([
        { id: '1', userId: 'test', command: '/test', isSuccess: true, timestamp: new Date() }
      ]);

      // Next call should hit database again (cache invalidated)
      await freshService.getDetailedStats();
      expect(mockPrisma.analyticsEvent.findMany).toHaveBeenCalled();
    });

    it('should cache metrics for performance', async () => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([]);

      // Multiple calls to same metrics
      await service.getUsageMetrics('week');
      await service.getUsageMetrics('week');
      await service.getUsageMetrics('week');

      // Should only call database once due to caching
      expect(mockPrisma.analyticsEvent.findMany).toHaveBeenCalledTimes(1);
    });
  });
});