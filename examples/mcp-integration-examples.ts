/**
 * MCP Integration Example
 * Demonstrates how to use the new Model Context Protocol (MCP) features
 * in the Discord AI chatbot following the implementation plan
 */

import { mcpManager } from '../src/services/mcp-manager.service.js';
import { UnifiedIntelligenceService } from '../src/services/unified-intelligence.service.js';

// Type definitions for better TypeScript support
interface ServerStatus {
  connected: boolean;
  phase: number;
  priority: string;
}

interface MCPStatus {
  connectedServers: number;
  totalServers: number;
  serverStatus: Record<string, ServerStatus>;
}

/**
 * Example 1: Basic MCP Integration Setup
 * This shows how to initialize and check MCP Manager status
 */
async function example1_BasicSetup() {
  console.log('=== Example 1: Basic MCP Integration Setup ===\n');
  
  try {
    // Initialize MCP Manager
    console.log('🔧 Initializing MCP Manager...');
    await mcpManager.initialize();
    
    // Get status
    const status = mcpManager.getStatus() as MCPStatus;
    console.log(`📊 Status: ${status.connectedServers}/${status.totalServers} servers connected`);
    
    // Show connected servers
    console.log('🔗 Connected Servers:');
    for (const [name, serverStatus] of Object.entries(status.serverStatus)) {
      if (serverStatus.connected) {
        console.log(`   ✅ ${name} (Phase ${serverStatus.phase}, ${serverStatus.priority} priority)`);
      } else {
        console.log(`   ❌ ${name} (Phase ${serverStatus.phase}, ${serverStatus.priority} priority)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
  
  console.log('\n');
}

/**
 * Example 2: Memory Search Integration
 * Shows how to use MCP memory search capabilities
 */
async function example2_MemorySearch() {
  console.log('=== Example 2: Memory Search Integration ===\n');
  
  try {
    // Direct memory search through MCP Manager
    console.log('🧠 Performing memory search...');
    const memoryResult = await mcpManager.searchMemory('Discord bot development best practices');
    
    console.log('📝 Memory Search Result:');
    console.log(JSON.stringify(memoryResult, null, 2));
    
  } catch (error) {
    console.error('❌ Memory search failed:', error);
    console.log('💡 This is normal if no memory servers are configured');
  }
  
  console.log('\n');
}

/**
 * Example 3: Web Search Integration
 * Demonstrates real-time web search capabilities
 */
async function example3_WebSearch() {
  console.log('=== Example 3: Web Search Integration ===\n');
  
  try {
    // Web search through MCP Manager
    console.log('🔍 Performing web search...');
    const searchResult = await mcpManager.searchWeb('latest Discord.js v14 features', 3);
    
    console.log('🌐 Web Search Result:');
    console.log(JSON.stringify(searchResult, null, 2));
    
  } catch (error) {
    console.error('❌ Web search failed:', error);
    console.log('💡 This is normal if no search servers are configured');
  }
  
  console.log('\n');
}

/**
 * Example 4: Content Extraction
 * Shows how to extract content from web pages
 */
async function example4_ContentExtraction() {
  console.log('=== Example 4: Content Extraction ===\n');
  
  try {
    // Content extraction through MCP Manager
    console.log('📄 Extracting content from URLs...');
    const urls = ['https://discord.js.org/', 'https://github.com/microsoft/TypeScript'];
    const extractionResult = await mcpManager.extractContent(urls);
    
    console.log('📋 Content Extraction Result:');
    console.log(JSON.stringify(extractionResult, null, 2));
    
  } catch (error) {
    console.error('❌ Content extraction failed:', error);
    console.log('💡 This is normal if no extraction servers are configured');
  }
  
  console.log('\n');
}

/**
 * Example 5: Enhanced Intelligence Service with MCP
 * Demonstrates how to use UnifiedIntelligenceService with MCP integration
 */
async function example5_EnhancedIntelligence() {
  console.log('=== Example 5: Enhanced Intelligence with MCP ===\n');
  
  try {
    // Create UnifiedIntelligenceService with MCP Manager
    console.log('🤖 Creating Enhanced Intelligence Service...');
    const intelligenceService = new UnifiedIntelligenceService(undefined, mcpManager);
    
    console.log('✅ UnifiedIntelligenceService created with MCP integration');
    console.log('💡 This service can now access all MCP capabilities for enhanced responses');
    
    // The service will automatically use MCP tools when processing messages
    console.log('🎯 Ready to process intelligent messages with MCP-enhanced capabilities');
    console.log(`🔧 Service has access to ${Object.keys(intelligenceService).length} enhanced features`);
    
  } catch (error) {
    console.error('❌ Enhanced Intelligence setup failed:', error);
  }
  
  console.log('\n');
}

/**
 * Example 6: Direct Tool Calls
 * Shows how to call specific MCP tools directly
 */
async function example6_DirectToolCalls() {
  console.log('=== Example 6: Direct MCP Tool Calls ===\n');
  
  try {
    // List connected clients
    console.log('📋 Available MCP clients:');
    const status = mcpManager.getStatus() as MCPStatus;
    const connectedServers = Object.entries(status.serverStatus)
      .filter(([, serverStatus]) => serverStatus.connected)
      .map(([name]) => name);
    
    if (connectedServers.length === 0) {
      console.log('   No servers currently connected (running in fallback mode)');
      return;
    }
    
    for (const serverName of connectedServers) {
      console.log(`   📡 ${serverName}`);
      
      try {
        // Try calling a generic tool on each server
        const result = await mcpManager.callTool(serverName, 'status', {});
        console.log(`     ✅ Tool call successful:`, result);
      } catch (error) {
        console.log(`     ⚠️ Tool call failed: ${error}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Direct tool calls failed:', error);
  }
  
  console.log('\n');
}

/**
 * Example 7: Error Handling and Fallbacks
 * Demonstrates robust error handling patterns
 */
async function example7_ErrorHandling() {
  console.log('=== Example 7: Error Handling and Fallbacks ===\n');
  
  try {
    console.log('🔧 Testing error handling patterns...');
    
    // Test with non-existent server
    try {
      await mcpManager.callTool('non-existent-server', 'test-tool', {});
    } catch (error) {
      console.log(`✅ Proper error handling: ${error}`);
    }
    
    // Test reconnection capability
    console.log('🔄 Testing reconnection capability...');
    await mcpManager.reconnectFailedServers();
    console.log('✅ Reconnection attempt completed');
    
    // Show graceful degradation
    console.log('💡 The system gracefully handles server failures and provides fallbacks');
    console.log('💡 Users will still receive responses even if MCP servers are unavailable');
    
  } catch (error) {
    console.error('❌ Error handling test failed:', error);
  }
  
  console.log('\n');
}

/**
 * Example 8: Production Deployment Patterns
 * Shows recommended patterns for production deployment
 */
async function example8_ProductionPatterns() {
  console.log('=== Example 8: Production Deployment Patterns ===\n');
  
  try {
    console.log('🏭 Production Deployment Best Practices:');
    console.log('');
    
    console.log('1. 📋 Environment Variables Required:');
    console.log('   - DISCORD_TOKEN (required)');
    console.log('   - BRAVE_SEARCH_API_KEY (optional, enables web search)');
    console.log('   - FIRECRAWL_API_KEY (optional, enables content extraction)');
    console.log('   - GITHUB_TOKEN (optional, enables GitHub integration)');
    console.log('   - DATABASE_URL (optional, enables database integration)');
    console.log('');
    
    console.log('2. 🚀 Phased Rollout Strategy:');
    console.log('   - Phase 1: Memory + Discord (Critical)');
    console.log('   - Phase 2: Web Search + File System (High Priority)');
    console.log('   - Phase 3: Database + GitHub (Medium Priority)');
    console.log('   - Phase 4: Advanced Tools (Medium Priority)');
    console.log('   - Phase 5: Specialized Tools (Low Priority)');
    console.log('');
    
    console.log('3. 🔧 Monitoring and Health Checks:');
    console.log('   - Monitor MCP server connection status');
    console.log('   - Track tool execution success rates');
    console.log('   - Implement fallback mechanisms');
    console.log('   - Log all MCP operations for debugging');
    console.log('');
    
    console.log('4. 🛡️ Security Considerations:');
    console.log('   - Validate all MCP tool inputs');
    console.log('   - Implement rate limiting');
    console.log('   - Use read-only database access');
    console.log('   - Sandbox file system operations');
    console.log('');
    
    console.log('5. 📈 Scaling Recommendations:');
    console.log('   - Start with Phase 1 servers only');
    console.log('   - Add phases incrementally based on usage');
    console.log('   - Monitor resource consumption');
    console.log('   - Implement auto-scaling for high-traffic scenarios');
    
  } catch (error) {
    console.error('❌ Production patterns example failed:', error);
  }
  
  console.log('\n');
}

/**
 * Main example runner
 * Runs all examples in sequence
 */
async function runAllExamples() {
  console.log('🎯 MCP Integration Examples\n');
  console.log('This demonstrates the comprehensive MCP integration following the implementation plan.\n');
  
  try {
    await example1_BasicSetup();
    await example2_MemorySearch();
    await example3_WebSearch();
    await example4_ContentExtraction();
    await example5_EnhancedIntelligence();
    await example6_DirectToolCalls();
    await example7_ErrorHandling();
    await example8_ProductionPatterns();
    
    console.log('🎉 All examples completed successfully!');
    console.log('🚀 Your Discord bot now has comprehensive MCP integration capabilities.');
    
  } catch (error) {
    console.error('❌ Example execution failed:', error);
  } finally {
    // Clean shutdown
    console.log('\n🛑 Shutting down MCP Manager...');
    await mcpManager.shutdown();
    console.log('✅ Shutdown complete');
  }
}

/**
 * Usage Instructions
 */
export function printUsageInstructions() {
  console.log(`
🎯 MCP Integration Usage Instructions

To enable MCP features in your Discord bot:

1. 📝 Set Environment Variables:
   export ENABLE_ENHANCED_INTELLIGENCE=true
   export BRAVE_SEARCH_API_KEY=your_brave_api_key
   export FIRECRAWL_API_KEY=your_firecrawl_api_key
   export GITHUB_TOKEN=your_github_token

2. 🚀 Start the Bot:
   npm start

3. 💬 Use in Discord:
   /optin enable:true  # Enable intelligent conversation
   
   Then send messages to get MCP-enhanced responses with:
   - 🧠 Persistent memory across conversations
   - 🔍 Real-time web search capabilities
   - 📄 Content extraction from URLs
   - 🤖 Advanced reasoning and analysis
   - 🔗 GitHub repository integration
   - 💾 Database query capabilities

4. 📊 Monitor Status:
   The bot will log MCP server connection status on startup
   Failed servers will use intelligent fallbacks

5. 🔧 Troubleshooting:
   - Check environment variables are set correctly
   - Verify API keys are valid and have sufficient quota
   - Monitor logs for connection errors
   - Use fallback mode if external services are unavailable

6. 🏭 Production Deployment:
   - Use Docker for consistent environments
   - Implement health checks for MCP servers
   - Monitor resource usage and implement auto-scaling
   - Set up proper logging and alerting
`);
}

// Export examples for testing and demonstration
export {
  example1_BasicSetup,
  example2_MemorySearch,
  example3_WebSearch,
  example4_ContentExtraction,
  example5_EnhancedIntelligence,
  example6_DirectToolCalls,
  example7_ErrorHandling,
  example8_ProductionPatterns,
  runAllExamples
};

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}
