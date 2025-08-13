/**
 * Temporal Client Service for AI Workflow Orchestration
 * Provides high-level interface for executing AI workflows with comprehensive monitoring
 */

import { features } from '../../config/feature-flags.js';
import { logger } from '../../utils/logger.js';

export interface WorkflowExecutionResult<T = any> {
  success: boolean;
  result?: T;
  error?: string;
  workflowId: string;
  executionTime: number;
  metadata: Record<string, unknown>;
}

export interface WorkflowMonitoringInfo {
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  progress?: number;
  currentStep?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
}

export class TemporalClientService {
  private client: any = null;
  private initialized = false;

  /**
   * Initialize the Temporal client
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    if (!features.temporal) {
      logger.debug('Temporal client not initialized - feature disabled');
      return false;
    }

    try {
      const { Client, Connection } = await import('@temporalio/client');
      
      // Configure connection
      const connectionConfig: any = {
        address: process.env.TEMPORAL_SERVER_URL || 'localhost:7233'
      };

      if (process.env.TEMPORAL_TLS === 'true') {
        connectionConfig.tls = {};
      }

      if (process.env.TEMPORAL_NAMESPACE) {
        connectionConfig.namespace = process.env.TEMPORAL_NAMESPACE;
      }

      // Create connection and client
      const connection = await Connection.connect(connectionConfig);
      this.client = new Client({
        connection,
        namespace: process.env.TEMPORAL_NAMESPACE || 'default'
      });

      this.initialized = true;
      logger.info('🧩 Temporal client initialized successfully', {
        namespace: process.env.TEMPORAL_NAMESPACE || 'default',
        serverUrl: connectionConfig.address
      });

      return true;

    } catch (error) {
      logger.error('Failed to initialize Temporal client', { error });
      return false;
    }
  }

  /**
   * Execute AI Agent Workflow with comprehensive error handling
   */
  async executeAIAgentWorkflow(request: {
    userId: string;
    task: string;
    context?: Record<string, unknown>;
    options?: {
      requireHumanApproval?: boolean;
      maxSteps?: number;
      qualityThreshold?: number;
      includeMemorySearch?: boolean;
      multimodalEnabled?: boolean;
      analysisDepth?: 'basic' | 'comprehensive' | 'deep';
      timeout?: string;
    };
  }): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    
    if (!await this.initialize()) {
      return {
        success: false,
        error: 'Temporal client not available',
        workflowId: 'unavailable',
        executionTime: Date.now() - startTime,
        metadata: { fallback: true }
      };
    }

    try {
      const workflowId = `ai-agent-${request.userId}-${Date.now()}`;
      const taskQueue = process.env.TEMPORAL_TASK_QUEUE || 'discord-ai-bot';

      // Start workflow execution
      const handle = await this.client.workflow.start('aiAgentWorkflow', {
        args: [request],
        taskQueue,
        workflowId,
        workflowExecutionTimeout: request.options?.timeout || '10m',
        workflowRunTimeout: request.options?.timeout || '10m'
      });

      logger.info('🚀 AI Agent workflow started', {
        workflowId,
        userId: request.userId,
        task: request.task.slice(0, 100)
      });

      // Wait for workflow completion
      const result = await handle.result();

      const executionTime = Date.now() - startTime;
      
      logger.info('✅ AI Agent workflow completed', {
        workflowId,
        userId: request.userId,
        executionTime,
        qualityScore: result.qualityScore
      });

      return {
        success: true,
        result,
        workflowId,
        executionTime,
        metadata: {
          steps: result.steps.length,
          qualityScore: result.qualityScore,
          memoryUpdates: result.memoryUpdates.length
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('❌ AI Agent workflow failed', { error, executionTime });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        workflowId: 'failed',
        executionTime,
        metadata: { error: true }
      };
    }
  }

  /**
   * Execute Multimodal Processing Workflow
   */
  async executeMultimodalWorkflow(request: {
    userId: string;
    contentItems: Array<{
      id: string;
      type: 'image' | 'audio' | 'video' | 'document';
      content: string | Buffer;
      contentUrl?: string;
      metadata?: Record<string, unknown>;
    }>;
    processingOptions: {
      analysisTypes: Array<'ocr' | 'object_detection' | 'sentiment' | 'transcription' | 'translation' | 'summary'>;
      enhanceContent?: boolean;
      generateDescription?: boolean;
      extractInsights?: boolean;
      storeInMemory?: boolean;
      qualityThreshold?: number;
    };
    outputFormat?: 'detailed' | 'summary' | 'insights_only';
    timeout?: string;
  }): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();

    if (!await this.initialize()) {
      return {
        success: false,
        error: 'Temporal client not available',
        workflowId: 'unavailable',
        executionTime: Date.now() - startTime,
        metadata: { fallback: true }
      };
    }

    try {
      const workflowId = `multimodal-${request.userId}-${Date.now()}`;
      const taskQueue = process.env.TEMPORAL_TASK_QUEUE || 'discord-ai-bot';

      // Start workflow execution
      const handle = await this.client.workflow.start('multimodalProcessingWorkflow', {
        args: [request],
        taskQueue,
        workflowId,
        workflowExecutionTimeout: request.timeout || '30m',
        workflowRunTimeout: request.timeout || '30m'
      });

      logger.info('🎨 Multimodal workflow started', {
        workflowId,
        userId: request.userId,
        contentItems: request.contentItems.length,
        analysisTypes: request.processingOptions.analysisTypes
      });

      // Wait for workflow completion
      const result = await handle.result();

      const executionTime = Date.now() - startTime;

      logger.info('✅ Multimodal workflow completed', {
        workflowId,
        userId: request.userId,
        executionTime,
        itemsProcessed: result.processedItems.length
      });

      return {
        success: true,
        result,
        workflowId,
        executionTime,
        metadata: {
          itemsProcessed: result.processedItems.length,
          analysisTypes: request.processingOptions.analysisTypes.length,
          memoryUpdates: result.memoryUpdates.length
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('❌ Multimodal workflow failed', { error, executionTime });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        workflowId: 'failed',
        executionTime,
        metadata: { error: true }
      };
    }
  }

  /**
   * Get workflow status and monitoring information
   */
  async getWorkflowStatus(workflowId: string): Promise<WorkflowMonitoringInfo | null> {
    if (!await this.initialize()) {
      return null;
    }

    try {
      const handle = this.client.workflow.getHandle(workflowId);
      const description = await handle.describe();

      const monitoringInfo: WorkflowMonitoringInfo = {
        workflowId,
        status: this.mapWorkflowStatus(description.status),
        startTime: description.startTime,
        endTime: description.closeTime,
        duration: description.closeTime 
          ? new Date(description.closeTime).getTime() - new Date(description.startTime).getTime()
          : undefined
      };

      return monitoringInfo;

    } catch (error) {
      logger.error('Failed to get workflow status', { workflowId, error });
      return null;
    }
  }

  /**
   * Cancel a running workflow
   */
  async cancelWorkflow(workflowId: string, reason: string = 'User requested cancellation'): Promise<boolean> {
    if (!await this.initialize()) {
      return false;
    }

    try {
      const handle = this.client.workflow.getHandle(workflowId);
      await handle.cancel();

      logger.info('🛑 Workflow cancelled', { workflowId, reason });
      return true;

    } catch (error) {
      logger.error('Failed to cancel workflow', { workflowId, error });
      return false;
    }
  }

  /**
   * Send signal to workflow (for human-in-the-loop operations)
   */
  async sendWorkflowSignal(
    workflowId: string, 
    signalName: string, 
    args: any[] = []
  ): Promise<boolean> {
    if (!await this.initialize()) {
      return false;
    }

    try {
      const handle = this.client.workflow.getHandle(workflowId);
      await handle.signal(signalName, ...args);

      logger.info('📡 Signal sent to workflow', { workflowId, signalName });
      return true;

    } catch (error) {
      logger.error('Failed to send workflow signal', { workflowId, signalName, error });
      return false;
    }
  }

  /**
   * List recent workflows for monitoring
   */
  async listRecentWorkflows(
    limit: number = 20,
    filters?: {
      workflowType?: string;
      status?: string;
      userId?: string;
    }
  ): Promise<WorkflowMonitoringInfo[]> {
    if (!await this.initialize()) {
      return [];
    }

    try {
      // Query workflows using list API
      const workflows = await this.client.workflow.list({
        query: this.buildWorkflowQuery(filters),
        pageSize: limit
      });

      const monitoringInfo: WorkflowMonitoringInfo[] = [];

      for await (const workflow of workflows) {
        monitoringInfo.push({
          workflowId: workflow.workflowId,
          status: this.mapWorkflowStatus(workflow.status),
          startTime: workflow.startTime,
          endTime: workflow.closeTime,
          duration: workflow.closeTime 
            ? new Date(workflow.closeTime).getTime() - new Date(workflow.startTime).getTime()
            : undefined
        });
      }

      return monitoringInfo;

    } catch (error) {
      logger.error('Failed to list workflows', { error });
      return [];
    }
  }

  /**
   * Get comprehensive health status of the Temporal client
   */
  getHealthStatus(): {
    initialized: boolean;
    clientAvailable: boolean;
    featureEnabled: boolean;
    lastOperation?: string;
  } {
    return {
      initialized: this.initialized,
      clientAvailable: this.client !== null,
      featureEnabled: features.temporal,
      lastOperation: this.initialized ? 'success' : 'not_initialized'
    };
  }

  /**
   * Close client connection
   */
  async close(): Promise<void> {
    if (this.client && this.initialized) {
      try {
        await this.client.connection.close();
        this.client = null;
        this.initialized = false;
        logger.info('🔌 Temporal client connection closed');
      } catch (error) {
        logger.error('Error closing Temporal client', { error });
      }
    }
  }

  // Helper methods

  private mapWorkflowStatus(status: any): WorkflowMonitoringInfo['status'] {
    switch (status?.name || status) {
      case 'WORKFLOW_EXECUTION_STATUS_RUNNING':
      case 'Running':
        return 'running';
      case 'WORKFLOW_EXECUTION_STATUS_COMPLETED':
      case 'Completed':
        return 'completed';
      case 'WORKFLOW_EXECUTION_STATUS_FAILED':
      case 'Failed':
        return 'failed';
      case 'WORKFLOW_EXECUTION_STATUS_CANCELED':
      case 'Cancelled':
        return 'cancelled';
      case 'WORKFLOW_EXECUTION_STATUS_TIMED_OUT':
      case 'TimedOut':
        return 'timeout';
      default:
        return 'running';
    }
  }

  private buildWorkflowQuery(filters?: {
    workflowType?: string;
    status?: string;
    userId?: string;
  }): string {
    const conditions: string[] = [];

    if (filters?.workflowType) {
      conditions.push(`WorkflowType = "${filters.workflowType}"`);
    }

    if (filters?.status) {
      conditions.push(`ExecutionStatus = "${filters.status}"`);
    }

    if (filters?.userId) {
      conditions.push(`WorkflowId STARTS_WITH "${filters.userId}"`);
    }

    return conditions.length > 0 ? conditions.join(' AND ') : '';
  }
}

// Export singleton instance
export const temporalClientService = new TemporalClientService();