import { prisma } from '../db/prisma.js';
import { knowledgeBaseEmbeddingsService } from './knowledge-base-embeddings.service.js';

export class KnowledgeBaseIngestService {
  async addSource(guildId: string, title: string, content: string, url?: string): Promise<string> {
    const checksum = this.simpleChecksum(content);
    const src = await prisma.kBSource.upsert({
      where: { checksum },
      update: { title, url },
      create: { guildId, title, url: url || null, checksum }
    } as any);
    // Chunk naive: single chunk; extend with real chunking as needed
    await prisma.kBChunk.create({ data: { sourceId: src.id, content } });
    // Try embedding
    await knowledgeBaseEmbeddingsService.embedAndStoreChunk(src.id, content);
    return src.id as any;
  }

  private simpleChecksum(text: string): string {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = ((h << 5) - h + text.charCodeAt(i)) | 0;
    return `cs_${Math.abs(h)}`;
  }
}

export const knowledgeBaseIngestService = new KnowledgeBaseIngestService();