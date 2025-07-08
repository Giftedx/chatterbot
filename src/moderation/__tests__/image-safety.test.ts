import { ImageSafetyModerator, checkImageSafety } from '../image-safety';

describe('ImageSafetyModerator', () => {
  let moderator: ImageSafetyModerator;

  beforeEach(() => {
    moderator = new ImageSafetyModerator();
  });

  describe('MIME type validation', () => {
    it('accepts valid image types', async () => {
      const result = await moderator.moderateImageUrl('https://cdn.discord.com/attachments/test.png', 'image/png');
      expect(result.safe).toBe(true);
      expect(result.mimeType).toBe('image/png');
    });

    it('rejects invalid file types', async () => {
      const result = await moderator.moderateImageUrl('https://cdn.discord.com/attachments/test.exe', 'application/exe');
      expect(result.safe).toBe(false);
      expect(result.reason).toContain('Unsupported file type');
    });
  });

  describe('URL validation', () => {
    it('accepts Discord CDN URLs', async () => {
      const result = await moderator.moderateImageUrl('https://cdn.discord.com/attachments/123/456/image.png', 'image/png');
      expect(result.safe).toBe(true);
    });

    it('accepts trusted domains', async () => {
      const result = await moderator.moderateImageUrl('https://i.imgur.com/abc123.jpg', 'image/jpeg');
      expect(result.safe).toBe(true);
    });

    it('rejects suspicious URLs', async () => {
      const result = await moderator.moderateImageUrl('https://bit.ly/malicious', 'image/png');
      expect(result.safe).toBe(false);
      expect(result.reason).toContain('Invalid or suspicious');
    });
  });

  describe('configuration', () => {
    it('respects custom configuration', () => {
      const customModerator = new ImageSafetyModerator({
        maxFileSize: 1024,
        allowedMimeTypes: ['image/png']
      });
      
      expect(customModerator['config'].maxFileSize).toBe(1024);
      expect(customModerator['config'].allowedMimeTypes).toEqual(['image/png']);
    });

    it('allows configuration updates', () => {
      moderator.updateConfig({ maxFileSize: 2048 });
      expect(moderator['config'].maxFileSize).toBe(2048);
    });
  });

  describe('convenience function', () => {
    it('checkImageSafety works as shortcut', async () => {
      const result = await checkImageSafety('https://cdn.discord.com/test.png', 'image/png');
      expect(result).toHaveProperty('safe');
      expect(result).toHaveProperty('mimeType');
    });
  });
});
