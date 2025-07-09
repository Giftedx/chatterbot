#!/usr/bin/env node

import { mcpToolRegistration } from './dist/services/enhanced-intelligence/mcp-tool-registration.service.js';

console.log('🔧 Debugging Test Case Capability Matching\n');

// Register all tools
await mcpToolRegistration.registerAllTools();

const testCases = [
  { input: 'search for cats', expectedCapabilities: ['web-search', 'search'] },
  { input: 'remember my name is John', expectedCapabilities: ['memory', 'context'] },
  { input: 'analyze this URL: https://example.com', expectedCapabilities: ['content-extraction', 'url-processing'] },
  { input: 'think about quantum physics', expectedCapabilities: ['reasoning', 'analysis'] }
];

for (const testCase of testCases) {
  console.log(`\n📝 Testing: "${testCase.input}"`);
  console.log(`   Expected capabilities: [${testCase.expectedCapabilities.join(', ')}]`);
  
  const recommendations = mcpToolRegistration.getToolRecommendations(
    testCase.input,
    { userId: 'test-user', channelId: 'test-channel' }
  );

  console.log(`   Found ${recommendations.length} recommendations:`);
  recommendations.forEach(tool => {
    console.log(`   - ${tool.name}: [${tool.capabilities.join(', ')}]`);
  });
  
  // Test the complex matching logic from the test
  const hasRelevantCapability = recommendations.some(tool => 
    testCase.expectedCapabilities.some(cap => 
      tool.capabilities.some(toolCap => 
        toolCap.includes(cap) || cap.includes(toolCap)
      )
    )
  );

  console.log(`   ✅ Complex matching result: ${hasRelevantCapability}`);
  
  // Debug each step
  for (const expectedCap of testCase.expectedCapabilities) {
    const matchingTools = recommendations.filter(tool => 
      tool.capabilities.some(toolCap => 
        toolCap.includes(expectedCap) || expectedCap.includes(toolCap)
      )
    );
    console.log(`   📍 Expected "${expectedCap}" matches: ${matchingTools.map(t => t.name).join(', ') || 'NONE'}`);
  }
}

console.log('\n✅ Debug completed');
