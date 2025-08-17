/**
 * Integration Test for Autonomous Orchestration System
 * Tests the complete flow from message input to autonomous capability activation
 */

import { logger } from '../utils/logger.js';
import { orchestrationWiring } from '../orchestration/orchestration-wiring.js';
import { autonomousOrchestration } from '../orchestration/autonomous-orchestration-integration.js';
import { serviceIntegration, IntelligenceRequest } from '../orchestration/service-integration.js';
import { capabilityRegistry } from '../orchestration/autonomous-capability-registry.js';

export interface TestScenario {
  name: string;
  messageContent: string;
  expectedCapabilities: string[];
  expectedComplexity: 'simple' | 'moderate' | 'complex';
  expectedIntents: string[];
}

export class AutonomousOrchestrationTest {
  private testScenarios: TestScenario[] = [];

  constructor() {
    this.initializeTestScenarios();
    logger.info('🧪 Autonomous Orchestration Test Suite initialized');
  }

  private initializeTestScenarios(): void {
    this.testScenarios = [
      {
        name: 'Basic Conversation',
        messageContent: 'Hello, how are you today?',
        expectedCapabilities: ['core-intelligence', 'semantic-cache'],
        expectedComplexity: 'simple',
        expectedIntents: ['general_conversation'],
      },
      {
        name: 'Factual Query',
        messageContent: 'What is the latest news about artificial intelligence?',
        expectedCapabilities: ['web-search', 'content-extraction', 'advanced-reasoning'],
        expectedComplexity: 'moderate',
        expectedIntents: ['factual_query', 'current_information'],
      },
      {
        name: 'Complex Analysis Request',
        messageContent:
          'Analyze the impact of climate change on global economics and provide a detailed comparison with historical data',
        expectedCapabilities: ['advanced-reasoning', 'web-search', 'knowledge-graph'],
        expectedComplexity: 'complex',
        expectedIntents: ['complex_reasoning', 'analysis_request'],
      },
      {
        name: 'Visual Content Query',
        messageContent: 'Can you analyze this image and tell me what you see?',
        expectedCapabilities: ['multimodal-analysis', 'advanced-reasoning'],
        expectedComplexity: 'moderate',
        expectedIntents: ['visual_content', 'analysis_request'],
      },
    ];

    logger.info(`📋 Initialized ${this.testScenarios.length} test scenarios`);
  }

  /**
   * Run all integration tests
   */
  async runAllTests(): Promise<{
    passed: number;
    failed: number;
    results: any[];
  }> {
    logger.info('🚀 Starting autonomous orchestration integration tests...');

    const results: any[] = [];
    let passed = 0;
    let failed = 0;

    for (const scenario of this.testScenarios) {
      try {
        logger.info(`🧪 Running test: ${scenario.name}`);
        const result = await this.runSingleTest(scenario);

        if (result.success) {
          passed++;
          logger.info(`✅ Test passed: ${scenario.name}`);
        } else {
          failed++;
          logger.error(`❌ Test failed: ${scenario.name} - ${result.error}`);
        }

        results.push(result);

        // Small delay between tests
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        const errorResult = {
          scenario: scenario.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          details: null,
        };
        results.push(errorResult);
        logger.error(`💥 Test crashed: ${scenario.name}`, error);
      }
    }

    logger.info(`🏁 Integration tests completed: ${passed} passed, ${failed} failed`);

    return { passed, failed, results };
  }

  private async runSingleTest(scenario: TestScenario): Promise<any> {
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Create test intelligence request
      const intelligenceRequest: IntelligenceRequest = {
        messageId: testId,
        content: scenario.messageContent,
        userId: 'test_user_123',
        channelId: 'test_channel_456',
        messageType: 'dm',
        conversationHistory: [],
        metadata: {
          timestamp: new Date(),
          userPermissions: ['basic_ai'],
          channelContext: { name: 'Test Channel', type: 'dm' },
        },
      };

      // Test the full service integration flow
      const serviceResponse =
        await serviceIntegration.processIntelligenceRequest(intelligenceRequest);

      // Get orchestration decision for analysis
      const orchestrationDecision = autonomousOrchestration.getOrchestrationDecision(testId);

      // Get wiring traces for detailed analysis
      const wiringTraces = orchestrationWiring.getWiringTraces(testId);

      // Validate results
      const validation = this.validateTestResult(
        scenario,
        serviceResponse,
        orchestrationDecision,
        wiringTraces,
      );

      return {
        scenario: scenario.name,
        success: validation.isValid,
        error: validation.error,
        details: {
          serviceResponse: {
            messageId: serviceResponse.messageId,
            confidence: serviceResponse.confidence,
            processingTime: serviceResponse.metadata.processingTime,
            capabilitiesUsed: serviceResponse.metadata.capabilitiesUsed,
            quality: serviceResponse.metadata.quality,
          },
          orchestrationDecision: orchestrationDecision
            ? {
                selectedCapabilities: orchestrationDecision.selectedCapabilities,
                analyzedIntent: orchestrationDecision.analyzedIntent,
                qualityPrediction: orchestrationDecision.qualityPrediction,
                performancePrediction: orchestrationDecision.performancePrediction,
              }
            : null,
          wiringTraces: wiringTraces.length,
          validation: validation.details,
        },
      };
    } catch (error) {
      return {
        scenario: scenario.name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: { testId, error: error instanceof Error ? error.stack : String(error) },
      };
    }
  }

  private validateTestResult(
    scenario: TestScenario,
    serviceResponse: any,
    orchestrationDecision: any,
    wiringTraces: any[],
  ): { isValid: boolean; error?: string; details: any } {
    const details: any = {};
    const issues: string[] = [];

    // Validate service response
    if (!serviceResponse.response || serviceResponse.response.length === 0) {
      issues.push('Empty or missing response');
    }

    if (serviceResponse.confidence < 0.3) {
      issues.push(`Low confidence score: ${serviceResponse.confidence}`);
    }

    // Validate orchestration decision
    if (!orchestrationDecision) {
      issues.push('Missing orchestration decision');
    } else {
      // Check if expected capabilities were considered
      const hasExpectedCapabilities = scenario.expectedCapabilities.some((cap) =>
        orchestrationDecision.selectedCapabilities.includes(cap),
      );

      if (!hasExpectedCapabilities) {
        issues.push(
          `Expected capabilities not activated. Expected: ${scenario.expectedCapabilities.join(', ')}, Got: ${orchestrationDecision.selectedCapabilities.join(', ')}`,
        );
      }

      // Check if expected intents were detected
      const hasExpectedIntents = scenario.expectedIntents.some((intent) =>
        orchestrationDecision.analyzedIntent.includes(intent),
      );

      if (!hasExpectedIntents) {
        issues.push(
          `Expected intents not detected. Expected: ${scenario.expectedIntents.join(', ')}, Got: ${orchestrationDecision.analyzedIntent.join(', ')}`,
        );
      }

      details.capabilityMatch = hasExpectedCapabilities;
      details.intentMatch = hasExpectedIntents;
      details.selectedCapabilities = orchestrationDecision.selectedCapabilities;
      details.analyzedIntents = orchestrationDecision.analyzedIntent;
    }

    // Validate wiring traces
    if (wiringTraces.length === 0) {
      issues.push('No wiring traces generated');
    }

    details.tracesGenerated = wiringTraces.length;
    details.issues = issues;

    return {
      isValid: issues.length === 0,
      error: issues.length > 0 ? issues.join('; ') : undefined,
      details,
    };
  }

  /**
   * Test capability registry health
   */
  async testCapabilityHealth(): Promise<{
    totalCapabilities: number;
    healthyCapabilities: number;
    healthResults: Map<string, boolean>;
  }> {
    logger.info('🏥 Testing capability registry health...');

    const healthResults = await capabilityRegistry.runHealthChecks();
    const totalCapabilities = healthResults.size;
    let healthyCapabilities = 0;

    for (const [capabilityId, isHealthy] of healthResults) {
      if (isHealthy) healthyCapabilities++;
      logger.info(`  ${capabilityId}: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    }

    logger.info(
      `🏥 Health check complete: ${healthyCapabilities}/${totalCapabilities} capabilities healthy`,
    );

    return {
      totalCapabilities,
      healthyCapabilities,
      healthResults,
    };
  }

  /**
   * Test system performance under load
   */
  async testPerformance(concurrency: number = 5): Promise<{
    averageLatency: number;
    maxLatency: number;
    minLatency: number;
    successRate: number;
    totalRequests: number;
  }> {
    logger.info(`⚡ Testing system performance with ${concurrency} concurrent requests...`);

    const testMessage = 'What is the current state of artificial intelligence development?';
    const promises: Promise<any>[] = [];
    const startTime = Date.now();

    // Create concurrent test requests
    for (let i = 0; i < concurrency; i++) {
      const testId = `perf_test_${i}_${Date.now()}`;
      const request: IntelligenceRequest = {
        messageId: testId,
        content: testMessage,
        userId: `test_user_${i}`,
        channelId: 'test_channel_perf',
        messageType: 'dm',
        conversationHistory: [],
        metadata: {
          timestamp: new Date(),
          userPermissions: ['basic_ai'],
          channelContext: { name: 'Performance Test', type: 'dm' },
        },
      };

      promises.push(
        serviceIntegration
          .processIntelligenceRequest(request)
          .then((response) => ({
            success: true,
            latency: response.metadata.processingTime,
            response,
          }))
          .catch((error) => ({ success: false, latency: 0, error })),
      );
    }

    // Wait for all requests to complete
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    // Calculate metrics
    const successfulResults = results.filter((r) => r.success);
    const latencies = successfulResults.map((r) => r.latency);

    const averageLatency =
      latencies.length > 0 ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length : 0;
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
    const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
    const successRate = successfulResults.length / results.length;

    logger.info(`⚡ Performance test completed in ${totalTime}ms`);
    logger.info(`  Success rate: ${(successRate * 100).toFixed(1)}%`);
    logger.info(`  Average latency: ${averageLatency.toFixed(0)}ms`);
    logger.info(`  Latency range: ${minLatency}ms - ${maxLatency}ms`);

    return {
      averageLatency,
      maxLatency,
      minLatency,
      successRate,
      totalRequests: concurrency,
    };
  }

  /**
   * Get comprehensive system status
   */
  getSystemStatus(): any {
    return {
      serviceIntegration: serviceIntegration.getSystemStatus(),
      performanceMetrics: serviceIntegration.getPerformanceMetrics(),
      capabilityRegistry: capabilityRegistry.exportRegistry(),
    };
  }
}

// Global test instance
export const orchestrationTest = new AutonomousOrchestrationTest();

// Minimal smoke test to ensure this suite contains at least one test.
// Full integration runs are driven by higher-level harnesses.
describe('Autonomous Orchestration - smoke', () => {
  it('should export a test harness instance', () => {
    expect(orchestrationTest).toBeDefined();
    expect(typeof orchestrationTest.getSystemStatus).toBe('function');
  });
});
