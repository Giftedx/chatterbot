/**
 * Neo4j Knowledge Graph Service  
 * Advanced graph database for knowledge representation, relationship mapping, and semantic analysis
 * Supports dynamic schema evolution, complex queries, and graph analytics
 */

import neo4j, { Driver, Session, Record, Node, Relationship } from 'neo4j-driver';
import { features } from '../config/feature-flags.js';
import { logger } from '../utils/logger.js';

/**
 * Represents a node (entity) in the knowledge graph.
 */
export interface GraphEntity {
  /** Optional ID (assigned by DB if not provided). */
  id?: string;
  /** Categorical labels (e.g., 'Person', 'Topic'). */
  labels: string[];
  /** Key-value properties associated with the node. */
  properties: { [key: string]: any };
}

/**
 * Represents a directed edge (relationship) between two nodes.
 */
export interface GraphRelationship {
  /** Optional ID. */
  id?: string;
  /** The semantic type of relationship (e.g., 'MENTIONED', 'RELATED_TO'). */
  type: string;
  /** Key-value properties for the edge. */
  properties?: { [key: string]: any };
  /** ID of the source node. */
  from: string;
  /** ID of the target node. */
  to: string;
}

/**
 * Configuration for a raw Cypher query execution.
 */
export interface GraphQuery {
  /** The Cypher query string. */
  cypher: string;
  /** Parameters to inject into the query safely. */
  parameters?: { [key: string]: any };
  /** Max execution time in ms. */
  timeout?: number;
}

/**
 * Options for semantic or keyword-based graph search.
 */
export interface GraphSearchOptions {
  /** Search text or semantic query string. */
  query: string;
  /** Filter results by node labels. */
  entityTypes?: string[];
  /** Filter results by relationship types. */
  relationshipTypes?: string[];
  /** Max results to return. */
  limit?: number;
  /** Pagination offset. */
  offset?: number;
  /** Minimum similarity threshold (for semantic search). */
  similarity?: number;
  /** Whether to fetch connected edges. */
  includeRelationships?: boolean;
  /** Maximum traversal depth for connected nodes. */
  maxDepth?: number;
}

/**
 * Represents a sequence of connected nodes and edges (a path).
 */
export interface GraphPath {
  /** Ordered list of nodes in the path. */
  nodes: GraphEntity[];
  /** Ordered list of edges connecting the nodes. */
  relationships: GraphRelationship[];
  /** Total steps in the path. */
  length: number;
  /** Optional relevance score. */
  score?: number;
}

/**
 * Aggregated statistics about the knowledge graph.
 */
export interface GraphAnalytics {
  /** Total number of nodes. */
  nodeCount: number;
  /** Total number of relationships. */
  relationshipCount: number;
  /** Count of nodes per label type. */
  labelDistribution: { [key: string]: number };
  /** Count of relationships per type. */
  relationshipTypeDistribution: { [key: string]: number };
  /** Nodes with the highest degree of connectivity. */
  topConnectedNodes: Array<{
    id: string;
    labels: string[];
    properties: { [key: string]: any };
    connectionCount: number;
  }>;
  /** Identified clusters or communities within the graph. */
  clusters?: Array<{
    id: string;
    size: number;
    density: number;
    centerNode: GraphEntity;
  }>;
}

/**
 * In-memory representation of a conversation's semantic structure.
 */
export interface ConversationGraph {
  /** ID of the conversation session. */
  conversationId: string;
  /** Nodes relevant to this conversation. */
  entities: Map<string, GraphEntity>;
  /** Edges relevant to this conversation. */
  relationships: Map<string, GraphRelationship>;
  /** Chronological log of graph modifications during the session. */
  timeline: Array<{
    timestamp: Date;
    action: 'add_entity' | 'add_relationship' | 'update_entity';
    data: any;
  }>;
  /** Key themes or topics extracted. */
  topics: string[];
  /** High-level insights derived from graph analysis. */
  keyInsights: string[];
  /** Timestamp of last update. */
  lastUpdated: Date;
}

/**
 * Service for interacting with Neo4j to manage and query the Knowledge Graph.
 *
 * Capabilities:
 * - Entity and Relationship management (CRUD).
 * - Semantic graph search and pathfinding.
 * - Conversation-scoped subgraph management.
 * - Graph analytics.
 */
export class Neo4jKnowledgeGraphService {
  private driver: Driver | null = null;
  private isEnabled: boolean;
  private isConnected: boolean = false;
  private conversationGraphs: Map<string, ConversationGraph> = new Map();

  constructor() {
    this.isEnabled = features.knowledgeGraphs;
    
    if (this.isEnabled) {
      this.initializeConnection();
    }
  }

  private async initializeConnection(): Promise<void> {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';

    try {
      this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
      
      // Test connection
      const session = this.driver.session();
      await session.run('RETURN 1');
      await session.close();
      
      this.isConnected = true;
      
      // Create initial indices and constraints
      await this.createInitialSchema();
      
      logger.info('Neo4j Knowledge Graph service initialized');
    } catch (error) {
      logger.error('Failed to connect to Neo4j:', error);
      this.isConnected = false;
    }
  }

  private async createInitialSchema(): Promise<void> {
    if (!this.driver) return;

    const session = this.driver.session();
    try {
      // Create constraints and indices for common entity types
      const schemaQueries = [
        'CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE',
        'CREATE CONSTRAINT person_name IF NOT EXISTS FOR (p:Person) REQUIRE p.name IS UNIQUE',
        'CREATE CONSTRAINT topic_name IF NOT EXISTS FOR (t:Topic) REQUIRE t.name IS UNIQUE',
        'CREATE CONSTRAINT conversation_id IF NOT EXISTS FOR (c:Conversation) REQUIRE c.id IS UNIQUE',
        'CREATE INDEX entity_properties IF NOT EXISTS FOR (e:Entity) ON (e.name, e.type)',
        'CREATE INDEX relationship_type IF NOT EXISTS FOR ()-[r]-() ON (r.type)',
        'CREATE INDEX temporal_index IF NOT EXISTS FOR (e:Entity) ON (e.created_at, e.updated_at)'
      ];

      for (const query of schemaQueries) {
        try {
          await session.run(query);
        } catch (error) {
          // Ignore errors for existing constraints/indices
        }
      }

    } finally {
      await session.close();
    }
  }

  /**
   * Creates or updates a node in the graph database.
   *
   * @param entity - The entity data to persist.
   * @returns The entity ID if successful, null otherwise.
   */
  async createEntity(entity: GraphEntity): Promise<string | null> {
    if (!this.driver || !this.isConnected) {
      logger.error('Neo4j not connected');
      return null;
    }

    const session = this.driver.session();
    try {
      const labels = entity.labels.join(':');
      const properties: { [key: string]: any } = { 
        ...entity.properties, 
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (entity.id) {
        (properties as any).id = entity.id;
      }

      const result = await session.run(
        `MERGE (e:${labels} {id: $id})
         SET e += $properties
         RETURN e.id as id`,
        {
          id: entity.id || this.generateNodeId(),
          properties
        }
      );

      const record = result.records[0];
      return record ? record.get('id') : null;

    } catch (error) {
      logger.error('Failed to create entity:', error);
      return null;
    } finally {
      await session.close();
    }
  }

  /**
   * Creates a directed relationship between two existing nodes.
   *
   * @param relationship - The relationship definition.
   * @returns True if created successfully.
   */
  async createRelationship(relationship: GraphRelationship): Promise<boolean> {
    if (!this.driver || !this.isConnected) {
      logger.error('Neo4j not connected');
      return false;
    }

    const session = this.driver.session();
    try {
      const properties = {
        ...relationship.properties,
        created_at: new Date().toISOString()
      };

      await session.run(
        `MATCH (a {id: $fromId}), (b {id: $toId})
         MERGE (a)-[r:${relationship.type}]->(b)
         SET r += $properties
         RETURN r`,
        {
          fromId: relationship.from,
          toId: relationship.to,
          properties
        }
      );

      return true;

    } catch (error) {
      logger.error('Failed to create relationship:', error);
      return false;
    } finally {
      await session.close();
    }
  }

  /**
   * Executes a raw Cypher query against the database.
   *
   * @param query - The query configuration.
   * @returns Array of raw Neo4j records.
   */
  async executeQuery(query: GraphQuery): Promise<Record[]> {
    if (!this.driver || !this.isConnected) {
      logger.error('Neo4j not connected');
      return [];
    }

    const session = this.driver.session();
    try {
      const result = await session.run(
        query.cypher,
        query.parameters || {},
        { timeout: query.timeout || 30000 }
      );

      return result.records;

    } catch (error) {
      logger.error('Failed to execute query:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Performs a comprehensive search of the graph.
   * Supports full-text search on node properties and filtering by type.
   *
   * @param options - Search criteria.
   * @returns Object containing matching entities, their relationships, and relevant paths.
   */
  async searchGraph(options: GraphSearchOptions): Promise<{
    entities: GraphEntity[];
    relationships: GraphRelationship[];
    paths: GraphPath[];
  }> {
    if (!this.driver || !this.isConnected) {
      return { entities: [], relationships: [], paths: [] };
    }

    const session = this.driver.session();
    try {
      let cypher = `
        MATCH (e)
        WHERE `;

      const conditions: string[] = [];
      const parameters: { [key: string]: any } = {
        limit: options.limit || 50,
        offset: options.offset || 0
      };

      // Text search in properties
      conditions.push(`(
        toLower(toString(e.name)) CONTAINS toLower($searchQuery) OR
        toLower(toString(e.description)) CONTAINS toLower($searchQuery) OR
        toLower(toString(e.content)) CONTAINS toLower($searchQuery)
      )`);
      (parameters as any).searchQuery = options.query;

      // Filter by entity types (labels)
      if (options.entityTypes && options.entityTypes.length > 0) {
        const labelConditions = options.entityTypes.map((_, i) => `$label${i} IN labels(e)`);
        conditions.push(`(${labelConditions.join(' OR ')})`);
        options.entityTypes.forEach((label, i) => {
          (parameters as any)[`label${i}`] = label;
        });
      }

      cypher += conditions.join(' AND ');
      cypher += `
        RETURN DISTINCT e
        SKIP $offset
        LIMIT $limit
      `;

      const result = await session.run(cypher, parameters);
      
      const entities: GraphEntity[] = result.records.map(record => {
        const node = record.get('e') as Node;
        return {
          id: (node.properties as any).id as string,
          labels: node.labels,
          properties: node.properties as { [key: string]: any }
        };
      });

      // If relationships requested, fetch them
      let relationships: GraphRelationship[] = [];
      if (options.includeRelationships && entities.length > 0) {
        const entityIds = entities.map(e => e.id).filter(Boolean);
        relationships = await this.getRelationshipsForEntities(entityIds as string[]);
      }

      // Find paths if maxDepth specified
      const paths: GraphPath[] = [];
      if (options.maxDepth && options.maxDepth > 0 && entities.length >= 2) {
        // Find paths between first few entities
        const pathResults = await this.findPaths(
          entities.slice(0, 2).map(e => e.id!),
          options.maxDepth
        );
        paths.push(...pathResults);
      }

      return { entities, relationships, paths };

    } catch (error) {
      logger.error('Failed to search graph:', error);
      return { entities: [], relationships: [], paths: [] };
    } finally {
      await session.close();
    }
  }

  /**
   * Discovers the shortest paths connecting a set of entities.
   * Useful for finding hidden connections or relationships.
   *
   * @param entityIds - List of entity IDs to connect.
   * @param maxDepth - Maximum number of hops allowed in a path.
   * @returns Array of discovered paths.
   */
  async findPaths(entityIds: string[], maxDepth: number = 5): Promise<GraphPath[]> {
    if (!this.driver || !this.isConnected || entityIds.length < 2) {
      return [];
    }

    const session = this.driver.session();
    try {
      const cypher = `
        MATCH (start {id: $startId}), (end {id: $endId})
        MATCH path = shortestPath((start)-[*1..${maxDepth}]-(end))
        RETURN path, length(path) as pathLength
        ORDER BY pathLength
        LIMIT 10
      `;

      const paths: GraphPath[] = [];

      for (let i = 0; i < entityIds.length - 1; i++) {
        for (let j = i + 1; j < entityIds.length; j++) {
          const result = await session.run(cypher, {
            startId: entityIds[i],
            endId: entityIds[j]
          });

          for (const record of result.records) {
            const path = record.get('path');
            const pathLength = record.get('pathLength').toNumber();

            const nodes: GraphEntity[] = path.segments.map((segment: any) => ({
              id: segment.start.properties.id,
              labels: segment.start.labels,
              properties: segment.start.properties
            }));

            const relationships: GraphRelationship[] = path.segments.map((segment: any) => ({
              id: segment.relationship.identity.toString(),
              type: segment.relationship.type,
              properties: segment.relationship.properties,
              from: segment.start.properties.id,
              to: segment.end.properties.id
            }));

            paths.push({
              nodes,
              relationships,
              length: pathLength
            });
          }
        }
      }

      return paths;

    } catch (error) {
      logger.error('Failed to find paths:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Computes aggregate statistics for the entire knowledge graph.
   *
   * @returns Analytics object or null if failed.
   */
  async getGraphAnalytics(): Promise<GraphAnalytics | null> {
    if (!this.driver || !this.isConnected) {
      return null;
    }

    const session = this.driver.session();
    try {
      // Get basic counts
      const countsResult = await session.run(`
        MATCH (n)
        OPTIONAL MATCH (n)-[r]-()
        RETURN 
          count(DISTINCT n) as nodeCount,
          count(DISTINCT r) as relationshipCount
      `);

      const counts = countsResult.records[0];
      const nodeCount = counts.get('nodeCount').toNumber();
      const relationshipCount = counts.get('relationshipCount').toNumber();

      // Get label distribution
      const labelsResult = await session.run(`
        MATCH (n)
        UNWIND labels(n) as label
        RETURN label, count(*) as count
        ORDER BY count DESC
      `);

      const labelDistribution: { [key: string]: number } = {};
      labelsResult.records.forEach(record => {
        (labelDistribution as any)[record.get('label')] = record.get('count').toNumber();
      });

      // Get relationship type distribution
      const relTypesResult = await session.run(`
        MATCH ()-[r]->()
        RETURN type(r) as relType, count(*) as count
        ORDER BY count DESC
      `);

      const relationshipTypeDistribution: { [key: string]: number } = {};
      relTypesResult.records.forEach(record => {
        (relationshipTypeDistribution as any)[record.get('relType')] = record.get('count').toNumber();
      });

      // Get top connected nodes
      const topNodesResult = await session.run(`
        MATCH (n)
        OPTIONAL MATCH (n)-[r]-()
        RETURN n, count(r) as connectionCount
        ORDER BY connectionCount DESC
        LIMIT 10
      `);

      const topConnectedNodes = topNodesResult.records.map(record => {
        const node = record.get('n') as Node;
        return {
          id: (node.properties as any).id as string,
          labels: node.labels,
          properties: node.properties as { [key: string]: any },
          connectionCount: record.get('connectionCount').toNumber()
        };
      });

      return {
        nodeCount,
        relationshipCount,
        labelDistribution,
        relationshipTypeDistribution,
        topConnectedNodes
      };

    } catch (error) {
      logger.error('Failed to get graph analytics:', error);
      return null;
    } finally {
      await session.close();
    }
  }

  /**
   * Initializes a new subgraph for a specific conversation session.
   *
   * @param conversationId - The session ID.
   * @returns The initialized conversation graph structure.
   */
  async createConversationGraph(conversationId: string): Promise<ConversationGraph> {
    const graph: ConversationGraph = {
      conversationId,
      entities: new Map(),
      relationships: new Map(),
      timeline: [],
      topics: [],
      keyInsights: [],
      lastUpdated: new Date()
    };

    this.conversationGraphs.set(conversationId, graph);
    
    // Create conversation node in Neo4j
    await this.createEntity({
      id: conversationId,
      labels: ['Conversation'],
      properties: {
        id: conversationId,
        created_at: new Date().toISOString(),
        status: 'active'
      }
    });

    return graph;
  }

  /**
   * Associates an entity with a specific conversation context.
   *
   * @param conversationId - The session ID.
   * @param entity - The entity to add.
   * @param relationshipToConversation - Optional label for the edge connecting the conversation to the entity.
   * @returns True if successful.
   */
  async addToConversationGraph(
    conversationId: string,
    entity: GraphEntity,
    relationshipToConversation?: string
  ): Promise<boolean> {
    let graph = this.conversationGraphs.get(conversationId);
    
    if (!graph) {
      graph = await this.createConversationGraph(conversationId);
    }

    const entityId = await this.createEntity(entity);
    
    if (!entityId) {
      return false;
    }

    // Add to local graph
    graph.entities.set(entityId, { ...entity, id: entityId });
    
    // Create relationship to conversation
    if (relationshipToConversation) {
      await this.createRelationship({
        type: relationshipToConversation,
        from: conversationId,
        to: entityId,
        properties: {
          added_at: new Date().toISOString()
        }
      });
    }

    // Update timeline
    graph.timeline.push({
      timestamp: new Date(),
      action: 'add_entity',
      data: entity
    });

    graph.lastUpdated = new Date();
    return true;
  }

  /**
   * Parsons text to identify and persist potential entities using NLP heuristics.
   *
   * @param text - The raw text to analyze.
   * @param conversationId - Optional session ID to associate found entities with.
   * @returns Array of extracted entities.
   */
  async extractEntitiesFromText(
    text: string,
    conversationId?: string
  ): Promise<GraphEntity[]> {
    // Simple entity extraction - could be enhanced with NLP libraries
    const entities: GraphEntity[] = [];
    
    // Extract potential entities using simple patterns
    const patterns = {
      Person: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
      Organization: /\b[A-Z][A-Z\s]+\b/g,
      Location: /\bin [A-Z][a-z]+(?:, [A-Z][a-z]+)?\b/g,
      Topic: /\b(?:about|regarding|concerning) ([a-z\s]+)\b/gi
    };

    for (const [label, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const entity: GraphEntity = {
            labels: [label, 'Entity'],
            properties: {
              name: match.trim(),
              source: 'text_extraction',
              extracted_from: conversationId || 'unknown',
              confidence: 0.7
            }
          };
          
          entities.push(entity);
        }
      }
    }

    // Create entities in graph
    const createdEntities: GraphEntity[] = [];
    for (const entity of entities) {
      const id = await this.createEntity(entity);
      if (id) {
        createdEntities.push({ ...entity, id });
        
        // Add to conversation graph if provided
        if (conversationId) {
          await this.addToConversationGraph(conversationId, entity, 'MENTIONED_IN');
        }
      }
    }

    return createdEntities;
  }

  private async getRelationshipsForEntities(entityIds: string[]): Promise<GraphRelationship[]> {
    if (!this.driver || !this.isConnected) {
      return [];
    }

    const session = this.driver.session();
    try {
      const cypher = `
        MATCH (a)-[r]-(b)
        WHERE a.id IN $entityIds AND b.id IN $entityIds
        RETURN DISTINCT r, a.id as fromId, b.id as toId
      `;

      const result = await session.run(cypher, { entityIds });
      
      return result.records.map(record => {
        const rel = record.get('r') as Relationship;
        return {
          id: rel.identity.toString(),
          type: rel.type,
          properties: rel.properties,
          from: record.get('fromId'),
          to: record.get('toId')
        };
      });

    } catch (error) {
      logger.error('Failed to get relationships:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  private generateNodeId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Removes an entity and all its incident relationships from the graph.
   *
   * @param entityId - The ID of the node to delete.
   * @returns True if successful.
   */
  async deleteEntity(entityId: string): Promise<boolean> {
    if (!this.driver || !this.isConnected) {
      return false;
    }

    const session = this.driver.session();
    try {
      await session.run(
        'MATCH (n {id: $entityId}) DETACH DELETE n',
        { entityId }
      );
      return true;
    } catch (error) {
      logger.error('Failed to delete entity:', error);
      return false;
    } finally {
      await session.close();
    }
  }

  /**
   * Wipes the entire database.
   * @warning This action is irreversible.
   * @returns True if successful.
   */
  async clearAllData(): Promise<boolean> {
    if (!this.driver || !this.isConnected) {
      return false;
    }

    const session = this.driver.session();
    try {
      await session.run('MATCH (n) DETACH DELETE n');
      this.conversationGraphs.clear();
      return true;
    } catch (error) {
      logger.error('Failed to clear data:', error);
      return false;
    } finally {
      await session.close();
    }
  }

  /**
   * Gracefully shuts down the driver and closes active sessions.
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.isConnected = false;
    }
  }

  /**
   * Returns the current operational status of the service.
   * @returns Object with connection and driver health info.
   */
  getHealthStatus(): {
    enabled: boolean;
    connected: boolean;
    driverActive: boolean;
    conversationGraphs: number;
  } {
    return {
      enabled: this.isEnabled,
      connected: this.isConnected,
      driverActive: !!this.driver,
      conversationGraphs: this.conversationGraphs.size
    };
  }
}

// Singleton instance
export const neo4jKnowledgeGraphService = new Neo4jKnowledgeGraphService();