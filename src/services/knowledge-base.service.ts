/**
 * Knowledge Base Service
 * Manages trusted information for zero-hallucination responses
 */

import { getPrisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';
import { features } from '../config/feature-flags.js';
import { pgvectorRepository } from '../vector/pgvector-enhanced.repository.js';
import { isLocalDBDisabled } from '../utils/env.js';

function cosineSim(a: Float32Array, b: Float32Array): number {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length && i < b.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

function jaccardSimilarity(a: string, b: string): number {
  const sa = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const sb = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  const intersection = new Set([...sa].filter((x) => sb.has(x))).size;
  const union = new Set([...sa, ...sb]).size || 1;
  return intersection / union;
}

function reRankEntries(
  entries: Array<{ content: string } & Record<string, any>>,
  limit: number,
): any[] {
  const selected: any[] = [];
  const threshold = 0.7; // consider near-duplicates above this similarity
  for (const e of entries) {
    const isDuplicate = selected.some((s) => jaccardSimilarity(s.content, e.content) >= threshold);
    if (!isDuplicate) selected.push(e);
    if (selected.length >= limit) break;
  }
  return selected;
}

// Optional: local reranker using Transformers.js and sentence-transformers
async function localRerank(
  query: string,
  entries: Array<{ content: string } & Record<string, any>>,
  limit: number,
): Promise<any[]> {
  try {
    if (process.env.FEATURE_LOCAL_RERANK !== 'true') return entries.slice(0, limit);
    // Lazy import to avoid bundling when feature is off; tolerate missing dep
    let pipeline: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      pipeline = (await import('@xenova/transformers')).pipeline;
    } catch {
      return entries.slice(0, limit);
    }
    // Default small model; can be overridden via env
    const model = process.env.LOCAL_RERANK_MODEL || 'Xenova/all-MiniLM-L6-v2';
    const embedder = await pipeline('feature-extraction', model);
    const qEmbAny: any = await embedder(query, { pooling: 'mean', normalize: true });
    const qEmb = new Float32Array(qEmbAny.data);
    const scored = [] as Array<{ idx: number; score: number }>;
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const dEmbAny: any = await embedder(e.content, { pooling: 'mean', normalize: true });
      const dEmb = new Float32Array(dEmbAny.data);
      const score = cosineSim(qEmb, dEmb);
      scored.push({ idx: i, score: isFinite(score) ? score : 0 });
    }
    scored.sort((a, b) => b.score - a.score);
    const out = scored.slice(0, limit).map((s) => entries[s.idx]);
    return out.length ? out : entries.slice(0, limit);
  } catch (e) {
    return entries.slice(0, limit);
  }
}

async function cohereRerank(
  query: string,
  entries: Array<{ content: string } & Record<string, any>>,
  limit: number,
): Promise<any[]> {
  try {
    if (!process.env.COHERE_API_KEY || process.env.FEATURE_RERANK !== 'true')
      return entries.slice(0, limit);
    const { CohereClient } = await import('cohere-ai');
    const cohere = new CohereClient({ token: process.env.COHERE_API_KEY! });
    const documents = entries.map((e, idx) => ({ id: String(idx), text: e.content }));
    const model = process.env.COHERE_RERANK_MODEL || 'rerank-english-v3.0';
    const result = await cohere.rerank({ model, query, documents });
    const ranked = result.results
      .sort((a: any, b: any) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
      .slice(0, limit)
      .map((r: any) => entries[Number(r.document?.id ?? r.index)]);
    return ranked.length ? ranked : entries.slice(0, limit);
  } catch {
    return entries.slice(0, limit);
  }
}

async function voyageRerank(
  query: string,
  entries: Array<{ content: string } & Record<string, any>>,
  limit: number,
): Promise<any[]> {
  try {
    if (!process.env.VOYAGE_API_KEY || process.env.FEATURE_RERANK !== 'true')
      return entries.slice(0, limit);
    const res = await fetch('https://api.voyageai.com/v1/rerank', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.VOYAGE_RERANK_MODEL || 'rerank-2.5',
        query,
        documents: entries.map((e) => e.content),
        top_k: limit,
      }),
    });
    if (!res.ok) return entries.slice(0, limit);
    const data: any = await res.json();
    const ranked: any[] = (data?.data || data?.results || [])
      .sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit)
      .map((r: any) => entries[r.index ?? Number(r.document_id) ?? 0]);
    return ranked.length ? ranked : entries.slice(0, limit);
  } catch {
    return entries.slice(0, limit);
  }
}

export interface KnowledgeEntry {
  id: string;
  content: string;
  source: string; // Accept any string from Prisma
  sourceId: string;
  sourceUrl: string | null;
  channelId: string | null;
  authorId: string | null;
  tags: string | null; // JSON string of tags
  confidence: number; // 0-1, how confident we are in this knowledge
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeQuery {
  query: string;
  channelId?: string;
  guildId?: string;
  tags?: string[];
  minConfidence?: number;
  limit?: number;
}

export class KnowledgeBaseService {
  private static instance: KnowledgeBaseService;

  private constructor() {}

  static getInstance(): KnowledgeBaseService {
    if (!KnowledgeBaseService.instance) {
      KnowledgeBaseService.instance = new KnowledgeBaseService();
    }
    return KnowledgeBaseService.instance;
  }

  /**
   * Add knowledge from Discord message
   */
  async addFromDiscordMessage(
    messageId: string,
    content: string,
    channelId: string,
    authorId: string,
    tags: string[] = [],
    confidence: number = 0.8,
    guildId?: string,
  ): Promise<KnowledgeEntry> {
    try {
      if (isLocalDBDisabled()) {
        // In local DB-less mode, just return a synthetic entry without persistence
        const now = new Date();
        const entry: KnowledgeEntry = {
          id: `local_${messageId}`,
          content: this.cleanContent(content),
          source: 'discord_message',
          sourceId: messageId,
          sourceUrl: null,
          channelId,
          authorId,
          tags: tags ? JSON.stringify(tags) : null,
          confidence,
          createdAt: now,
          updatedAt: now,
        };
        logger.debug('KB addFromDiscordMessage (local mode, not persisted)', { messageId });
        return entry;
      }
      const prisma = await getPrisma();
      const entryRaw = await prisma.guildKnowledgeBase.create({
        data: {
          guildId: guildId || 'global',
          content: this.cleanContent(content),
          source: 'discord_message',
          sourceId: messageId,
          sourceUrl: null,
          tags: tags ? JSON.stringify(tags) : null,
          confidence,
          addedBy: authorId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.info('Added knowledge from Discord message', {
        messageId,
        channelId,
        authorId,
        confidence,
      });

      const entry: KnowledgeEntry = {
        id: entryRaw.id,
        content: entryRaw.content,
        source: entryRaw.source,
        sourceId: entryRaw.sourceId || messageId,
        sourceUrl: entryRaw.sourceUrl || null,
        channelId,
        authorId,
        tags: entryRaw.tags || (tags ? JSON.stringify(tags) : null),
        confidence: entryRaw.confidence,
        createdAt: entryRaw.createdAt,
        updatedAt: entryRaw.updatedAt,
      };
      return entry;
    } catch (error) {
      logger.error('Failed to add knowledge from Discord message', error);
      throw error;
    }
  }

  /**
   * Add FAQ entry
   */
  async addFAQ(
    question: string,
    answer: string,
    tags: string[] = [],
    confidence: number = 0.9,
    guildId?: string,
    addedBy?: string,
  ): Promise<KnowledgeEntry> {
    try {
      if (isLocalDBDisabled()) {
        const now = new Date();
        const entry: KnowledgeEntry = {
          id: `local_faq_${Date.now()}`,
          content: this.cleanContent(`Q: ${question}\nA: ${answer}`),
          source: 'faq',
          sourceId: `faq_${Date.now()}`,
          sourceUrl: null,
          channelId: null,
          authorId: addedBy || 'system',
          tags: tags ? JSON.stringify(tags) : null,
          confidence,
          createdAt: now,
          updatedAt: now,
        };
        logger.debug('KB addFAQ (local mode, not persisted)');
        return entry;
      }
      const prisma = await getPrisma();
      const content = `Q: ${question}\nA: ${answer}`;
      const entryRaw = await prisma.guildKnowledgeBase.create({
        data: {
          guildId: guildId || 'global',
          content: this.cleanContent(content),
          source: 'faq',
          sourceId: `faq_${Date.now()}`,
          sourceUrl: null,
          tags: tags ? JSON.stringify(tags) : null,
          confidence,
          addedBy: addedBy || 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.info('Added FAQ to knowledge base', { question, confidence });
      const entry: KnowledgeEntry = {
        id: entryRaw.id,
        content: entryRaw.content,
        source: entryRaw.source,
        sourceId: entryRaw.sourceId || '',
        sourceUrl: entryRaw.sourceUrl || null,
        channelId: null,
        authorId: entryRaw.addedBy || null,
        tags: entryRaw.tags || (tags ? JSON.stringify(tags) : null),
        confidence: entryRaw.confidence,
        createdAt: entryRaw.createdAt,
        updatedAt: entryRaw.updatedAt,
      };
      return entry;
    } catch (error) {
      logger.error('Failed to add FAQ', error);
      throw error;
    }
  }

  /**
   * Search knowledge base for relevant information
   */
  async search(query: KnowledgeQuery): Promise<KnowledgeEntry[]> {
    try {
      if (isLocalDBDisabled()) {
        logger.debug('KB search skipped (local DB disabled)', { q: query.query });
        return [];
      }
      const {
        query: searchQuery,
        channelId,
        guildId,
        tags,
        minConfidence = 0.5,
        limit = 5,
      } = query;
      const rerankProvider = (process.env.RERANK_PROVIDER || 'auto').toLowerCase(); // 'cohere' | 'voyage' | 'local' | 'auto'

      // Vector-first search using pgvector if enabled
      if (features.pgvector && process.env.OPENAI_API_KEY) {
        try {
          const OpenAI = (await import('openai')).default;
          const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const emb = await client.embeddings.create({
            model: 'text-embedding-3-small',
            input: searchQuery,
          });
          const qvec = emb.data?.[0]?.embedding;
          if (qvec && (await pgvectorRepository.init())) {
            const filter: any = {};
            if (guildId) filter.guildId = guildId;
            const results = await pgvectorRepository.search({
              vector: qvec,
              topK: limit * 3,
              filter,
            });
            if (results.length > 0) {
              const mapped = results.map(
                (r) =>
                  ({
                    id: r.id,
                    content: r.content,
                    source: 'kb_vector',
                    sourceId: r.id,
                    sourceUrl: null,
                    channelId: null,
                    authorId: null,
                    tags: null,
                    confidence: Math.max(
                      minConfidence,
                      Math.min(0.99, (r as any).similarity ?? (r as any).score ?? 0),
                    ),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  }) as any,
              );
              const heuristic = reRankEntries(mapped, limit) as KnowledgeEntry[];
              if (rerankProvider === 'cohere') {
                const co = (await cohereRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
                if (co && co.length) return co;
                const vo = (await voyageRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
                if (vo && vo.length) return vo;
                const lo = (await localRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
                return lo && lo.length ? lo : heuristic;
              } else if (rerankProvider === 'voyage') {
                const vo = (await voyageRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
                if (vo && vo.length) return vo;
                const co = (await cohereRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
                if (co && co.length) return co;
                const lo = (await localRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
                return lo && lo.length ? lo : heuristic;
              } else if (rerankProvider === 'local') {
                const lo = (await localRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
                if (lo && lo.length) return lo;
                const co = (await cohereRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
                if (co && co.length) return co;
                const vo = (await voyageRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
                return vo && vo.length ? vo : heuristic;
              } else {
                const co = (await cohereRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
                if (co && co.length) return co;
                const vo = (await voyageRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
                if (vo && vo.length) return vo;
                const lo = (await localRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
                return lo && lo.length ? lo : heuristic;
              }
            }
          }
        } catch (e) {
          logger.debug('pgvector search failed, falling back', { error: String(e) });
        }
      }

      // Attempt vector retrieval via KBChunk if embeddings exist
      try {
        const prisma = await getPrisma();
        const chunks = await prisma.kBChunk.findMany({ take: 200 });
        if (chunks && chunks.length > 0 && process.env.OPENAI_API_KEY) {
          const OpenAI = (await import('openai')).default;
          const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const emb = await client.embeddings.create({
            model: 'text-embedding-3-small',
            input: searchQuery,
          });
          const qvec = emb.data?.[0]?.embedding;
          if (qvec) {
            const q = new Float32Array(qvec);
            const scored = (
              chunks as Array<{
                id: string;
                content: string;
                embedding: Buffer | null;
                sourceId: string;
                createdAt: Date;
              }>
            )
              .map((c) => {
                const vec = c.embedding
                  ? new Float32Array(Buffer.from(c.embedding).buffer)
                  : new Float32Array();
                return { chunk: c, score: vec.length ? cosineSim(q, vec) : 0 };
              })
              .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
              .slice(0, limit * 3);
            const mapped = scored.map(
              (s: { chunk: any; score: number }) =>
                ({
                  id: s.chunk.id,
                  content: s.chunk.content,
                  source: 'kb_chunk',
                  sourceId: s.chunk.sourceId,
                  sourceUrl: null,
                  channelId: null,
                  authorId: null,
                  tags: null,
                  confidence: Math.max(minConfidence, Math.min(0.99, s.score)),
                  createdAt: s.chunk.createdAt,
                  updatedAt: s.chunk.createdAt,
                }) as any,
            );
            const heuristic = reRankEntries(mapped, limit) as KnowledgeEntry[];
            if (rerankProvider === 'cohere') {
              const co = (await cohereRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
              if (co && co.length) return co;
              const vo = (await voyageRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
              if (vo && vo.length) return vo;
              const lo = (await localRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
              return lo && lo.length ? lo : heuristic;
            } else if (rerankProvider === 'voyage') {
              const vo = (await voyageRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
              if (vo && vo.length) return vo;
              const co = (await cohereRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
              if (co && co.length) return co;
              const lo = (await localRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
              return lo && lo.length ? lo : heuristic;
            } else if (rerankProvider === 'local') {
              const lo = (await localRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
              if (lo && lo.length) return lo;
              const co = (await cohereRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
              if (co && co.length) return co;
              const vo = (await voyageRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
              return vo && vo.length ? vo : heuristic;
            } else {
              const co = (await cohereRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
              if (co && co.length) return co;
              const vo = (await voyageRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
              if (vo && vo.length) return vo;
              const lo = (await localRerank(searchQuery, mapped, limit)) as KnowledgeEntry[];
              return lo && lo.length ? lo : heuristic;
            }
          }
        }
      } catch {}

      // Fallback to keyword-based search using GuildKnowledgeBase model
      const whereClause: Record<string, unknown> = {
        confidence: { gte: minConfidence },
      };
      if (guildId) (whereClause as any).guildId = guildId;

      const prisma = await getPrisma();
      const rawEntries = await prisma.guildKnowledgeBase.findMany({
        where: whereClause,
        orderBy: [{ confidence: 'desc' }, { updatedAt: 'desc' }],
        take: limit * 5,
      });

      const entries: KnowledgeEntry[] = (rawEntries as any[]).map((e) => ({
        id: e.id,
        content: e.content,
        source: e.source,
        sourceId: e.sourceId || '',
        sourceUrl: e.sourceUrl || null,
        channelId: null,
        authorId: e.addedBy || null,
        tags: e.tags || null,
        confidence: e.confidence,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      }));

      const relevantEntries = entries
        .map((entry) => ({ entry, score: this.calculateRelevance(searchQuery, entry.content) }))
        .filter((e) => e.score > 0.2)
        .sort((a, b) => b.score - a.score)
        .map((e) => e.entry);

      let reranked = reRankEntries(relevantEntries, limit) as KnowledgeEntry[];
      try {
        if (rerankProvider === 'cohere') {
          const co = (await cohereRerank(searchQuery, relevantEntries, limit)) as KnowledgeEntry[];
          if (co && co.length) reranked = co as KnowledgeEntry[];
          else {
            const vo = (await voyageRerank(
              searchQuery,
              relevantEntries,
              limit,
            )) as KnowledgeEntry[];
            if (vo && vo.length) reranked = vo as KnowledgeEntry[];
            else {
              const lo = (await localRerank(
                searchQuery,
                relevantEntries,
                limit,
              )) as KnowledgeEntry[];
              if (lo && lo.length) reranked = lo as KnowledgeEntry[];
            }
          }
        } else if (rerankProvider === 'voyage') {
          const vo = (await voyageRerank(searchQuery, relevantEntries, limit)) as KnowledgeEntry[];
          if (vo && vo.length) reranked = vo as KnowledgeEntry[];
          else {
            const co = (await cohereRerank(
              searchQuery,
              relevantEntries,
              limit,
            )) as KnowledgeEntry[];
            if (co && co.length) reranked = co as KnowledgeEntry[];
            else {
              const lo = (await localRerank(
                searchQuery,
                relevantEntries,
                limit,
              )) as KnowledgeEntry[];
              if (lo && lo.length) reranked = lo as KnowledgeEntry[];
            }
          }
        } else if (rerankProvider === 'local') {
          const lo = (await localRerank(searchQuery, relevantEntries, limit)) as KnowledgeEntry[];
          if (lo && lo.length) reranked = lo as KnowledgeEntry[];
          else {
            const co = (await cohereRerank(
              searchQuery,
              relevantEntries,
              limit,
            )) as KnowledgeEntry[];
            if (co && co.length) reranked = co as KnowledgeEntry[];
            else {
              const vo = (await voyageRerank(
                searchQuery,
                relevantEntries,
                limit,
              )) as KnowledgeEntry[];
              if (vo && vo.length) reranked = vo as KnowledgeEntry[];
            }
          }
        } else {
          const co = (await cohereRerank(searchQuery, relevantEntries, limit)) as KnowledgeEntry[];
          if (co && co.length) reranked = co as KnowledgeEntry[];
          else {
            const vo = (await voyageRerank(
              searchQuery,
              relevantEntries,
              limit,
            )) as KnowledgeEntry[];
            if (vo && vo.length) reranked = vo as KnowledgeEntry[];
            else {
              const lo = (await localRerank(
                searchQuery,
                relevantEntries,
                limit,
              )) as KnowledgeEntry[];
              if (lo && lo.length) reranked = lo as KnowledgeEntry[];
            }
          }
        }
      } catch {}

      logger.info('Knowledge base search completed', {
        query: searchQuery,
        results: reranked.length,
        totalSearched: entries.length,
      });

      return reranked;
    } catch (error) {
      logger.error('Failed to search knowledge base', error);
      return [];
    }
  }

  /**
   * Check if we have grounded knowledge for a query
   */
  async hasGroundedKnowledge(query: string, minConfidence: number = 0.6): Promise<boolean> {
    const results = await this.search({
      query,
      minConfidence,
      limit: 1,
    });
    return results.length > 0;
  }

  /**
   * Get best matching knowledge for a query
   */
  async getBestMatch(query: string, channelId?: string): Promise<KnowledgeEntry | null> {
    const results = await this.search({
      query,
      channelId,
      minConfidence: 0.6,
      limit: 1,
    });
    return results[0] || null;
  }

  /**
   * Update confidence score for an entry
   */
  async updateConfidence(entryId: string, newConfidence: number): Promise<void> {
    try {
      if (isLocalDBDisabled()) {
        logger.debug('KB updateConfidence skipped (local DB disabled)', { entryId });
        return;
      }
      const prisma = await getPrisma();
      await prisma.guildKnowledgeBase.update({
        where: { id: entryId },
        data: {
          confidence: Math.max(0, Math.min(1, newConfidence)),
          updatedAt: new Date(),
        },
      });

      logger.info('Updated knowledge entry confidence', { entryId, newConfidence });
    } catch (error) {
      logger.error('Failed to update confidence', error);
    }
  }

  /**
   * Delete knowledge entry
   */
  async deleteEntry(entryId: string): Promise<void> {
    try {
      if (isLocalDBDisabled()) {
        logger.debug('KB deleteEntry skipped (local DB disabled)', { entryId });
        return;
      }
      const prisma = await getPrisma();
      await prisma.guildKnowledgeBase.delete({
        where: { id: entryId },
      });

      logger.info('Deleted knowledge entry', { entryId });
    } catch (error) {
      logger.error('Failed to delete knowledge entry', error);
    }
  }

  /**
   * Get statistics about knowledge base
   */
  async getStats(): Promise<{
    totalEntries: number;
    bySource: Record<string, number>;
    averageConfidence: number;
    recentAdditions: number;
  }> {
    try {
      if (isLocalDBDisabled()) {
        return {
          totalEntries: 0,
          bySource: {},
          averageConfidence: 0,
          recentAdditions: 0,
        };
      }
      const prisma = await getPrisma();
      const totalEntries = await prisma.guildKnowledgeBase.count();
      const avgConfidence = await prisma.guildKnowledgeBase.aggregate({
        _avg: { confidence: true },
      });

      const bySource = await prisma.guildKnowledgeBase.groupBy({
        by: ['source'],
        _count: { source: true },
      });

      const recentAdditions = await prisma.guildKnowledgeBase.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      });

      return {
        totalEntries,
        bySource: bySource.reduce(
          (acc: Record<string, number>, item: { source: string; _count: { source: number } }) => {
            acc[item.source] = item._count.source;
            return acc;
          },
          {},
        ),
        averageConfidence: avgConfidence._avg.confidence || 0,
        recentAdditions,
      };
    } catch (error) {
      logger.error('Failed to get knowledge base stats', error);
      return {
        totalEntries: 0,
        bySource: {},
        averageConfidence: 0,
        recentAdditions: 0,
      };
    }
  }

  /**
   * Clean content for storage
   */
  private cleanContent(content: string): string {
    return content.trim().replace(/\s+/g, ' ').substring(0, 2000); // Limit length
  }

  /**
   * Calculate relevance between query and content (simple implementation)
   */
  private calculateRelevance(query: string, content: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);

    const matches = queryWords.filter((word) =>
      contentWords.some((contentWord) => contentWord.includes(word)),
    );

    return matches.length / queryWords.length;
  }
}

// Export singleton instance
export const knowledgeBaseService = KnowledgeBaseService.getInstance();
