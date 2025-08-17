/**
 * Qdrant Vector Database Service
 * Advanced vector database with collections management, filtering, and metadata support
 * Alternative to pgvector with superior performance and features
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { features } from '../config/feature-flags.js';
import { logger } from '../utils/logger.js';

export interface QdrantDocument {
  id: string | number;
  vector: number[];
  payload: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface QdrantSearchOptions {
  limit?: number;
  offset?: number;
  filter?: Record<string, any>;
  withPayload?: boolean;
  withVector?: boolean;
  scoreThreshold?: number;
}

export interface QdrantCollection {
  name: string;
  vectorSize: number;
  distance: 'Cosine' | 'Euclid' | 'Dot' | 'Manhattan';
  description?: string;
  metadata?: Record<string, any>;
}

export interface QdrantSearchResult {
  id: string | number;
  score: number;
  payload: Record<string, any>;
  vector?: number[];
}

export interface QdrantCollectionStats {
  name: string;
  vectorsCount: number;
  segments: number;
  diskUsage: number;
  ramUsage: number;
  status: string;
}

export class QdrantVectorService {
  private client: QdrantClient | null = null;
  private isEnabled: boolean;
  private isConnected: boolean = false;
  private collections: Map<string, QdrantCollection> = new Map();

  constructor() {
    this.isEnabled = features.qdrantVectorDB;
    
    if (this.isEnabled) {
      this.initializeClient();
    }
  }

  private async initializeClient(): Promise<void> {
    const host = process.env.QDRANT_HOST || 'localhost';
    const port = parseInt(process.env.QDRANT_PORT || '6333');
    const apiKey = process.env.QDRANT_API_KEY;
    const url = process.env.QDRANT_URL;

    try {
      if (url) {
        this.client = new QdrantClient({ url, apiKey });
      } else {
        this.client = new QdrantClient({ host, port, apiKey });
      }

      // Test connection
      await this.client.getCollections();
      this.isConnected = true;
      
      // Load existing collections
      await this.loadExistingCollections();
      
      logger.info('Qdrant vector database service initialized');
    } catch (error) {
      logger.error('Failed to initialize Qdrant client:', error);
      this.isConnected = false;
    }
  }

  private async loadExistingCollections(): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      const response = await this.client.getCollections();
      
      for (const collectionInfo of response.collections) {
        const details = await this.client.getCollection(collectionInfo.name);
        const vectorConfig = details.config.params.vectors as any;
        
        this.collections.set(collectionInfo.name, {
          name: collectionInfo.name,
          vectorSize: typeof vectorConfig === 'object' && 'size' in vectorConfig ? vectorConfig.size : 0,
          distance: typeof vectorConfig === 'object' && 'distance' in vectorConfig ? vectorConfig.distance : 'Cosine',
          description: collectionInfo.name
        });
      }

      logger.info(`Loaded ${this.collections.size} existing Qdrant collections`);
    } catch (error) {
      logger.error('Failed to load existing collections:', error);
    }
  }

  /**
   * Create a new collection with specified configuration
   */
  async createCollection(params: {
    name: string;
    vectorSize: number;
    distance?: 'Cosine' | 'Euclid' | 'Dot' | 'Manhattan';
    onDisk?: boolean;
    replicationFactor?: number;
    writeConsistencyFactor?: number;
    shardNumber?: number;
    metadata?: Record<string, any>;
  }): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      logger.error('Qdrant client not connected');
      return false;
    }

    try {
      const vectorParams: any = {
        size: params.vectorSize,
        distance: params.distance || 'Cosine',
        on_disk: params.onDisk
      };

      await this.client.createCollection(params.name, {
        vectors: vectorParams,
        replication_factor: params.replicationFactor,
        write_consistency_factor: params.writeConsistencyFactor,
        shard_number: params.shardNumber
      });

      const collection: QdrantCollection = {
        name: params.name,
        vectorSize: params.vectorSize,
        distance: params.distance || 'Cosine',
        metadata: params.metadata
      };

      this.collections.set(params.name, collection);
      
      logger.info(`Created Qdrant collection: ${params.name}`);
      return true;

    } catch (error) {
      logger.error(`Failed to create collection ${params.name}:`, error);
      return false;
    }
  }

  /**
   * Delete a collection
   */
  async deleteCollection(collectionName: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      logger.error('Qdrant client not connected');
      return false;
    }

    try {
      await this.client.deleteCollection(collectionName);
      this.collections.delete(collectionName);
      
      logger.info(`Deleted Qdrant collection: ${collectionName}`);
      return true;

    } catch (error) {
      logger.error(`Failed to delete collection ${collectionName}:`, error);
      return false;
    }
  }

  /**
   * Insert or update documents in a collection
   */
  async upsertDocuments(collectionName: string, documents: QdrantDocument[]): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      logger.error('Qdrant client not connected');
      return false;
    }

    if (!this.collections.has(collectionName)) {
      logger.error(`Collection ${collectionName} does not exist`);
      return false;
    }

    try {
      const points = documents.map(doc => ({
        id: doc.id,
        vector: doc.vector,
        payload: {
          ...doc.payload,
          ...(doc.metadata && { metadata: doc.metadata }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }));

      await this.client.upsert(collectionName, {
        wait: true,
        points
      });

      logger.debug(`Upserted ${documents.length} documents to collection ${collectionName}`);
      return true;

    } catch (error) {
      logger.error(`Failed to upsert documents to ${collectionName}:`, error);
      return false;
    }
  }

  /**
   * Search for similar vectors in a collection
   */
  async searchSimilar(
    collectionName: string, 
    queryVector: number[], 
    options: QdrantSearchOptions = {}
  ): Promise<QdrantSearchResult[]> {
    if (!this.client || !this.isConnected) {
      logger.error('Qdrant client not connected');
      return [];
    }

    if (!this.collections.has(collectionName)) {
      logger.error(`Collection ${collectionName} does not exist`);
      return [];
    }

    try {
      const searchRequest: any = {
        vector: queryVector,
        limit: options.limit || 10,
        offset: options.offset || 0,
        with_payload: options.withPayload !== false,
        with_vector: options.withVector || false,
        score_threshold: options.scoreThreshold,
        filter: options.filter
      };

      const response = await this.client.search(collectionName, searchRequest);

      return response.map(point => ({
        id: point.id,
        score: point.score,
        payload: point.payload || {},
        vector: Array.isArray(point.vector) && typeof point.vector[0] === 'number' ? point.vector as number[] : undefined
      }));

    } catch (error) {
      logger.error(`Failed to search in collection ${collectionName}:`, error);
      return [];
    }
  }

  /**
   * Advanced search with hybrid filtering
   */
  async hybridSearch(params: {
    collectionName: string;
    queryVector: number[];
    textQuery?: string;
    filters: {
      must?: Record<string, any>[];
      mustNot?: Record<string, any>[];
      should?: Record<string, any>[];
    };
    limit?: number;
    offset?: number;
    scoreThreshold?: number;
  }): Promise<QdrantSearchResult[]> {
    if (!this.client || !this.isConnected) {
      logger.error('Qdrant client not connected');
      return [];
    }

    try {
      // Build complex filter
      const filter: any = {};
      
      if (params.filters.must && params.filters.must.length > 0) {
        filter.must = params.filters.must;
      }
      
      if (params.filters.mustNot && params.filters.mustNot.length > 0) {
        filter.must_not = params.filters.mustNot;
      }
      
      if (params.filters.should && params.filters.should.length > 0) {
        filter.should = params.filters.should;
      }

      // Add text search if provided
      if (params.textQuery) {
        const textFilter = {
          key: 'content',
          match: { text: params.textQuery }
        };
        
        if (filter.must) {
          filter.must.push(textFilter);
        } else {
          filter.must = [textFilter];
        }
      }

      const searchRequest: any = {
        vector: params.queryVector,
        limit: params.limit || 10,
        offset: params.offset || 0,
        with_payload: true,
        with_vector: false,
        score_threshold: params.scoreThreshold,
        filter: Object.keys(filter).length > 0 ? filter : undefined
      };

      const response = await this.client.search(params.collectionName, searchRequest);

      return response.map(point => ({
        id: point.id,
        score: point.score,
        payload: point.payload || {}
      }));

    } catch (error) {
      logger.error(`Failed to perform hybrid search:`, error);
      return [];
    }
  }

  /**
   * Get collection statistics and health metrics
   */
  async getCollectionStats(collectionName: string): Promise<QdrantCollectionStats | null> {
    if (!this.client || !this.isConnected) {
      logger.error('Qdrant client not connected');
      return null;
    }

    try {
      const info = await this.client.getCollection(collectionName);
      const infoAny = info as any;
      
      return {
        name: collectionName,
        vectorsCount: info.vectors_count || 0,
        segments: info.segments_count || 0,
        diskUsage: infoAny.disk_usage || 0,
        ramUsage: infoAny.ram_usage || 0,
        status: info.status || 'unknown'
      };

    } catch (error) {
      logger.error(`Failed to get stats for collection ${collectionName}:`, error);
      return null;
    }
  }

  /**
   * Create optimized indices for better search performance
   */
  async createPayloadIndex(collectionName: string, fieldName: string, fieldType: 'keyword' | 'integer' | 'float' | 'bool'): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      logger.error('Qdrant client not connected');
      return false;
    }

    try {
      await this.client.createPayloadIndex(collectionName, {
        field_name: fieldName,
        field_schema: fieldType
      });

      logger.info(`Created payload index for field ${fieldName} in collection ${collectionName}`);
      return true;

    } catch (error) {
      logger.error(`Failed to create payload index:`, error);
      return false;
    }
  }

  /**
   * Batch delete documents by IDs or filter
   */
  async deleteDocuments(
    collectionName: string,
    filter: { ids?: (string | number)[]; filter?: Record<string, any> }
  ): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      logger.error('Qdrant client not connected');
      return false;
    }

    try {
      if (filter.ids && filter.ids.length > 0) {
        await this.client.delete(collectionName, {
          wait: true,
          points: filter.ids
        });
      } else if (filter.filter) {
        await this.client.delete(collectionName, {
          wait: true,
          filter: filter.filter
        });
      }

      logger.debug(`Deleted documents from collection ${collectionName}`);
      return true;

    } catch (error) {
      logger.error(`Failed to delete documents from ${collectionName}:`, error);
      return false;
    }
  }

  /**
   * Get all available collections
   */
  getCollections(): Map<string, QdrantCollection> {
    return new Map(this.collections);
  }

  /**
   * Check if a collection exists
   */
  hasCollection(collectionName: string): boolean {
    return this.collections.has(collectionName);
  }

  /**
   * Reconnect to Qdrant if connection is lost
   */
  async reconnect(): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      await this.initializeClient();
      return this.isConnected;
    } catch (error) {
      logger.error('Failed to reconnect to Qdrant:', error);
      return false;
    }
  }

  /**
   * Perform collection maintenance operations
   */
  async optimizeCollection(collectionName: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      logger.error('Qdrant client not connected');
      return false;
    }

    try {
      // This would trigger collection optimization in Qdrant
      // Currently not directly supported by the client, placeholder for future implementation
      logger.info(`Optimization requested for collection ${collectionName}`);
      return true;

    } catch (error) {
      logger.error(`Failed to optimize collection ${collectionName}:`, error);
      return false;
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    enabled: boolean;
    connected: boolean;
    collectionsCount: number;
    client: boolean;
  } {
    return {
      enabled: this.isEnabled,
      connected: this.isConnected,
      collectionsCount: this.collections.size,
      client: this.client !== null
    };
  }
}

// Singleton instance
export const qdrantVectorService = new QdrantVectorService();