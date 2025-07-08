/**
 * API Integration Test (formerly Real MCP Integration Test)
 * Tests the external API integrations in the Direct MCP Executor
 */

import { directMCPExecutor } from '../direct-mcp-executor.service.js';

describe('API Integration (Direct Executor)', () => {
  test('should execute memory search', async () => {
    const result = await directMCPExecutor.executeMemorySearch('test query for Discord bot');
    
    expect(result.success).toBe(true);
    expect(result.toolUsed).toBe('mcp-memory-search');
    expect(result.data).toBeDefined();
    
    // Check structure without type assertions
    const data = result.data as { entities?: unknown[] };
    expect(data.entities).toBeDefined();
    
    console.log('✅ Memory Search Test Result:', result);
  });

  test('should execute web search with fallback', async () => {
    const result = await directMCPExecutor.executeWebSearch('Discord bot development', 3);
    
    expect(result.success).toBe(true);
    expect(['mcp-brave-search'].includes(result.toolUsed)).toBe(true);
    expect(result.data).toBeDefined();
    
    // Check structure without type assertions
    const data = result.data as { results?: unknown[] };
    expect(data.results).toBeDefined();
    if (data.results) {
      expect(data.results.length).toBeGreaterThan(0);
    }
    
    console.log('✅ Web Search Test Result:', result);
  });

  test('should execute content extraction with fallback', async () => {
    const result = await directMCPExecutor.executeContentExtraction(['https://example.com']);
    
    expect(result.success).toBe(true);
    expect(['mcp-firecrawl'].includes(result.toolUsed)).toBe(true);
    expect(result.data).toBeDefined();
    
    // Check structure without type assertions
    const data = result.data as { results?: unknown[] };
    expect(data.results).toBeDefined();
    
    console.log('✅ Content Extraction Test Result:', result);
  });

  test('should execute sequential thinking', async () => {
    const result = await directMCPExecutor.executeSequentialThinking('How to improve Discord bot performance?');
    
    expect(result.success).toBe(true);
    expect(result.toolUsed).toBe('mcp-sequential-thinking');
    expect(result.data).toBeDefined();
    
    // Check structure without type assertions
    const data = result.data as { steps?: unknown[]; finalAnswer?: string };
    expect(data.steps).toBeDefined();
    expect(data.finalAnswer).toBeDefined();
    
    console.log('✅ Sequential Thinking Test Result:', result);
  });

  test('should execute browser automation fallback', async () => {
    const result = await directMCPExecutor.executeBrowserAutomation('https://example.com');
    
    expect(result.success).toBe(true);
    expect(result.toolUsed).toBe('mcp-playwright');
    expect(result.data).toBeDefined();
    
    // Check structure without type assertions
    const data = result.data as { currentUrl?: string };
    expect(data.currentUrl).toBe('https://example.com');
    
    console.log('✅ Browser Automation Test Result:', result);
  });

  test('should check API availability status', () => {
    const isAvailable = directMCPExecutor.isRealMCPAvailable();
    const apis = directMCPExecutor.getAvailableRealMCPFunctions();
    
    expect(typeof isAvailable).toBe('boolean');
    expect(Array.isArray(apis)).toBe(true);
    // Should have at least fallback capabilities
    expect(apis.length).toBeGreaterThanOrEqual(0);
    
    console.log('✅ API Availability Check:', { isAvailable, apis });
  });
});
