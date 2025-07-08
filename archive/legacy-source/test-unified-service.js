// Simple test to verify the unified intelligence service works
import { spawn } from 'child_process';

// Test if the unified service can be imported and used
async function testUnifiedService() {
  console.log('🧪 Testing Unified Intelligence Service...\n');
  
  try {
    // Try to compile just the unified service with ts-node
    const tsc = spawn('npx', ['ts-node', '--transpile-only', '-e', `
      import { UnifiedIntelligenceService } from './src/services/unified-intelligence.service.js';
      console.log('✅ UnifiedIntelligenceService imported successfully');
      
      // Test the intelligence analysis
      const service = new UnifiedIntelligenceService();
      const mockMessage = {
        content: 'Hey bot, can you help me analyze this image and switch to creative persona?',
        attachments: new Map(),
        author: { id: 'test-user' },
        guild: { id: 'test-guild' },
        channel: { id: 'test-channel' }
      };
      
      // Test intelligence analysis
      const analysis = service.analyzeIntelligenceNeeds(mockMessage);
      console.log('✅ Intelligence analysis completed:', JSON.stringify(analysis, null, 2));
      
      process.exit(0);
    `], {
      stdio: 'inherit',
      cwd: __dirname
    });

    tsc.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Unified Intelligence Service test passed!');
      } else {
        console.log('\n❌ Unified Intelligence Service test failed with code:', code);
      }
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUnifiedService();
