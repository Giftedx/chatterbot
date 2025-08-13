import { features } from '../config/feature-flags.js';

export interface VectorRecord {
  id: string;
  userId?: string;
  guildId?: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export interface VectorSearchParams {
  vector: number[];
  topK: number;
  filter?: { userId?: string; guildId?: string };
}

interface PgClient {
  connect(): Promise<void>;
  query(text: string, params?: unknown[]): Promise<{ rows: unknown[] } | any>;
  end(): Promise<void>;
}

export class PgvectorRepository {
  private initialized = false;
  private client: PgClient | null = null;

  async init(): Promise<boolean> {
    if (this.initialized) return true;
    if (!features.pgvector) return false;
    try {
      const pg = await import('pg');
      const Client = (pg as any).Client || (pg as any).default?.Client;
      this.client = new Client({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });
      if (this.client && typeof (this.client as any).connect === 'function') {
        await this.client.connect();
      }
      await this.client!.query('CREATE EXTENSION IF NOT EXISTS vector');
      await this.client!.query(`CREATE TABLE IF NOT EXISTS kb_vectors (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        guild_id TEXT,
        content TEXT NOT NULL,
        embedding vector(1536),
        metadata JSONB
      )`);
      await this.client!.query(`CREATE INDEX IF NOT EXISTS kb_vectors_embedding_idx ON kb_vectors USING ivfflat (embedding vector_l2_ops)`);
      this.initialized = true;
      return true;
    } catch (err) {
      return false;
    }
  }

  async upsert(record: VectorRecord): Promise<void> {
    if (!(await this.init())) return;
    await this.client!.query(
      `INSERT INTO kb_vectors (id, user_id, guild_id, content, embedding, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         guild_id = EXCLUDED.guild_id,
         content = EXCLUDED.content,
         embedding = EXCLUDED.embedding,
         metadata = EXCLUDED.metadata`,
      [record.id, record.userId || null, record.guildId || null, record.content, record.embedding, JSON.stringify(record.metadata || {})]
    );
  }

  async search(params: VectorSearchParams): Promise<Array<{ id: string; content: string; score: number }>> {
    if (!(await this.init())) return [];
    const { vector, topK, filter } = params;
    const where: string[] = [];
    const args: any[] = [vector];
    if (filter?.userId) { where.push(`user_id = $${args.length + 1}`); args.push(filter.userId); }
    if (filter?.guildId) { where.push(`guild_id = $${args.length + 1}`); args.push(filter.guildId); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const res = await this.client!.query(
      `SELECT id, content, 1 - (embedding <=> $1) AS score
       FROM kb_vectors
       ${whereSql}
       ORDER BY embedding <-> $1
       LIMIT ${topK}`,
      args
    );
    return (res.rows as any[]).map((r: any) => ({ id: r.id, content: r.content, score: Number(r.score) }));
  }
}

export const pgvectorRepository = new PgvectorRepository();