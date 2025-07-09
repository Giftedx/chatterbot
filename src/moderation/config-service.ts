/**
 * Moderation Configuration Service
 * Manages per-guild moderation settings and preferences
 */

import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { ModerationConfig, DEFAULT_MODERATION_CONFIG } from './types.js';

/**
 * Service for managing moderation configurations
 */
export class ModerationConfigService {
  private configCache = new Map<string, ModerationConfig>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get moderation configuration for a guild
   */
  async getConfig(guildId: string): Promise<ModerationConfig> {
    // Check cache first
    const cached = this.configCache.get(guildId);
    const expiry = this.cacheExpiry.get(guildId);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    try {
      // Load from database
      const dbConfig = await prisma.moderationConfig.findUnique({
        where: { guildId }
      });

      let config: ModerationConfig;
      
      if (dbConfig) {
        config = {
          guildId: dbConfig.guildId,
          strictnessLevel: dbConfig.strictnessLevel as 'low' | 'medium' | 'high',
          enabledFeatures: JSON.parse(dbConfig.enabledFeatures) as ('text' | 'image' | 'attachment')[],
          logChannelId: dbConfig.logChannelId || undefined,
          autoDeleteUnsafe: dbConfig.autoDeleteUnsafe,
          customKeywords: dbConfig.customKeywords ? JSON.parse(dbConfig.customKeywords) : []
        };
      } else {
        // Use default config
        config = {
          guildId,
          ...DEFAULT_MODERATION_CONFIG
        };
      }

      // Cache the result
      this.configCache.set(guildId, config);
      this.cacheExpiry.set(guildId, Date.now() + this.CACHE_TTL);

      return config;

    } catch (error) {
      logger.error('Failed to load moderation config', {
        operation: 'moderation-config-get',
        guildId,
        metadata: { errorMessage: error instanceof Error ? error.message : 'Unknown error' }
      });

      // Return default config on error
      const defaultConfig = { guildId, ...DEFAULT_MODERATION_CONFIG };
      this.configCache.set(guildId, defaultConfig);
      this.cacheExpiry.set(guildId, Date.now() + this.CACHE_TTL);
      
      return defaultConfig;
    }
  }

  /**
   * Update moderation configuration for a guild
   */
  async updateConfig(
    guildId: string,
    updates: Partial<Omit<ModerationConfig, 'guildId'>>
  ): Promise<ModerationConfig> {
    try {
      // Get current config to merge with updates
      const currentConfig = await this.getConfig(guildId);
      const newConfig = { ...currentConfig, ...updates };

      // Update database
      await prisma.moderationConfig.upsert({
        where: { guildId },
        update: {
          strictnessLevel: newConfig.strictnessLevel,
          enabledFeatures: JSON.stringify(newConfig.enabledFeatures),
          logChannelId: newConfig.logChannelId,
          autoDeleteUnsafe: newConfig.autoDeleteUnsafe,
          customKeywords: JSON.stringify(newConfig.customKeywords || [])
        },
        create: {
          guildId,
          strictnessLevel: newConfig.strictnessLevel,
          enabledFeatures: JSON.stringify(newConfig.enabledFeatures),
          logChannelId: newConfig.logChannelId,
          autoDeleteUnsafe: newConfig.autoDeleteUnsafe,
          customKeywords: JSON.stringify(newConfig.customKeywords || [])
        }
      });

      // Update cache
      this.configCache.set(guildId, newConfig);
      this.cacheExpiry.set(guildId, Date.now() + this.CACHE_TTL);

      logger.info('Moderation config updated', {
        operation: 'moderation-config-update',
        guildId,
        metadata: { 
          strictnessLevel: newConfig.strictnessLevel,
          enabledFeatures: newConfig.enabledFeatures,
          autoDeleteUnsafe: newConfig.autoDeleteUnsafe
        }
      });

      return newConfig;

    } catch (error) {
      logger.error('Failed to update moderation config', {
        operation: 'moderation-config-update',
        guildId,
        metadata: { errorMessage: error instanceof Error ? error.message : 'Unknown error' }
      });
      throw error;
    }
  }

  /**
   * Reset moderation configuration to defaults
   */
  async resetConfig(guildId: string): Promise<ModerationConfig> {
    try {
      await prisma.moderationConfig.delete({
        where: { guildId }
      });

      // Clear cache
      this.configCache.delete(guildId);
      this.cacheExpiry.delete(guildId);

      const defaultConfig = { guildId, ...DEFAULT_MODERATION_CONFIG };
      
      logger.info('Moderation config reset to defaults', {
        operation: 'moderation-config-reset',
        guildId
      });

      return defaultConfig;

    } catch (error) {
      if ((error as { code?: string })?.code === 'P2025') {
        // Record not found, that's fine
        const defaultConfig = { guildId, ...DEFAULT_MODERATION_CONFIG };
        this.configCache.delete(guildId);
        this.cacheExpiry.delete(guildId);
        return defaultConfig;
      }
      
      logger.error('Failed to reset moderation config', {
        operation: 'moderation-config-reset',
        guildId,
        metadata: { errorMessage: error instanceof Error ? error.message : 'Unknown error' }
      });
      throw error;
    }
  }

  /**
   * Get all guild configurations (admin only)
   */
  async getAllConfigs(): Promise<ModerationConfig[]> {
    try {
      const dbConfigs = await prisma.moderationConfig.findMany();
      
      return dbConfigs.map((dbConfig: any) => ({
        guildId: dbConfig.guildId,
        strictnessLevel: dbConfig.strictnessLevel as 'low' | 'medium' | 'high',
        enabledFeatures: JSON.parse(dbConfig.enabledFeatures) as ('text' | 'image' | 'attachment')[],
        logChannelId: dbConfig.logChannelId || undefined,
        autoDeleteUnsafe: dbConfig.autoDeleteUnsafe,
        customKeywords: dbConfig.customKeywords ? JSON.parse(dbConfig.customKeywords) : []
      }));

    } catch (error) {
      logger.error('Failed to get all moderation configs', {
        operation: 'moderation-config-get-all',
        metadata: { errorMessage: error instanceof Error ? error.message : 'Unknown error' }
      });
      throw error;
    }
  }

  /**
   * Clear cache for specific guild or all guilds
   */
  clearCache(guildId?: string): void {
    if (guildId) {
      this.configCache.delete(guildId);
      this.cacheExpiry.delete(guildId);
    } else {
      this.configCache.clear();
      this.cacheExpiry.clear();
    }
  }
}

// Export singleton instance
export const moderationConfigService = new ModerationConfigService();
