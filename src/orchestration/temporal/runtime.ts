// Runtime module only loaded when FEATURE_TEMPORAL=true.
// Keep this dependency-free for now; actual Temporal SDK wiring can be added in a later PR.
import { logger } from '../../utils/logger.js';

export async function startWorker(): Promise<void> {
  logger.info('Starting orchestration worker (stubbed).');
}

export async function stopWorker(): Promise<void> {
  logger.info('Stopping orchestration worker (stubbed).');
}