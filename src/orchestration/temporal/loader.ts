// Safe loader for orchestration features. No Temporal imports unless enabled.
import { features } from '../../config/feature-flags.js';
import { logger } from '../../utils/logger.js';

export interface OrchestrationResult {
  started: boolean;
}

export async function startTemporalOrchestrationIfEnabled(): Promise<OrchestrationResult> {
  if (!features.temporal) {
    logger.debug('Temporal orchestration is disabled by feature flag.');
    return { started: false };
  }

  try {
    const mod = await import('./runtime.js');
    await mod.startWorker();
    logger.info('Temporal orchestration started.');
    return { started: true };
  } catch (err) {
    logger.error('Failed to start Temporal orchestration:', err);
    return { started: false };
  }
}