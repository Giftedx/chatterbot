import { moderationService } from '../moderation-service';
import { moderationConfigService } from '../config-service';
import { prisma } from '../../db/prisma';

describe('ModerationService branch coverage - text/image/attachment', () => {
  const ctx = { guildId: 'guild-branch', userId: 'user-1', channelId: 'chan-1', messageId: 'msg-1' };

  beforeEach(async () => {
    await prisma.moderationIncident.deleteMany();
    await prisma.moderationConfig.deleteMany();
  });

  afterEach(async () => {
    await prisma.moderationIncident.deleteMany();
    await prisma.moderationConfig.deleteMany();
  });

  it('blocks critical text and logs incident (autoDeleteUnsafe off still blocks critical)', async () => {
    await moderationConfigService.updateConfig(ctx.guildId, {
      enabledFeatures: ['text'],
      strictnessLevel: 'medium',
      autoDeleteUnsafe: false,
    });

    const res = await moderationService.moderateText('nazi genocide murder', ctx);
    expect(res.action).toBe('block');
    expect(res.verdict.safe).toBe(false);
    expect(res.incident?.type).toBe('text');
    expect(res.incident?.action).toBe('blocked');
  });

  it('warns on medium severity when strictness is medium and logs incident as warned', async () => {
    await moderationConfigService.updateConfig(ctx.guildId, {
      enabledFeatures: ['text'],
      strictnessLevel: 'medium',
      autoDeleteUnsafe: false,
      customKeywords: ['forbidden']
    });

    const res = await moderationService.moderateText('this contains forbidden content', ctx);
    // custom keyword yields medium severity per implementation
    expect(res.verdict.severity).toBe('medium');
    // In medium strictness, medium severity -> warn
    expect(res.action).toBe('warn');
    expect(res.incident?.action).toBe('warned');
  });

  it('blocks attachment based on dangerous extension and logs incident', async () => {
    await moderationConfigService.updateConfig(ctx.guildId, {
      enabledFeatures: ['attachment'],
      strictnessLevel: 'medium',
    });

    const res = await moderationService.moderateAttachment(
      'https://ex.com/files/malware.exe',
      'application/x-msdownload',
      'malware.exe',
      ctx
    );
    expect(res.verdict.safe).toBe(false);
    expect(res.verdict.reason).toContain('dangerous file type');
    expect(res.action).toBe('block');
    expect(res.incident?.type).toBe('attachment');
  });
});
