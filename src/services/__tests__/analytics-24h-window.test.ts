import { getDetailedStats } from '../analytics';

// Mock Prisma
jest.mock('../../db/prisma', () => ({
  prisma: {
    analyticsEvent: {
      findMany: jest.fn()
    }
  }
}));

import { prisma } from '../../db/prisma';

describe('Analytics 24h window', () => {
  it('counts commandsToday within last 24 hours only', async () => {
    const now = Date.now();
    const mockEvents = [
      { userId: 'u1', guildId: 'g1', command: 'x', isSuccess: true, timestamp: new Date(now - 1000) }, // within 24h
      { userId: 'u1', guildId: 'g1', command: 'x', isSuccess: true, timestamp: new Date(now - 1000 * 60 * 60 * 23) }, // within 24h
      { userId: 'u1', guildId: 'g1', command: 'x', isSuccess: true, timestamp: new Date(now - 1000 * 60 * 60 * 25) } // outside 24h
    ];

    (prisma.analyticsEvent.findMany as jest.Mock).mockResolvedValue(mockEvents);

    const stats = await getDetailedStats();
    expect(stats.commandsToday).toBe(2);
  });
});
