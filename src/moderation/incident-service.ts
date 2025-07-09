/**
 * Moderation Incident Service
 * Manages logging and tracking of moderation events
 */

import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { ModerationIncident } from './types.js';

export interface ModerationStats {
  totalIncidents: number;
  incidentsToday: number;
  incidentsByType: Record<string, number>;
  incidentsBySeverity: Record<string, number>;
  topUsers: Array<{ userId: string; count: number }>;
  recentIncidents: ModerationIncident[];
}

/**
 * Service for logging and managing moderation incidents
 */
export class ModerationIncidentService {

  /**
   * Log a moderation incident
   */
  async logIncident(incident: Omit<ModerationIncident, 'id' | 'createdAt'>): Promise<ModerationIncident> {
    try {
      const dbIncident = await prisma.moderationIncident.create({
        data: {
          guildId: incident.guildId,
          userId: incident.userId,
          type: incident.type,
          severity: incident.severity,
          action: incident.action,
          reason: incident.reason,
          contentHash: incident.contentHash,
          metadata: incident.metadata ? JSON.stringify(incident.metadata) : null
        }
      });

      const savedIncident: ModerationIncident = {
        id: dbIncident.id,
        guildId: dbIncident.guildId,
        userId: dbIncident.userId,
        type: dbIncident.type as 'text' | 'image' | 'attachment',
        severity: dbIncident.severity as 'low' | 'medium' | 'high' | 'critical',
        action: dbIncident.action as 'blocked' | 'warned' | 'logged',
        reason: dbIncident.reason || undefined,
        contentHash: dbIncident.contentHash || undefined,
        metadata: dbIncident.metadata ? JSON.parse(dbIncident.metadata) : undefined,
        createdAt: dbIncident.createdAt
      };

      logger.info('Moderation incident logged', {
        operation: 'moderation-incident-log',
        guildId: incident.guildId,
        userId: incident.userId,
        metadata: {
          type: incident.type,
          severity: incident.severity,
          action: incident.action,
          reason: incident.reason
        }
      });

      return savedIncident;

    } catch (error) {
      logger.error('Failed to log moderation incident', {
        operation: 'moderation-incident-log',
        guildId: incident.guildId,
        userId: incident.userId,
        metadata: { errorMessage: error instanceof Error ? error.message : 'Unknown error' }
      });
      throw error;
    }
  }

  /**
   * Get moderation statistics for a guild
   */
  async getStats(guildId: string, days = 30): Promise<ModerationStats> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all incidents for the guild within timeframe
      const incidents = await prisma.moderationIncident.findMany({
        where: {
          guildId,
          createdAt: { gte: since }
        },
        orderBy: { createdAt: 'desc' },
        take: 100 // Limit for performance
      });

      // Calculate statistics
      const totalIncidents = incidents.length;
      const incidentsToday = incidents.filter((i: any) => i.createdAt >= today).length;

      const incidentsByType = incidents.reduce((acc: any, incident: any) => {
        acc[incident.type] = (acc[incident.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const incidentsBySeverity = incidents.reduce((acc: any, incident: any) => {
        acc[incident.severity] = (acc[incident.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const userCounts = incidents.reduce((acc: any, incident: any) => {
        acc[incident.userId] = (acc[incident.userId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topUsers = Object.entries(userCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([userId, count]) => ({ userId, count: count as number }));

      const recentIncidents: ModerationIncident[] = incidents.slice(0, 20).map((incident: any) => ({
        id: incident.id,
        guildId: incident.guildId,
        userId: incident.userId,
        type: incident.type as 'text' | 'image' | 'attachment',
        severity: incident.severity as 'low' | 'medium' | 'high' | 'critical',
        action: incident.action as 'blocked' | 'warned' | 'logged',
        reason: incident.reason || undefined,
        contentHash: incident.contentHash || undefined,
        metadata: incident.metadata ? JSON.parse(incident.metadata) : undefined,
        createdAt: incident.createdAt
      }));

      return {
        totalIncidents,
        incidentsToday,
        incidentsByType,
        incidentsBySeverity,
        topUsers,
        recentIncidents
      };

    } catch (error) {
      logger.error('Failed to get moderation stats', {
        operation: 'moderation-stats-get',
        guildId,
        metadata: { errorMessage: error instanceof Error ? error.message : 'Unknown error' }
      });
      throw error;
    }
  }

  /**
   * Get incidents for a specific user
   */
  async getUserIncidents(guildId: string, userId: string, limit = 20): Promise<ModerationIncident[]> {
    try {
      const dbIncidents = await prisma.moderationIncident.findMany({
        where: { guildId, userId },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      const incidents = dbIncidents.map((incident: any) => ({
        id: incident.id,
        guildId: incident.guildId,
        userId: incident.userId,
        type: incident.type as 'text' | 'image' | 'attachment',
        severity: incident.severity as 'low' | 'medium' | 'high' | 'critical',
        action: incident.action as 'blocked' | 'warned' | 'logged',
        reason: incident.reason || undefined,
        contentHash: incident.contentHash || undefined,
        metadata: incident.metadata ? JSON.parse(incident.metadata) : undefined,
        createdAt: incident.createdAt
      }));

      return incidents;

    } catch (error) {
      logger.error('Failed to get user incidents', {
        operation: 'moderation-user-incidents-get',
        guildId,
        userId,
        metadata: { errorMessage: error instanceof Error ? error.message : 'Unknown error' }
      });
      throw error;
    }
  }

  /**
   * Delete old incidents (cleanup)
   */
  async cleanupOldIncidents(daysOld = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await prisma.moderationIncident.deleteMany({
        where: {
          createdAt: { lt: cutoffDate }
        }
      });

      logger.info('Cleaned up old moderation incidents', {
        operation: 'moderation-cleanup',
        metadata: { deletedCount: result.count, daysOld }
      });

      return result.count;

    } catch (error) {
      logger.error('Failed to cleanup old incidents', {
        operation: 'moderation-cleanup',
        metadata: { errorMessage: error instanceof Error ? error.message : 'Unknown error' }
      });
      throw error;
    }
  }

  /**
   * Export incidents for a guild (admin use)
   */
  async exportIncidents(guildId: string, days = 30): Promise<ModerationIncident[]> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const dbIncidents = await prisma.moderationIncident.findMany({
        where: {
          guildId,
          createdAt: { gte: since }
        },
        orderBy: { createdAt: 'desc' }
      });

      const incidents = dbIncidents.map((incident: any) => ({
        id: incident.id,
        guildId: incident.guildId,
        userId: incident.userId,
        type: incident.type as 'text' | 'image' | 'attachment',
        severity: incident.severity as 'low' | 'medium' | 'high' | 'critical',
        action: incident.action as 'blocked' | 'warned' | 'logged',
        reason: incident.reason || undefined,
        contentHash: incident.contentHash || undefined,
        metadata: incident.metadata ? JSON.parse(incident.metadata) : undefined,
        createdAt: incident.createdAt
      }));

      return incidents;

    } catch (error) {
      logger.error('Failed to export incidents', {
        operation: 'moderation-export',
        guildId,
        metadata: { errorMessage: error instanceof Error ? error.message : 'Unknown error' }
      });
      throw error;
    }
  }
}

// Export singleton instance
export const moderationIncidentService = new ModerationIncidentService();
