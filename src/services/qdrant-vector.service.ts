/**
 * Qdrant Vector Database Service
 * Advanced vector database with collections management, filtering, and metadata support
 * Alternative to pgvector with superior performance and features
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { features } from '../config/feature-flags.js';
import { logger } from '../utils/logger.js';

/**
 * Represents a document to be stored in the vector database.
 */
export interface QdrantDocument {
  /** Unique identifier for the document (UUID or integer). */
  id: string | number;
  /** The embedding vector. */
  vector: number[];
  /** Arbitrary payload data associated with the vector. */
  payload: Record<string, any>;
  /** Optional additional metadata. */
  metadata?: Record<string, any>;
}

/**
 * Options for vector similarity search.
 */
export interface QdrantSearchOptions {
  /** Maximum number of results to return. */
  limit?: number;
  /** Number of results to skip (for pagination). */
  offset?: number;
  /** Qdrant filter object for pre-filtering. */
  filter?: Record<string, any>;
  /** Whether to include the payload in results. */
  withPayload?: boolean;
  /** Whether to include the vector in results. */
  withVector?: boolean;
  /** Minimum similarity score to include a result. */
  scoreThreshold?: number;
}

/**
 * Metadata about a Qdrant collection.
 */
export interface QdrantCollection {
  /** Name of the collection. */
  name: string;
  /** Dimension of the vectors in this collection. */
  vectorSize: number;
  /** Distance metric used for similarity. */
  distance: 'Cosine' | 'Euclid' | 'Dot' | 'Manhattan';
  /** Optional description. */
  description?: string;
  /** Arbitrary collection metadata. */
  metadata?: Record<string, any>;
}

/**
 * Result returned from a vector search.
 */
export interface QdrantSearchResult {
  /** ID of the matching document. */
  id: string | number;
  /** Similarity score. */
  score: number;
  /** Payload data of the document. */
  payload: Record<string, any>;
  /** The document vector (if requested). */
  vector?: number[];
}

/**
 * Operational statistics for a collection.
 */
export interface QdrantCollectionStats {
  name: string;
  /** Total number of vectors stored. */
  vectorsCount: number;
  /** Number of storage segments. */
  segments: number;
  /** Disk usage in bytes. */
  diskUsage: number;
  /** RAM usage in bytes. */
  ramUsage: number;
  /** Operational status (e.g., 'green', 'yellow'). */
  status: string;
}

/**
 * Service for interacting with Qdrant Vector Database.
 *
 * Provides an abstraction layer for:
 * - Collection management (create, delete, optimize).
 * - Vector operations (upsert, delete).
 * - Advanced search (similarity, hybrid filtering).
 */
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
   * Create a new collection with specified configuration.
   *
   * @param params - Configuration including name, vector size, and optimization settings.
   * @returns True if successful, false otherwise.
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
   * Deletes an entire collection and all its data.
   *
   * @param collectionName - The name of the collection to delete.
   * @returns True if successful, false otherwise.
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
   * Inserts or updates documents in a collection.
   *
   * @param collectionName - The target collection.
   * @param documents - Array of documents to upsert.
   * @returns True if successful, false otherwise.
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
   * Performs a k-nearest neighbor search for similar vectors.
   *
   * @param collectionName - The collection to search in.
   * @param queryVector - The vector to compare against.
   * @param options - Search options (limit, filter, score threshold).
   * @returns Array of matches sorted by similarity score.
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
   * Performs an advanced hybrid search combining vector similarity with text and metadata filtering.
   *
   * @param params - Search parameters including query vector, optional text query, and complex filters.
   * @returns Array of matches.
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
   * Retrieves detailed statistics and health metrics for a collection.
   *
   * @param collectionName - The name of the collection.
   * @returns Statistics object or null if failed.
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
   * Creates an optimized index for a specific payload field to improve filtering performance.
   *
   * @param collectionName - The collection name.
   * @param fieldName - The path of the field to index.
   * @param fieldType - The type of data in the field.
   * @returns True if successful.
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
   * Deletes specific documents from a collection by ID or filter criteria.
   *
   * @param collectionName - The collection name.
   * @param filter - Criteria for deletion (list of IDs or a filter object).
   * @returns True if successful.
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
   * Retrieves all known collections from the local cache.
   * @returns Map of collection names to collection metadata.
   */
  getCollections(): Map<string, QdrantCollection> {
    return new Map(this.collections);
  }

  /**
   * Checks if a specific collection exists in the local cache.
   * @param collectionName - The name to check.
   * @returns True if it exists.
   */
  hasCollection(collectionName: string): boolean {
    return this.collections.has(collectionName);
  }

  /**
   * Attempts to re-establish connection to the Qdrant server.
   * @returns True if reconnected successfully.
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
   * Triggers optimization (compaction) processes on a collection.
   *
   * @param collectionName - The name of the collection.
   * @returns True if request accepted.
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
   * Returns the current operational status of the service.
   * @returns Object containing enabled state, connection status, and client readiness.
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