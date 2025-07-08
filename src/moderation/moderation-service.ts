/**
 * Comprehensive Moderation Service
 * Coordinates all mode      if (!verdict.safe || action !== 'allow') {
        const contentHash = createHash('sha256').update(text).digest('hex').substring(0, 16);
        
        incident = await moderationIncidentService.logIncident({
          guildId: context.guildId,
          userId: context.userId,
          type: 'text',
          severity: verdict.severity || 'medium',
          action: action === 'block' ? 'blocked' : action === 'warn' ? 'warned' : 'logged',
          reason: verdict.reason,
          contentHash,
          metadata: {
            confidence: verdict.confidence,
            categories: verdict.categories,
            channelId: context.channelId,
            messageId: context.messageId
          }
        });
      }y with intelligent routing
 */

import { AdvancedTextModeration } from './advanced-text-moderation.js';
import { AdvancedImageModeration } from './advanced-image-moderation.js';
import { moderationConfigService } from './config-service.js';
import { moderationIncidentService } from './incident-service.js';
import { logger } from '../utils/logger';
import { createHash } from 'crypto';
import {
  SafetyVerdict,
  ModerationResult,
  ModerationConfig
} from './types.js';

export interface ModerationContext {
  guildId: string;
  userId: string;
  channelId?: string;
  messageId?: string;
}

/**
 * Main moderation service that coordinates all moderation functionality
 */
export class ModerationService {
  private textModeration: AdvancedTextModeration;
  private imageModeration: AdvancedImageModeration;

  constructor() {
    this.textModeration = new AdvancedTextModeration();
    this.imageModeration = new AdvancedImageModeration();
  }

  /**
   * Moderate text content with full context
   */
  async moderateText(
    text: string,
    context: ModerationContext
  ): Promise<ModerationResult> {
    try {
      const config = await moderationConfigService.getConfig(context.guildId);

      // Skip if text moderation is disabled
      if (!config.enabledFeatures.includes('text')) {
        return { verdict: { safe: true }, action: 'allow' };
      }

      // Perform text moderation
      const verdict = await this.textModeration.checkTextSafety(text, {
        useMLAPI: true,
        customKeywords: config.customKeywords,
        strictnessLevel: config.strictnessLevel
      });

      // Determine action based on verdict and config
      const action = this.determineAction(verdict, config);

      // Log incident if unsafe
      let incident;
      if (!verdict.safe && action !== 'allow') {
        const contentHash = createHash('sha256').update(text).digest('hex').substring(0, 16);
        
        incident = await moderationIncidentService.logIncident({
          guildId: context.guildId,
          userId: context.userId,
          type: 'text',
          severity: verdict.severity || 'medium',
          action: action === 'block' ? 'blocked' : action === 'warn' ? 'warned' : 'logged',
          reason: verdict.reason,
          contentHash,
          metadata: {
            confidence: verdict.confidence,
            categories: verdict.categories,
            channelId: context.channelId,
            messageId: context.messageId
          }
        });
      }

      logger.info('Text moderation completed', {
        operation: 'text-moderation',
        guildId: context.guildId,
        userId: context.userId,
        metadata: {
          safe: verdict.safe,
          action,
          severity: verdict.severity,
          confidence: verdict.confidence
        }
      });

      return { verdict, action, incident };

    } catch (error) {
      logger.error('Text moderation failed', {
        operation: 'text-moderation',
        guildId: context.guildId,
        userId: context.userId,
        metadata: { errorMessage: error instanceof Error ? error.message : 'Unknown error' }
      });

      // Fail open with warning
      return {
        verdict: { safe: true, reason: 'Moderation service error' },
        action: 'allow'
      };
    }
  }

  /**
   * Moderate image content with full context
   */
  async moderateImage(
    imageUrl: string,
    contentType: string,
    context: ModerationContext
  ): Promise<ModerationResult> {
    try {
      const config = await moderationConfigService.getConfig(context.guildId);

      // Skip if image moderation is disabled
      if (!config.enabledFeatures.includes('image')) {
        return { verdict: { safe: true }, action: 'allow' };
      }

      // Perform image moderation
      const verdict = await this.imageModeration.checkImageSafety(imageUrl, contentType, {
        useCloudVision: true,
        safeSearchLevel: this.getCloudVisionThreshold(config.strictnessLevel),
        checkNSFW: true
      });

      // Determine action based on verdict and config
      const action = this.determineAction(verdict, config);

      // Log incident if unsafe
      let incident;
      if (!verdict.safe && action !== 'allow') {
        const contentHash = createHash('sha256').update(imageUrl).digest('hex').substring(0, 16);
        
        incident = await moderationIncidentService.logIncident({
          guildId: context.guildId,
          userId: context.userId,
          type: 'image',
          severity: verdict.severity || 'medium',
          action: action === 'block' ? 'blocked' : action === 'warn' ? 'warned' : 'logged',
          reason: verdict.reason,
          contentHash,
          metadata: {
            confidence: verdict.confidence,
            categories: verdict.categories,
            channelId: context.channelId,
            messageId: context.messageId,
            imageUrl: imageUrl.substring(0, 100)
          }
        });
      }

      logger.info('Image moderation completed', {
        operation: 'image-moderation',
        guildId: context.guildId,
        userId: context.userId,
        metadata: {
          safe: verdict.safe,
          action,
          severity: verdict.severity,
          confidence: verdict.confidence
        }
      });

      return { verdict, action, incident };

    } catch (error) {
      logger.error('Image moderation failed', {
        operation: 'image-moderation',
        guildId: context.guildId,
        userId: context.userId,
        metadata: { errorMessage: error instanceof Error ? error.message : 'Unknown error' }
      });

      // Fail safe for images - block on error
      return {
        verdict: { safe: false, reason: 'Image moderation service error' },
        action: 'block'
      };
    }
  }

  /**
   * Moderate attachment (generic file)
   */
  async moderateAttachment(
    attachmentUrl: string,
    contentType: string,
    filename: string,
    context: ModerationContext
  ): Promise<ModerationResult> {
    try {
      const config = await moderationConfigService.getConfig(context.guildId);

      // Skip if attachment moderation is disabled
      if (!config.enabledFeatures.includes('attachment')) {
        return { verdict: { safe: true }, action: 'allow' };
      }

      // Check if it's an image first
      if (contentType.startsWith('image/')) {
        return this.moderateImage(attachmentUrl, contentType, context);
      }

      // Basic file type validation
      const verdict = this.validateFileType(filename, contentType);
      const action = this.determineAction(verdict, config);

      // Log incident if unsafe
      let incident;
      if (!verdict.safe && action !== 'allow') {
        const contentHash = createHash('sha256').update(attachmentUrl + filename).digest('hex').substring(0, 16);
        
        incident = await moderationIncidentService.logIncident({
          guildId: context.guildId,
          userId: context.userId,
          type: 'attachment',
          severity: verdict.severity || 'medium',
          action: action === 'block' ? 'blocked' : action === 'warn' ? 'warned' : 'logged',
          reason: verdict.reason,
          contentHash,
          metadata: {
            filename,
            contentType,
            channelId: context.channelId,
            messageId: context.messageId
          }
        });
      }

      return { verdict, action, incident };

    } catch (error) {
      logger.error('Attachment moderation failed', {
        operation: 'attachment-moderation',
        guildId: context.guildId,
        userId: context.userId,
        metadata: { errorMessage: error instanceof Error ? error.message : 'Unknown error' }
      });

      // Fail safe for attachments
      return {
        verdict: { safe: false, reason: 'Attachment moderation service error' },
        action: 'block'
      };
    }
  }

  /**
   * Test moderation system (admin command)
   */
  async testModeration(
    content: string,
    type: 'text' | 'image',
    context: ModerationContext
  ): Promise<ModerationResult> {
    if (type === 'text') {
      return this.moderateText(content, context);
    } else {
      return this.moderateImage(content, 'image/png', context);
    }
  }

  /**
   * Determine action based on verdict and configuration
   */
  private determineAction(verdict: SafetyVerdict, config: ModerationConfig): 'allow' | 'warn' | 'block' {
    if (verdict.safe) {
      return 'allow';
    }

    // Critical severity always blocks
    if (verdict.severity === 'critical') {
      return 'block';
    }

    // Auto-delete setting
    if (config.autoDeleteUnsafe && verdict.severity && ['high', 'critical'].includes(verdict.severity)) {
      return 'block';
    }

    // Strictness-based decisions
    switch (config.strictnessLevel) {
      case 'low':
        return verdict.severity === 'high' ? 'block' : 'warn';
      case 'medium':
        return ['high'].includes(verdict.severity || '') ? 'block' : 'warn';
      case 'high':
        return ['medium', 'high'].includes(verdict.severity || '') ? 'block' : 'warn';
      default:
        return 'warn';
    }
  }

  /**
   * Map strictness to Cloud Vision threshold
   */
  private getCloudVisionThreshold(strictness: string): 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY' {
    switch (strictness) {
      case 'low': return 'LIKELY';
      case 'medium': return 'POSSIBLE';
      case 'high': return 'UNLIKELY';
      default: return 'POSSIBLE';
    }
  }

  /**
   * Basic file type validation
   */
  private validateFileType(filename: string, contentType: string): SafetyVerdict {
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    const suspiciousTypes = ['application/x-msdownload', 'application/x-executable'];

    const extension = '.' + filename.toLowerCase().split('.').pop();
    
    if (dangerousExtensions.includes(extension)) {
      return {
        safe: false,
        reason: 'Potentially dangerous file type',
        severity: 'high',
        categories: ['executable']
      };
    }

    if (suspiciousTypes.includes(contentType.toLowerCase())) {
      return {
        safe: false,
        reason: 'Suspicious content type',
        severity: 'medium',
        categories: ['suspicious']
      };
    }

    return { safe: true };
  }
}

// Export singleton instance
export const moderationService = new ModerationService();

// Convenience exports for backward compatibility
export { moderationConfigService, moderationIncidentService };
