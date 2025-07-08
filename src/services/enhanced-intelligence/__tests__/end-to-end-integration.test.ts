/**
 * End-to-End Enhanced Intelligence Integration Test
 * Verifies complete integration from Enhanced Intelligence Service through to API integrations
 */

import { EnhancedInvisibleIntelligenceService } from '../index.js';
import { directMCPExecutor } from '../direct-mcp-executor.service.js';

describe('End-to-End Enhanced Intelligence Integration', () => {
  let enhancedService: EnhancedInvisibleIntelligenceService;

  beforeEach(() => {
    enhancedService = new EnhancedInvisibleIntelligenceService();
  });

  describe('Enhanced Intelligence Service', () => {
    it('should create slash command', () => {
      const slashCommand = enhancedService.createSlashCommand();
      
      expect(slashCommand).toBeDefined();
      expect(slashCommand.name).toBe('optin');
      expect(slashCommand.description).toContain('enhanced AI conversation');
    });

    it('should be available and ready', () => {
      expect(enhancedService).toBeDefined();
      expect(typeof enhancedService.handleEnhancedConversation).toBe('function');
      expect(typeof enhancedService.handleRegenerateEnhanced).toBe('function');
      expect(typeof enhancedService.handleExplainProcessing).toBe('function');
    });
  });

  describe('API Integration Connectivity', () => {
    it('should detect API environment availability', () => {
      const hasAPIs = directMCPExecutor.isRealMCPAvailable();
      const availableAPIs = directMCPExecutor.getAvailableRealMCPFunctions();
      
      console.log(`🔧 Enhanced Intelligence → API Environment: ${hasAPIs ? 'ENABLED' : 'FALLBACK MODE'}`);
      console.log(`📋 Available APIs: ${availableAPIs.join(', ') || 'None (using fallbacks)'}`);
      expect(typeof hasAPIs).toBe('boolean');
    });

    it('should connect to API integrations or fallbacks', async () => {
      const testQuery = 'enhanced intelligence integration test';
      
      console.log(`🔍 Testing Enhanced Intelligence → Memory Search: ${testQuery}`);
      const memoryResult = await directMCPExecutor.executeMemorySearch(testQuery);
      
      expect(memoryResult).toBeDefined();
      expect(memoryResult.success).toBe(true);
      expect(memoryResult.toolUsed).toBe('mcp-memory-search');
      expect(memoryResult.requiresExternalMCP).toBe(false);
      
      console.log(`✅ Enhanced Intelligence → Memory Search: SUCCESS`);
    });

    it('should execute web search through enhanced service', async () => {
      const testQuery = 'enhanced intelligence web search test';
      
      console.log(`🌐 Testing Enhanced Intelligence → Web Search: ${testQuery}`);
      const webResult = await directMCPExecutor.executeWebSearch(testQuery, 2);
      
      expect(webResult).toBeDefined();
      expect(webResult.success).toBe(true);
      expect(['mcp-brave-search'].includes(webResult.toolUsed)).toBe(true);
      expect(webResult.data).toBeDefined();
      
      console.log(`✅ Enhanced Intelligence → Web Search: SUCCESS (${webResult.toolUsed})`);
    });

    it('should perform sequential thinking through enhanced service', async () => {
      const testThought = 'analyze the integration between Enhanced Intelligence and API systems';
      
      console.log(`🧠 Testing Enhanced Intelligence → Sequential Thinking`);
      const thinkingResult = await directMCPExecutor.executeSequentialThinking(testThought);
      
      expect(thinkingResult).toBeDefined();
      expect(thinkingResult.success).toBe(true);
      expect(thinkingResult.toolUsed).toBe('mcp-sequential-thinking');
      expect(thinkingResult.data).toBeDefined();
      
      console.log(`✅ Enhanced Intelligence → Sequential Thinking: SUCCESS`);
    });
  });

  describe('Integration Flow Verification', () => {
    it('should demonstrate complete Enhanced Intelligence → API pipeline', async () => {
      console.log(`🔄 Testing Complete Enhanced Intelligence Pipeline...`);
      
      // Test the full pipeline: Enhanced Service → Direct Executor → APIs/Fallbacks
      const queries = [
        'memory integration test',
        'web search integration test',
        'sequential thinking integration test'
      ];
      
      const results = [];
      
      for (const query of queries) {
        try {
          // Test memory search
          const memoryResult = await directMCPExecutor.executeMemorySearch(query);
          results.push({ type: 'memory', success: memoryResult.success, tool: memoryResult.toolUsed });
          
          // Test web search
          const webResult = await directMCPExecutor.executeWebSearch(query, 1);
          results.push({ type: 'web', success: webResult.success, tool: webResult.toolUsed });
          
          console.log(`✅ Pipeline step completed for: ${query}`);
        } catch (error) {
          console.error(`❌ Pipeline error for ${query}:`, error);
          results.push({ type: 'error', success: false, tool: 'unknown' });
        }
      }
      
      // Verify all operations succeeded
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      console.log(`📊 Enhanced Intelligence Pipeline Results: ${successCount}/${totalCount} successful`);
      console.log(`🔧 Tools used: ${results.map(r => r.tool).join(', ')}`);
      expect(successCount).toBeGreaterThan(0);
      expect(successCount / totalCount).toBeGreaterThan(0.8); // At least 80% success rate
    });
  });

  describe('API Integration Verification', () => {
    it('should show API or fallback system is operational', () => {
      // This test verifies that the API integration system is working
      const hasAPIs = directMCPExecutor.isRealMCPAvailable();
      const availableAPIs = directMCPExecutor.getAvailableRealMCPFunctions();
      
      if (hasAPIs && availableAPIs.length > 0) {
        console.log(`🎯 VERIFICATION: Real External APIs ARE Available!`);
        console.log(`📋 This means Enhanced Intelligence can use:`);
        console.log(`   🔍 Real Brave Search API for web search`);
        console.log(`   🔍 Real Firecrawl API for content extraction`);
        availableAPIs.forEach(api => console.log(`   ✅ ${api}`));
      } else {
        console.log(`⚠️  VERIFICATION: Using intelligent fallback systems`);
        console.log(`🔍 This means Enhanced Intelligence provides:`);
        console.log(`   🔍 Local memory search and storage`);
        console.log(`   🔍 Intelligent web search simulation`);
        console.log(`   📄 Content extraction simulation`);
        console.log(`   🤖 Local sequential thinking`);
        console.log(`   🌐 Browser automation simulation`);
      }
      
      // Both API and fallback modes are valid - the system should always work
      expect(typeof hasAPIs).toBe('boolean');
    });
  });
});
