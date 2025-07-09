#!/usr/bin/env node

import { mcpToolRegistration } from './dist/services/enhanced-intelligence/mcp-tool-registration.service.js';

console.log('🔧 Quick Test Debug\n');

await mcpToolRegistration.registerAllTools();

const failingCase = 'think about quantum physics';
console.log(`Testing: "${failingCase}"`);

const recommendations = mcpToolRegistration.getToolRecommendations(
  failingCase,
  { userId: 'test-user', channelId: 'test-channel' }
);

console.log(`Found ${recommendations.length} recommendations:`);
recommendations.forEach(tool => {
  console.log(`- ${tool.name}: [${tool.capabilities.join(', ')}]`);
});

// Test the exact matching logic from the test
const expectedCapabilities = ['reasoning', 'analysis'];
const hasRelevantCapability = recommendations.some(tool => 
  expectedCapabilities.some(cap => 
    tool.capabilities.some(toolCap => 
      toolCap.includes(cap) || cap.includes(toolCap)
    )
  )
);

console.log(`\nExpected capabilities: [${expectedCapabilities.join(', ')}]`);
console.log(`Has relevant capability: ${hasRelevantCapability}`);

console.log('\n✅ Debug completed');
