/**
 * Enhanced Personalization Engine with MCP Integration - Usage Examples
 * Demonstrates the powerful personalization capabilities enhanced by MCP tools
 */

import { PersonalizationEngine } from '../src/services/enhanced-intelligence/personalization-engine.service.js';
import { MCPManager } from '../src/services/mcp-manager.service.js';

/**
 * Example 1: Research-Oriented User Personalization - Uses the `/chat <message>` command for intelligent conversation
`/chat enable:true` - Enables full MCP-enhanced personalization
 * Shows how the system adapts to users interested in research and current events
 */
async function example1_ResearchUserPersonalization() {
  console.log('=== Example 1: Research-Oriented User Personalization ===\n');

  // Create personalization engine with MCP integration
  const mcpManager = new MCPManager();
  await mcpManager.initialize();
  const personalizationEngine = new PersonalizationEngine(mcpManager);

  const userId = 'researcher-alice';
  const guildId = 'research-guild-123';

  try {
    // Simulate research-oriented interactions
    console.log('📚 Recording research-oriented interactions...');
    
    await personalizationEngine.recordInteraction({
      userId,
      guildId,
      messageType: 'research-question',
      toolsUsed: ['memory', 'web-search'],
      responseTime: 2500,
      userSatisfaction: 5,
      conversationContext: 'Questions about current technology trends and research in AI',
      timestamp: new Date()
    });

    await personalizationEngine.recordInteraction({
      userId,
      guildId,
      messageType: 'analysis-request',
      toolsUsed: ['web-search', 'content-extraction'],
      responseTime: 3200,
      userSatisfaction: 4,
      conversationContext: 'Analysis of recent research papers and current events in machine learning',
      timestamp: new Date()
    });

    // Generate personalized recommendations
    console.log('🎯 Generating personalized recommendations...');
    const recommendations = await personalizationEngine.generatePersonalizedRecommendations(
      userId,
      guildId,
      'technology research and current events'
    );

    console.log('📋 Personalized Recommendations for Research User:');
    recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. ${rec.title} (${rec.priority} priority)`);
      console.log(`   Description: ${rec.description}`);
      console.log(`   Confidence: ${(rec.confidenceScore * 100).toFixed(1)}%`);
      console.log(`   Expected Benefit: ${rec.expectedBenefit}`);
      console.log(`   Action Steps: ${rec.actionableSteps.slice(0, 2).join(', ')}`);
    });

    // Demonstrate response adaptation
    console.log('\n🔧 Response Adaptation Example:');
    const originalResponse = 'Here are some findings about neural networks.';
    const adaptedResponse = await personalizationEngine.adaptResponse(
      userId,
      originalResponse,
      guildId
    );

    console.log(`Original: "${adaptedResponse.originalResponse}"`);
    console.log(`Adapted:  "${adaptedResponse.personalizedResponse}"`);
    console.log(`Adaptations Applied: ${adaptedResponse.adaptations.length}`);

  } catch (error) {
    console.error('❌ Research user personalization failed:', error);
  }

  await mcpManager.shutdown();
  console.log('\n✅ Research user personalization example completed\n');
}

/**
 * Example 2: Developer-Focused Personalization
 * Shows personalization for users with technical/programming interests
 */
async function example2_DeveloperPersonalization() {
  console.log('=== Example 2: Developer-Focused Personalization ===\n');

  const mcpManager = new MCPManager();
  await mcpManager.initialize();
  const personalizationEngine = new PersonalizationEngine(mcpManager);

  const userId = 'dev-bob';
  const guildId = 'coding-guild-456';

  try {
    // Simulate developer interactions
    console.log('💻 Recording developer-oriented interactions...');
    
    for (let i = 0; i < 3; i++) {
      await personalizationEngine.recordInteraction({
        userId,
        guildId,
        messageType: 'technical-question',
        toolsUsed: ['memory', 'sequential-thinking', 'github'],
        responseTime: 1800 + i * 200,
        userSatisfaction: 4 + (i % 2),
        conversationContext: `Complex programming discussion about software architecture and development patterns session ${i + 1}`,
        timestamp: new Date(Date.now() - i * 3600000)
      });
    }

    // Generate recommendations for developer
    const recommendations = await personalizationEngine.generatePersonalizedRecommendations(
      userId,
      guildId,
      'software development and programming'
    );

    console.log('📋 Personalized Recommendations for Developer:');
    recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. ${rec.title} (${rec.priority} priority)`);
      console.log(`   Focus: ${rec.type} recommendation`);
      console.log(`   Confidence: ${(rec.confidenceScore * 100).toFixed(1)}%`);
      console.log(`   Key Benefits: ${rec.expectedBenefit}`);
    });

    // Show personalization metrics
    console.log('\n📊 Developer Personalization Metrics:');
    const metrics = personalizationEngine.getPersonalizationMetrics();
    console.log(`   Active Users: ${metrics.activeUsers}`);
    console.log(`   Total Interactions: ${metrics.totalInteractions}`);
    console.log(`   Average Confidence: ${(metrics.averageConfidence * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Developer personalization failed:', error);
  }

  await mcpManager.shutdown();
  console.log('\n✅ Developer personalization example completed\n');
}

/**
 * Example 3: MCP-Enhanced vs Fallback Comparison
 * Demonstrates the difference between MCP-enhanced and fallback personalization
 */
async function example3_MCPEnhancedVsFallback() {
  console.log('=== Example 3: MCP-Enhanced vs Fallback Comparison ===\n');

  const userId = 'comparison-user';

  try {
    // Test with MCP integration
    console.log('🚀 Testing with MCP Integration...');
    const mcpManager = new MCPManager();
    await mcpManager.initialize();
    const mcpPersonalization = new PersonalizationEngine(mcpManager);

    await mcpPersonalization.recordInteraction({
      userId,
      messageType: 'general-question',
      toolsUsed: ['memory'],
      responseTime: 1500,
      userSatisfaction: 4,
      conversationContext: 'General discussion about technology and current events',
      timestamp: new Date()
    });

    const mcpRecommendations = await mcpPersonalization.generatePersonalizedRecommendations(userId);

    // Test without MCP integration
    console.log('🔧 Testing without MCP Integration (Fallback)...');
    const fallbackPersonalization = new PersonalizationEngine();

    await fallbackPersonalization.recordInteraction({
      userId,
      messageType: 'general-question',
      toolsUsed: ['memory'],
      responseTime: 1500,
      userSatisfaction: 4,
      conversationContext: 'General discussion about technology and current events',
      timestamp: new Date()
    });

    const fallbackRecommendations = await fallbackPersonalization.generatePersonalizedRecommendations(userId);

    // Compare results
    console.log('\n📊 Comparison Results:');
    console.log(`MCP-Enhanced Recommendations: ${mcpRecommendations.length}`);
    console.log(`Fallback Recommendations: ${fallbackRecommendations.length}`);

    console.log('\n🚀 MCP-Enhanced Features:');
    mcpRecommendations.forEach((rec, index) => {
      if (rec.title.includes('MCP') || rec.confidenceScore > 0.7) {
        console.log(`   ${index + 1}. ${rec.title} (${(rec.confidenceScore * 100).toFixed(1)}% confidence)`);
      }
    });

    console.log('\n🔧 Fallback Features:');
    fallbackRecommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec.title} (${(rec.confidenceScore * 100).toFixed(1)}% confidence)`);
    });

    await mcpManager.shutdown();

  } catch (error) {
    console.error('❌ Comparison test failed:', error);
  }

  console.log('\n✅ MCP comparison example completed\n');
}

/**
 * Example 4: Adaptive Response Demonstration
 * Shows how responses are personalized based on user patterns
 */
async function example4_AdaptiveResponseDemo() {
  console.log('=== Example 4: Adaptive Response Demonstration ===\n');

  const mcpManager = new MCPManager();
  await mcpManager.initialize();
  const personalizationEngine = new PersonalizationEngine(mcpManager);

  const userId = 'adaptive-user';

  try {
    // Record user preferences for technical, detailed responses
    console.log('📝 Recording user preference patterns...');
    
    await personalizationEngine.recordInteraction({
      userId,
      messageType: 'technical-deep-dive',
      toolsUsed: ['memory', 'sequential-thinking'],
      responseTime: 4500,
      userSatisfaction: 5,
      conversationContext: 'Detailed technical discussion requiring comprehensive explanations with examples',
      timestamp: new Date()
    });

    // Test response adaptation
    console.log('🔄 Testing Response Adaptation...');
    
    const testResponses = [
      'Machine learning is useful for data analysis.',
      'APIs allow applications to communicate.',
      'Database optimization improves performance.'
    ];

    for (const originalResponse of testResponses) {
      const adaptation = await personalizationEngine.adaptResponse(
        userId,
        originalResponse
      );

      console.log(`\nOriginal: "${adaptation.originalResponse}"`);
      console.log(`Adapted:  "${adaptation.personalizedResponse}"`);
      console.log(`Confidence: ${(adaptation.confidenceScore * 100).toFixed(1)}%`);
      
      if (adaptation.adaptations.length > 0) {
        console.log(`Applied: ${adaptation.adaptations.map(a => a.type).join(', ')}`);
      }
    }

  } catch (error) {
    console.error('❌ Adaptive response demo failed:', error);
  }

  await mcpManager.shutdown();
  console.log('\n✅ Adaptive response demonstration completed\n');
}

/**
 * Example 5: Cross-Session Learning
 * Demonstrates how personalization persists across multiple sessions
 */
async function example5_CrossSessionLearning() {
  console.log('=== Example 5: Cross-Session Learning ===\n');

  const mcpManager = new MCPManager();
  await mcpManager.initialize();
  const personalizationEngine = new PersonalizationEngine(mcpManager);

  const userId = 'learning-user';

  try {
    // Session 1: Initial learning about user
    console.log('📚 Session 1: Initial Learning...');
    
    await personalizationEngine.recordInteraction({
      userId,
      messageType: 'learning-question',
      toolsUsed: ['memory'],
      responseTime: 2000,
      userSatisfaction: 4,
      conversationContext: 'Learning about machine learning and data science fundamentals',
      timestamp: new Date()
    });

    const session1Recommendations = await personalizationEngine.generatePersonalizedRecommendations(userId);
    console.log(`Session 1 Recommendations: ${session1Recommendations.length}`);

    // Session 2: Building on previous knowledge
    console.log('\n📈 Session 2: Building Knowledge...');
    
    await personalizationEngine.recordInteraction({
      userId,
      messageType: 'advanced-question',
      toolsUsed: ['memory', 'web-search', 'sequential-thinking'],
      responseTime: 3500,
      userSatisfaction: 5,
      conversationContext: 'Advanced machine learning research and current trends in AI development',
      timestamp: new Date()
    });

    const session2Recommendations = await personalizationEngine.generatePersonalizedRecommendations(userId);
    console.log(`Session 2 Recommendations: ${session2Recommendations.length}`);

    // Show learning progression
    console.log('\n📊 Learning Progression Analysis:');
    console.log('Session 1 → Session 2 improvements:');
    console.log(`- Recommendation count: ${session1Recommendations.length} → ${session2Recommendations.length}`);
    console.log(`- Average confidence: ${(session1Recommendations.reduce((sum, r) => sum + r.confidenceScore, 0) / session1Recommendations.length * 100).toFixed(1)}% → ${(session2Recommendations.reduce((sum, r) => sum + r.confidenceScore, 0) / session2Recommendations.length * 100).toFixed(1)}%`);

    const advancedRecs = session2Recommendations.filter(r => r.title.includes('Advanced') || r.priority === 'high');
    console.log(`- Advanced recommendations: ${advancedRecs.length}`);

  } catch (error) {
    console.error('❌ Cross-session learning demo failed:', error);
  }

  await mcpManager.shutdown();
  console.log('\n✅ Cross-session learning example completed\n');
}

/**
 * Main runner for all personalization examples
 */
async function runAllPersonalizationExamples() {
  console.log('🎯 Enhanced Personalization Engine with MCP Integration - Examples\n');
  console.log('This demonstrates how MCP integration supercharges personalization capabilities.\n');

  try {
    await example1_ResearchUserPersonalization();
    await example2_DeveloperPersonalization();
    await example3_MCPEnhancedVsFallback();
    await example4_AdaptiveResponseDemo();
    await example5_CrossSessionLearning();

    console.log('🎉 All personalization examples completed successfully!');
    console.log('🚀 Your Discord bot now provides truly personalized AI experiences.');

  } catch (error) {
    console.error('❌ Personalization examples failed:', error);
  }
}

/**
 * Usage instructions for the enhanced personalization system
 */
export function printPersonalizationUsage() {
  console.log(`
🎯 Enhanced Personalization Engine Usage

The MCP-enhanced personalization engine provides intelligent, adaptive AI experiences:

## 🧠 Key Features

1. **Smart User Profiling**
   - Automatically learns user preferences from conversation patterns
   - Tracks tool usage, response preferences, and topic interests
   - Builds comprehensive behavioral profiles over time

2. **MCP-Enhanced Recommendations**
   - Real-time web search recommendations for research-oriented users
   - Memory feature suggestions for frequent users
   - Content analysis tools for users who share links
   - Advanced reasoning capabilities for complex problem solvers

3. **Adaptive Response Styles**
   - Adjusts communication style (formal, casual, technical)
   - Modifies response length based on user preferences
   - Includes examples when users learn better with concrete examples

4. **Cross-Session Learning**
   - Maintains user context across multiple conversations
   - Builds on previous interactions for better recommendations
   - Continuous improvement of personalization accuracy

## 🚀 Integration in Discord Bot

The personalization engine automatically activates when users opt into enhanced intelligence:

\`/optin enable:true\` - Enables basic personalization
\`/optin <message>\` - Enables full MCP-enhanced personalization

## 📊 Benefits for Users

- **Researchers**: Get intelligent web search and content analysis recommendations
- **Developers**: Receive advanced reasoning and technical tool suggestions  
- **Learners**: Experience adaptive response styles and progressive recommendations
- **All Users**: Enjoy conversations that remember preferences and improve over time

## 🎛️ Fallback Behavior

Even without MCP servers, the system provides:
- Basic preference learning and adaptation
- Intelligent fallback recommendations
- Continuous user pattern analysis
- Response style adaptation

The enhanced personalization ensures every user gets a tailored AI experience! 🌟
`);
}

// Export examples for testing and demonstration
export {
  example1_ResearchUserPersonalization,
  example2_DeveloperPersonalization,
  example3_MCPEnhancedVsFallback,
  example4_AdaptiveResponseDemo,
  example5_CrossSessionLearning,
  runAllPersonalizationExamples
};

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllPersonalizationExamples().catch(console.error);
}
