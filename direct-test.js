#!/usr/bin/env node

import { mcpToolRegistration } from './dist/services/enhanced-intelligence/mcp-tool-registration.service.js';

console.log('🔧 Direct Method Test\n');

await mcpToolRegistration.registerAllTools();

const testInput = 'think about quantum physics';
console.log(`Input: "${testInput}"`);

// Test the actual getToolRecommendations method
const recommendations = mcpToolRegistration.getToolRecommendations(
  testInput,
  { userId: 'test-user', channelId: 'test-channel' }
);

console.log(`\nRecommendations (${recommendations.length}):`);
recommendations.forEach(tool => {
  console.log(`- ${tool.name}: [${tool.capabilities.join(', ')}]`);
});

// Now let me check if the issue is in the order/priority 
// The test expects ANY tool with reasoning/analysis capability
// Let's see what we actually get vs what we expect

const expectedCapabilities = ['reasoning', 'analysis'];
console.log(`\nExpected capabilities: [${expectedCapabilities.join(', ')}]`);

console.log('\nChecking each recommendation against expected capabilities:');
recommendations.forEach(tool => {
  const matches = expectedCapabilities.filter(cap => 
    tool.capabilities.some(toolCap => 
      toolCap.includes(cap) || cap.includes(toolCap)
    )
  );
  console.log(`- ${tool.name}: matches [${matches.join(', ')}]`);
});

const hasRelevantCapability = recommendations.some(tool => 
  expectedCapabilities.some(cap => 
    tool.capabilities.some(toolCap => 
      toolCap.includes(cap) || cap.includes(toolCap)
    )
  )
);

console.log(`\nFinal result: ${hasRelevantCapability}`);

console.log('\n✅ Debug completed');
