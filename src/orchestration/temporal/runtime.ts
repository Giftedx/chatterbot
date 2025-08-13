/**
 * Enhanced Temporal Runtime for Durable AI Workflow Orchestration
 * Supports complex multi-step AI operations with retry, compensation, and state management
 */
import { logger } from '../../utils/logger.js';
import type { WorkerOptions, Worker as TemporalWorker } from '@temporalio/worker';

// Global worker instance for lifecycle management
let workerInstance: TemporalWorker | null = null;

export interface TemporalConfig {
  taskQueue: string;
  namespace: string;
  connection?: {
    address: string;
    tls?: boolean;
  };
  maxConcurrentWorkflowTaskExecutions: number;
  maxConcurrentActivityTaskExecutions: number;
}

export function getTemporalConfig(): TemporalConfig {
  return {
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'discord-ai-bot',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    connection: process.env.TEMPORAL_SERVER_URL ? {
      address: process.env.TEMPORAL_SERVER_URL,
      tls: process.env.TEMPORAL_TLS === 'true'
    } : undefined,
    maxConcurrentWorkflowTaskExecutions: parseInt(process.env.TEMPORAL_MAX_WORKFLOWS || '5'),
    maxConcurrentActivityTaskExecutions: parseInt(process.env.TEMPORAL_MAX_ACTIVITIES || '10')
  };
}

export async function startWorker(): Promise<void> {
  if (workerInstance) {
    logger.warn('Temporal worker already running');
    return;
  }

  try {
    const { Worker } = await import('@temporalio/worker');
    const config = getTemporalConfig();
    
    // Import all activities for comprehensive AI operations
    const activities = {
      ...(await import('./activities/llm.activities.js')),
      ...(await import('./activities/memory.activities.js')),
      ...(await import('./activities/multimodal.activities.js')),
      ...(await import('./activities/analysis.activities.js'))
    };

    const workerOptions: WorkerOptions = {
      workflowsPath: new URL('./workflows', import.meta.url).pathname,
      activities,
      taskQueue: config.taskQueue,
      namespace: config.namespace,
      maxConcurrentWorkflowTaskExecutions: config.maxConcurrentWorkflowTaskExecutions,
      maxConcurrentActivityTaskExecutions: config.maxConcurrentActivityTaskExecutions,
      // Enhanced error handling and retry policies
      stickyQueueScheduleToStartTimeout: '30s',
      maxCachedWorkflows: 200
    } as WorkerOptions;

    let nativeConnection: any = undefined;
    if (config.connection) {
      const { Connection } = await import('@temporalio/client');
      nativeConnection = await Connection.connect(config.connection as any);
    }

    workerInstance = await Worker.create({ ...(workerOptions as any), connection: nativeConnection } as any);

    // Start worker with comprehensive error handling
    const runPromise = workerInstance.run();
    
    // Handle graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down Temporal worker...');
      await stopWorker();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    runPromise.catch((err) => {
      logger.error('Temporal worker run error', { 
        error: err.message,
        stack: err.stack,
        taskQueue: config.taskQueue
      });
      workerInstance = null;
    });

    logger.info(`🧩 Advanced Temporal worker started`, {
      taskQueue: config.taskQueue,
      namespace: config.namespace,
      maxWorkflows: config.maxConcurrentWorkflowTaskExecutions,
      maxActivities: config.maxConcurrentActivityTaskExecutions
    });

  } catch (err) {
    const error = err as Error;
    logger.error('Failed to start Temporal worker', { 
      error: error.message,
      stack: error.stack 
    });
    throw err;
  }
}

export async function stopWorker(): Promise<void> {
  if (!workerInstance) {
    logger.debug('No Temporal worker to stop');
    return;
  }

  try {
    logger.info('Stopping Temporal worker...');
    await workerInstance.shutdown();
    workerInstance = null;
    logger.info('✅ Temporal worker stopped successfully');
  } catch (err) {
    const error = err as Error;
    logger.error('Error stopping Temporal worker', { 
      error: error.message,
      stack: error.stack 
    });
  }
}

/**
 * Check if Temporal worker is running
 */
export function isWorkerRunning(): boolean {
  return workerInstance !== null;
}

/**
 * Get worker health information
 */
export function getWorkerHealth(): { 
  running: boolean; 
  taskQueue?: string; 
  namespace?: string; 
} {
  const config = getTemporalConfig();
  return {
    running: isWorkerRunning(),
    taskQueue: config.taskQueue,
    namespace: config.namespace
  };
}