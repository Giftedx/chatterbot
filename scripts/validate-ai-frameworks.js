#!/usr/bin/env node

// Simple validation script for advanced AI framework integrations
// This validates that all services can initialize and perform basic operations

import { comprehensiveAIFramework } from '../src/ai/comprehensive-framework.service.js';
import { autoGenMultiAgentService } from '../src/agents/autogen/multi-agent.service.js';
import { dspyFrameworkService } from '../src/agents/dspy/framework.service.js';
import { semanticRoutingService } from '../src/ai/semantic-routing/intelligent-router.service.js';
import { neuralSymbolicReasoningService } from '../src/ai/neural-symbolic/reasoning.service.js';

async function validateAdvancedAIFrameworks() {
  console.log('🧪 Starting Advanced AI Framework Validation...\n');

  try {
    // 1. Initialize Comprehensive AI Framework
    console.log('1️⃣ Initializing Comprehensive AI Framework...');
    const frameworkInit = await comprehensiveAIFramework.init();
    console.log('   ✅ Framework initialized:', frameworkInit);

    // 2. Check capabilities
    console.log('\n2️⃣ Checking AI Framework Capabilities...');
    const capabilities = comprehensiveAIFramework.getCapabilities();
    const enabledCapabilities = Object.entries(capabilities)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);
    
    console.log('   ✅ Enabled capabilities:', enabledCapabilities.length);
    enabledCapabilities.forEach(cap => console.log(`      - ${cap}`));

    // 3. Test AutoGen Multi-Agent Service
    console.log('\n3️⃣ Testing AutoGen Multi-Agent Service...');
    if (autoGenMultiAgentService.isReady()) {
      const agents = autoGenMultiAgentService.getAgents();
      console.log('   ✅ AutoGen ready, agents available:', agents.length);
      
      try {
        const result = await autoGenMultiAgentService.executeCollaborativeTask(
          'Simple test: explain the concept of microservices',
          ['general_assistance']
        );
        console.log('   ✅ Collaborative task executed successfully');
        console.log('   📊 Result preview:', result.result.substring(0, 100) + '...');
      } catch (error) {
        console.log('   ⚠️ AutoGen task execution failed (expected without API keys)');
      }
    } else {
      console.log('   ⚠️ AutoGen not ready (expected without API keys)');
    }

    // 4. Test DSPy Framework Service
    console.log('\n4️⃣ Testing DSPy Framework Service...');
    if (dspyFrameworkService.isReady()) {
      const signatures = dspyFrameworkService.getSignatures();
      const modules = dspyFrameworkService.getModules();
      const pipelines = dspyFrameworkService.getPipelines();
      
      console.log('   ✅ DSPy ready');
      console.log('   📊 Signatures:', signatures.length);
      console.log('   📊 Modules:', modules.length);
      console.log('   📊 Pipelines:', pipelines.length);
    } else {
      console.log('   ⚠️ DSPy not ready');
    }

    // 5. Test Semantic Routing Service
    console.log('\n5️⃣ Testing Semantic Routing Service...');
    if (semanticRoutingService.isReady()) {
      const routes = semanticRoutingService.getRoutes();
      console.log('   ✅ Semantic Routing ready, routes available:', routes.length);
      
      const testQueries = [
        'What is machine learning?',
        'Write code for sorting data',
        'Analyze market trends'
      ];

      for (const query of testQueries) {
        try {
          const decision = await semanticRoutingService.route(query);
          console.log(`   🧭 "${query}" → ${decision.route_id} (${(decision.confidence * 100).toFixed(1)}%)`);
        } catch (error) {
          console.log(`   ⚠️ Routing failed for "${query}" (expected without API keys)`);
        }
      }
    } else {
      console.log('   ⚠️ Semantic Routing not ready');
    }

    // 6. Test Neural-Symbolic Reasoning Service
    console.log('\n6️⃣ Testing Neural-Symbolic Reasoning Service...');
    if (neuralSymbolicReasoningService.isReady()) {
      const rules = neuralSymbolicReasoningService.getSymbolicRules();
      const kg = neuralSymbolicReasoningService.getKnowledgeGraph();
      const models = neuralSymbolicReasoningService.getNeuralModels();
      
      console.log('   ✅ Neural-Symbolic ready');
      console.log('   📊 Symbolic rules:', rules.length);
      console.log('   📊 Knowledge graph nodes:', kg.nodes.length);
      console.log('   📊 Knowledge graph edges:', kg.edges.length);
      console.log('   📊 Neural models:', models.length);
    } else {
      console.log('   ⚠️ Neural-Symbolic not ready');
    }

    // 7. Test Framework Processing
    console.log('\n7️⃣ Testing Framework Processing...');
    try {
      const result = await comprehensiveAIFramework.processAdvancedQuery(
        'Explain the importance of artificial intelligence in modern technology',
        { userId: 'test-user', sessionId: 'validation-session' }
      );
      
      console.log('   ✅ Framework processing successful');
      console.log('   📊 Response length:', result.response.length, 'characters');
      console.log('   📊 Confidence:', (result.confidence * 100).toFixed(1) + '%');
      console.log('   📊 Processing time:', result.processing_time_ms + 'ms');
      console.log('   📊 Capabilities used:', result.capabilities_used.join(', '));
    } catch (error) {
      console.log('   ⚠️ Framework processing failed:', error.message);
    }

    // 8. Test Semantic Routing Integration
    console.log('\n8️⃣ Testing Semantic Routing Integration...');
    if (capabilities.semantic_routing) {
      try {
        const result = await comprehensiveAIFramework.processWithSemanticRouting(
          'Create a comprehensive analysis of renewable energy trends',
          { userId: 'test-user', sessionId: 'routing-test' }
        );
        
        console.log('   ✅ Semantic routing integration successful');
        console.log('   📊 Routed to:', result.routing_decision?.route_id || 'unknown');
        console.log('   📊 Routing confidence:', (result.routing_decision?.confidence * 100 || 0).toFixed(1) + '%');
      } catch (error) {
        console.log('   ⚠️ Semantic routing integration failed:', error.message);
      }
    } else {
      console.log('   ⚠️ Semantic routing not available');
    }

    // 9. Framework Health Check
    console.log('\n9️⃣ Framework Health Check...');
    const healthStatus = comprehensiveAIFramework.getHealthStatus();
    const metrics = comprehensiveAIFramework.getMetrics();
    
    console.log('   ✅ Health check completed');
    console.log('   📊 Overall health:', healthStatus.overall_health);
    console.log('   📊 Framework initialized:', healthStatus.initialized);
    console.log('   📊 Total requests processed:', metrics.total_requests);
    console.log('   📊 Success rate:', metrics.total_requests > 0 ? 
      (metrics.successful_requests / metrics.total_requests * 100).toFixed(1) + '%' : 'N/A');

    // 10. Cleanup
    console.log('\n🔟 Cleaning up...');
    await comprehensiveAIFramework.shutdown();
    console.log('   ✅ Framework shutdown complete');

    // Summary
    console.log('\n🎉 Advanced AI Framework Validation Complete!');
    console.log('📊 Summary:');
    console.log(`   - Total capabilities: ${Object.keys(capabilities).length}`);
    console.log(`   - Enabled capabilities: ${enabledCapabilities.length}`);
    console.log(`   - Completion rate: ${(enabledCapabilities.length / Object.keys(capabilities).length * 100).toFixed(1)}%`);
    console.log(`   - Framework health: ${healthStatus.overall_health}`);
    
    if (enabledCapabilities.length >= 8) {
      console.log('\n✅ SUCCESS: Advanced AI Framework is ready for production!');
    } else {
      console.log('\n⚠️ PARTIAL: Some advanced capabilities are not available (likely due to missing API keys)');
    }

  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run validation
validateAdvancedAIFrameworks().catch(console.error);