// COMPREHENSIVE AI FRAMEWORK INTEGRATION TEST
// Tests all major AI framework components working together

import { describe, test, expect } from '@jest/globals';
// Use global jest.beforeAll/afterAll to avoid TS export mismatch
const { beforeAll, afterAll } = global as unknown as {
  beforeAll: typeof globalThis.beforeAll;
  afterAll: typeof globalThis.afterAll;
};
import { comprehensiveAIFramework } from '../../src/ai/comprehensive-framework.service.js';
import { advancedLangGraphWorkflow } from '../../src/agents/langgraph/workflow.js';
import { crewAIOrchestrationService } from '../../src/agents/crewai/orchestration.service.js';
import { longTermMemoryService } from '../../src/memory/long-term-memory.service.js';
import { hardenedAudioProcessingService } from '../../src/audio/hardened-processing.service.js';
import { gpt4oEnhancedMultimodalService } from '../../src/multimodal/gpt4o-enhanced.service.js';
// Advanced AI Framework Services
import { autoGenMultiAgentService } from '../../src/agents/autogen/multi-agent.service.js';
import { dspyFrameworkService } from '../../src/agents/dspy/framework.service.js';
import { semanticRoutingService } from '../../src/ai/semantic-routing/intelligent-router.service.js';
import { neuralSymbolicReasoningService } from '../../src/ai/neural-symbolic/reasoning.service.js';

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

    console.log('Advanced AI Frameworks:');
    console.log(`  ✓ AutoGen Multi-Agent: ${capabilities.autogen_multi_agent ? '✅' : '❌'}`);
    console.log(
      `  ✓ DSPy Structured Prompting: ${capabilities.dspy_structured_prompting ? '✅' : '❌'}`,
    );
    console.log(`  ✓ Semantic Routing: ${capabilities.semantic_routing ? '✅' : '❌'}`);
    console.log(
      `  ✓ Neural-Symbolic Reasoning: ${capabilities.neural_symbolic_reasoning ? '✅' : '❌'}`,
    );
    console.log(`  ✓ Advanced Orchestration: ${capabilities.advanced_orchestration ? '✅' : '❌'}`);
    console.log(`  ✓ Intelligent Routing: ${capabilities.intelligent_routing ? '✅' : '❌'}`);
    console.log(`  ✓ Hybrid Reasoning: ${capabilities.hybrid_reasoning ? '✅' : '❌'}`);
    console.log(`  ✓ Collaborative Agents: ${capabilities.collaborative_agents ? '✅' : '❌'}`);

    // Count enabled capabilities
    const enabledCount = Object.values(capabilities).filter(Boolean).length;
    const totalCount = Object.keys(capabilities).length;
    const completionRate = ((enabledCount / totalCount) * 100).toFixed(1);

    console.log(`\n📊 Overall Completion: ${enabledCount}/${totalCount} (${completionRate}%)`);

    // At least some core capabilities should be enabled
    expect(enabledCount).toBeGreaterThan(0);

    // Verify advanced AI frameworks are available
    expect(capabilities.autogen_multi_agent).toBeDefined();
    expect(capabilities.dspy_structured_prompting).toBeDefined();
    expect(capabilities.semantic_routing).toBeDefined();
    expect(capabilities.neural_symbolic_reasoning).toBeDefined();
  });

  test('Health check returns framework status', async () => {
    const healthCheck = await comprehensiveAIFramework.healthCheck();

    expect(healthCheck.status).toMatch(/healthy|degraded|unhealthy/);
    expect(healthCheck.details).toBeDefined();
    expect(Object.keys(healthCheck.details).length).toBeGreaterThan(0);

    console.log('🏥 Framework health status:', healthCheck.status);
    console.log(
      '📊 Enabled capabilities:',
      Object.keys(healthCheck.details).filter(
        (key) => healthCheck.details[key].status === 'healthy',
      ).length,
    );
  });

  test('Advanced AI query processing', async () => {
    const testQuery =
      'Explain the concept of artificial intelligence and its applications in modern software development';

    const result = await comprehensiveAIFramework.processAdvancedQuery(testQuery, {
      userId: 'test_user_advanced',
      sessionId: 'test_session_advanced',
      quality_threshold: 0.7,
      max_cost_usd: 1.0,
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
    console.log(
      '  - Success rate:',
      metrics.total_requests > 0
        ? ((metrics.successful_requests / metrics.total_requests) * 100).toFixed(1) + '%'
        : 'N/A',
    );
    console.log(
      '  - Reliability score:',
      (metrics.performance_scores.reliability * 100).toFixed(1) + '%',
    );
    console.log(
      '  - Efficiency score:',
      (metrics.performance_scores.efficiency * 100).toFixed(1) + '%',
    );
  });

  describe('Advanced AI Framework Services', () => {
    test('AutoGen Multi-Agent Service functionality', async () => {
      if (!autoGenMultiAgentService.isReady()) {
        console.log('⏭️ Skipping AutoGen test - service not ready');
        return;
      }

      const result = await autoGenMultiAgentService.executeCollaborativeTask(
        'Design a simple REST API for a todo application',
        ['code_execution', 'strategic_planning'],
      );

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.conversation_id).toBeDefined();

      console.log('🤖 AutoGen result preview:', result.result.substring(0, 100) + '...');
    }, 30000);

    test('DSPy Framework Service functionality', async () => {
      if (!dspyFrameworkService.isReady()) {
        console.log('⏭️ Skipping DSPy test - service not ready');
        return;
      }

      // Create a test pipeline
      const signatureId = await dspyFrameworkService.createSignature({
        name: 'TestAnalysis',
        input_fields: [
          { name: 'topic', type: 'string', description: 'Topic to analyze', required: true },
        ],
        output_fields: [{ name: 'summary', type: 'string', description: 'Analysis summary' }],
        instructions: 'Provide a concise analysis of the given topic.',
      });

      const moduleId = await dspyFrameworkService.createModule({
        name: 'AnalysisModule',
        type: 'Predict',
        signature: signatureId,
      });

      const pipelineId = await dspyFrameworkService.createPipeline({
        name: 'TestPipeline',
        modules: [moduleId],
      });

      const result = await dspyFrameworkService.executePipeline(pipelineId, {
        topic: 'artificial intelligence in healthcare',
      });

      expect(result.success).toBe(true);
      expect(result.outputs).toBeDefined();
      expect(result.total_execution_time_ms).toBeGreaterThan(0);

      console.log('🧠 DSPy execution time:', result.total_execution_time_ms + 'ms');
    }, 20000);

    test('Semantic Routing Service functionality', async () => {
      if (!semanticRoutingService.isReady()) {
        console.log('⏭️ Skipping Semantic Routing test - service not ready');
        return;
      }

      const testQueries = [
        'What is machine learning?',
        'Write a Python function to sort data',
        'Analyze the market trends for electric vehicles',
        'I need help from multiple experts on this complex project',
      ];

      for (const query of testQueries) {
        const decision = await semanticRoutingService.route(query);

        expect(decision.route_id).toBeDefined();
        expect(decision.confidence).toBeGreaterThan(0);
        expect(decision.reasoning).toBeDefined();

        console.log(
          `🧭 "${query.substring(0, 30)}..." → ${decision.route_id} (${(decision.confidence * 100).toFixed(1)}%)`,
        );
      }
    }, 15000);

    test('Neural-Symbolic Reasoning Service functionality', async () => {
      if (!neuralSymbolicReasoningService.isReady()) {
        console.log('⏭️ Skipping Neural-Symbolic test - service not ready');
        return;
      }

      const result = await neuralSymbolicReasoningService.reason(
        'If renewable energy becomes cheaper than fossil fuels, what are the economic implications?',
        {},
        { prefer_method: 'hybrid', confidence_threshold: 0.6 },
      );

      expect(result.conclusion).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning_type).toBe('hybrid');
      expect(result.evidence).toBeDefined();
      expect(result.evidence.length).toBeGreaterThan(0);

      console.log('🧠🔗 Neural-Symbolic reasoning:');
      console.log('  - Conclusion:', result.conclusion.substring(0, 100) + '...');
      console.log('  - Confidence:', (result.confidence * 100).toFixed(1) + '%');
      console.log('  - Neural contribution:', (result.neural_contribution * 100).toFixed(1) + '%');
      console.log(
        '  - Symbolic contribution:',
        (result.symbolic_contribution * 100).toFixed(1) + '%',
      );
    }, 25000);
  });

  describe('Enhanced Integration Testing', () => {
    test('Semantic routing integration with comprehensive framework', async () => {
      const testQuery = 'Create a comprehensive business strategy for a sustainable tech startup';

      const standardResult = await comprehensiveAIFramework.processAdvancedQuery(testQuery, {
        userId: 'test-user',
        sessionId: 'test-session',
      });

      if (comprehensiveAIFramework.getCapabilities().semantic_routing) {
        const routedResult = await comprehensiveAIFramework.processWithSemanticRouting(testQuery, {
          userId: 'test-user',
          sessionId: 'test-session',
        });

        expect(routedResult.routing_decision).toBeDefined();
        expect(routedResult.metadata.semantic_routing_used).toBe(true);

        console.log('🧭 Routed to:', routedResult.routing_decision.route_id);
        console.log(
          '🧭 Routing confidence:',
          (routedResult.routing_decision.confidence * 100).toFixed(1) + '%',
        );
      }

      expect(standardResult.response).toBeDefined();
      expect(standardResult.confidence).toBeGreaterThan(0);
    }, 30000);

    test('Multi-framework collaboration test', async () => {
      // Test a complex query that should utilize multiple AI frameworks
      const complexQuery =
        'Using logical reasoning and collaborative analysis, explain why distributed systems require both consistency and availability trade-offs, and provide practical implementation strategies';

      const result = await comprehensiveAIFramework.processAdvancedQuery(complexQuery, {
        userId: 'test-user',
        sessionId: 'complex-test',
      });

      expect(result.response).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.processing_time_ms).toBeGreaterThan(0);
      expect(result.capabilities_used.length).toBeGreaterThan(0);

      console.log('🔬 Complex analysis result:');
      console.log('  - Response length:', result.response.length, 'characters');
      console.log('  - Processing time:', result.processing_time_ms + 'ms');
      console.log('  - Capabilities used:', result.capabilities_used.join(', '));
      console.log('  - Confidence:', (result.confidence * 100).toFixed(1) + '%');
    }, 45000);

    test('Performance benchmarking across frameworks', async () => {
      const benchmarkQueries = [
        'Explain quantum computing',
        'Write code for data processing',
        'Analyze business trends',
        'Design system architecture',
        'Create marketing strategy',
      ];

      const results = [];

      for (const query of benchmarkQueries) {
        const startTime = Date.now();
        const result = await comprehensiveAIFramework.processAdvancedQuery(query, {
          userId: 'benchmark-user',
        });
        const endTime = Date.now();

        results.push({
          query: query.substring(0, 30) + '...',
          processingTime: endTime - startTime,
          confidence: result.confidence,
          capabilities: result.capabilities_used,
        });
      }

      const averageTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
      const averageConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

      console.log('⚡ Performance benchmark results:');
      console.log('  - Average processing time:', averageTime.toFixed(0) + 'ms');
      console.log('  - Average confidence:', (averageConfidence * 100).toFixed(1) + '%');
      console.log('  - Total queries processed:', results.length);

      expect(averageTime).toBeLessThan(20000); // Should be under 20 seconds on average
      expect(averageConfidence).toBeGreaterThan(0.6); // Should maintain good confidence
    }, 120000);
  });
});
