/**
 * Knowledge Base Service
 * Manages trusted information for zero-hallucination responses
 */

import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';
import { features } from '../config/feature-flags.js';
import { pgvectorRepository } from '../vector/pgvector.repository.js';

function cosineSim(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length && i < b.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

function jaccardSimilarity(a: string, b: string): number {
  const sa = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const sb = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  const intersection = new Set([...sa].filter(x => sb.has(x))).size;
  const union = new Set([...sa, ...sb]).size || 1;
  return intersection / union;
}

function reRankEntries(entries: Array<{ content: string } & Record<string, any>>, limit: number): any[] {
  const selected: any[] = [];
  const threshold = 0.7; // consider near-duplicates above this similarity
  for (const e of entries) {
    const isDuplicate = selected.some(s => jaccardSimilarity(s.content, e.content) >= threshold);
    if (!isDuplicate) selected.push(e);
    if (selected.length >= limit) break;
  }
  return selected;
}

async function cohereRerank(query: string, entries: Array<{ content: string } & Record<string, any>>, limit: number): Promise<any[]> {
  try {
    if (!process.env.COHERE_API_KEY || process.env.FEATURE_RERANK !== 'true') return entries.slice(0, limit);
    const { CohereClient } = await import('cohere-ai');
    const cohere = new CohereClient({ token: process.env.COHERE_API_KEY! });
    const documents = entries.map((e, idx) => ({ id: String(idx), text: e.content }));
    const result = await cohere.rerank({ model: 'rerank-english-v3.0', query, documents });
    const ranked = result.results
      .sort((a: any, b: any) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
      .slice(0, limit)
      .map((r: any) => entries[Number(r.document?.id ?? r.index)]);
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
    confidence: number = 0.8
  ): Promise<KnowledgeEntry> {
    try {
      const entry = await prisma.knowledgeEntry.create({
        data: {
          content: this.cleanContent(content),
          source: 'discord_message',
          sourceId: messageId,
          channelId,
          authorId,
          tags: tags ? JSON.stringify(tags) : null,
          confidence,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      logger.info('Added knowledge from Discord message', {
        messageId,
        channelId,
        authorId,
        confidence
      });

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
    confidence: number = 0.9
  ): Promise<KnowledgeEntry> {
    try {
      const content = `Q: ${question}\nA: ${answer}`;
      
      const entry = await prisma.knowledgeEntry.create({
        data: {
          content: this.cleanContent(content),
          source: 'faq',
          sourceId: `faq_${Date.now()}`,
          tags: tags ? JSON.stringify(tags) : null,
          confidence,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      logger.info('Added FAQ to knowledge base', { question, confidence });
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
      const { query: searchQuery, channelId, guildId, tags, minConfidence = 0.5, limit = 5 } = query;

      // Vector-first search using pgvector if enabled
      if (features.pgvector && process.env.OPENAI_API_KEY) {
        try {
          const OpenAI = (await import('openai')).default;
          const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const emb = await client.embeddings.create({ model: 'text-embedding-3-small', input: searchQuery });
          const qvec = emb.data?.[0]?.embedding;
          if (qvec && (await pgvectorRepository.init())) {
            const filter: any = {};
            if (guildId) filter.guildId = guildId;
            const results = await pgvectorRepository.search({ vector: qvec, topK: limit * 3, filter });
            if (results.length > 0) {
              const mapped = results.map(r => ({
                id: r.id,
                content: r.content,
                source: 'kb_vector',
                sourceId: r.id,
                sourceUrl: null,
                channelId: null,
                authorId: null,
                tags: null,
                confidence: Math.max(minConfidence, Math.min(0.99, r.score)),
                createdAt: new Date(),
                updatedAt: new Date()
              } as any));
              const heuristic = reRankEntries(mapped, limit) as KnowledgeEntry[];
              const reranked = await cohereRerank(searchQuery, mapped, limit) as KnowledgeEntry[];
              return reranked && reranked.length ? reranked : heuristic;
            }
          }
        } catch (e) {
          logger.debug('pgvector search failed, falling back', { error: String(e) });
        }
      }

      // Attempt vector retrieval via KBChunk if embeddings exist
      try {
        const chunks = await prisma.kBChunk.findMany({ take: 200 });
        if (chunks && chunks.length > 0 && process.env.OPENAI_API_KEY) {
          const OpenAI = (await import('openai')).default;
          const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const emb = await client.embeddings.create({ model: 'text-embedding-3-small', input: searchQuery });
          const qvec = emb.data?.[0]?.embedding;
          if (qvec) {
            const q = new Float32Array(qvec);
            const scored = (chunks as Array<{ id: string; content: string; embedding: Buffer | null; sourceId: string; createdAt: Date }>).
              map((c) => {
                const vec = c.embedding ? new Float32Array(Buffer.from(c.embedding).buffer) : new Float32Array();
                return { chunk: c, score: vec.length ? cosineSim(q, vec) : 0 };
              }).sort((a: { score: number }, b: { score: number }) => b.score - a.score).slice(0, limit * 3);
            const mapped = scored.map((s: { chunk: any; score: number }) => ({
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
              updatedAt: s.chunk.createdAt
            } as any));
            const heuristic = reRankEntries(mapped, limit) as KnowledgeEntry[];
            const reranked = await cohereRerank(searchQuery, mapped, limit) as KnowledgeEntry[];
            return reranked && reranked.length ? reranked : heuristic;
          }
        }
      } catch {}

      // Fallback to keyword-based search
      const whereClause: Record<string, unknown> = {
        confidence: { gte: minConfidence }
      };
      if (channelId) whereClause.channelId = channelId;

      const entries = await prisma.knowledgeEntry.findMany({
        where: whereClause,
        orderBy: [ { confidence: 'desc' }, { updatedAt: 'desc' } ],
        take: limit * 5
      });

      const relevantEntries = (entries as KnowledgeEntry[])
        .map((entry) => ({ entry, score: this.calculateRelevance(searchQuery, entry.content) }))
        .filter((e) => e.score > 0.2)
        .sort((a, b) => b.score - a.score)
        .map((e) => e.entry);

      let reranked = reRankEntries(relevantEntries, limit) as KnowledgeEntry[];
      try {
        const re = await cohereRerank(searchQuery, relevantEntries, limit) as KnowledgeEntry[];
        if (re && re.length) reranked = re as KnowledgeEntry[];
      } catch {}

      logger.info('Knowledge base search completed', {
        query: searchQuery,
        results: reranked.length,
        totalSearched: entries.length
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
      limit: 1
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
      limit: 1
    });
    return results[0] || null;
  }

  /**
   * Update confidence score for an entry
   */
  async updateConfidence(entryId: string, newConfidence: number): Promise<void> {
    try {
      await prisma.knowledgeEntry.update({
        where: { id: entryId },
        data: {
          confidence: Math.max(0, Math.min(1, newConfidence)),
          updatedAt: new Date()
        }
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
      await prisma.knowledgeEntry.delete({
        where: { id: entryId }
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
      const totalEntries = await prisma.knowledgeEntry.count();
      const avgConfidence = await prisma.knowledgeEntry.aggregate({
        _avg: { confidence: true }
      });

      const bySource = await prisma.knowledgeEntry.groupBy({
        by: ['source'],
        _count: { source: true }
      });

      const recentAdditions = await prisma.knowledgeEntry.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      });

      return {
        totalEntries,
        bySource: bySource.reduce((acc: Record<string, number>, item: { source: string; _count: { source: number } }) => {
          acc[item.source] = item._count.source;
          return acc;
        }, {}),
        averageConfidence: avgConfidence._avg.confidence || 0,
        recentAdditions
      };
    } catch (error) {
      logger.error('Failed to get knowledge base stats', error);
      return {
        totalEntries: 0,
        bySource: {},
        averageConfidence: 0,
        recentAdditions: 0
      };
    }
  }

  /**
   * Clean content for storage
   */
  private cleanContent(content: string): string {
    return content
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 2000); // Limit length
  }

  /**
   * Calculate relevance between query and content (simple implementation)
   */
  private calculateRelevance(query: string, content: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    const matches = queryWords.filter(word => 
      contentWords.some(contentWord => contentWord.includes(word))
    );
    
    return matches.length / queryWords.length;
  }
}

// Export singleton instance
export const knowledgeBaseService = KnowledgeBaseService.getInstance(); 