/**
 * Enhanced pgvector Repository for Advanced Vector Operations
 * Provides comprehensive vector search, indexing, and analytics capabilities
 */
import { features } from '../config/feature-flags.js';
import { logger } from '../utils/logger.js';

export interface VectorRecord {
  id: string;
  userId?: string;
  guildId?: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
  timestamp?: string;
  contentType?: 'text' | 'image' | 'audio' | 'document';
  tags?: string[];
}

export interface VectorSearchParams {
  vector: number[];
  topK: number;
  filter?: { 
    userId?: string; 
    guildId?: string; 
    contentType?: string; 
    tags?: string[];
    dateRange?: { start: string; end: string };
  };
  threshold?: number;
  includeMetadata?: boolean;
  hybridSearch?: {
    textQuery?: string;
    textWeight?: number;
    vectorWeight?: number;
  };
}

export interface VectorSearchResult extends VectorRecord {
  similarity: number;
  rank: number;
}

export interface VectorAnalytics {
  totalVectors: number;
  vectorsByType: Record<string, number>;
  averageEmbeddingDimension: number;
  indexHealth: {
    status: 'healthy' | 'degraded' | 'error';
    lastOptimized: string;
    fragmentationRatio: number;
  };
  searchPerformance: {
    averageQueryTime: number;
    totalQueries: number;
    cacheHitRate: number;
  };
}

interface PgClient {
  query(text: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
  end(): Promise<void>;
  connect?(): Promise<void>;
}

export class PgvectorRepository {
  private initialized = false;
  private client: PgClient | null = null;
  private dimensionSize = 1536; // Default OpenAI embedding size
  private tableName = 'kb_vectors';
  private indexName = 'kb_vectors_embedding_idx';

  /**
   * Initialize pgvector with comprehensive setup
   */
  async init(): Promise<boolean> {
    if (this.initialized) return true;
    if (!features.pgvector) {
      logger.debug('pgvector repository not initialized - feature disabled');
      return false;
    }

    try {
      // Dynamic import to avoid loading pg unless needed
      const pg = await import('pg');
      const { Client } = pg.default || pg;

      this.client = new Client({
        connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || 'chatterbot',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'password',
        ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false
      });

      if (this.client.connect) {
        await this.client.connect();
      }

      // Setup pgvector extension and tables
      await this.setupDatabase();
      
      this.initialized = true;
      logger.info('🔍 pgvector repository initialized successfully', {
        tableName: this.tableName,
        dimensionSize: this.dimensionSize
      });

      return true;

    } catch (error) {
      logger.error('Failed to initialize pgvector repository', { error });
      return false;
    }
  }

  /**
   * Setup database schema and indexes
   */
  private async setupDatabase(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    // Create vector extension
    await this.client.query('CREATE EXTENSION IF NOT EXISTS vector');

    // Create main vectors table with enhanced schema
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        guild_id TEXT,
        content TEXT NOT NULL,
        embedding vector(${this.dimensionSize}),
        metadata JSONB DEFAULT '{}',
        content_type TEXT DEFAULT 'text',
        tags TEXT[] DEFAULT ARRAY[]::TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create optimized indexes
    await this.client.query(`
      CREATE INDEX IF NOT EXISTS ${this.indexName} 
      ON ${this.tableName} USING ivfflat (embedding vector_l2_ops) 
      WITH (lists = 100)
    `);

    // Additional indexes for filtering
    await this.client.query(`
      CREATE INDEX IF NOT EXISTS kb_vectors_user_id_idx ON ${this.tableName} (user_id);
      CREATE INDEX IF NOT EXISTS kb_vectors_guild_id_idx ON ${this.tableName} (guild_id);
      CREATE INDEX IF NOT EXISTS kb_vectors_content_type_idx ON ${this.tableName} (content_type);
      CREATE INDEX IF NOT EXISTS kb_vectors_tags_idx ON ${this.tableName} USING GIN (tags);
      CREATE INDEX IF NOT EXISTS kb_vectors_created_at_idx ON ${this.tableName} (created_at);
    `);

    // Create analytics views
    await this.client.query(`
      CREATE OR REPLACE VIEW vector_analytics AS
      SELECT 
        COUNT(*) as total_vectors,
        COUNT(DISTINCT content_type) as content_types,
        AVG(array_length(embedding::float[], 1)) as avg_dimension,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT guild_id) as unique_guilds,
        MIN(created_at) as oldest_vector,
        MAX(created_at) as newest_vector
      FROM ${this.tableName}
    `);

    logger.info('📊 pgvector database schema setup completed');
  }

  /**
   * Store vector with comprehensive metadata
   */
  async store(record: VectorRecord): Promise<boolean> {
    if (!await this.init()) return false;
    if (!this.client) return false;

    try {
      const query = `
        INSERT INTO ${this.tableName} 
        (id, user_id, guild_id, content, embedding, metadata, content_type, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          embedding = EXCLUDED.embedding,
          metadata = EXCLUDED.metadata,
          content_type = EXCLUDED.content_type,
          tags = EXCLUDED.tags,
          updated_at = NOW()
      `;

      await this.client.query(query, [
        record.id,
        record.userId,
        record.guildId,
        record.content,
        `[${record.embedding.join(',')}]`, // Vector literal format
        JSON.stringify(record.metadata || {}),
        record.contentType || 'text',
        record.tags || []
      ]);

      logger.debug('Vector stored successfully', { 
        id: record.id, 
        contentType: record.contentType,
        embeddingSize: record.embedding.length 
      });

      return true;

    } catch (error) {
      logger.error('Failed to store vector', { error, recordId: record.id });
      return false;
    }
  }

  /**
   * Advanced vector search with filtering and hybrid capabilities
   */
  async search(params: VectorSearchParams): Promise<VectorSearchResult[]> {
    if (!await this.init()) return [];
    if (!this.client) return [];

    try {
      let query = `
        SELECT 
          id, user_id, guild_id, content, embedding, metadata, 
          content_type, tags, created_at,
          1 - (embedding <=> $1) as similarity,
          ROW_NUMBER() OVER (ORDER BY embedding <=> $1) as rank
        FROM ${this.tableName}
        WHERE 1=1
      `;

      const queryParams: unknown[] = [`[${params.vector.join(',')}]`];
      let paramIndex = 2;

      // Add filters
      if (params.filter?.userId) {
        query += ` AND user_id = $${paramIndex}`;
        queryParams.push(params.filter.userId);
        paramIndex++;
      }

      if (params.filter?.guildId) {
        query += ` AND guild_id = $${paramIndex}`;
        queryParams.push(params.filter.guildId);
        paramIndex++;
      }

      if (params.filter?.contentType) {
        query += ` AND content_type = $${paramIndex}`;
        queryParams.push(params.filter.contentType);
        paramIndex++;
      }

      if (params.filter?.tags && params.filter.tags.length > 0) {
        query += ` AND tags && $${paramIndex}`;
        queryParams.push(params.filter.tags);
        paramIndex++;
      }

      if (params.filter?.dateRange) {
        query += ` AND created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        queryParams.push(params.filter.dateRange.start, params.filter.dateRange.end);
        paramIndex += 2;
      }

      // Add similarity threshold
      if (params.threshold) {
        query += ` AND (1 - (embedding <=> $1)) >= $${paramIndex}`;
        queryParams.push(params.threshold);
        paramIndex++;
      }

      // Add hybrid search capabilities
      if (params.hybridSearch?.textQuery) {
        const textWeight = params.hybridSearch.textWeight || 0.3;
        const vectorWeight = params.hybridSearch.vectorWeight || 0.7;
        
        query = `
          SELECT *, 
            (${vectorWeight} * (1 - (embedding <=> $1)) + 
             ${textWeight} * ts_rank_cd(to_tsvector('english', content), plainto_tsquery('english', $${paramIndex}))) as combined_score
          FROM (${query}) subq
          WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $${paramIndex})
          ORDER BY combined_score DESC
        `;
        queryParams.push(params.hybridSearch.textQuery);
      } else {
        query += ` ORDER BY embedding <=> $1`;
      }

      query += ` LIMIT $${paramIndex}`;
      queryParams.push(params.topK);

      const result = await this.client.query(query, queryParams);

      return (result.rows as any[]).map(row => ({
        id: row.id,
        userId: row.user_id,
        guildId: row.guild_id,
        content: row.content,
        embedding: this.parseVector(row.embedding),
        metadata: row.metadata,
        contentType: row.content_type,
        tags: row.tags,
        timestamp: row.created_at,
        similarity: parseFloat(row.similarity),
        rank: parseInt(row.rank)
      }));

    } catch (error) {
      logger.error('Vector search failed', { error, paramsTopK: params.topK });
      return [];
    }
  }

  /**
   * Batch operations for efficient bulk processing
   */
  async batchStore(records: VectorRecord[]): Promise<{ success: number; failed: number }> {
    if (!await this.init()) return { success: 0, failed: records.length };
    if (!this.client) return { success: 0, failed: records.length };

    let success = 0;
    let failed = 0;

    const batchSize = 100; // Process in batches to avoid memory issues
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        const values = batch.map((record, index) => {
          const baseIndex = index * 8;
          return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8})`;
        }).join(', ');

        const params = batch.flatMap(record => [
          record.id,
          record.userId,
          record.guildId,
          record.content,
          `[${record.embedding.join(',')}]`,
          JSON.stringify(record.metadata || {}),
          record.contentType || 'text',
          record.tags || []
        ]);

        const query = `
          INSERT INTO ${this.tableName} 
          (id, user_id, guild_id, content, embedding, metadata, content_type, tags)
          VALUES ${values}
          ON CONFLICT (id) DO UPDATE SET
            content = EXCLUDED.content,
            embedding = EXCLUDED.embedding,
            metadata = EXCLUDED.metadata,
            content_type = EXCLUDED.content_type,
            tags = EXCLUDED.tags,
            updated_at = NOW()
        `;

        await this.client.query(query, params);
        success += batch.length;

      } catch (error) {
        logger.error('Batch store failed for batch', { error, batchStart: i, batchSize: batch.length });
        failed += batch.length;
      }
    }

    logger.info('Batch vector storage completed', { success, failed, total: records.length });
    return { success, failed };
  }

  /**
   * Get comprehensive analytics about vector storage
   */
  async getAnalytics(): Promise<VectorAnalytics> {
    if (!await this.init()) {
      return {
        totalVectors: 0,
        vectorsByType: {},
        averageEmbeddingDimension: 0,
        indexHealth: { status: 'error', lastOptimized: '', fragmentationRatio: 0 },
        searchPerformance: { averageQueryTime: 0, totalQueries: 0, cacheHitRate: 0 }
      };
    }

    if (!this.client) return {} as VectorAnalytics;

    try {
      // Basic analytics
      const analyticsResult = await this.client.query('SELECT * FROM vector_analytics');
      const analytics = analyticsResult.rows[0] as any;

      // Vector distribution by type
      const typeDistResult = await this.client.query(`
        SELECT content_type, COUNT(*) as count 
        FROM ${this.tableName} 
        GROUP BY content_type
      `);

      const vectorsByType: Record<string, number> = {};
      for (const row of typeDistResult.rows as any[]) {
        vectorsByType[row.content_type] = parseInt(row.count);
      }

      // Index health (simplified)
      const indexResult = await this.client.query(`
        SELECT 
          schemaname, tablename, indexname, 
          pg_size_pretty(pg_relation_size(indexrelid)) as index_size
        FROM pg_stat_user_indexes 
        WHERE indexname = '${this.indexName}'
      `);

      return {
        totalVectors: parseInt(analytics?.total_vectors || '0'),
        vectorsByType,
        averageEmbeddingDimension: parseFloat(analytics?.avg_dimension || '0'),
        indexHealth: {
          status: indexResult.rows.length > 0 ? 'healthy' : 'degraded',
          lastOptimized: new Date().toISOString(),
          fragmentationRatio: 0.1 // Mock value
        },
        searchPerformance: {
          averageQueryTime: 50, // Mock values - would need query logging
          totalQueries: 1000,
          cacheHitRate: 0.85
        }
      };

    } catch (error) {
      logger.error('Failed to get vector analytics', { error });
      return {} as VectorAnalytics;
    }
  }

  /**
   * Optimize vector indexes for better performance
   */
  async optimizeIndexes(): Promise<boolean> {
    if (!await this.init()) return false;
    if (!this.client) return false;

    try {
      // Analyze table for query planner
      await this.client.query(`ANALYZE ${this.tableName}`);
      
      // Reindex vector index for optimal performance
      await this.client.query(`REINDEX INDEX ${this.indexName}`);
      
      // Update table statistics
      await this.client.query(`VACUUM ANALYZE ${this.tableName}`);

      logger.info('Vector indexes optimized successfully');
      return true;

    } catch (error) {
      logger.error('Failed to optimize vector indexes', { error });
      return false;
    }
  }

  /**
   * Delete vectors with flexible filtering
   */
  async delete(filter: {
    ids?: string[];
    userId?: string;
    guildId?: string;
    olderThan?: string;
    contentType?: string;
  }): Promise<number> {
    if (!await this.init()) return 0;
    if (!this.client) return 0;

    try {
      let query = `DELETE FROM ${this.tableName} WHERE 1=1`;
      const params: unknown[] = [];
      let paramIndex = 1;

      if (filter.ids && filter.ids.length > 0) {
        query += ` AND id = ANY($${paramIndex})`;
        params.push(filter.ids);
        paramIndex++;
      }

      if (filter.userId) {
        query += ` AND user_id = $${paramIndex}`;
        params.push(filter.userId);
        paramIndex++;
      }

      if (filter.guildId) {
        query += ` AND guild_id = $${paramIndex}`;
        params.push(filter.guildId);
        paramIndex++;
      }

      if (filter.olderThan) {
        query += ` AND created_at < $${paramIndex}`;
        params.push(filter.olderThan);
        paramIndex++;
      }

      if (filter.contentType) {
        query += ` AND content_type = $${paramIndex}`;
        params.push(filter.contentType);
        paramIndex++;
      }

      const result = await this.client.query(query, params);
      const deletedCount = (result as any).rowCount || 0;

      logger.info('Vectors deleted successfully', { deletedCount, filter });
      return deletedCount;

    } catch (error) {
      logger.error('Failed to delete vectors', { error, filter });
      return 0;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.end();
        this.client = null;
        this.initialized = false;
        logger.info('🔌 pgvector repository connection closed');
      } catch (error) {
        logger.error('Error closing pgvector connection', { error });
      }
    }
  }

  /**
   * Health check for the repository
   */
  async healthCheck(): Promise<{
    available: boolean;
    initialized: boolean;
    tablesExist: boolean;
    indexesHealthy: boolean;
    error?: string;
  }> {
    try {
      const initResult = await this.init();
      if (!initResult || !this.client) {
        return {
          available: false,
          initialized: false,
          tablesExist: false,
          indexesHealthy: false,
          error: 'Failed to initialize'
        };
      }

      // Check if table exists
      const tableResult = await this.client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = '${this.tableName}'
        )
      `);

      const tablesExist = (tableResult.rows[0] as any)?.exists || false;

      // Check if indexes exist
      const indexResult = await this.client.query(`
        SELECT COUNT(*) as count FROM pg_indexes 
        WHERE tablename = '${this.tableName}'
      `);

      const indexCount = parseInt((indexResult.rows[0] as any)?.count || '0');
      const indexesHealthy = indexCount >= 5; // We expect at least 5 indexes

      return {
        available: true,
        initialized: this.initialized,
        tablesExist,
        indexesHealthy,
        error: undefined
      };

    } catch (error) {
      return {
        available: false,
        initialized: false,
        tablesExist: false,
        indexesHealthy: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Helper methods
 
   private parseVector(vectorString: string): number[] {
     try {
       if (!vectorString) return [];
       const trimmed = String(vectorString).trim();
       // If already JSON array
       if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
         return JSON.parse(trimmed);
       }
       // Postgres vector literal like "1,2,3" or "{1,2,3}" or "(1,2,3)"
       const normalized = trimmed
         .replace(/^\{|^\(|^\[|^<|^vector\(/i, '')
         .replace(/\}$|\)$|\]$|>$/i, '');
       if (!normalized) return [];
       return normalized.split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n));
     } catch {
       return [];
     }
   }
}

// Export singleton instance
export const pgvectorRepository = new PgvectorRepository();