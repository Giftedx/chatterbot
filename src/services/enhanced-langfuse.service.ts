/**
 * Enhanced Langfuse Integration Service
 * Provides comprehensive observability and evaluation for AI operations
 * Self-hosted capability with production-grade features
 */

import { Langfuse } from 'langfuse';
import { features } from '../config/feature-flags.js';
import { getEnvAsBoolean } from '../utils/env.js';
import logger from '../utils/logger.js';

interface TokenUsage {
  input?: number;
  output?: number;
  total?: number;
}

interface EnhancedTrace {
  id: string;
  sessionId: string;
  userId: string;
  metadata: Record<string, any>;
  startTime: Date;
  endTime?: Date;
}

interface ModelPerformanceMetrics {
  modelName: string;
  tokenUsage: TokenUsage;
  latency: number;
  cost?: number;
  quality?: number;
}

interface ConversationTrace {
  conversationId: string;
  messageCount: number;
  totalTokens: number;
  averageLatency: number;
  qualityScore?: number;
}

export class EnhancedLangfuseService {
  private client: any | null = null;
  private isEnabled: boolean;
  private traces: Map<string, EnhancedTrace> = new Map();

  constructor() {
    this.isEnabled = features.enhancedLangfuse && this.initializeClient();
    if (this.isEnabled) {
      logger.info('Enhanced Langfuse service initialized');
    }
  }

  private initializeClient(): boolean {
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_SECRET_KEY;
    const baseUrl = process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com';

    if (!publicKey || !secretKey) {
      logger.warn('Langfuse keys not provided - enhanced observability disabled');
      return false;
    }

    try {
      this.client = new Langfuse({
        publicKey,
        secretKey,
        baseUrl,
        release: process.env.npm_package_version || 'unknown',
        debug: getEnvAsBoolean('LANGFUSE_DEBUG', false)
      });

      return true;
    } catch (error) {
      logger.error('Failed to initialize enhanced Langfuse client:', error);
      return false;
    }
  }

  /**
   * Start comprehensive conversation tracing
   */
  async startConversationTrace(params: {
    conversationId: string;
    userId: string;
    sessionId: string;
    metadata?: Record<string, any>;
  }): Promise<string | null> {
    if (!this.isEnabled || !this.client) return null;

    try {
      const trace = this.client.trace({
        id: params.conversationId,
        name: 'discord_conversation',
        userId: params.userId,
        sessionId: params.sessionId,
        metadata: {
          platform: 'discord',
          service: 'chatterbot',
          ...params.metadata
        }
      });

      const enhancedTrace: EnhancedTrace = {
        id: params.conversationId,
        sessionId: params.sessionId,
        userId: params.userId,
        metadata: params.metadata || {},
        startTime: new Date()
      };

      this.traces.set(params.conversationId, enhancedTrace);
      
      return params.conversationId;
    } catch (error) {
      logger.error('Failed to start conversation trace:', error);
      return null;
    }
  }

  /**
   * Track AI model generation with enhanced metrics
   */
  async trackGeneration(params: {
    traceId: string;
    name: string;
    model: string;
    input: any;
    output?: any;
    usage?: TokenUsage;
    startTime: Date;
    endTime: Date;
    metadata?: Record<string, any>;
  }): Promise<any | null> {
    if (!this.isEnabled || !this.client) return null;

    try {
      const latency = params.endTime.getTime() - params.startTime.getTime();
      
      const generation = this.client.generation({
        traceId: params.traceId,
        name: params.name,
        model: params.model,
        input: params.input,
        output: params.output,
        usage: params.usage,
        startTime: params.startTime,
        endTime: params.endTime,
        metadata: {
          latency,
          ...params.metadata
        }
      });

      // Track performance metrics for analytics
      if (params.usage) {
        await this.trackModelPerformance({
          modelName: params.model,
          tokenUsage: params.usage,
          latency,
          metadata: params.metadata
        });
      }

      return generation;
    } catch (error) {
      logger.error('Failed to track generation:', error);
      return null;
    }
  }

  /**
   * Track decision engine operations
   */
  async trackDecisionEngine(params: {
    traceId: string;
    operation: string;
    input: any;
    output: any;
    metadata?: Record<string, any>;
  }): Promise<any | null> {
    if (!this.isEnabled || !this.client) return null;

    try {
      const span = this.client.span({
        traceId: params.traceId,
        name: `decision_engine_${params.operation}`,
        input: params.input,
        output: params.output,
        metadata: {
          component: 'decision_engine',
          operation: params.operation,
          ...params.metadata
        }
      });

      return span;
    } catch (error) {
      logger.error('Failed to track decision engine operation:', error);
      return null;
    }
  }

  /**
   * Track MCP tool usage
   */
  async trackMCPTool(params: {
    traceId: string;
    toolName: string;
    input: any;
    output?: any;
    error?: string;
    startTime: Date;
    endTime: Date;
  }): Promise<any | null> {
    if (!this.isEnabled || !this.client) return null;

    try {
      const span = this.client.span({
        traceId: params.traceId,
        name: `mcp_tool_${params.toolName}`,
        input: params.input,
        output: params.output,
        startTime: params.startTime,
        endTime: params.endTime,
        metadata: {
          component: 'mcp_tools',
          tool_name: params.toolName,
          latency: params.endTime.getTime() - params.startTime.getTime(),
          success: !params.error
        }
      });

      if (params.error) {
        span.update({
          level: 'ERROR',
          statusMessage: params.error
        });
      }

      return span;
    } catch (error) {
      logger.error('Failed to track MCP tool usage:', error);
      return null;
    }
  }

  /**
   * End conversation trace with comprehensive metrics
   */
  async endConversationTrace(traceId: string, finalMetadata?: Record<string, any>): Promise<void> {
    if (!this.isEnabled || !this.client) return;

    try {
      const trace = this.traces.get(traceId);
      if (trace) {
        trace.endTime = new Date();
        
        // Calculate conversation-level metrics
        const duration = trace.endTime.getTime() - trace.startTime.getTime();
        
        this.client.trace({
          id: traceId,
          metadata: {
            ...trace.metadata,
            ...finalMetadata,
            conversation_duration: duration,
            end_time: trace.endTime.toISOString()
          }
        });

        this.traces.delete(traceId);
      }
    } catch (error) {
      logger.error('Failed to end conversation trace:', error);
    }
  }

  /**
   * Track model performance for analytics
   */
  private async trackModelPerformance(params: {
    modelName: string;
    tokenUsage: TokenUsage;
    latency: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    if (!this.isEnabled || !this.client) return;

    try {
      // Create a performance event for aggregated analytics
      this.client.event({
        name: 'model_performance',
        metadata: {
          model: params.modelName,
          input_tokens: params.tokenUsage.input,
          output_tokens: params.tokenUsage.output,
          total_tokens: params.tokenUsage.total,
          latency: params.latency,
          tokens_per_second: params.tokenUsage.output ? 
            (params.tokenUsage.output / (params.latency / 1000)) : 0,
          ...params.metadata
        }
      });
    } catch (error) {
      logger.error('Failed to track model performance:', error);
    }
  }

  /**
   * Generate comprehensive conversation analytics
   */
  async getConversationAnalytics(params: {
    userId?: string;
    timeRange: { start: Date; end: Date };
    modelFilter?: string;
  }): Promise<ConversationTrace[]> {
    if (!this.isEnabled || !this.client) return [];

    try {
      // This would typically use Langfuse's analytics API
      // For now, return empty array as placeholder
      logger.info('Conversation analytics requested:', params);
      return [];
    } catch (error) {
      logger.error('Failed to get conversation analytics:', error);
      return [];
    }
  }

  /**
   * Score conversation quality
   */
  async scoreConversation(params: {
    traceId: string;
    scoreType: 'relevance' | 'helpfulness' | 'accuracy' | 'safety';
    value: number;
    comment?: string;
  }): Promise<void> {
    if (!this.isEnabled || !this.client) return;

    try {
      this.client.score({
        traceId: params.traceId,
        name: params.scoreType,
        value: params.value,
        comment: params.comment
      });
    } catch (error) {
      logger.error('Failed to score conversation:', error);
    }
  }

  /**
   * Flush all pending traces
   */
  async flush(): Promise<void> {
    if (!this.isEnabled || !this.client) return;

    try {
      await this.client.flushAsync();
    } catch (error) {
      logger.error('Failed to flush Langfuse traces:', error);
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    enabled: boolean;
    connected: boolean;
    pendingTraces: number;
  } {
    return {
      enabled: this.isEnabled,
      connected: this.client !== null,
      pendingTraces: this.traces.size
    };
  }
}

// Singleton instance
export const enhancedLangfuseService = new EnhancedLangfuseService();