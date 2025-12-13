import { prisma } from '../db/prisma.js';
import OpenAI from 'openai';
import { features } from '../config/feature-flags.js';
import { pgvectorRepository } from '../vector/pgvector.repository.js';
import { logger } from '../utils/logger.js';

export class KnowledgeBaseEmbeddingsService {
  private client: OpenAI | null = null;
  private model: string = 'text-embedding-3-small';

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  /**
   * Generates a vector embedding for the given text
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.client) {
      logger.debug('OpenAI client not initialized in KnowledgeBaseEmbeddingsService');
      return null;
    }

    try {
      const res = await this.client.embeddings.create({
        model: this.model,
        input: text.replace(/\n/g, ' ')
      });
      return res.data?.[0]?.embedding || null;
    } catch (error) {
      logger.error('Failed to generate embedding', { error });
      return null;
    }
  }

  async embedAndStoreChunk(sourceId: string, content: string, section?: string, guildId?: string): Promise<void> {
    const vector = await this.generateEmbedding(content);
    if (!vector) return;

    const arr = new Float32Array(vector);
    const buf = Buffer.from(arr.buffer);

    try {
      const created = await prisma.kBChunk.create({
        data: {
          sourceId,
          content,
          section: section || null,
          embedding: buf
        } as any
      });

      if (features.pgvector) {
        try {
          await pgvectorRepository.upsert({
            id: created.id,
            content,
            embedding: vector,
            guildId,
            metadata: { sourceId, section: section || null }
          });
        } catch (err) {
          logger.warn('Failed to upsert to pgvector', { error: err });
        }
      }
    } catch (error) {
      logger.error('Failed to store embedding chunk', { error });
    }
  }
}

export const knowledgeBaseEmbeddingsService = new KnowledgeBaseEmbeddingsService();
