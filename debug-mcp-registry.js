#!/usr/bin/env node

import { mcpToolRegistration } from './dist/services/enhanced-intelligence/mcp-tool-registration.service.js';
import { mcpRegistry } from './dist/services/enhanced-intelligence/mcp-registry.service.js';

console.log('🔧 Debugging MCP Registry System\n');

// Register all tools
console.log('📝 Registering all tools...');
await mcpToolRegistration.registerAllTools();

// Check registry status
console.log('\n📊 Registry Status:');
const status = mcpRegistry.getRegistryStatus();
console.log(JSON.stringify(status, null, 2));

// Test capability analysis
console.log('\n🧠 Testing capability analysis...');
const testInput = 'AI news search';

console.log(`\n🔍 Deep Debug for: "${testInput}"`);

// Mock context
const context = {
  userId: 'debug-user',
  channelId: 'debug-channel',
  priority: 'medium'
};

// Step 1: Test capability analysis
console.log('\n📝 Step 1: Capability Analysis');
const capabilities = testInput.toLowerCase().includes('search') ? ['web-search'] : 
                    testInput.toLowerCase().includes('news') ? ['real-time-info'] : [];
console.log(`   Raw capabilities for "${testInput}":`, capabilities);

// Step 2: Get all tools and check availability
console.log('\n📝 Step 2: Tool Availability Check');
const allTools = Array.from(mcpRegistry.tools.values());
console.log(`   Total tools: ${allTools.length}`);

allTools.forEach(tool => {
  console.log(`   - ${tool.name} (${tool.id})`);
  console.log(`     Capabilities: ${tool.capabilities.join(', ')}`);
  console.log(`     Required ENV: ${tool.requiredEnvVars?.join(', ') || 'None'}`);
  console.log(`     Priority: ${tool.priority}`);
  
  // Test environment variable check
  let envOk = true;
  if (tool.requiredEnvVars) {
    for (const envVar of tool.requiredEnvVars) {
      if (!process.env[envVar]) {
        envOk = false;
        console.log(`     ❌ Missing ENV VAR: ${envVar}`);
      }
    }
  }
  if (envOk) {
    console.log(`     ✅ Environment OK`);
  }
  
  // Test capability matching
  const hasWebSearch = tool.capabilities.includes('web-search');
  const hasRealTime = tool.capabilities.includes('real-time-info');
  console.log(`     Has web-search: ${hasWebSearch}, Has real-time-info: ${hasRealTime}`);
});

// Step 3: Test discoverTools directly
console.log('\n� Step 3: Direct discoverTools test');
const executionContext = {
  userId: context.userId,
  channelId: context.channelId,
  messageContent: testInput,
  priority: context.priority || 'medium',
  requiredCapabilities: ['web-search'],
  fallbackAllowed: true
};

console.log('   Execution context:', JSON.stringify(executionContext, null, 2));

const discovered = mcpRegistry.discoverTools(executionContext);
console.log(`   Discovered tools: ${discovered.length}`);
discovered.forEach(tool => {
  console.log(`   - ${tool.name} (${tool.id}) - Priority: ${tool.priority}`);
});

// Step 4: Test with different capabilities
console.log('\n� Step 4: Testing different capability sets');
const capabilitySets = [
  ['web-search'],
  ['real-time-info'], 
  ['web-search', 'real-time-info'],
  ['search'],
  ['current-events']
];

capabilitySets.forEach(caps => {
  const testContext = { ...executionContext, requiredCapabilities: caps };
  const results = mcpRegistry.discoverTools(testContext);
  console.log(`   Capabilities [${caps.join(', ')}]: ${results.length} tools found`);
});

console.log('\n✅ Debug completed');
