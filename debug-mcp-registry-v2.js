#!/usr/bin/env node

import { mcpToolRegistration } from './dist/services/enhanced-intelligence/mcp-tool-registration.service.js';
import { mcpRegistry } from './dist/services/enhanced-intelligence/mcp-registry.service.js';

console.log('🔧 Debugging MCP Registry System\n');

// Register all tools
console.log('📝 Registering all tools...');
await mcpToolRegistration.registerAllTools();

// Test the actual getToolRecommendations method
console.log('\n🧠 Testing getToolRecommendations method...');
const testInput = 'AI news search';

console.log(`\n🔍 Deep Debug for: "${testInput}"`);

// Mock context
const context = {
  userId: 'debug-user',
  channelId: 'debug-channel',
  priority: 'medium'
};

// Step 1: Test the actual method that's failing
console.log('\n📝 Step 1: Testing getToolRecommendations directly');
try {
  const recommendations = mcpToolRegistration.getToolRecommendations(testInput, context);
  console.log(`   Found ${recommendations.length} recommendations:`);
  
  recommendations.forEach((tool, index) => {
    console.log(`   ${index + 1}. ${tool.name} (${tool.id})`);
    console.log(`      Priority: ${tool.priority}`);
    console.log(`      Capabilities: ${tool.capabilities.join(', ')}`);
  });
} catch (error) {
  console.error(`   ❌ Error: ${error.message}`);
  console.error(error.stack);
}

// Step 2: Test the analyzeCapabilityRequirements method manually
console.log('\n📝 Step 2: Manual capability analysis');

// Simulate the analyzeCapabilityRequirements method
function testAnalyzeCapabilities(userInput) {
  const lowerInput = userInput.toLowerCase();
  const capabilities = [];

  console.log(`   Input: "${userInput}"`);
  console.log(`   Lowercase: "${lowerInput}"`);

  // Memory/knowledge requirements
  if (lowerInput.includes('remember') || lowerInput.includes('recall') || lowerInput.includes('know')) {
    capabilities.push('memory', 'context');
    console.log(`   ✅ Added memory capabilities`);
  }

  // Search requirements
  if (lowerInput.includes('search') || lowerInput.includes('find') || lowerInput.includes('look up') || lowerInput.includes('lookup')) {
    capabilities.push('web-search', 'search');
    console.log(`   ✅ Added search capabilities`);
  }

  // Content analysis requirements
  if (lowerInput.includes('analyze') || lowerInput.includes('extract') || lowerInput.includes('summarize')) {
    capabilities.push('content-extraction', 'analysis');
    console.log(`   ✅ Added content analysis capabilities`);
  }

  // Current events and news requirements
  if (lowerInput.includes('current') || lowerInput.includes('latest') || lowerInput.includes('news') || 
      lowerInput.includes('recent') || lowerInput.includes('today') || lowerInput.includes('now')) {
    capabilities.push('web-search', 'real-time-info', 'current-events');
    console.log(`   ✅ Added news/current events capabilities`);
  }

  // Information gathering requirements  
  if (lowerInput.includes('information') || lowerInput.includes('info') || lowerInput.includes('data') ||
      lowerInput.includes('details') || lowerInput.includes('about')) {
    capabilities.push('web-search', 'search');
    console.log(`   ✅ Added information gathering capabilities`);
  }

  // Browse/automation requirements
  if (lowerInput.includes('browse') || lowerInput.includes('visit') || lowerInput.includes('navigate') ||
      lowerInput.includes('website') || lowerInput.includes('page')) {
    capabilities.push('browser-automation', 'web-interaction', 'content-extraction');
    console.log(`   ✅ Added browsing capabilities`);
  }

  // Default to basic search if no specific capabilities identified
  if (capabilities.length === 0) {
    capabilities.push('search', 'reasoning');
    console.log(`   ⚠️  No specific capabilities found, adding defaults`);
  }

  console.log(`   Final capabilities: [${capabilities.join(', ')}]`);
  return capabilities;
}

const manualCapabilities = testAnalyzeCapabilities(testInput);

// Step 3: Test with manual capabilities
console.log('\n📝 Step 3: Testing discoverTools with manual capabilities');
const executionContext = {
  userId: context.userId,
  channelId: context.channelId,
  messageContent: testInput,
  priority: context.priority || 'medium',
  requiredCapabilities: manualCapabilities,
  fallbackAllowed: true
};

const discovered = mcpRegistry.discoverTools(executionContext);
console.log(`   Discovered ${discovered.length} tools with manual capabilities:`);
discovered.forEach(tool => {
  console.log(`   - ${tool.name} (${tool.id}) - Priority: ${tool.priority}`);
});

console.log('\n✅ Debug completed');
