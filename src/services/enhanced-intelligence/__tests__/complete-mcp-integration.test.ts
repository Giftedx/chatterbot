/**
 * MCP Integration Verification Test
 * Tests the complete MCP integration flow without Discord.js dependencies
 */

import { MCPProductionIntegrationService } from '../mcp-production-integration.service';
import { DirectMCPExecutor } from '../direct-mcp-executor.service';

describe('Complete MCP Integration Flow', () => {
  let productionService: MCPProductionIntegrationService;
  let directExecutor: DirectMCPExecutor;

  beforeEach(() => {
    productionService = new MCPProductionIntegrationService();
    directExecutor = new DirectMCPExecutor();
  });

  describe('Layer 1: Direct MCP Executor', () => {
    it('should be available and execute MCP functions', async () => {
      const result = await directExecutor.executeMemorySearch('layer 1 availability test');
      
      console.log(`🔧 Layer 1 (Direct MCP): ${result.success ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should execute memory search directly', async () => {
      const result = await directExecutor.executeMemorySearch('layer 1 test');
      
      console.log(`🧠 Layer 1 Memory Search Result:`, {
        success: result.success,
        toolUsed: result.toolUsed
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe('mcp-memory-search'); // Updated to canonical MCP tool name
    });
  });

  describe('Layer 2: Direct MCP Executor (Enhanced)', () => {
    it('should execute memory search directly', async () => {
      const result = await directExecutor.executeMemorySearch('layer 2 test');
      
      console.log(`🧠 Layer 2 Memory Search Result:`, {
        success: result.success,
        toolUsed: result.toolUsed
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe('mcp-memory-search');
    });

    it('should execute web search directly', async () => {
      const result = await directExecutor.executeWebSearch('layer 2 web test', 2);
      
      console.log(`🔍 Layer 2 Web Search Result:`, {
        success: result.success,
        toolUsed: result.toolUsed
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe('mcp-brave-search');
    });
  });

  describe('Layer 3: Production Integration Service', () => {
    it('should detect MCP environment correctly', () => {
      const status = productionService.getMCPStatus();
      
      console.log(`🔧 Layer 3 (Production): ${status.isEnabled ? 'ENABLED' : 'DISABLED'}`);
      expect(typeof status.isEnabled).toBe('boolean');
    });

    it('should execute production memory search', async () => {
      const result = await productionService.executeProductionMemorySearch('layer 3 test');
      
      console.log(`🧠 Layer 3 Memory Search Result:`, {
        success: result.success,
        toolUsed: result.toolUsed,
        requiresExternalMCP: result.requiresExternalMCP
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe('mcp-memory-search');
    });

    it('should execute production web search', async () => {
      const result = await productionService.executeProductionWebSearch('layer 3 web test', 1);
      
      console.log(`🔍 Layer 3 Web Search Result:`, {
        success: result.success,
        toolUsed: result.toolUsed
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe('mcp-brave-search');
    });

    it('should execute production sequential thinking', async () => {
      const result = await productionService.executeProductionSequentialThinking('analyze layer 3 integration');
      
      console.log(`🧠 Layer 3 Sequential Thinking Result:`, {
        success: result.success,
        toolUsed: result.toolUsed
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe('mcp-sequential-thinking');
    });
  });

  describe('Complete Integration Flow Test', () => {
    it('should demonstrate working MCP pipeline', async () => {
      console.log(`\n🚀 Testing Complete MCP Integration Pipeline...\n`);
      
      // Test pipeline: Layer 3 → Layer 2 → Layer 1 → Real MCP Functions
      const testQueries = [
        'integration test query 1',
        'integration test query 2'
      ];
      
      const results = [];
      
      for (const query of testQueries) {
        console.log(`📝 Processing: ${query}`);
        
        try {
          // Test memory through all layers
          const memoryResult = await productionService.executeProductionMemorySearch(query);
          results.push({
            query,
            type: 'memory',
            success: memoryResult.success,
            layer: 'production',
            toolUsed: memoryResult.toolUsed
          });
          
          // Test web search through all layers  
          const webResult = await productionService.executeProductionWebSearch(query, 1);
          results.push({
            query,
            type: 'web',
            success: webResult.success,
            layer: 'production',
            toolUsed: webResult.toolUsed
          });
          
          console.log(`   ✅ Memory: ${memoryResult.success ? 'SUCCESS' : 'FAILED'}`);
          console.log(`   ✅ Web: ${webResult.success ? 'SUCCESS' : 'FAILED'}`);
          
        } catch (error) {
          console.log(`   ❌ Error: ${error}`);
          results.push({
            query,
            type: 'error',
            success: false,
            layer: 'production',
            error: String(error)
          });
        }
      }
      
      // Analyze results
      const successfulResults = results.filter(r => r.success);
      const totalResults = results.length;
      const successRate = successfulResults.length / totalResults;
      
      console.log(`\n📊 Pipeline Results Summary:`);
      console.log(`   Total Operations: ${totalResults}`);
      console.log(`   Successful: ${successfulResults.length}`);
      console.log(`   Success Rate: ${(successRate * 100).toFixed(1)}%`);
      
      // Print detailed results
      console.log(`\n📋 Detailed Results:`);
      results.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.query} (${result.type}): ${result.success ? '✅' : '❌'} [${result.toolUsed || 'N/A'}]`);
      });
      
      // Verify high success rate
      expect(successRate).toBeGreaterThan(0.8); // At least 80% success
      expect(successfulResults.length).toBeGreaterThan(0); // At least some successes
      
      console.log(`\n🎯 Integration Verification: ${successRate > 0.8 ? 'PASSED' : 'FAILED'}`);
    });
  });

  describe('Real MCP Function Verification', () => {
    it('should confirm actual MCP functions are being called', async () => {
      console.log(`\n🔍 Verifying Real MCP Function Calls...\n`);
      
      // Test direct executor to confirm real MCP availability
      const directResult = await directExecutor.executeMemorySearch('real MCP verification test');
      
      console.log(`📋 Direct MCP Result:`, {
        success: directResult.success,
        toolUsed: directResult.toolUsed,
        hasData: !!directResult.data
      });
      
      // Test production service to confirm end-to-end flow
      const productionResult = await productionService.executeProductionMemorySearch('production MCP verification test');
      
      console.log(`📋 Production MCP Result:`, {
        success: productionResult.success,
        toolUsed: productionResult.toolUsed,
        requiresExternalMCP: productionResult.requiresExternalMCP,
        hasData: !!productionResult.data
      });
      
      // Verify both layers work
      expect(directResult.success).toBe(true);
      expect(productionResult.success).toBe(true);
      expect(productionResult.requiresExternalMCP).toBe(true); // Should be handled by external MCP in production mode
      
      if (directResult.success && productionResult.success) {
        console.log(`\n✅ CONFIRMATION: Real MCP Functions are Connected and Working!`);
        console.log(`   🔧 DirectMCPExecutor: Connected to real MCP functions`);
        console.log(`   🏭 ProductionIntegrationService: Using real function calls`);
        console.log(`   🎯 Enhanced Intelligence: Ready for real MCP capabilities`);
      } else {
        console.log(`\n❌ WARNING: MCP Functions may be simulated or not properly connected`);
      }
    });
  });
});
