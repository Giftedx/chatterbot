/**
 * Advanced Capabilities Integration Test
 * 
 * Tests the integration of advanced capabilities with the core intelligence service.
 */

import { AdvancedCapabilitiesManager } from '../advanced-capabilities-manager.service.js';

describe('Advanced Capabilities Integration', () => {
  let manager: AdvancedCapabilitiesManager;

  beforeEach(() => {
    manager = new AdvancedCapabilitiesManager({
      enableImageGeneration: false, // Disable for testing to avoid API calls
      enableGifGeneration: false,
      enableSpeechGeneration: false,
      enableEnhancedReasoning: true,
      enableWebSearch: false,
      enableMemoryEnhancement: true,
      maxConcurrentCapabilities: 2,
      responseTimeoutMs: 5000
    });
  });

  describe('Message Processing', () => {
    test('should process simple messages without errors', async () => {
      const result = await manager.processMessage(
        'Hello, how are you?',
        [],
        'test-user-id',
        'test-channel-id',
        'test-guild-id',
        [],
        {}
      );

      expect(result).toBeDefined();
      expect(result.textResponse).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.capabilitiesUsed).toBeInstanceOf(Array);
      expect(result.metadata.totalExecutionTime).toBeGreaterThan(0);
    });

    test('should detect reasoning needs for complex questions', async () => {
      const result = await manager.processMessage(
        'Can you analyze the pros and cons of remote work versus office work?',
        [],
        'test-user-id',
        'test-channel-id',
        'test-guild-id',
        [],
        {}
      );

      expect(result).toBeDefined();
      expect(result.metadata.capabilitiesUsed).toContain('reasoning');
      expect(result.reasoning).toBeDefined();
    });

    test('should handle image generation requests gracefully when disabled', async () => {
      const result = await manager.processMessage(
        'Can you draw a picture of a sunset?',
        [],
        'test-user-id',
        'test-channel-id',
        'test-guild-id',
        [],
        {}
      );

      expect(result).toBeDefined();
      expect(result.textResponse).toBeDefined();
      // Image generation should be detected but disabled, so no image attachment
      expect(result.attachments).toHaveLength(0);
    });

    test('should process memory enhancement for personal information', async () => {
      const result = await manager.processMessage(
        'My name is John and I work as a software engineer. I love playing guitar.',
        [],
        'test-user-id',
        'test-channel-id',
        'test-guild-id',
        [],
        {}
      );

      expect(result).toBeDefined();
      expect(result.metadata.capabilitiesUsed).toContain('memory_enhancement');
    });

    test('should handle concurrent capability requests efficiently', async () => {
      const startTime = Date.now();
      
      const result = await manager.processMessage(
        'Compare different programming languages and explain why Python is popular. Also remember that I prefer detailed explanations.',
        [],
        'test-user-id',
        'test-channel-id',
        'test-guild-id',
        ['Previous conversation context'],
        { preferDetailed: true }
      );

      const executionTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.metadata.capabilitiesUsed.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration correctly', () => {
      const status = manager.getStatus();
      expect(status.config.enableEnhancedReasoning).toBe(true);
      expect(status.config.enableImageGeneration).toBe(false);

      manager.updateConfig({
        enableImageGeneration: true,
        maxConcurrentCapabilities: 5
      });

      const updatedStatus = manager.getStatus();
      expect(updatedStatus.config.enableImageGeneration).toBe(true);
      expect(updatedStatus.config.maxConcurrentCapabilities).toBe(5);
    });

    test('should report enabled capabilities correctly', () => {
      const status = manager.getStatus();
      expect(status.enabledCapabilities).toContain('enhanced_reasoning');
      expect(status.enabledCapabilities).toContain('memory_enhancement');
      expect(status.enabledCapabilities).not.toContain('image_generation');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed input gracefully', async () => {
      const result = await manager.processMessage(
        '', // Empty message
        [],
        'test-user-id',
        'test-channel-id',
        'test-guild-id',
        [],
        {}
      );

      expect(result).toBeDefined();
      expect(result.textResponse).toBeDefined();
      expect(result.metadata.confidenceScore).toBeGreaterThanOrEqual(0);
    });

    test('should handle service failures gracefully', async () => {
      // Test with invalid user preferences that might cause errors
      const result = await manager.processMessage(
        'Tell me about artificial intelligence',
        [],
        'test-user-id',
        'test-channel-id',
        'test-guild-id',
        [],
        { invalidPreference: null }
      );

      expect(result).toBeDefined();
      expect(result.textResponse).toBeDefined();
    });
  });
});