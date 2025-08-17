/*
  Lightweight DB-backed guild decision overrides with TTL cache.
  - Reads from table `guild_decision_overrides` defined in Prisma schema
  - Returns Partial<DecisionEngineOptions>
  - Gracefully degrades when Prisma or table is unavailable
*/
import { logger } from '../utils/logger.js';
import type { DecisionEngineOptions } from './decision-engine.service.js';
import { getPrisma } from '../db/prisma.js';

type Overrides = Partial<DecisionEngineOptions>;

const TTL_MS = Number(process.env.DECISION_OVERRIDES_TTL_MS || 60_000);

interface CacheEntry {
  value: Overrides | null; // null => explicit no overrides
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function now() {
  return Date.now();
}

export async function fetchGuildDecisionOverrides(guildId: string): Promise<Overrides | null> {
  if (!guildId) return null;
  const hit = cache.get(guildId);
  if (hit && hit.expiresAt > now()) return hit.value;

  // Miss or expired; query DB
  try {
    const prisma = await getPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = prisma;
    if (!client || !client.guildDecisionOverride) {
      // Client not generated or model missing; cache null briefly
      cache.set(guildId, { value: null, expiresAt: now() + TTL_MS });
      return null;
    }

    const row = await client.guildDecisionOverride.findUnique({
      where: { guildId },
    });
    const overrides: Overrides | null = row?.overrides ?? null;
    cache.set(guildId, { value: overrides, expiresAt: now() + TTL_MS });
    return overrides;
  } catch (err) {
    logger.warn('[DecisionOverridesDB] fetch failed, falling back to env/none', {
      error: err instanceof Error ? err.message : String(err),
    });
    // Cache negative result briefly to avoid hot-looping on errors
    cache.set(guildId, { value: null, expiresAt: now() + Math.min(TTL_MS, 15_000) });
    return null;
  }
}

export function clearGuildOverridesCache(guildId?: string) {
  if (guildId) cache.delete(guildId);
  else cache.clear();
}

/**
 * Upsert and merge partial overrides for a guild. Any keys in `patch` with value === null
 * will be removed from the stored overrides. Other keys will be set/overwritten.
 * Returns the updated overrides JSON.
 */
export async function updateGuildDecisionOverridesPartial(
  guildId: string,
  patch: Overrides,
): Promise<Overrides> {
  if (!guildId) throw new Error('guildId is required');
  try {
    const prisma = await getPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = prisma;
    if (!client || !client.guildDecisionOverride) {
      throw new Error('Prisma client or model guildDecisionOverride not available');
    }

    // Load existing
    const current = await client.guildDecisionOverride.findUnique({ where: { guildId } });
    const next: Record<string, unknown> = { ...(current?.overrides || {}) };

    for (const [k, v] of Object.entries(patch || {})) {
      if (v === null) delete next[k];
      else (next as any)[k] = v;
    }

    // If empty after removals, delete row
    if (Object.keys(next).length === 0) {
      try {
        await client.guildDecisionOverride.delete({ where: { guildId } });
      } catch {}
      // Invalidate cache and cache explicit null result briefly
      clearGuildOverridesCache(guildId);
      cache.set(guildId, { value: null, expiresAt: now() + Math.min(TTL_MS, 15_000) });
      return {} as Overrides;
    }

    // Upsert
    const saved = await client.guildDecisionOverride.upsert({
      where: { guildId },
      update: { overrides: next },
      create: { guildId, overrides: next },
    });

    // Invalidate and prime cache with fresh value
    clearGuildOverridesCache(guildId);
    cache.set(guildId, { value: saved.overrides as Overrides, expiresAt: now() + TTL_MS });
    return saved.overrides as Overrides;
  } catch (err) {
    logger.warn('[DecisionOverridesDB] update failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Delete all overrides for a guild. Returns true if the row existed and was deleted, false otherwise.
 */
export async function deleteGuildDecisionOverrides(guildId: string): Promise<boolean> {
  if (!guildId) throw new Error('guildId is required');
  try {
    const prisma = await getPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = prisma;
    if (!client || !client.guildDecisionOverride) {
      // Nothing to delete; treat as success to keep UX simple
      clearGuildOverridesCache(guildId);
      cache.set(guildId, { value: null, expiresAt: now() + Math.min(TTL_MS, 15_000) });
      return false;
    }
    let deleted = false;
    try {
      await client.guildDecisionOverride.delete({ where: { guildId } });
      deleted = true;
    } catch {
      deleted = false;
    }
    clearGuildOverridesCache(guildId);
    cache.set(guildId, { value: null, expiresAt: now() + Math.min(TTL_MS, 15_000) });
    return deleted;
  } catch (err) {
    logger.warn('[DecisionOverridesDB] delete failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
