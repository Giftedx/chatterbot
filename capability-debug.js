#!/usr/bin/env node

import { mcpToolRegistration } from './dist/services/enhanced-intelligence/mcp-tool-registration.service.js';
import { mcpRegistry } from './dist/services/enhanced-intelligence/mcp-registry.service.js';

console.log('🔧 Capability Detection Debug\n');

await mcpToolRegistration.registerAllTools();

const testInput = 'think about quantum physics';
console.log(`Input: "${testInput}"`);

// Check what tools we have with reasoning capabilities
const allTools = Array.from(mcpRegistry.tools.values());
console.log(`\nAll registered tools (${allTools.length}):`);
allTools.forEach(tool => {
  console.log(`- ${tool.name} (${tool.id}): [${tool.capabilities.join(', ')}]`);
  if (tool.capabilities.includes('reasoning') || tool.capabilities.includes('analysis')) {
    console.log(`  🧠 HAS REASONING CAPABILITIES`);
  }
});

// Manually test capability analysis (simulate the private method)
const lowerInput = testInput.toLowerCase();
console.log(`\nCapability Analysis for: "${lowerInput}"`);
console.log(`- includes('think'): ${lowerInput.includes('think')}`);
console.log(`- includes('reason'): ${lowerInput.includes('reason')}`);
console.log(`- includes('explain'): ${lowerInput.includes('explain')}`);

// Test discovery with reasoning capabilities
console.log(`\nTesting discovery with 'reasoning' capability:`);
const reasoningContext = {
  userId: 'test-user',
  channelId: 'test-channel',
  messageContent: testInput,
  priority: 'medium',
  requiredCapabilities: ['reasoning'],
  fallbackAllowed: true
};

const reasoningTools = mcpRegistry.discoverTools(reasoningContext);
console.log(`Found ${reasoningTools.length} tools with reasoning capability:`);
reasoningTools.forEach(tool => {
  console.log(`- ${tool.name}: [${tool.capabilities.join(', ')}]`);
});

console.log('\n✅ Debug completed');
