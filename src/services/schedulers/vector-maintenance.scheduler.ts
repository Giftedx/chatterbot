import { prisma } from '../../db/prisma.js';
import { logger } from '../../utils/logger.js';
import { features } from '../../config/feature-flags.js';
import { pgvectorRepository } from '../../vector/pgvector.repository.js';
import { isLocalDBDisabled } from '../../utils/env.js';

export class VectorMaintenanceScheduler {
  private timer?: NodeJS.Timeout;

  start(
    intervalMs: number = Number(process.env.VECTOR_MAINTENANCE_INTERVAL || 6 * 60 * 60 * 1000),
  ) {
    if (this.timer) return;
    this.timer = setInterval(async () => {
      try {
        if (isLocalDBDisabled()) {
          logger.info('Vector maintenance skipped in local DB-less mode');
          return;
        }
        const cutoffDays = Number(process.env.KB_CHUNK_TTL_DAYS || 180);
        const cutoff = new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000);

        // Prune old KB chunks without recent activity
        const oldChunks = await prisma.kBChunk.findMany({
          where: { createdAt: { lt: cutoff } },
          take: 100,
        });
        for (const c of oldChunks) {
          try {
            await prisma.kBChunk.delete({ where: { id: c.id } });
            // Optional: if mirrored to pgvector, we would also delete there if we had an id linkage
          } catch {}
        }

        logger.info('Vector maintenance cycle completed', { pruned: oldChunks.length });
      } catch (err) {
        logger.warn('Vector maintenance cycle failed', { error: String(err) });
      }
    }, intervalMs).unref();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
}

export const vectorMaintenanceScheduler = new VectorMaintenanceScheduler();
