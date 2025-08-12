// COMPREHENSIVE AI FRAMEWORK INTEGRATION TEST
// Tests all major AI framework components working together

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { comprehensiveAIFramework } from '../../src/ai/comprehensive-framework.service.js';
import { advancedLangGraphWorkflow } from '../../src/agents/langgraph/workflow.js';
import { crewAIOrchestrationService } from '../../src/agents/crewai/orchestration.service.js';
import { longTermMemoryService } from '../../src/memory/long-term-memory.service.js';
import { hardenedAudioProcessingService } from '../../src/audio/hardened-processing.service.js';
import { gpt4oEnhancedMultimodalService } from '../../src/multimodal/gpt4o-enhanced.service.js';

describe('Comprehensive AI Framework Integration', () => {
  let frameworkInitialized = false;

  beforeAll(async () => {
    // Set feature flags for testing
    process.env.FEATURE_LANGGRAPH = 'true';
    process.env.FEATURE_LONG_TERM_MEMORY = 'true';
    process.env.FEATURE_GPT4O_MULTIMODAL = 'true';
    process.env.FEATURE_HARDENED_AUDIO = 'true';
    process.env.FEATURE_CREWAI_SPECIALISTS = 'true';
    
    console.log('🧪 Initializing AI Framework for integration testing...');
    frameworkInitialized = await comprehensiveAIFramework.init();
  }, 60000); // 60 second timeout for initialization

  afterAll(async () => {
    if (frameworkInitialized) {
      await comprehensiveAIFramework.shutdown();
    }
  });

  test('AI Framework initializes successfully', async () => {
    expect(frameworkInitialized).toBe(true);
    
    const status = comprehensiveAIFramework.getFrameworkStatus();
    expect(status.initialized).toBe(true);
    expect(status.capabilities_count).toBeGreaterThan(0);
    expect(status.performance_score).toBeGreaterThan(0.5);
  });

  test('Individual service availability', async () => {
    const capabilities = comprehensiveAIFramework.getCapabilities();
    
    console.log('\n🔍 AI Framework Capability Matrix:');
    console.log('Core AI Orchestration:');
    console.log(`  ✓ LangGraph Reasoning: ${capabilities.langgraph_reasoning ? '✅' : '❌'}`);
    console.log(`  ✓ CrewAI Specialists: ${capabilities.crewai_specialists ? '✅' : '❌'}`);
    console.log(`  ✓ Temporal Workflows: ${capabilities.temporal_workflows ? '✅' : '❌'}`);
    
    console.log('Memory & Context:');
    console.log(`  ✓ Long-term Memory: ${capabilities.long_term_memory ? '✅' : '❌'}`);
    console.log(`  ✓ Semantic Search: ${capabilities.semantic_search ? '✅' : '❌'}`);
    console.log(`  ✓ Conversation Context: ${capabilities.conversation_context ? '✅' : '❌'}`);
    
    console.log('Multimodal Processing:');
    console.log(`  ✓ GPT-4o Multimodal: ${capabilities.gpt4o_multimodal ? '✅' : '❌'}`);
    console.log(`  ✓ Audio Processing: ${capabilities.audio_processing ? '✅' : '❌'}`);
    console.log(`  ✓ Video Analysis: ${capabilities.video_analysis ? '✅' : '❌'}`);
    console.log(`  ✓ Document Processing: ${capabilities.document_processing ? '✅' : '❌'}`);
    
    console.log('Real-time Features:');
    console.log(`  ✓ Streaming Responses: ${capabilities.streaming_responses ? '✅' : '❌'}`);
    console.log(`  ✓ Live Interactions: ${capabilities.live_interactions ? '✅' : '❌'}`);
    console.log(`  ✓ Collaborative Editing: ${capabilities.collaborative_editing ? '✅' : '❌'}`);
    
    console.log('Production Features:');
    console.log(`  ✓ MLOps Lifecycle: ${capabilities.mlops_lifecycle ? '✅' : '❌'}`);
    console.log(`  ✓ Edge Deployment: ${capabilities.edge_deployment ? '✅' : '❌'}`);
    console.log(`  ✓ Performance Monitoring: ${capabilities.performance_monitoring ? '✅' : '❌'}`);
    console.log(`  ✓ Cost Optimization: ${capabilities.cost_optimization ? '✅' : '❌'}`);

    // Count enabled capabilities
    const enabledCount = Object.values(capabilities).filter(Boolean).length;
    const totalCount = Object.keys(capabilities).length;
    const completionRate = (enabledCount / totalCount * 100).toFixed(1);
    
    console.log(`\n📊 Overall Completion: ${enabledCount}/${totalCount} (${completionRate}%)`);
    
    // At least some core capabilities should be enabled
    expect(enabledCount).toBeGreaterThan(0);
  });

  test('Health check returns framework status', async () => {
    const healthCheck = await comprehensiveAIFramework.healthCheck();
    
    expect(healthCheck.status).toMatch(/healthy|degraded|unhealthy/);
    expect(healthCheck.details).toBeDefined();
    expect(Object.keys(healthCheck.details).length).toBeGreaterThan(0);
    
    console.log('🏥 Framework health status:', healthCheck.status);
    console.log('📊 Enabled capabilities:', Object.keys(healthCheck.details).filter(
      key => healthCheck.details[key].status === 'healthy'
    ).length);
  });

  test('Advanced AI query processing', async () => {
    const testQuery = 'Explain the concept of artificial intelligence and its applications in modern software development';
    
    const result = await comprehensiveAIFramework.processAdvancedQuery(testQuery, {
      userId: 'test_user_advanced',
      sessionId: 'test_session_advanced',
      quality_threshold: 0.7,
      max_cost_usd: 1.0
    });

    expect(result).toBeDefined();
    expect(result.response).toBeDefined();
    expect(result.response.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.processing_time_ms).toBeGreaterThan(0);
    expect(result.cost_usd).toBeGreaterThanOrEqual(0);
    expect(result.capabilities_used).toBeDefined();
    expect(result.capabilities_used.length).toBeGreaterThan(0);
    
    console.log('🤖 AI Response confidence:', result.confidence);
    console.log('⚡ Processing time:', result.processing_time_ms, 'ms');
    console.log('💰 Cost:', result.cost_usd, 'USD');
    console.log('🛠️ Capabilities used:', result.capabilities_used.join(', '));
  });

  test('Framework metrics collection', async () => {
    const metrics = comprehensiveAIFramework.getMetrics();
    
    expect(metrics).toBeDefined();
    expect(metrics.total_requests).toBeGreaterThanOrEqual(0);
    expect(metrics.performance_scores).toBeDefined();
    expect(metrics.performance_scores.reliability).toBeGreaterThan(0);
    expect(metrics.performance_scores.efficiency).toBeGreaterThan(0);
    expect(metrics.performance_scores.scalability).toBeGreaterThan(0);
    expect(metrics.performance_scores.user_satisfaction).toBeGreaterThan(0);
    
    console.log('📈 Framework metrics:');
    console.log('  - Total requests:', metrics.total_requests);
    console.log('  - Success rate:', metrics.total_requests > 0 ? 
      (metrics.successful_requests / metrics.total_requests * 100).toFixed(1) + '%' : 'N/A');
    console.log('  - Reliability score:', (metrics.performance_scores.reliability * 100).toFixed(1) + '%');
    console.log('  - Efficiency score:', (metrics.performance_scores.efficiency * 100).toFixed(1) + '%');
  });
});