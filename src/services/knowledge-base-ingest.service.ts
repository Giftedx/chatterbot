import { prisma } from '../db/prisma.js';
import { knowledgeBaseEmbeddingsService } from './knowledge-base-embeddings.service.js';

function chunkText(text: string, opts?: { chunkSize?: number; overlap?: number }): string[] {
  const chunkSize = opts?.chunkSize ?? 1200; // ~800-1000 tokens
  const overlap = opts?.overlap ?? 200;
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(text.length, i + chunkSize);
    const chunk = text.slice(i, end).trim();
    if (chunk.length > 0) chunks.push(chunk);
    i = end - overlap;
    if (i < 0) i = 0;
    if (i >= text.length) break;
  }
  return chunks;
}

export class KnowledgeBaseIngestService {
  async addSource(guildId: string, title: string, content: string, url?: string): Promise<string> {
    const checksum = this.simpleChecksum(content);
    const src = await prisma.kBSource.upsert({
      where: { checksum },
      update: { title, url },
      create: { guildId, title, url: url || null, checksum }
    } as any);

    const chunks = chunkText(content);

    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];
      const section = `${title}#${index + 1}`;
      const created = await prisma.kBChunk.create({ data: { sourceId: src.id, content: chunk, section } });
      await knowledgeBaseEmbeddingsService.embedAndStoreChunk(src.id, chunk, section, guildId);
    }

    return src.id as any;
  }

  private simpleChecksum(text: string): string {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = ((h << 5) - h + text.charCodeAt(i)) | 0;
    return `cs_${Math.abs(h)}`;
  }
}

export const knowledgeBaseIngestService = new KnowledgeBaseIngestService();