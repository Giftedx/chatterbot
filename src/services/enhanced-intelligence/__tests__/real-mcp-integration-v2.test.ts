/**
 * Test for API Integration V2 (formerly Real MCP Integration V2)
 * Verify that the new API integration architecture is working properly
 */

import { directMCPExecutor } from '../direct-mcp-executor.service.js';

describe('API Integration V2 (Direct Executor)', () => {
  describe('Direct API Executor', () => {
    test('should be available with fallbacks', () => {
      // API availability depends on environment variables
      const isAvailable = directMCPExecutor.isRealMCPAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });

    test('should list available APIs', () => {
      const apis = directMCPExecutor.getAvailableRealMCPFunctions();
      expect(Array.isArray(apis)).toBe(true);
      // APIs may be empty if no keys configured, which is fine
    });

    test('should execute memory search', async () => {
      const result = await directMCPExecutor.executeMemorySearch('test query');
      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe('mcp-memory-search');
      expect(result.requiresExternalMCP).toBe(false);
      expect(result.data).toBeDefined();
      
      // Validate structure
      const data = result.data as { entities?: unknown[] };
      expect(data.entities).toBeDefined();
    });

    test('should execute web search with API or fallback', async () => {
      const result = await directMCPExecutor.executeWebSearch('test search', 3);
      expect(result.success).toBe(true);
      expect(['mcp-brave-search'].includes(result.toolUsed)).toBe(true);
      expect(result.requiresExternalMCP).toBe(false);
      expect(result.data).toBeDefined();
      
      // Validate structure
      const data = result.data as { results?: unknown[] };
      expect(data.results).toBeDefined();
      if (data.results) {
        expect(data.results.length).toBeGreaterThan(0);
      }
    });

    test('should execute content extraction with API or fallback', async () => {
      const result = await directMCPExecutor.executeContentExtraction(['https://example.com']);
      expect(result.success).toBe(true);
      expect(['mcp-firecrawl'].includes(result.toolUsed)).toBe(true);
      expect(result.requiresExternalMCP).toBe(false);
      expect(result.data).toBeDefined();
      
      // Validate structure
      const data = result.data as { results?: unknown[] };
      expect(data.results).toBeDefined();
    });

    test('should execute sequential thinking', async () => {
      const result = await directMCPExecutor.executeSequentialThinking('analyze this problem');
      expect(result.success).toBe(true);
      expect(['mcp-sequential-thinking'].includes(result.toolUsed)).toBe(true);
      expect(result.requiresExternalMCP).toBe(false);
      expect(result.data).toBeDefined();
      
      // Validate structure
      const data = result.data as { steps?: unknown[]; finalAnswer?: string };
      expect(data.steps).toBeDefined();
      expect(data.finalAnswer).toBeDefined();
    });

    test('should execute browser automation fallback', async () => {
      const result = await directMCPExecutor.executeBrowserAutomation('https://example.com');
      expect(result.success).toBe(true);
      expect(['mcp-playwright'].includes(result.toolUsed)).toBe(true);
      expect(result.requiresExternalMCP).toBe(false);
      expect(result.data).toBeDefined();
      
      // Validate structure
      const data = result.data as { currentUrl?: string };
      expect(data.currentUrl).toBe('https://example.com');
    });
  });

  describe('API Integration Verification', () => {
    test('should log API execution properly', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      await directMCPExecutor.executeMemorySearch('integration test');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🧠 Real Memory Search')
      );
      
      consoleSpy.mockRestore();
    });

    test('should handle fallback gracefully when no API keys', async () => {
      // This test validates that fallbacks work when external APIs aren't configured
      const result = await directMCPExecutor.executeWebSearch('fallback test', 1);
      
      expect(result.success).toBe(true);
      const data = result.data as { searchInfo?: { fallbackMode?: boolean } };
      
      // If no API key is configured, should use fallback
      if (result.toolUsed === 'web_search_fallback') {
        expect(data.searchInfo?.fallbackMode).toBe(true);
      }
    });

    test('should provide consistent response structures', async () => {
      // Test that all methods return consistent MCPToolResult structures
      const memoryResult = await directMCPExecutor.executeMemorySearch('test');
      const webResult = await directMCPExecutor.executeWebSearch('test', 1);
      const contentResult = await directMCPExecutor.executeContentExtraction(['https://test.com']);
      
      // All should have the same result structure
      [memoryResult, webResult, contentResult].forEach(result => {
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('toolUsed');
        expect(result).toHaveProperty('requiresExternalMCP');
        expect(typeof result.success).toBe('boolean');
      });
    });
  });
});
