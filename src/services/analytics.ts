import { prisma } from '../db/prisma.js';

export interface InteractionLog {
  guildId: string | null;
  userId: string;
  command: string;
  isSuccess: boolean;
}

export interface DetailedStats {
  total: number;
  commandsToday: number;
  commandsThisWeek: number;
  commandsThisMonth: number;
  perUser: Record<string, number>;
  perGuild: Record<string, number>;
  perCommand: Record<string, number>;
  successRate: number;
  topUsers: Array<{ userId: string; count: number }>;
  topGuilds: Array<{ guildId: string; count: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
  dailyTrend: Array<{ date: string; count: number }>;
}

export interface UsageMetrics {
  timeRange: 'today' | 'week' | 'month' | 'all';
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  uniqueUsers: number;
  uniqueGuilds: number;
  averageCommandsPerUser: number;
  mostActiveHour: number;
  mostActiveDay: string;
  commandBreakdown: Record<string, number>;
}

export async function logInteraction({ guildId, userId, command, isSuccess }: InteractionLog): Promise<void> {
  await prisma.analyticsEvent.create({ 
    data: { 
      guildId: guildId ?? undefined, 
      userId, 
      command, 
      isSuccess 
    } 
  });
}

export async function getStats(): Promise<StatsSummary> {
  const events = await prisma.analyticsEvent.findMany();
  const perUser: Record<string, number> = {};
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  let commandsToday = 0;
  for (const e of events) {
    if (e.timestamp >= todayStart) commandsToday++;
    perUser[e.userId] = (perUser[e.userId] || 0) + 1;
  }
  return { total: events.length, commandsToday, perUser };
}

export async function getDetailedStats(): Promise<DetailedStats> {
  const events = await prisma.analyticsEvent.findMany({
    orderBy: { timestamp: 'desc' }
  });

  // Time boundaries
  const now = new Date();
  const last24hStart = new Date(now.getTime() - 1000 * 60 * 60 * 24);
  
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  
  const monthStart = new Date(now);
  monthStart.setMonth(now.getMonth() - 1);

  // Counters
  let commandsToday = 0;
  let commandsThisWeek = 0;
  let commandsThisMonth = 0;
  let successfulCommands = 0;
  
  const perUser: Record<string, number> = {};
  const perGuild: Record<string, number> = {};
  const perCommand: Record<string, number> = {};
  const hourlyDistribution: Record<number, number> = {};
  const dailyTrend: Record<string, number> = {};

  // Process events
  for (const event of events) {
    const eventDate = new Date(event.timestamp);
    
    // Time-based counting
    if (eventDate >= last24hStart) commandsToday++;
    if (eventDate >= weekStart) commandsThisWeek++;
    if (eventDate >= monthStart) commandsThisMonth++;
    
    // Success tracking
    if (event.isSuccess) successfulCommands++;
    
    // User tracking
    perUser[event.userId] = (perUser[event.userId] || 0) + 1;
    
    // Guild tracking
    if (event.guildId) {
      perGuild[event.guildId] = (perGuild[event.guildId] || 0) + 1;
    }
    
    // Command tracking
    perCommand[event.command] = (perCommand[event.command] || 0) + 1;
    
    // Hourly distribution
    const hour = eventDate.getHours();
    hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    
    // Daily trend (last 30 days)
    const dateKey = eventDate.toISOString().split('T')[0];
    dailyTrend[dateKey] = (dailyTrend[dateKey] || 0) + 1;
  }

  // Calculate derived metrics
  const successRate = events.length > 0 ? (successfulCommands / events.length) * 100 : 0;
  
  const topUsers = Object.entries(perUser)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([userId, count]) => ({ userId, count }));
    
  const topGuilds = Object.entries(perGuild)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([guildId, count]) => ({ guildId, count }));

  const hourlyDistributionArray = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hourlyDistribution[hour] || 0
  }));

  const dailyTrendArray = Object.entries(dailyTrend)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30) // Last 30 days
    .map(([date, count]) => ({ date, count }));

  return {
    total: events.length,
    commandsToday,
    commandsThisWeek,
    commandsThisMonth,
    perUser,
    perGuild,
    perCommand,
    successRate: Math.round(successRate * 100) / 100,
    topUsers,
    topGuilds,
    hourlyDistribution: hourlyDistributionArray,
    dailyTrend: dailyTrendArray
  };
}

export async function getUsageMetrics(timeRange: 'today' | 'week' | 'month' | 'all' = 'all'): Promise<UsageMetrics> {
  const now = new Date();
  let startDate: Date;

  switch (timeRange) {
    case 'today':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      break;
    default:
      startDate = new Date(0); // Beginning of time
  }

  const events = await prisma.analyticsEvent.findMany({
    where: {
      timestamp: {
        gte: startDate
      }
    }
  });

  const totalCommands = events.length;
  const successfulCommands = events.filter((e: any) => e.isSuccess).length;
  const failedCommands = totalCommands - successfulCommands;
  const uniqueUsers = new Set(events.map((e: any) => e.userId)).size;
  const uniqueGuilds = new Set(events.filter((e: any) => e.guildId).map((e: any) => e.guildId)).size;
  const averageCommandsPerUser = uniqueUsers > 0 ? Math.round((totalCommands / uniqueUsers) * 100) / 100 : 0;

  // Most active hour
  const hourCounts: Record<number, number> = {};
  events.forEach((event: any) => {
    const hour = new Date(event.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  const mostActiveHour = Object.entries(hourCounts).reduce((max, [hour, count]) => 
    count > (hourCounts[max] || 0) ? parseInt(hour) : max, 0
  );

  // Most active day
  const dayCounts: Record<string, number> = {};
  events.forEach((event: any) => {
    const day = new Date(event.timestamp).toISOString().split('T')[0];
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
  const mostActiveDay = Object.entries(dayCounts).reduce((max, [day, count]) => 
    count > (dayCounts[max] || 0) ? day : max, ''
  );

  // Command breakdown
  const commandBreakdown: Record<string, number> = {};
  events.forEach((event: any) => {
    commandBreakdown[event.command] = (commandBreakdown[event.command] || 0) + 1;
  });

  return {
    timeRange,
    totalCommands,
    successfulCommands,
    failedCommands,
    uniqueUsers,
    uniqueGuilds,
    averageCommandsPerUser,
    mostActiveHour,
    mostActiveDay,
    commandBreakdown
  };
}

export interface StatsSummary {
  total: number;
  commandsToday: number;
  perUser: Record<string, number>;
}
