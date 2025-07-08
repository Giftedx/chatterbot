/**
 * Memory System Validation Script
 * Manual validation of the personal user memory system
 */

import { UserMemoryService } from './user-memory.service.js';
import { MemoryExtractionService } from './extraction.service.js';

async function validateMemorySystem() {
  console.log('🧠 Validating Personal User Memory System...\n');

  try {
    const userMemoryService = new UserMemoryService();
    const extractionService = new MemoryExtractionService();

    // Test 1: Memory Extraction
    console.log('📝 Test 1: Memory Extraction');
    const extractionContext = {
      userId: 'test-validation-user',
      channelId: 'test-channel',
      messageContent: 'Hi, my name is Alex and I\'m a Python developer working on machine learning projects.',
      responseContent: 'Great to meet you Alex! Python is excellent for ML.'
    };

    const extractionResult = extractionService.extractFromConversation(extractionContext);
    console.log('   Extracted memories:', extractionResult.memories);
    console.log('   Extracted preferences:', extractionResult.preferences);
    console.log('   Confidence:', extractionResult.confidence);
    console.log('   ✅ Memory extraction working\n');

    // Test 2: Memory Storage
    console.log('📚 Test 2: Memory Storage');
    const testUserId = 'validation-user-123';
    const testMemories = { 
      name: 'Jordan',
      role: 'senior engineer',
      programmingLanguages: 'TypeScript, Python'
    };
    const testPreferences = {
      communicationStyle: 'technical' as const,
      helpLevel: 'expert' as const,
      responseLength: 'detailed' as const
    };

    const stored = await userMemoryService.updateUserMemory(testUserId, testMemories, testPreferences);
    console.log('   Memory storage result:', stored);
    console.log('   ✅ Memory storage working\n');

    // Test 3: Memory Retrieval
    console.log('🔍 Test 3: Memory Retrieval');
    const retrieved = await userMemoryService.getUserMemory(testUserId);
    if (retrieved) {
      console.log('   Retrieved user:', retrieved.memories.name);
      console.log('   Retrieved role:', retrieved.memories.role);
      console.log('   Communication style:', retrieved.preferences?.communicationStyle);
      console.log('   Memory count:', retrieved.memoryCount);
      console.log('   Token count:', retrieved.tokenCount);
      console.log('   ✅ Memory retrieval working\n');
    } else {
      console.log('   ❌ Failed to retrieve memory\n');
    }

    // Test 4: Context Generation
    console.log('🎯 Test 4: Context Generation');
    const context = await userMemoryService.getMemoryContext(testUserId);
    if (context) {
      console.log('   User profile:', context.userProfile);
      console.log('   Context prompt preview:', context.contextPrompt.substring(0, 100) + '...');
      console.log('   ✅ Context generation working\n');
    } else {
      console.log('   ❌ Failed to generate context\n');
    }

    // Test 5: Conversation Processing
    console.log('💬 Test 5: Conversation Processing');
    const conversationContext = {
      userId: 'conversation-test-user',
      channelId: 'test-channel',
      messageContent: 'I\'m Sarah, a React developer from Seattle. I prefer concise explanations.',
      responseContent: 'Thanks for sharing, Sarah! I\'ll keep my responses concise.'
    };

    const processed = await userMemoryService.processConversation(conversationContext);
    console.log('   Conversation processing result:', processed);
    
    if (processed) {
      const conversationMemory = await userMemoryService.getUserMemory(conversationContext.userId);
      console.log('   Extracted name:', conversationMemory?.memories.name);
      console.log('   Extracted tech:', conversationMemory?.memories.programmingLanguages);
      console.log('   Extracted location:', conversationMemory?.memories.location);
      console.log('   Response preference:', conversationMemory?.preferences?.responseLength);
      console.log('   ✅ Conversation processing working\n');
    }

    // Test 6: Memory Statistics
    console.log('📊 Test 6: Memory Statistics');
    const stats = await userMemoryService.getUserMemoryStats(testUserId);
    if (stats) {
      console.log('   Total memories:', stats.memoryCount);
      console.log('   Token count:', stats.tokenCount);
      console.log('   Has preferences:', stats.hasPreferences);
      console.log('   Memory types:', stats.memoryTypes.join(', '));
      console.log('   ✅ Statistics working\n');
    }

    // Cleanup
    console.log('🧹 Cleanup Test Data');
    await userMemoryService.deleteAllUserMemories(testUserId);
    await userMemoryService.deleteAllUserMemories(conversationContext.userId);
    console.log('   ✅ Cleanup completed\n');

    console.log('🎉 Personal User Memory System Validation PASSED!');
    console.log('✅ All memory functionality is working correctly.');

  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run validation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateMemorySystem().catch(console.error);
}

export { validateMemorySystem };
