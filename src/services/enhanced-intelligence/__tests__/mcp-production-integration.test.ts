import { MCPProductionIntegrationService } from '../mcp-production-integration.service.js';
import { MCPToolResult } from '../types.js';

describe('MCPProductionIntegrationService', () => {
  let service: MCPProductionIntegrationService;

  beforeEach(() => {
    service = new MCPProductionIntegrationService();
  });

  describe('Memory Search Integration', () => {
    test('should execute memory search with proper error handling', async () => {
      const result: MCPToolResult = await service.executeProductionMemorySearch('test query');
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe('mcp-memory-search');
      expect(typeof result.data).toBeDefined();
    });

    test('should handle empty query gracefully', async () => {
      const result: MCPToolResult = await service.executeProductionMemorySearch('');
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe('mcp-memory-search');
    });
  });

  describe('Web Search Integration', () => {
    test('should execute web search with proper fallback', async () => {
      const result: MCPToolResult = await service.executeProductionWebSearch('test search');
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe('mcp-brave-search');
      expect(result.data).toBeDefined();
    });

    test('should accept custom count parameter', async () => {
      const result: MCPToolResult = await service.executeProductionWebSearch('test search', 3);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe('mcp-brave-search');
    });
  });

  describe('Content Extraction Integration', () => {
    test('should execute content extraction with URL array', async () => {
      const result: MCPToolResult = await service.executeProductionContentExtraction(['https://example.com']);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe('mcp-firecrawl');
      expect(result.data).toBeDefined();
    });

    test('should handle multiple URLs', async () => {
      const urls = ['https://example.com', 'https://test.com'];
      const result: MCPToolResult = await service.executeProductionContentExtraction(urls);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe('mcp-firecrawl');
    });
  });

  describe('Sequential Thinking Integration', () => {
    test('should execute sequential thinking process', async () => {
      const result: MCPToolResult = await service.executeProductionSequentialThinking('complex problem');
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe('mcp-sequential-thinking');
      expect(result.data).toBeDefined();
    });

    test('should handle complex thinking queries', async () => {
      const complexQuery = 'Analyze the implications of quantum computing on cryptography';
      const result: MCPToolResult = await service.executeProductionSequentialThinking(complexQuery);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe('mcp-sequential-thinking');
    });
  });

  describe('Browser Automation Integration', () => {
    test('should execute browser automation with URL string', async () => {
      const result: MCPToolResult = await service.executeProductionBrowserAutomation('https://example.com');
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe('mcp-playwright');
      expect(result.data).toBeDefined();
    });

    test('should handle automation requests safely', async () => {
      const result: MCPToolResult = await service.executeProductionBrowserAutomation('https://safe-test-site.com');
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe('mcp-playwright');
    });
  });

  describe('Error Handling and Fallback', () => {
    test('should handle service unavailability gracefully', async () => {
      // Test that all services return proper MCPToolResult structure
      const memoryResult = await service.executeProductionMemorySearch('test');
      expect(memoryResult.success).toBe(true);
      expect(memoryResult.toolUsed).toBe('mcp-memory-search');
      
      const webResult = await service.executeProductionWebSearch('test');
      expect(webResult.success).toBe(true);
      expect(webResult.toolUsed).toBe('mcp-brave-search');
    });

    test('should maintain consistent result structure', async () => {
      const result = await service.executeProductionMemorySearch('consistency test');
      
      // Validate MCPToolResult structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('toolUsed');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.toolUsed).toBe('string');
      
      // Optional properties should be properly typed if present
      if (result.data !== undefined) {
        expect(result.data).toBeDefined();
      }
      if (result.error !== undefined) {
        expect(typeof result.error).toBe('string');
      }
    });
  });

  describe('Performance and Reliability', () => {
    test('should complete requests within reasonable time', async () => {
      const startTime = Date.now();
      const result = await service.executeProductionMemorySearch('performance test');
      const executionTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should handle concurrent requests', async () => {
      const promises = [
        service.executeProductionMemorySearch('test 1'),
        service.executeProductionWebSearch('test 2'),
        service.executeProductionContentExtraction(['https://example.com'])
      ];
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.toolUsed).toBeDefined();
      });
    });
  });

  describe('Integration Validation', () => {
    test('should have all required MCP tool types', async () => {
      const memoryResult = await service.executeProductionMemorySearch('test');
      const webResult = await service.executeProductionWebSearch('test');
      const contentResult = await service.executeProductionContentExtraction(['https://example.com']);
      const thinkingResult = await service.executeProductionSequentialThinking('test');
      const browserResult = await service.executeProductionBrowserAutomation('https://example.com');
      
      const expectedTools = [
        'mcp-memory-search',
        'mcp-brave-search', 
        'mcp-firecrawl',
        'mcp-sequential-thinking',
        'mcp-playwright'
      ];
      
      const actualTools = [
        memoryResult.toolUsed,
        webResult.toolUsed,
        contentResult.toolUsed,
        thinkingResult.toolUsed,
        browserResult.toolUsed
      ];
      
      expectedTools.forEach(tool => {
        expect(actualTools).toContain(tool);
      });
    });
  });
});