import { prisma } from '../db/prisma.js';
import OpenAI from 'openai';
import { features } from '../config/feature-flags.js';
import { pgvectorRepository } from '../vector/pgvector.repository.js';

export class KnowledgeBaseEmbeddingsService {
  private client: OpenAI | null = null;
  private model: string = 'text-embedding-3-small';

  constructor() {
    if (process.env.OPENAI_API_KEY) this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.client) return null;
    try {
      const res = await this.client.embeddings.create({ model: this.model, input: text });
      return res.data?.[0]?.embedding || null;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      return null;
    }
  }

  async embedAndStoreChunk(sourceId: string, content: string, section?: string, guildId?: string): Promise<void> {
    if (!this.client) return;
    const res = await this.client.embeddings.create({ model: this.model, input: content });
    const vector = res.data?.[0]?.embedding;
    if (!vector) return;

    const arr = new Float32Array(vector);
    const buf = Buffer.from(arr.buffer);
    const created = await prisma.kBChunk.create({ data: { sourceId, content, section: section || null, embedding: buf } as any });

    if (features.pgvector) {
      try {
        await pgvectorRepository.upsert({
          id: created.id,
          content,
          embedding: vector,
          guildId,
          metadata: { sourceId, section: section || null }
        });
      } catch {}
    }
  }
}

export const knowledgeBaseEmbeddingsService = new KnowledgeBaseEmbeddingsService();