// TASK-021: Implement long-term memory subsystem with persistence

import { getEnvAsBoolean, getEnvAsNumber } from '../utils/env.js';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import cron from 'node-cron';

// Memory schemas
const MemorySchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  content: z.string(),
  type: z.enum(['episodic', 'semantic', 'procedural', 'working', 'autobiographical']),
  importance: z.number().min(0).max(1),
  timestamp: z.date().default(() => new Date()),
  context: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).default([]),
  associatedMemories: z.array(z.string()).default([]),
  lastAccessed: z.date().default(() => new Date()),
  accessCount: z.number().default(0),
  decayFactor: z.number().min(0).max(1).default(1),
  consolidationLevel: z.number().min(0).max(1).default(0),
  emotional_valence: z.number().min(-1).max(1).default(0),
  sensory_details: z.record(z.unknown()).optional()
});

type Memory = z.infer<typeof MemorySchema>;

const ConsolidationRuleSchema = z.object({
  pattern: z.string(),
  importance_boost: z.number(),
  consolidation_threshold: z.number(),
  retention_period_days: z.number()
});

const MemoryClusterSchema = z.object({
  id: z.string(),
  centroid_embedding: z.array(z.number()),
  memory_ids: z.array(z.string()),
  theme: z.string(),
  creation_date: z.date(),
  last_updated: z.date(),
  cluster_strength: z.number()
});

export interface MemoryQuery {
  userId: string;
  query?: string;
  type?: Memory['type'];
  timeRange?: {
    start: Date;
    end: Date;
  };
  importance_threshold?: number;
  tags?: string[];
  limit?: number;
  include_associations?: boolean;
  semantic_search?: boolean;
}

export interface MemoryStats {
  total_memories: number;
  by_type: Record<Memory['type'], number>;
  average_importance: number;
  consolidation_rate: number;
  decay_rate: number;
  access_patterns: {
    most_accessed: Memory[];
    recent_access: Memory[];
    forgotten_memories: number;
  };
  memory_clusters: number;
  retention_health: number;
}

export class LongTermMemoryService {
  private prisma: PrismaClient;
  private consolidationRules: z.infer<typeof ConsolidationRuleSchema>[] = [];
  private memoryCache: Map<string, Memory> = new Map();
  private clusterCache: Map<string, z.infer<typeof MemoryClusterSchema>> = new Map();
  private isInitialized = false;

  // Configuration
  private readonly MAX_MEMORIES_PER_USER: number;
  private readonly MEMORY_DECAY_RATE: number;
  private readonly IMPORTANCE_THRESHOLD: number;
  private readonly CONSOLIDATION_INTERVAL: number;

  constructor() {
    this.prisma = new PrismaClient();
    this.MAX_MEMORIES_PER_USER = getEnvAsNumber('MAX_MEMORIES_PER_USER', 1000);
    this.MEMORY_DECAY_RATE = getEnvAsNumber('MEMORY_DECAY_RATE', 0.01);
    this.IMPORTANCE_THRESHOLD = getEnvAsNumber('MEMORY_IMPORTANCE_THRESHOLD', 0.3);
    this.CONSOLIDATION_INTERVAL = getEnvAsNumber('MEMORY_CONSOLIDATION_INTERVAL', 3600000);
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize default consolidation rules
      this.consolidationRules = [
        {
          pattern: 'error|bug|issue|problem',
          importance_boost: 0.3,
          consolidation_threshold: 0.7,
          retention_period_days: 30
        },
        {
          pattern: 'learn|remember|important|critical',
          importance_boost: 0.4,
          consolidation_threshold: 0.6,
          retention_period_days: 90
        },
        {
          pattern: 'personal|private|confidential',
          importance_boost: 0.5,
          consolidation_threshold: 0.8,
          retention_period_days: 365
        },
        {
          pattern: 'project|work|task|deadline',
          importance_boost: 0.2,
          consolidation_threshold: 0.5,
          retention_period_days: 60
        }
      ];

      // Start consolidation scheduler if enabled
      if (getEnvAsBoolean('ENABLE_AUTO_MEMORY', true)) {
        this.startConsolidationScheduler();
      }

      this.isInitialized = true;
      console.log('🧠 Long-term memory service initialized');
    } catch (error) {
      console.error('Failed to initialize long-term memory service:', error);
      throw error;
    }
  }

  private startConsolidationScheduler(): void {
    // Run memory consolidation every hour
    cron.schedule('0 * * * *', async () => {
      try {
        await this.runConsolidationCycle();
      } catch (error) {
        console.error('Memory consolidation cycle failed:', error);
      }
    });

    // Run decay processing every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      try {
        await this.runDecayCycle();
      } catch (error) {
        console.error('Memory decay cycle failed:', error);
      }
    });

    // Weekly cleanup and optimization
    cron.schedule('0 2 * * 0', async () => {
      try {
        await this.runWeeklyMaintenance();
      } catch (error) {
        console.error('Weekly memory maintenance failed:', error);
      }
    });
  }

  async storeMemory(memoryData: Omit<Memory, 'id' | 'timestamp' | 'lastAccessed' | 'accessCount' | 'decayFactor' | 'consolidationLevel'>): Promise<Memory> {
    await this.init();

    try {
      // Validate input
      const validatedData = MemorySchema.omit({ id: true }).parse({
        ...memoryData,
        timestamp: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        decayFactor: 1,
        consolidationLevel: 0
      });

      // Calculate dynamic importance based on content and context
      const enhancedImportance = await this.calculateDynamicImportance(validatedData);
      validatedData.importance = Math.max(validatedData.importance, enhancedImportance);

      // Generate memory ID
      const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const memory: Memory = {
        id: memoryId,
        ...validatedData
      };

      // Store in database (simulated with in-memory for now)
      this.memoryCache.set(memoryId, memory);

      // Create associations with existing memories
      await this.createMemoryAssociations(memory);

      // Trigger clustering update
      await this.updateMemoryCluster(memory);

      console.log(`📚 Stored ${memory.type} memory for user ${memory.userId} (importance: ${memory.importance.toFixed(2)})`);
      
      return memory;
    } catch (error) {
      console.error('Failed to store memory:', error);
      throw error;
    }
  }

  async retrieveMemories(query: MemoryQuery): Promise<Memory[]> {
    await this.init();

    try {
      let memories = Array.from(this.memoryCache.values())
        .filter(memory => memory.userId === query.userId);

      // Apply filters
      if (query.type) {
        memories = memories.filter(memory => memory.type === query.type);
      }

      if (query.timeRange) {
        memories = memories.filter(memory => 
          memory.timestamp >= query.timeRange!.start && 
          memory.timestamp <= query.timeRange!.end
        );
      }

      if (query.importance_threshold) {
        memories = memories.filter(memory => memory.importance >= query.importance_threshold!);
      }

      if (query.tags && query.tags.length > 0) {
        memories = memories.filter(memory => 
          query.tags!.some(tag => memory.tags.includes(tag))
        );
      }

      // Semantic search if enabled
      if (query.semantic_search && query.query) {
        memories = await this.performSemanticSearch(memories, query.query);
      } else if (query.query) {
        // Text-based search
        const queryLower = query.query.toLowerCase();
        memories = memories.filter(memory => 
          memory.content.toLowerCase().includes(queryLower) ||
          memory.tags.some(tag => tag.toLowerCase().includes(queryLower))
        );
      }

      // Include associations if requested
      if (query.include_associations) {
        memories = await this.includeAssociations(memories);
      }

      // Sort by relevance (importance + recency + access count)
      memories.sort((a, b) => {
        const scoreA = this.calculateRelevanceScore(a, query.query);
        const scoreB = this.calculateRelevanceScore(b, query.query);
        return scoreB - scoreA;
      });

      // Update access patterns
      memories.forEach(memory => {
        memory.lastAccessed = new Date();
        memory.accessCount++;
        this.memoryCache.set(memory.id!, memory);
      });

      // Apply limit
      const limit = query.limit || 50;
      return memories.slice(0, limit);
    } catch (error) {
      console.error('Failed to retrieve memories:', error);
      throw error;
    }
  }

  async deleteMemory(memoryId: string, userId: string): Promise<boolean> {
    await this.init();

    try {
      const memory = this.memoryCache.get(memoryId);
      if (!memory || memory.userId !== userId) {
        return false;
      }

      // Remove associations
      await this.removeMemoryAssociations(memoryId);

      // Update clusters
      await this.updateClustersAfterDeletion(memoryId);

      // Delete from cache
      this.memoryCache.delete(memoryId);

      console.log(`🗑️ Deleted memory ${memoryId} for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete memory:', error);
      return false;
    }
  }

  async getMemoryStats(userId: string): Promise<MemoryStats> {
    await this.init();

    try {
      const userMemories = Array.from(this.memoryCache.values())
        .filter(memory => memory.userId === userId);

      const byType = userMemories.reduce((acc, memory) => {
        acc[memory.type] = (acc[memory.type] || 0) + 1;
        return acc;
      }, {} as Record<Memory['type'], number>);

      const averageImportance = userMemories.length > 0 ? 
        userMemories.reduce((sum, memory) => sum + memory.importance, 0) / userMemories.length : 0;

      const consolidatedMemories = userMemories.filter(memory => memory.consolidationLevel > 0.5);
      const consolidationRate = userMemories.length > 0 ? 
        consolidatedMemories.length / userMemories.length : 0;

      const decayedMemories = userMemories.filter(memory => memory.decayFactor < 0.5);
      const decayRate = userMemories.length > 0 ? 
        decayedMemories.length / userMemories.length : 0;

      const mostAccessed = userMemories
        .sort((a, b) => b.accessCount - a.accessCount)
        .slice(0, 10);

      const recentAccess = userMemories
        .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
        .slice(0, 10);

      const forgottenMemories = userMemories.filter(memory => 
        Date.now() - memory.lastAccessed.getTime() > 30 * 24 * 60 * 60 * 1000 // 30 days
      ).length;

      const userClusters = Array.from(this.clusterCache.values())
        .filter(cluster => 
          cluster.memory_ids.some(id => this.memoryCache.get(id)?.userId === userId)
        );

      const retentionHealth = this.calculateRetentionHealth(userMemories);

      return {
        total_memories: userMemories.length,
        by_type: byType,
        average_importance: averageImportance,
        consolidation_rate: consolidationRate,
        decay_rate: decayRate,
        access_patterns: {
          most_accessed: mostAccessed,
          recent_access: recentAccess,
          forgotten_memories: forgottenMemories
        },
        memory_clusters: userClusters.length,
        retention_health: retentionHealth
      };
    } catch (error) {
      console.error('Failed to get memory stats:', error);
      throw error;
    }
  }

  private async calculateDynamicImportance(memory: Omit<Memory, 'id'>): Promise<number> {
    let importance = memory.importance;

    // Apply consolidation rules
    for (const rule of this.consolidationRules) {
      const regex = new RegExp(rule.pattern, 'i');
      if (regex.test(memory.content)) {
        importance += rule.importance_boost;
      }
    }

    // Emotional valence boost
    if (Math.abs(memory.emotional_valence) > 0.5) {
      importance += 0.2;
    }

    // Context-based importance
    if (memory.context) {
      const contextFactors = Object.keys(memory.context).length;
      importance += Math.min(contextFactors * 0.05, 0.3);
    }

    // Tag-based importance
    const importantTags = ['critical', 'important', 'urgent', 'remember', 'key'];
    const hasImportantTags = memory.tags.some(tag => 
      importantTags.some(importantTag => tag.toLowerCase().includes(importantTag))
    );
    if (hasImportantTags) {
      importance += 0.2;
    }

    return Math.min(importance, 1);
  }

  private calculateRelevanceScore(memory: Memory, query?: string): number {
    let score = memory.importance * 0.4;
    
    // Recency factor
    const daysSinceCreation = (Date.now() - memory.timestamp.getTime()) / (24 * 60 * 60 * 1000);
    const recencyScore = Math.exp(-daysSinceCreation / 30); // Exponential decay over 30 days
    score += recencyScore * 0.3;

    // Access frequency
    const accessScore = Math.min(memory.accessCount / 10, 1);
    score += accessScore * 0.2;

    // Query relevance
    if (query) {
      const queryLower = query.toLowerCase();
      const contentMatch = memory.content.toLowerCase().includes(queryLower) ? 0.1 : 0;
      const tagMatch = memory.tags.some(tag => tag.toLowerCase().includes(queryLower)) ? 0.1 : 0;
      score += contentMatch + tagMatch;
    }

    return score;
  }

  private async createMemoryAssociations(newMemory: Memory): Promise<void> {
    // Simple association based on tag overlap and content similarity
    const existingMemories = Array.from(this.memoryCache.values())
      .filter(memory => memory.userId === newMemory.userId && memory.id !== newMemory.id);

    for (const existingMemory of existingMemories) {
      const tagOverlap = newMemory.tags.filter(tag => existingMemory.tags.includes(tag)).length;
      const contentSimilarity = this.calculateContentSimilarity(newMemory.content, existingMemory.content);
      
      if (tagOverlap > 0 || contentSimilarity > 0.3) {
        newMemory.associatedMemories.push(existingMemory.id!);
        existingMemory.associatedMemories.push(newMemory.id!);
        this.memoryCache.set(existingMemory.id!, existingMemory);
      }
    }
  }

  private calculateContentSimilarity(content1: string, content2: string): number {
    // Simple word-based similarity
    const words1 = content1.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const words2 = content2.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    
    const commonWords = words1.filter(word => words2.includes(word)).length;
    const totalWords = new Set([...words1, ...words2]).size;
    
    return commonWords / totalWords;
  }

  private async performSemanticSearch(memories: Memory[], query: string): Promise<Memory[]> {
    // Placeholder for semantic search implementation
    // In a real implementation, this would use vector embeddings
    return memories.filter(memory => 
      this.calculateContentSimilarity(memory.content, query) > 0.1
    );
  }

  private async includeAssociations(memories: Memory[]): Promise<Memory[]> {
    const result = [...memories];
    const addedIds = new Set(memories.map(m => m.id));

    for (const memory of memories) {
      for (const associatedId of memory.associatedMemories) {
        if (!addedIds.has(associatedId)) {
          const associatedMemory = this.memoryCache.get(associatedId);
          if (associatedMemory) {
            result.push(associatedMemory);
            addedIds.add(associatedId);
          }
        }
      }
    }

    return result;
  }

  private async updateMemoryCluster(memory: Memory): Promise<void> {
    // Simplified clustering based on tags and content
    const clusterId = `cluster_${memory.type}_${memory.userId}`;
    
    let cluster = this.clusterCache.get(clusterId);
    if (!cluster) {
      cluster = {
        id: clusterId,
        centroid_embedding: [], // Would be calculated from embeddings
        memory_ids: [],
        theme: memory.type,
        creation_date: new Date(),
        last_updated: new Date(),
        cluster_strength: 0
      };
    }

    cluster.memory_ids.push(memory.id!);
    cluster.last_updated = new Date();
    cluster.cluster_strength = cluster.memory_ids.length / 10; // Simple strength calculation

    this.clusterCache.set(clusterId, cluster);
  }

  private async removeMemoryAssociations(memoryId: string): Promise<void> {
    const memory = this.memoryCache.get(memoryId);
    if (!memory) return;

    for (const associatedId of memory.associatedMemories) {
      const associatedMemory = this.memoryCache.get(associatedId);
      if (associatedMemory) {
        associatedMemory.associatedMemories = associatedMemory.associatedMemories.filter(id => id !== memoryId);
        this.memoryCache.set(associatedId, associatedMemory);
      }
    }
  }

  private async updateClustersAfterDeletion(memoryId: string): Promise<void> {
    for (const [clusterId, cluster] of this.clusterCache.entries()) {
      if (cluster.memory_ids.includes(memoryId)) {
        cluster.memory_ids = cluster.memory_ids.filter(id => id !== memoryId);
        cluster.last_updated = new Date();
        cluster.cluster_strength = cluster.memory_ids.length / 10;
        
        if (cluster.memory_ids.length === 0) {
          this.clusterCache.delete(clusterId);
        } else {
          this.clusterCache.set(clusterId, cluster);
        }
      }
    }
  }

  private calculateRetentionHealth(memories: Memory[]): number {
    if (memories.length === 0) return 1;

    const factors = {
      recentActivity: memories.filter(m => Date.now() - m.lastAccessed.getTime() < 7 * 24 * 60 * 60 * 1000).length / memories.length,
      consolidationRate: memories.filter(m => m.consolidationLevel > 0.5).length / memories.length,
      importanceDistribution: memories.filter(m => m.importance > 0.5).length / memories.length,
      diversityFactor: new Set(memories.map(m => m.type)).size / 5 // 5 memory types
    };

    return (factors.recentActivity + factors.consolidationRate + factors.importanceDistribution + factors.diversityFactor) / 4;
  }

  private async runConsolidationCycle(): Promise<void> {
    console.log('🔄 Running memory consolidation cycle...');
    
    for (const [memoryId, memory] of this.memoryCache.entries()) {
      // Apply consolidation rules
      for (const rule of this.consolidationRules) {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(memory.content) && memory.importance >= rule.consolidation_threshold) {
          memory.consolidationLevel = Math.min(memory.consolidationLevel + 0.1, 1);
        }
      }

      // Consolidate frequently accessed memories
      if (memory.accessCount > 5) {
        memory.consolidationLevel = Math.min(memory.consolidationLevel + 0.05, 1);
      }

      this.memoryCache.set(memoryId, memory);
    }
  }

  private async runDecayCycle(): Promise<void> {
    console.log('⏳ Running memory decay cycle...');
    
    for (const [memoryId, memory] of this.memoryCache.entries()) {
      const daysSinceAccess = (Date.now() - memory.lastAccessed.getTime()) / (24 * 60 * 60 * 1000);
      
      // Apply decay based on time since last access and importance
      const decayAmount = this.MEMORY_DECAY_RATE * (1 - memory.importance) * Math.log(daysSinceAccess + 1);
      memory.decayFactor = Math.max(memory.decayFactor - decayAmount, 0);

      // Remove severely decayed memories with low importance
      if (memory.decayFactor < 0.1 && memory.importance < this.IMPORTANCE_THRESHOLD) {
        await this.deleteMemory(memoryId, memory.userId);
      } else {
        this.memoryCache.set(memoryId, memory);
      }
    }
  }

  private async runWeeklyMaintenance(): Promise<void> {
    console.log('🧹 Running weekly memory maintenance...');
    
    // Clean up orphaned associations
    for (const [memoryId, memory] of this.memoryCache.entries()) {
      memory.associatedMemories = memory.associatedMemories.filter(id => this.memoryCache.has(id));
      this.memoryCache.set(memoryId, memory);
    }

    // Update cluster health
    for (const [clusterId, cluster] of this.clusterCache.entries()) {
      cluster.memory_ids = cluster.memory_ids.filter(id => this.memoryCache.has(id));
      if (cluster.memory_ids.length === 0) {
        this.clusterCache.delete(clusterId);
      } else {
        cluster.cluster_strength = cluster.memory_ids.length / 10;
        this.clusterCache.set(clusterId, cluster);
      }
    }

    console.log('✅ Weekly memory maintenance completed');
  }

  async shutdown(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      console.log('🔌 Long-term memory service shutdown complete');
    } catch (error) {
      console.error('Error during memory service shutdown:', error);
    }
  }
}

export const longTermMemoryService = new LongTermMemoryService();