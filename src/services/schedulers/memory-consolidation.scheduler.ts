import { getMemoryManager } from '../memory-registry.js';
import { logger } from '../../utils/logger.js';

export class MemoryConsolidationScheduler {
  private timer?: NodeJS.Timeout;

  start(intervalMs: number = Number(process.env.MEMORY_CONSOLIDATION_INTERVAL || 60 * 60 * 1000)) {
    if (this.timer) return;
    this.timer = setInterval(async () => {
      try {
        const mm = getMemoryManager();
        if (mm) {
          await mm.consolidateMemories();
          logger.info('Memory consolidation cycle completed.');
        }
      } catch (err) {
        logger.warn('Memory consolidation cycle failed', { error: String(err) });
      }
    }, intervalMs).unref();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
}

export const memoryConsolidationScheduler = new MemoryConsolidationScheduler();