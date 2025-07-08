import { getHistory, updateHistory, updateHistoryWithParts, cleanupInactiveChannels, contextManager } from '../context-manager';
import type { Part } from '@google/generative-ai';

describe('ContextManager', () => {
  const channelA = 'channel-A';
  const channelB = 'channel-B';

  beforeEach(() => {
    // Clean up any existing history before each test
    contextManager.cache.clear();
  });

  describe('Text-only functionality (backward compatibility)', () => {
    it('adds and retrieves history for the same channel', async () => {
      await updateHistory(channelA, 'hello', 'hi');
      const history = await getHistory(channelA);
      expect(history.length).toBe(2);
      expect(history[0].role).toBe('user');
      expect(history[1].role).toBe('model');
    });

    it('keeps history isolated across channels', async () => {
      await updateHistory(channelB, 'foo', 'bar');
      const historyA = await getHistory(channelA);
      const historyB = await getHistory(channelB);
      expect(historyA).not.toBe(historyB);
      expect(historyB.length).toBe(2);
    });

    it('prunes history beyond max length', async () => {
      // push 25 exchanges (50 parts) into channelA
      for (let i = 0; i < 25; i++) {
        await updateHistory(channelA, `q${i}`, `a${i}`);
      }
      const history = await getHistory(channelA);
      // MAX_HISTORY_LENGTH is 20 exchanges -> 40 parts
      expect(history.length).toBeLessThanOrEqual(40);
      // oldest messages should be pruned; ensure last entry exists
      const last = history[history.length - 1];
      expect(last.parts[0].text).toBe('a24');
    });
  });

  describe('Multimodal functionality', () => {
    const createImagePart = (data: string): Part => ({
      inlineData: {
        mimeType: 'image/png',
        data: data
      }
    });

    it('stores and retrieves multimodal conversations', async () => {
      const userParts: Part[] = [
        { text: 'What do you see in this image?' },
        createImagePart('base64encodedimagedata123')
      ];
      
      await updateHistoryWithParts(channelA, userParts, 'I see a beautiful landscape.');
      
      const history = await getHistory(channelA);
      expect(history.length).toBe(2);
      expect(history[0].role).toBe('user');
      expect(history[0].parts.length).toBe(2);
      expect(history[0].parts[0].text).toBe('What do you see in this image?');
      expect('inlineData' in history[0].parts[1]).toBe(true);
      expect(history[1].role).toBe('model');
      expect(history[1].parts[0].text).toBe('I see a beautiful landscape.');
    });

    it('handles mixed text and multimodal conversations', async () => {
      // Add text-only conversation
      await updateHistory(channelA, 'Hello', 'Hi there!');
      
      // Add multimodal conversation
      const userParts: Part[] = [
        { text: 'Analyze this image' },
        createImagePart('imagedata456')
      ];
      await updateHistoryWithParts(channelA, userParts, 'Analysis complete.');
      
      const history = await getHistory(channelA);
      expect(history.length).toBe(4);
      
      // First pair: text-only
      expect(history[0].parts.length).toBe(1);
      expect(history[0].parts[0].text).toBe('Hello');
      
      // Second pair: multimodal
      expect(history[2].parts.length).toBe(2);
      expect(history[2].parts[0].text).toBe('Analyze this image');
      expect('inlineData' in history[2].parts[1]).toBe(true);
    });

    it('manages memory for image-heavy conversations', async () => {
      // Add many multimodal conversations to test memory management
      for (let i = 0; i < 15; i++) {
        const userParts: Part[] = [
          { text: `Image query ${i}` },
          createImagePart(`imagedata${i}`)
        ];
        await updateHistoryWithParts(channelA, userParts, `Response ${i}`);
      }
      
      const history = await getHistory(channelA);
      
      // Count multimodal messages
      const multimodalCount = history.filter(msg => 
        msg.parts.some(part => 'inlineData' in part || 'fileData' in part)
      ).length;
      
      // Should not exceed MAX_IMAGE_HISTORY_SIZE (10)
      expect(multimodalCount).toBeLessThanOrEqual(10);
      
      // Should still have recent conversations
      const lastUserMsg = history[history.length - 2];
      expect(lastUserMsg.parts[0].text).toBe('Image query 14');
    });

    it('preserves text-only messages when cleaning multimodal overflow', async () => {
      // Add text-only messages
      for (let i = 0; i < 5; i++) {
        await updateHistory(channelA, `text${i}`, `response${i}`);
      }
      
      // Add many multimodal messages to trigger cleanup
      for (let i = 0; i < 15; i++) {
        const userParts: Part[] = [
          { text: `image${i}` },
          createImagePart(`data${i}`)
        ];
        await updateHistoryWithParts(channelA, userParts, `imgresponse${i}`);
      }
      
      const history = await getHistory(channelA);
      
      // Should still have some text-only messages
      const textOnlyCount = history.filter(msg => 
        msg.parts.every(part => 'text' in part && !('inlineData' in part))
      ).length;
      
      expect(textOnlyCount).toBeGreaterThan(0);
    });
  });

  describe('Channel cleanup functionality', () => {
    it('cleans up inactive channels when threshold exceeded', async () => {
      // Simulate many channels with varying activity levels
      for (let i = 0; i < 1100; i++) {
        const channelId = `channel-${i}`;
        const activityLevel = (i % 10) + 1; // Ensure all channels have at least 1 activity
        
        // Add different amounts of history to simulate activity
        for (let j = 0; j < activityLevel; j++) {
          await updateHistory(channelId, `msg${j}`, `resp${j}`);
        }
      }
      
      const initialSize = contextManager.cache.size;
      expect(initialSize).toBe(1100); // Should have exactly 1100 channels
      
      const cleanedCount = await cleanupInactiveChannels();
      const finalSize = contextManager.cache.size;
      
      expect(cleanedCount).toBeGreaterThan(0);
      expect(finalSize).toBeLessThan(initialSize);
      expect(cleanedCount).toBe(initialSize - finalSize);
    });

    it('does not clean up when under threshold', async () => {
      // Add few channels (under threshold)
      for (let i = 0; i < 50; i++) {
        await updateHistory(`channel-${i}`, 'test', 'response');
      }
      
      const initialSize = contextManager.cache.size;
      const cleanedCount = await cleanupInactiveChannels();
      const finalSize = contextManager.cache.size;
      
      expect(cleanedCount).toBe(0);
      expect(finalSize).toBe(initialSize);
    });

    it('prioritizes keeping channels with more activity', async () => {
      // Add many channels to trigger cleanup
      for (let i = 0; i < 1100; i++) {
        const channelId = `channel-${i}`;
        
        if (i < 10) {
          // High activity channels
          for (let j = 0; j < 20; j++) {
            await updateHistory(channelId, `msg${j}`, `resp${j}`);
          }
        } else {
          // Low activity channels
          await updateHistory(channelId, 'single', 'message');
        }
      }
      
      await cleanupInactiveChannels();
      
      // High activity channels should still exist
      for (let i = 0; i < 10; i++) {
        const history = await getHistory(`channel-${i}`);
        expect(history.length).toBeGreaterThan(10);
      }
    });
  });
});
