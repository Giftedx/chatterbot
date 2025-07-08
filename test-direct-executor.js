// Quick test of DirectMCPExecutor
const { DirectMCPExecutor } = require('./dist/services/enhanced-intelligence/direct-mcp-executor.service.js');

async function testExecutor() {
  console.log('🧪 Testing DirectMCPExecutor...');
  
  const executor = new DirectMCPExecutor();
  
  try {
    // Test memory search
    console.log('\n1. Testing Memory Search...');
    const memoryResult = await executor.executeMemorySearch('test query');
    console.log('✅ Memory Search Result:', memoryResult.success);
    
    // Test web search
    console.log('\n2. Testing Web Search...');
    const webResult = await executor.executeWebSearch('test search', 2);
    console.log('✅ Web Search Result:', webResult.success);
    
    // Test sequential thinking
    console.log('\n3. Testing Sequential Thinking...');
    const thinkingResult = await executor.executeSequentialThinking('test thought');
    console.log('✅ Sequential Thinking Result:', thinkingResult.success);
    
    console.log('\n🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testExecutor();
