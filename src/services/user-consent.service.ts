/**
 * User Consent and Privacy Management Service
 * Handles user opt-in/opt-out, privacy consent, and data lifecycle
 */

import { getPrisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

export interface UserConsent {
  userId: string;
  username?: string;
  optedInAt?: Date;
  optedOut: boolean;
  optedOutAt?: Date;
  privacyAccepted: boolean;
  privacyAcceptedAt?: Date;
  dataRetentionDays: number;
  consentToStore: boolean;
  consentToAnalyze: boolean;
  consentToPersonalize: boolean;
  lastActivity: Date;
  dataExportedAt?: Date;
  scheduledDeletion?: Date;
  // Routing and controls
  dmPreferred?: boolean;
  lastThreadId?: string | null;
  pauseUntil?: Date | null;
}

export interface DataExportPayload {
  user: UserConsent;
  memories: any[];
  conversations: any[];
  analytics: any[];
  exportTimestamp: Date;
  retentionInfo: {
    dataRetentionDays: number;
    autoDeleteAfter: Date | null;
  };
}

export class UserConsentService {
  private static instance: UserConsentService;
  private readonly DEFAULT_RETENTION_DAYS = 90;
  // In-memory fallback store for local/dev when Prisma DB is disabled
  private memoryStore = new Map<string, UserConsent>();
  private get useMemoryOnly() {
    return process.env.DISABLE_PRISMA_DB === 'true';
  }

  public static getInstance(): UserConsentService {
    if (!UserConsentService.instance) {
      UserConsentService.instance = new UserConsentService();
    }
    return UserConsentService.instance;
  }

  /**
   * Get user consent status
   */
  public async getUserConsent(userId: string): Promise<UserConsent | null> {
    try {
      if (this.useMemoryOnly) {
        return this.memoryStore.get(userId) ?? null;
      }
      // Ensure prisma client is initialized
      const prismaClient = await getPrisma();

      const user = await prismaClient.user.findUnique({
        where: { id: userId },
      });

      if (!user) return null;

      return {
        userId: user.id,
        username: user.username || undefined,
        optedInAt: user.optedInAt || undefined,
        optedOut: user.optedOut,
        optedOutAt: user.optedOutAt || undefined,
        privacyAccepted: user.privacyAccepted,
        privacyAcceptedAt: user.privacyAcceptedAt || undefined,
        dataRetentionDays: user.dataRetentionDays,
        consentToStore: user.consentToStore,
        consentToAnalyze: user.consentToAnalyze,
        consentToPersonalize: user.consentToPersonalize,
        lastActivity: user.lastActivity,
        dataExportedAt: user.dataExportedAt || undefined,
        scheduledDeletion: user.scheduledDeletion || undefined,
        dmPreferred: user.dmPreferred,
        lastThreadId: user.lastThreadId || null,
        pauseUntil: user.pauseUntil || null,
      };
    } catch (error) {
      logger.error('Failed to get user consent', {
        operation: 'get-user-consent',
        userId,
        error: String(error),
      });
      // Graceful local fallback
      if (this.useMemoryOnly) return this.memoryStore.get(userId) ?? null;
      return null;
    }
  }

  /**
   * Check if user has opted in and given necessary consents
   */
  public async isUserOptedIn(userId: string): Promise<boolean> {
    try {
      const consent = await this.getUserConsent(userId);
      return consent ? !consent.optedOut && consent.privacyAccepted : false;
    } catch (error) {
      logger.error('Failed to check user opt-in status', {
        operation: 'check-opt-in',
        userId,
        error: String(error),
      });
      return false;
    }
  }

  /**
   * Opt in user with privacy consent
   */
  public async optInUser(
    userId: string,
    username?: string,
    consents: Partial<{
      consentToStore: boolean;
      consentToAnalyze: boolean;
      consentToPersonalize: boolean;
    }> = {},
  ): Promise<boolean> {
    try {
      const now = new Date();
      if (this.useMemoryOnly) {
        const existing = this.memoryStore.get(userId);
        const updated: UserConsent = {
          userId,
          username,
          optedInAt: now,
          optedOut: false,
          optedOutAt: undefined,
          privacyAccepted: true,
          privacyAcceptedAt: now,
          dataRetentionDays: this.DEFAULT_RETENTION_DAYS,
          consentToStore: consents.consentToStore ?? true,
          consentToAnalyze: consents.consentToAnalyze ?? false,
          consentToPersonalize: consents.consentToPersonalize ?? false,
          lastActivity: now,
          dmPreferred: existing?.dmPreferred ?? false,
          lastThreadId: existing?.lastThreadId ?? null,
          pauseUntil: null,
        };
        this.memoryStore.set(userId, updated);
        return true;
      }
      const prismaClient = await getPrisma();
      await prismaClient.user.upsert({
        where: { id: userId },
        update: {
          username: username || undefined,
          optedInAt: now,
          optedOut: false,
          optedOutAt: null,
          privacyAccepted: true,
          privacyAcceptedAt: now,
          consentToStore: consents.consentToStore ?? true,
          consentToAnalyze: consents.consentToAnalyze ?? false,
          consentToPersonalize: consents.consentToPersonalize ?? false,
          lastActivity: now,
          scheduledDeletion: null,
        },
        create: {
          id: userId,
          username: username || undefined,
          optedInAt: now,
          optedOut: false,
          privacyAccepted: true,
          privacyAcceptedAt: now,
          dataRetentionDays: this.DEFAULT_RETENTION_DAYS,
          consentToStore: consents.consentToStore ?? true,
          consentToAnalyze: consents.consentToAnalyze ?? false,
          consentToPersonalize: consents.consentToPersonalize ?? false,
          lastActivity: now,
          dmPreferred: false,
        },
      });

      logger.info('User opted in with privacy consent', {
        operation: 'opt-in-user',
        userId,
        username,
        consents,
      });

      return true;
    } catch (error) {
      logger.error('Failed to opt in user', {
        operation: 'opt-in-user',
        userId,
        username,
        error: String(error),
      });
      if (this.useMemoryOnly) return true;
      return false;
    }
  }

  /**
   * Opt out user from all bot interactions
   */
  public async optOutUser(userId: string): Promise<boolean> {
    try {
      const now = new Date();
      if (this.useMemoryOnly) {
        const existing = this.memoryStore.get(userId);
        if (existing) {
          existing.optedOut = true;
          existing.optedOutAt = now;
          existing.lastActivity = now;
          this.memoryStore.set(userId, existing);
        }
        return true;
      }
      const prismaClient = await getPrisma();
      await prismaClient.user.update({
        where: { id: userId },
        data: {
          optedOut: true,
          optedOutAt: now,
          lastActivity: now,
        },
      });

      logger.info('User opted out', {
        operation: 'opt-out-user',
        userId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to opt out user', {
        operation: 'opt-out-user',
        userId,
        error: String(error),
      });
      if (this.useMemoryOnly) return true;
      return false;
    }
  }

  /**
   * Temporarily pause user interactions
   */
  public async pauseUser(userId: string, minutes: number): Promise<Date | null> {
    try {
      const resumeAt = new Date(Date.now() + minutes * 60 * 1000);
      if (this.useMemoryOnly) {
        const existing = this.memoryStore.get(userId);
        if (existing) {
          existing.pauseUntil = resumeAt;
          existing.lastActivity = new Date();
          this.memoryStore.set(userId, existing);
        } else {
          this.memoryStore.set(userId, {
            userId,
            optedOut: false,
            privacyAccepted: true,
            dataRetentionDays: this.DEFAULT_RETENTION_DAYS,
            consentToStore: true,
            consentToAnalyze: false,
            consentToPersonalize: false,
            lastActivity: new Date(),
            pauseUntil: resumeAt,
          } as any);
        }
        return resumeAt;
      }
      const prismaClient = await getPrisma();
      await prismaClient.user.update({
        where: { id: userId },
        data: {
          pauseUntil: resumeAt,
          lastActivity: new Date(),
        },
      });

      logger.info('User interactions paused', {
        operation: 'pause-user',
        userId,
        minutes,
        resumeAt: resumeAt.toISOString(),
      });

      return resumeAt;
    } catch (error) {
      logger.error('Failed to pause user', {
        operation: 'pause-user',
        userId,
        error: String(error),
      });
      if (this.useMemoryOnly) return null;
      return null;
    }
  }

  /**
   * Resume user interactions (remove pause)
   */
  public async resumeUser(userId: string): Promise<boolean> {
    try {
      if (this.useMemoryOnly) {
        const existing = this.memoryStore.get(userId);
        if (existing) {
          existing.pauseUntil = null;
          existing.lastActivity = new Date();
          this.memoryStore.set(userId, existing);
        }
        return true;
      }
      const prismaClient = await getPrisma();
      await prismaClient.user.update({
        where: { id: userId },
        data: {
          pauseUntil: null,
          lastActivity: new Date(),
        },
      });

      logger.info('User interactions resumed', {
        operation: 'resume-user',
        userId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to resume user', {
        operation: 'resume-user',
        userId,
        error: String(error),
      });
      if (this.useMemoryOnly) return true;
      return false;
    }
  }

  /**
   * Check if user is currently paused
   */
  public async isUserPaused(userId: string): Promise<boolean> {
    try {
      if (this.useMemoryOnly) {
        const c = this.memoryStore.get(userId);
        return !!(c?.pauseUntil && c.pauseUntil > new Date());
      }
      const consent = await this.getUserConsent(userId);
      if (!consent || !consent.pauseUntil) return false;

      return consent.pauseUntil > new Date();
    } catch (error) {
      logger.error('Failed to check user pause status', {
        operation: 'check-pause-status',
        userId,
        error: String(error),
      });
      return false;
    }
  }

  /**
   * Export all user data as JSON
   */
  public async exportUserData(userId: string): Promise<DataExportPayload | null> {
    try {
      if (this.useMemoryOnly) {
        const userConsent = await this.getUserConsent(userId);
        if (!userConsent) return null;
        return {
          user: userConsent,
          memories: [],
          conversations: [],
          analytics: [],
          exportTimestamp: new Date(),
          retentionInfo: {
            dataRetentionDays: userConsent.dataRetentionDays,
            autoDeleteAfter: userConsent.scheduledDeletion || null,
          },
        };
      }
      const prismaClient = await getPrisma();
      // Get user consent data
      const userConsent = await this.getUserConsent(userId);
      if (!userConsent) return null;

      // Get user memories
      const memories = await prismaClient.userMemory.findMany({
        where: { userId },
        include: {
          memoryEmbeddings: true,
        },
      });

      // Get conversation messages
      const conversations = await prismaClient.conversationMessage.findMany({
        where: { userId },
        include: {
          mediaFiles: true,
        },
      });

      // Get analytics events
      const analytics = await prismaClient.analyticsEvent.findMany({
        where: { userId },
      });

      // Update export timestamp
      await prismaClient.user.update({
        where: { id: userId },
        data: {
          dataExportedAt: new Date(),
          lastActivity: new Date(),
        },
      });

      const exportPayload: DataExportPayload = {
        user: userConsent,
        memories: memories.map((m: any) => ({
          ...m,
          memories: JSON.parse(m.memories),
          preferences: m.preferences ? JSON.parse(m.preferences) : null,
        })),
        conversations: conversations.map((c: any) => ({
          ...c,
          topicTags: c.topicTags ? JSON.parse(c.topicTags) : null,
          attachmentData: c.attachmentData ? JSON.parse(c.attachmentData) : null,
          mediaFileIds: c.mediaFileIds ? JSON.parse(c.mediaFileIds) : null,
        })),
        analytics,
        exportTimestamp: new Date(),
        retentionInfo: {
          dataRetentionDays: userConsent.dataRetentionDays,
          autoDeleteAfter: userConsent.scheduledDeletion || null,
        },
      };

      logger.info('User data exported', {
        operation: 'export-user-data',
        userId,
        metadata: {
          memoriesCount: memories.length,
          conversationsCount: conversations.length,
          analyticsCount: analytics.length,
        },
      });

      return exportPayload;
    } catch (error) {
      logger.error('Failed to export user data', {
        operation: 'export-user-data',
        userId,
        error: String(error),
      });
      if (this.useMemoryOnly) return null;
      return null;
    }
  }

  /**
   * Delete all user data (GDPR right to be forgotten)
   */
  public async forgetUser(userId: string): Promise<boolean> {
    try {
      if (this.useMemoryOnly) {
        this.memoryStore.delete(userId);
        return true;
      }
      const prismaClient = await getPrisma();
      // Use transaction to ensure all data is deleted together
      await prismaClient.$transaction(async (tx: any) => {
        // Delete user memories and embeddings (cascade will handle embeddings)
        await tx.userMemory.deleteMany({
          where: { userId },
        });

        // Delete conversation messages and related media files
        await tx.conversationMessage.deleteMany({
          where: { userId },
        });

        // Delete user conversation threads
        await tx.userConversationThread.deleteMany({
          where: { userId },
        });

        // Delete analytics events
        await tx.analyticsEvent.deleteMany({
          where: { userId },
        });

        // Delete media files
        await tx.mediaFile.deleteMany({
          where: { userId },
        });

        // Finally delete the user record
        await tx.user.delete({
          where: { id: userId },
        });
      });

      logger.info('User data completely deleted (GDPR compliance)', {
        operation: 'forget-user',
        userId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete user data', {
        operation: 'forget-user',
        userId,
        error: String(error),
      });
      if (this.useMemoryOnly) return true;
      return false;
    }
  }

  /**
   * Update user activity timestamp
   */
  public async updateUserActivity(userId: string): Promise<void> {
    try {
      if (this.useMemoryOnly) {
        const c = this.memoryStore.get(userId);
        if (c) {
          c.lastActivity = new Date();
          this.memoryStore.set(userId, c);
        }
        return;
      }
      const prismaClient = await getPrisma();
      await prismaClient.user.update({
        where: { id: userId },
        data: {
          lastActivity: new Date(),
        },
      });
    } catch (error) {
      logger.debug('Failed to update user activity', {
        operation: 'update-activity',
        userId,
        error: String(error),
      });
    }
  }

  /**
   * Clean up expired user data based on retention policies
   */
  public async cleanupExpiredData(): Promise<number> {
    try {
      if (this.useMemoryOnly) {
        // No-op in memory mode
        return 0;
      }
      const prismaClient = await getPrisma();
      const users = await prismaClient.user.findMany({
        where: {
          scheduledDeletion: {
            lte: new Date(),
          },
        },
      });

      let deletedCount = 0;
      for (const user of users) {
        const success = await this.forgetUser(user.id);
        if (success) deletedCount++;
      }

      logger.info('Expired user data cleaned up', {
        operation: 'cleanup-expired-data',
        deletedCount,
      });

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired data', {
        operation: 'cleanup-expired-data',
        error: String(error),
      });
      if (this.useMemoryOnly) return 0;
      return 0;
    }
  }

  /**
   * Get users who have been inactive beyond their retention period
   */
  public async getExpiredUsers(): Promise<string[]> {
    try {
      if (this.useMemoryOnly) {
        // No persisted expirations in memory mode
        return [];
      }
      const prismaClient = await getPrisma();
      const users = await prismaClient.user.findMany({
        where: {
          lastActivity: {
            lt: new Date(Date.now() - this.DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          id: true,
        },
      });

      return users.map((u: any) => u.id);
    } catch (error) {
      logger.error('Failed to get expired users', {
        operation: 'get-expired-users',
        error: String(error),
      });
      if (this.useMemoryOnly) return [];
      return [];
    }
  }

  /** Lightweight ensure user exists and is opted in */
  public async ensureOptedIn(userId: string, username?: string): Promise<void> {
    const consent = await this.getUserConsent(userId);
    if (!consent || !consent.privacyAccepted || consent.optedOut) {
      await this.optInUser(userId, username);
    }
  }

  /** Set DM preference */
  public async setDmPreference(userId: string, dmPreferred: boolean): Promise<void> {
    try {
      if (this.useMemoryOnly) {
        const c =
          this.memoryStore.get(userId) ??
          ({
            userId,
            optedOut: false,
            privacyAccepted: true,
            dataRetentionDays: this.DEFAULT_RETENTION_DAYS,
            consentToStore: true,
            consentToAnalyze: false,
            consentToPersonalize: false,
            lastActivity: new Date(),
          } as any);
        c.dmPreferred = dmPreferred;
        this.memoryStore.set(userId, c);
        return;
      }
      const prismaClient = await getPrisma();
      await prismaClient.user.update({ where: { id: userId }, data: { dmPreferred } });
    } catch (error) {
      logger.error('Failed to set DM preference', { userId, dmPreferred, error: String(error) });
    }
  }

  /** Set last personal thread ID */
  public async setLastThreadId(userId: string, threadId: string | null): Promise<void> {
    try {
      if (this.useMemoryOnly) {
        const c =
          this.memoryStore.get(userId) ??
          ({
            userId,
            optedOut: false,
            privacyAccepted: true,
            dataRetentionDays: this.DEFAULT_RETENTION_DAYS,
            consentToStore: true,
            consentToAnalyze: false,
            consentToPersonalize: false,
            lastActivity: new Date(),
          } as any);
        c.lastThreadId = threadId ?? null;
        this.memoryStore.set(userId, c);
        return;
      }
      const prismaClient = await getPrisma();
      await prismaClient.user.update({ where: { id: userId }, data: { lastThreadId: threadId } });
    } catch (error) {
      logger.error('Failed to set last thread ID', { userId, threadId, error: String(error) });
    }
  }

  /** Get routing preferences */
  public async getRouting(
    userId: string,
  ): Promise<{ dmPreferred: boolean; lastThreadId: string | null }> {
    const consent = await this.getUserConsent(userId);
    return {
      dmPreferred: consent?.dmPreferred ?? false,
      lastThreadId: consent?.lastThreadId ?? null,
    };
  }
}
