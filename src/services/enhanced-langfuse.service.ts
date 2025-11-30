/**
 * Enhanced Langfuse Integration Service
 * Provides comprehensive observability and evaluation for AI operations
 * Self-hosted capability with production-grade features
 */

import { Langfuse } from 'langfuse';
import { features } from '../config/feature-flags.js';
import { getEnvAsBoolean } from '../utils/env.js';
import { logger } from '../utils/logger.js';

/**
 * Metrics representing token consumption for an LLM request.
 */
interface TokenUsage {
  /** Tokens in the prompt. */
  input?: number;
  /** Tokens in the completion. */
  output?: number;
  /** Combined total tokens. */
  total?: number;
}

/**
 * Internal tracking object for an active trace session.
 */
interface EnhancedTrace {
  id: string;
  sessionId: string;
  userId: string;
  metadata: Record<string, any>;
  startTime: Date;
  endTime?: Date;
}

/**
 * Performance data for a specific model interaction.
 */
interface ModelPerformanceMetrics {
  modelName: string;
  tokenUsage: TokenUsage;
  latency: number;
  cost?: number;
  quality?: number;
}

/**
 * Summary statistics for a completed conversation trace.
 */
interface ConversationTrace {
  conversationId: string;
  messageCount: number;
  totalTokens: number;
  averageLatency: number;
  qualityScore?: number;
}

/**
 * Service for deep observability integration via Langfuse.
 *
 * Capabilities:
 * - Distributed tracing of conversation flows.
 * - Detailed generation tracking (tokens, latency, model usage).
 * - Component-level spanning (Decision Engine, MCP tools).
 * - Quality scoring and feedback collection.
 */
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
   * Begins a new distributed trace for a user conversation.
   *
   * @param params - Trace initialization parameters.
   * @param params.conversationId - Unique conversation identifier.
   * @param params.userId - The user involved.
   * @param params.sessionId - Session context (e.g., Guild ID or DM).
   * @param params.metadata - Additional context tags.
   * @returns The trace ID if successful, null otherwise.
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
   * Records a specific LLM generation event within a trace.
   *
   * @param params - Generation details.
   * @param params.traceId - Parent trace ID.
   * @param params.name - Descriptive name of the generation step.
   * @param params.model - Model identifier used.
   * @param params.input - The prompt or input sent to the model.
   * @param params.output - The completion or output received.
   * @param params.usage - Token usage stats.
   * @param params.startTime - When the request started.
   * @param params.endTime - When the request completed.
   * @param params.metadata - Extra context.
   * @returns The generation span object.
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
   * Creates a span for internal decision engine logic.
   *
   * @param params - Span details.
   * @param params.traceId - Parent trace ID.
   * @param params.operation - Name of the decision logic.
   * @param params.input - Input context.
   * @param params.output - Decision result.
   * @returns The created span.
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
   * Records the execution of an external tool via MCP.
   *
   * @param params - Tool execution details.
   * @param params.traceId - Parent trace ID.
   * @param params.toolName - Name of the tool invoked.
   * @param params.input - Arguments passed to the tool.
   * @param params.output - Result returned by the tool.
   * @param params.error - Error message if failed.
   * @returns The created span.
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
   * Finalizes a conversation trace, calculating duration and attaching final metadata.
   *
   * @param traceId - The ID of the trace to complete.
   * @param finalMetadata - Any final data to append.
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
   * Internal helper to log aggregated performance metrics for a model call.
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
   * Retrieves aggregated analytics for conversations matching criteria.
   *
   * @param params - Filter criteria.
   * @returns List of conversation summaries.
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
   * Adds a quality score or user feedback to a trace.
   *
   * @param params - Score details including type and value.
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
   * Forces immediate export of all buffered traces.
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
   * Checks the operational status of the observability service.
   * @returns Health status object.
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