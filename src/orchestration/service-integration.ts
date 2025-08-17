/**
 * Service Integration Layer
 * Integrates autonomous orchestration with existing core intelligence service
 */

import { logger } from '../utils/logger.js';
import { orchestrationWiring } from './orchestration-wiring.js';
import { autonomousOrchestration } from './autonomous-orchestration-integration.js';
import { capabilityRegistry } from './autonomous-capability-registry.js';

export interface ServiceIntegrationConfig {
  enabled: boolean;
  fallbackToLegacy: boolean;
  tracingEnabled: boolean;
  metricsCollection: boolean;
}

export interface IntelligenceRequest {
  messageId: string;
  content: string;
  userId: string;
  guildId?: string;
  channelId: string;
  messageType: 'dm' | 'mention' | 'reply' | 'thread' | 'ambient';
  conversationHistory: string[];
  metadata?: {
    timestamp: Date;
    userPermissions?: string[];
    channelContext?: any;
    previousMessages?: any[];
  };
}

export interface IntelligenceResponse {
  messageId: string;
  response: string;
  confidence: number;
  sources?: string[];
  metadata: {
    processingTime: number;
    capabilitiesUsed: string[];
    quality: {
      accuracy: number;
      completeness: number;
      freshness: number;
    };
    fallbackUsed: boolean;
    traceId?: string;
  };
}

export class ServiceIntegration {
  private config: ServiceIntegrationConfig;
  private requestQueue: Map<string, IntelligenceRequest> = new Map();
  private responseCache: Map<string, IntelligenceResponse> = new Map();

  constructor(
    config: ServiceIntegrationConfig = {
      enabled: true,
      fallbackToLegacy: true,
      tracingEnabled: true,
      metricsCollection: true,
    },
  ) {
    this.config = config;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    logger.info('🔧 Initializing Service Integration Layer...');

    try {
      // Initialize capability registry health checks
      await this.initializeHealthChecks();

      // Start background cleanup task
      this.startBackgroundTasks();

      logger.info('✅ Service Integration Layer initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Service Integration Layer:', error);
    }
  }

  private async initializeHealthChecks(): Promise<void> {
    // Run initial health checks for all capabilities
    const healthResults = await capabilityRegistry.runHealthChecks();

    logger.info(`🏥 Health checks initialized: ${healthResults.size} capabilities checked`);

    for (const [capabilityId, isHealthy] of healthResults) {
      logger.info(`  ${capabilityId}: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    }
  }

  private startBackgroundTasks(): void {
    // Cleanup old data every hour
    setInterval(
      () => {
        this.cleanup();
      },
      60 * 60 * 1000,
    );

    // Update capability health every 5 minutes
    setInterval(
      () => {
        this.updateCapabilityHealth();
      },
      5 * 60 * 1000,
    );

    logger.info('🔄 Background tasks started');
  }

  /**
   * Main intelligence processing method
   */
  async processIntelligenceRequest(request: IntelligenceRequest): Promise<IntelligenceResponse> {
    const startTime = Date.now();
    logger.info(`🧠 Processing intelligence request ${request.messageId}`);

    // Store request for tracking
    this.requestQueue.set(request.messageId, request);

    try {
      if (!this.config.enabled) {
        return await this.processLegacyRequest(request);
      }

      // Use orchestration wiring for autonomous processing
      const result = await orchestrationWiring.wireOrchestration(
        request.messageId,
        {
          content: request.content,
          messageType: request.messageType,
          metadata: request.metadata,
        },
        {
          userId: request.userId,
          guildId: request.guildId,
          channelId: request.channelId,
          conversationHistory: request.conversationHistory,
          messageType: request.messageType,
        },
      );

      // Convert orchestration result to intelligence response
      const response = this.convertToIntelligenceResponse(request, result, startTime);

      // Cache response
      this.responseCache.set(request.messageId, response);

      // Clean up request queue
      this.requestQueue.delete(request.messageId);

      logger.info(
        `✅ Intelligence request ${request.messageId} processed in ${response.metadata.processingTime}ms`,
      );
      return response;
    } catch (error) {
      logger.error(`❌ Failed to process intelligence request ${request.messageId}:`, error);

      // Fallback to legacy processing if enabled
      if (this.config.fallbackToLegacy) {
        return await this.processLegacyRequest(request);
      }

      // Return error response
      return this.createErrorResponse(request, error, startTime);
    }
  }

  private async processLegacyRequest(request: IntelligenceRequest): Promise<IntelligenceResponse> {
    logger.info(`🔄 Using legacy processing for request ${request.messageId}`);

    const startTime = Date.now();

    // Simulate legacy processing
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 500));

    return {
      messageId: request.messageId,
      response: `I understand your message: "${request.content}". I'm processing this using legacy intelligence capabilities.`,
      confidence: 0.7,
      metadata: {
        processingTime: Date.now() - startTime,
        capabilitiesUsed: ['legacy-intelligence'],
        quality: {
          accuracy: 0.7,
          completeness: 0.6,
          freshness: 0.5,
        },
        fallbackUsed: true,
      },
    };
  }

  private convertToIntelligenceResponse(
    request: IntelligenceRequest,
    orchestrationResult: any,
    startTime: number,
  ): IntelligenceResponse {
    // Extract data from orchestration result
    const response =
      orchestrationResult.finalResponse ||
      orchestrationResult.response ||
      'I processed your request using autonomous intelligence capabilities.';

    const confidence = orchestrationResult.confidenceScore || 0.8;
    const capabilitiesUsed = orchestrationResult.activationPlan?.primary || ['core-intelligence'];

    // Get tracing data for quality assessment
    const traceability = orchestrationWiring.getCompleteTraceability(request.messageId);
    const orchestrationDecision = traceability.orchestrationDecision;

    return {
      messageId: request.messageId,
      response,
      confidence,
      sources: orchestrationResult.sources,
      metadata: {
        processingTime: Date.now() - startTime,
        capabilitiesUsed,
        quality: orchestrationDecision?.qualityPrediction || {
          accuracy: 0.8,
          completeness: 0.7,
          freshness: 0.6,
        },
        fallbackUsed: false,
        traceId: this.config.tracingEnabled ? request.messageId : undefined,
      },
    };
  }

  private createErrorResponse(
    request: IntelligenceRequest,
    error: any,
    startTime: number,
  ): IntelligenceResponse {
    return {
      messageId: request.messageId,
      response:
        'I apologize, but I encountered an issue processing your request. Please try again.',
      confidence: 0.1,
      metadata: {
        processingTime: Date.now() - startTime,
        capabilitiesUsed: ['error-handler'],
        quality: {
          accuracy: 0.1,
          completeness: 0.1,
          freshness: 0.1,
        },
        fallbackUsed: true,
        traceId: this.config.tracingEnabled ? request.messageId : undefined,
      },
    };
  }

  private async updateCapabilityHealth(): Promise<void> {
    // Run health checks for all capabilities
    const healthResults = await capabilityRegistry.runHealthChecks();

    if (this.config.metricsCollection) {
      logger.info(
        `🏥 Updated capability health metrics: ${healthResults.size} capabilities checked`,
      );

      let healthyCount = 0;
      for (const [capabilityId, isHealthy] of healthResults) {
        if (isHealthy) healthyCount++;
      }

      logger.info(`  Healthy: ${healthyCount}/${healthResults.size} capabilities`);
    }
  }

  /**
   * Get system status and health information
   */
  getSystemStatus(): {
    integration: any;
    orchestration: any;
    capabilities: any;
    metrics: any;
  } {
    const orchestrationStatus = autonomousOrchestration.getSystemStatus();
    const wiringMetrics = orchestrationWiring.getSystemMetrics();

    return {
      integration: {
        config: this.config,
        activeRequests: this.requestQueue.size,
        cachedResponses: this.responseCache.size,
        status: 'healthy',
      },
      orchestration: orchestrationStatus,
      capabilities: {
        total: capabilityRegistry.getAllCapabilities().length,
        healthy: capabilityRegistry.getAllCapabilities().filter((cap) => {
          const state = capabilityRegistry.getCapabilityState(cap.id);
          return state?.status === 'active' || (state?.healthScore && state.healthScore > 0.5);
        }).length,
      },
      metrics: {
        wiring: wiringMetrics,
        avgProcessingTime: this.calculateAverageProcessingTime(),
        successRate: this.calculateSuccessRate(),
      },
    };
  }

  private calculateAverageProcessingTime(): number {
    const responses = Array.from(this.responseCache.values());
    if (responses.length === 0) return 0;

    const totalTime = responses.reduce(
      (sum, response) => sum + response.metadata.processingTime,
      0,
    );

    return Math.round(totalTime / responses.length);
  }

  private calculateSuccessRate(): number {
    const responses = Array.from(this.responseCache.values());
    if (responses.length === 0) return 1.0;

    const successful = responses.filter(
      (response) => !response.metadata.fallbackUsed && response.confidence > 0.5,
    ).length;

    return Number((successful / responses.length).toFixed(3));
  }

  /**
   * Get detailed traceability for a request
   */
  getRequestTraceability(messageId: string): any {
    return orchestrationWiring.getCompleteTraceability(messageId);
  }

  /**
   * Update configuration
   */
  updateConfiguration(newConfig: Partial<ServiceIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('🔧 Updated service integration configuration');
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics(): {
    requestsProcessed: number;
    averageLatency: number;
    successRate: number;
    capabilityUtilization: Map<string, number>;
    systemHealth: number;
  } {
    const responses = Array.from(this.responseCache.values());
    const capabilityUsage = new Map<string, number>();

    // Calculate capability utilization
    for (const response of responses) {
      for (const capability of response.metadata.capabilitiesUsed) {
        capabilityUsage.set(capability, (capabilityUsage.get(capability) || 0) + 1);
      }
    }

    // Calculate system health
    const capabilities = capabilityRegistry.getAllCapabilities();
    const healthScores = capabilities.map((cap) => {
      const state = capabilityRegistry.getCapabilityState(cap.id);
      return state?.healthScore || 0;
    });
    const averageHealth = healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length;

    return {
      requestsProcessed: responses.length,
      averageLatency: this.calculateAverageProcessingTime(),
      successRate: this.calculateSuccessRate(),
      capabilityUtilization: capabilityUsage,
      systemHealth: Number(averageHealth.toFixed(3)),
    };
  }

  /**
   * Clean up old data and optimize memory usage
   */
  private cleanup(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    // Clean up old responses
    for (const [messageId, response] of this.responseCache) {
      if (new Date(response.metadata.processingTime) < cutoffTime) {
        this.responseCache.delete(messageId);
      }
    }

    // Clean up old requests
    for (const [messageId, request] of this.requestQueue) {
      if (request.metadata?.timestamp && request.metadata.timestamp < cutoffTime) {
        this.requestQueue.delete(messageId);
      }
    }

    // Clean up orchestration data
    orchestrationWiring.cleanup();
    autonomousOrchestration.cleanup();

    logger.info(`🧹 Service integration cleanup completed. Cache size: ${this.responseCache.size}`);
  }

  /**
   * Shutdown service integration
   */
  async shutdown(): Promise<void> {
    logger.info('🔄 Shutting down Service Integration Layer...');

    // Process any remaining requests
    const pendingRequests = Array.from(this.requestQueue.keys());
    if (pendingRequests.length > 0) {
      logger.warn(`⚠️ Shutting down with ${pendingRequests.length} pending requests`);
    }

    // Clear caches
    this.requestQueue.clear();
    this.responseCache.clear();

    logger.info('✅ Service Integration Layer shutdown complete');
  }
}

// Global service integration instance
export const serviceIntegration = new ServiceIntegration();
