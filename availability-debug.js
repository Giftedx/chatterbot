#!/usr/bin/env node

import { mcpToolRegistration } from './dist/services/enhanced-intelligence/mcp-tool-registration.service.js';
import { mcpRegistry } from './dist/services/enhanced-intelligence/mcp-registry.service.js';

console.log('🔧 Tool Availability Debug\n');

await mcpToolRegistration.registerAllTools();

// Test discovery with ONLY reasoning capabilities
console.log('Testing discovery with ONLY reasoning capabilities:');
const reasoningOnlyContext = {
  userId: 'test-user',
  channelId: 'test-channel',
  messageContent: 'think about quantum physics',
  priority: 'medium',
  requiredCapabilities: ['reasoning'],
  fallbackAllowed: true
};

const reasoningTools = mcpRegistry.discoverTools(reasoningOnlyContext);
console.log(`Found ${reasoningTools.length} reasoning tools:`);
reasoningTools.forEach(tool => {
  console.log(`- ${tool.name}: [${tool.capabilities.join(', ')}]`);
});

// Test discovery with mixed capabilities (what we actually get)
console.log('\nTesting discovery with mixed capabilities [reasoning, analysis, web-search, search]:');
const mixedContext = {
  userId: 'test-user',
  channelId: 'test-channel',
  messageContent: 'think about quantum physics',
  priority: 'medium',
  requiredCapabilities: ['reasoning', 'analysis', 'web-search', 'search'],
  fallbackAllowed: true
};

const mixedTools = mcpRegistry.discoverTools(mixedContext);
console.log(`Found ${mixedTools.length} tools with mixed capabilities:`);
mixedTools.forEach(tool => {
  console.log(`- ${tool.name}: [${tool.capabilities.join(', ')}] - Priority: ${tool.priority}`);
});

console.log('\n✅ Debug completed');
