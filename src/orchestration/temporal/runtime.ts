// @ts-nocheck
// Runtime module only loaded when FEATURE_TEMPORAL=true.
// Keep this dependency-light; load Temporal SDK dynamically.
import { logger } from '../../utils/logger.js';

export async function startWorker(): Promise<void> {
  try {
    const sdk = await import('@temporalio/worker');
    const { Worker } = sdk as any;
    const taskQueue = process.env.TEMPORAL_TASK_QUEUE || 'discord-ai-bot';

    const worker = await Worker.create({
      workflowsPath: new URL('./workflows', import.meta.url).pathname,
      activities: await import('./activities/llm.activities.js'),
      taskQueue
    });

    worker.run().catch((err: any) => {
      logger.error('Temporal worker run error', { error: String(err) });
    });

    logger.info(`Temporal worker started on task queue: ${taskQueue}`);
  } catch (err) {
    logger.warn('Temporal SDK not available; skipping worker start', { error: String(err) });
  }
}

export async function stopWorker(): Promise<void> {
  logger.info('Stopping orchestration worker (no-op).');
}