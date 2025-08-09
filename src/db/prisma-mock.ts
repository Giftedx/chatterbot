/**
 * Mock Prisma Client for Testing
 * 
 * This provides a mock implementation of PrismaClient that can be used
 * when the real Prisma client cannot be generated (e.g., in CI environments
 * without database access).
 */

export class MockPrismaClient {
  // Mock data stores
  private personas = new Map();
  private analyticsEvents = new Map();
  private moderationConfigs = new Map();
  private moderationIncidents = new Map();
  private userMemories = new Map();
  private conversationThreads = new Map();
  private conversationMessages = new Map();
  private knowledgeEntries = new Map();
  private escalationTickets = new Map();
  private interactionLogs = new Map();

  // Auto-increment counters
  private counters = {
    personas: 1,
    analyticsEvents: 1,
    moderationConfigs: 1,
    moderationIncidents: 1,
    userMemories: 1,
    conversationThreads: 1,
    conversationMessages: 1,
    knowledgeEntries: 1,
    escalationTickets: 1,
    interactionLogs: 1
  };

  // Mock implementation for each model
  persona = {
    create: async (data: any) => {
      const id = this.counters.personas++;
      const persona = { id, ...data.data, createdAt: new Date(), updatedAt: new Date() };
      this.personas.set(id, persona);
      return persona;
    },
    findMany: async () => {
      return Array.from(this.personas.values());
    },
    findUnique: async (query: any) => {
      return this.personas.get(query.where.id) || null;
    },
    update: async (query: any) => {
      const existing = this.personas.get(query.where.id);
      if (existing) {
        const updated = { ...existing, ...query.data, updatedAt: new Date() };
        this.personas.set(query.where.id, updated);
        return updated;
      }
      return null;
    },
    delete: async (query: any) => {
      const deleted = this.personas.get(query.where.id);
      this.personas.delete(query.where.id);
      return deleted;
    }
  };

  analyticsEvent = {
    create: async (data: any) => {
      const id = this.counters.analyticsEvents++;
      const event = { id, ...data.data, timestamp: new Date() };
      this.analyticsEvents.set(id, event);
      return event;
    },
    findMany: async () => {
      return Array.from(this.analyticsEvents.values());
    },
    count: async () => {
      return this.analyticsEvents.size;
    }
  };

  moderationConfig = {
    create: async (data: any) => {
      const id = this.counters.moderationConfigs++;
      const config = { id, ...data.data, createdAt: new Date(), updatedAt: new Date() };
      this.moderationConfigs.set(id, config);
      return config;
    },
    findUnique: async (query: any) => {
      return Array.from(this.moderationConfigs.values()).find(c => c.guildId === query.where.guildId) || null;
    },
    upsert: async (query: any) => {
      const existing = Array.from(this.moderationConfigs.values()).find(c => c.guildId === query.where.guildId);
      if (existing) {
        const updated = { ...existing, ...query.update, updatedAt: new Date() };
        this.moderationConfigs.set(existing.id, updated);
        return updated;
      } else {
        const id = this.counters.moderationConfigs++;
        const created = { id, ...query.create, createdAt: new Date(), updatedAt: new Date() };
        this.moderationConfigs.set(id, created);
        return created;
      }
    },

    deleteMany: async () => {
      const count = this.moderationConfigs.size;
      this.moderationConfigs.clear();
      return { count };
    },
    delete: async (query: any) => {
      const toDelete = Array.from(this.moderationConfigs.entries()).find(([_, config]) => 
        config.guildId === query.where.guildId
      );
      
      if (toDelete) {
        this.moderationConfigs.delete(toDelete[0]);
        return toDelete[1];
      }
      
      return null;
    }
  };

  moderationIncident = {
    create: async (data: any) => {
      const id = this.counters.moderationIncidents++;
      const incident = { id, ...data.data, createdAt: new Date() };
      this.moderationIncidents.set(id, incident);
      return incident;
    },
    findMany: async () => {
      return Array.from(this.moderationIncidents.values());
    },
    deleteMany: async () => {
      const count = this.moderationIncidents.size;
      this.moderationIncidents.clear();
      return { count };
    }
  };

  userMemory = {
    create: async (data: any) => {
      const id = this.counters.userMemories++;
      const memory = { id, ...data.data, createdAt: new Date(), lastUpdated: new Date() };
      this.userMemories.set(id, memory);
      return memory;
    },
    findFirst: async (query: any) => {
      return Array.from(this.userMemories.values()).find(m => 
        m.userId === query.where.userId && 
        m.guildId === (query.where.guildId || '')

      ) || null;
    },
    findUnique: async (query: any) => {
      return Array.from(this.userMemories.values()).find(m => 
        m.userId === query.where.userId_guildId?.userId && m.guildId === query.where.userId_guildId?.guildId
      ) || null;
    },
    findMany: async (query: any) => {
      let memories = Array.from(this.userMemories.values());
      if (query?.where?.userId) {
        memories = memories.filter(m => m.userId === query.where.userId);
      }
      if (query?.where?.guildId) {
        memories = memories.filter(m => m.guildId === query.where.guildId);
      }
      if (query?.where?.userId?.startsWith) {
        memories = memories.filter(m => m.userId.startsWith(query.where.userId.startsWith));
      }
      return memories;
    },
    upsert: async (query: any) => {
      const whereClause = query.where.userId_guildId;
      const existing = Array.from(this.userMemories.values()).find(m => 
        m.userId === whereClause.userId && m.guildId === whereClause.guildId
      );
      if (existing) {
        const updated = { ...existing, ...query.update, lastUpdated: new Date() };
        this.userMemories.set(existing.id, updated);
        return updated;
      } else {
        const id = this.counters.userMemories++;
        const created = { id, ...query.create, createdAt: new Date(), lastUpdated: new Date() };
        this.userMemories.set(id, created);
        return created;
      }
    },
    update: async (query: any) => {
      const whereClause = query.where.userId_guildId;
      const existing = Array.from(this.userMemories.values()).find(m => 
        m.userId === whereClause.userId && m.guildId === whereClause.guildId
      );
      if (existing) {
        const updated = { ...existing, ...query.data, lastUpdated: new Date() };
        this.userMemories.set(existing.id, updated);
        return updated;
      }
      return null;
    },
    deleteMany: async (query: any) => {
      const where = query?.where;
      let count = 0;
      
      if (where?.userId?.startsWith) {
        // Handle startsWith query
        const prefix = where.userId.startsWith;
        const toDelete = Array.from(this.userMemories.entries()).filter(([_, memory]) => 
          memory.userId.startsWith(prefix)
        );
        toDelete.forEach(([id, _]) => {
          this.userMemories.delete(id);
          count++;
        });
      } else {
        // Delete all if no specific where clause
        count = this.userMemories.size;
        this.userMemories.clear();
      }
      
      return { count };
    },
    delete: async (query: any) => {
      const whereClause = query.where.userId_guildId;
      const toDelete = Array.from(this.userMemories.entries()).find(([_, memory]) => 
        memory.userId === whereClause.userId && memory.guildId === whereClause.guildId
      );
      
      if (toDelete) {
        this.userMemories.delete(toDelete[0]);
        return toDelete[1];
      }
      
      return null;
    }
  };

  knowledgeEntry = {
    create: async (data: any) => {
      const id = `knowledge_${this.counters.knowledgeEntries++}`;
      const entry = { id, ...data.data, createdAt: new Date(), updatedAt: new Date() };
      this.knowledgeEntries.set(id, entry);
      return entry;
    },
    findMany: async () => {
      return Array.from(this.knowledgeEntries.values());
    }
  };

  escalationTicket = {
    create: async (data: any) => {
      const id = `ticket_${this.counters.escalationTickets++}`;
      const ticket = { id, ...data.data, createdAt: new Date(), updatedAt: new Date() };
      this.escalationTickets.set(id, ticket);
      return ticket;
    },
    findMany: async () => {
      return Array.from(this.escalationTickets.values());
    }
  };

  interactionLog = {
    create: async (data: any) => {
      const id = `log_${this.counters.interactionLogs++}`;
      const log = { id, ...data.data, createdAt: new Date() };
      this.interactionLogs.set(id, log);
      return log;
    },
    findMany: async () => {
      return Array.from(this.interactionLogs.values());
    }
  };

  // Mock connection methods  
  async $connect() {
    return Promise.resolve();
  }
  
  async $disconnect() {
    return Promise.resolve();
  }
  
  async $transaction(fn: any) {
    return Promise.resolve(fn(this));
  }

  // Clear all data (useful for test cleanup)
  $reset() {
    this.personas.clear();
    this.analyticsEvents.clear();
    this.moderationConfigs.clear();
    this.moderationIncidents.clear();
    this.userMemories.clear();
    this.conversationThreads.clear();
    this.conversationMessages.clear();
    this.knowledgeEntries.clear();
    this.escalationTickets.clear();
    this.interactionLogs.clear();
    
    // Reset counters
    Object.keys(this.counters).forEach(key => {
      this.counters[key as keyof typeof this.counters] = 1;
    });
  }
}

export const mockPrisma = new MockPrismaClient();

// CommonJS export for tests that use require()
module.exports = { mockPrisma };