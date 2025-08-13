// Jest mock for @prisma/client
// Provides mock implementations for Prisma client methods

// Simple in-memory stores for select models used in tests
const __db = {
  moderationConfigs: new Map(),
  moderationIncidents: [],
  userMemories: new Map(),
  analytics: []
};

const mockPrismaClient = {
  // Mock Persona model operations
  persona: {
    findMany: jest.fn(() => Promise.resolve([])),
    findUnique: jest.fn(() => Promise.resolve(null)),
    findFirst: jest.fn(() => Promise.resolve(null)),
    create: jest.fn((data) => Promise.resolve({ id: 1, ...data.data })),
    update: jest.fn((params) => Promise.resolve({ id: 1, ...params.data })),
    upsert: jest.fn((params) => Promise.resolve({ 
      id: 1, 
      ...params.create,
      ...params.update 
    })),
    delete: jest.fn(() => Promise.resolve({ id: 1 })),
    deleteMany: jest.fn(() => Promise.resolve({ count: 0 }))
  },

  // Mock User model operations
  user: {
    findMany: jest.fn(() => Promise.resolve([])),
    findUnique: jest.fn(() => Promise.resolve(null)),
    findFirst: jest.fn(() => Promise.resolve(null)),
    create: jest.fn((data) => Promise.resolve({ id: 'user1', ...data.data })),
    update: jest.fn((params) => Promise.resolve({ id: 'user1', ...params.data })),
    upsert: jest.fn((params) => Promise.resolve({ 
      id: 'user1', 
      ...params.create,
      ...params.update 
    })),
    delete: jest.fn(() => Promise.resolve({ id: 'user1' })),
    deleteMany: jest.fn(() => Promise.resolve({ count: 0 }))
  },

  // Mock UserMemory model operations
  userMemory: {
    findMany: jest.fn((params) => {
      const items = Array.from(__db.userMemories.values());
      if (params?.where?.userId) {
        return Promise.resolve(items.filter(i => i.userId === params.where.userId));
      }
      return Promise.resolve(items);
    }),
    findUnique: jest.fn((params) => {
      const key = `${params.where?.userId_guildId?.userId || ''}:${params.where?.userId_guildId?.guildId || ''}`;
      return Promise.resolve(__db.userMemories.get(key) || null);
    }),
    findFirst: jest.fn((params) => {
      const userId = params?.where?.userId;
      const guildId = params?.where?.guildId ?? '';
      const key = `${userId}:${guildId}`;
      return Promise.resolve(__db.userMemories.get(key) || null);
    }),
    create: jest.fn(({ data }) => {
      const key = `${data.userId}:${data.guildId ?? ''}`;
      const record = { id: key, ...data };
      __db.userMemories.set(key, record);
      return Promise.resolve(record);
    }),
    update: jest.fn((params) => {
      const key = `${params.where?.userId_guildId?.userId}:${params.where?.userId_guildId?.guildId || ''}`;
      const existing = __db.userMemories.get(key) || { id: key, userId: params.where?.userId_guildId?.userId, guildId: params.where?.userId_guildId?.guildId || '' };
      const updated = { ...existing, ...params.data };
      __db.userMemories.set(key, updated);
      return Promise.resolve(updated);
    }),
    upsert: jest.fn((params) => {
      const key = `${params.where?.userId_guildId?.userId}:${params.where?.userId_guildId?.guildId || ''}`;
      const existing = __db.userMemories.get(key);
      const record = existing ? { ...existing, ...params.update } : { id: key, ...params.create };
      __db.userMemories.set(key, record);
      return Promise.resolve(record);
    }),
    delete: jest.fn((params) => {
      const key = `${params.where?.userId_guildId?.userId}:${params.where?.userId_guildId?.guildId || ''}`;
      const existed = __db.userMemories.get(key) || null;
      __db.userMemories.delete(key);
      return Promise.resolve(existed);
    }),
    deleteMany: jest.fn((params) => {
      const before = __db.userMemories.size;
      if (params?.where?.userId) {
        for (const [k, v] of __db.userMemories.entries()) {
          if (v.userId === params.where.userId) __db.userMemories.delete(k);
        }
      } else {
        __db.userMemories.clear();
      }
      const after = __db.userMemories.size;
      return Promise.resolve({ count: before - after });
    })
  },

  // Mock Memory model operations
  memory: {
    findMany: jest.fn(() => Promise.resolve([])),
    findUnique: jest.fn(() => Promise.resolve(null)),
    findFirst: jest.fn(() => Promise.resolve(null)),
    create: jest.fn((data) => Promise.resolve({ id: 'mem1', ...data.data })),
    update: jest.fn((params) => Promise.resolve({ id: 'mem1', ...params.data })),
    upsert: jest.fn((params) => Promise.resolve({ 
      id: 'mem1', 
      ...params.create,
      ...params.update 
    })),
    delete: jest.fn(() => Promise.resolve({ id: 'mem1' })),
    deleteMany: jest.fn(() => Promise.resolve({ count: 0 }))
  },

  // Mock ConversationMessage model operations
  conversationMessage: {
    findMany: jest.fn(() => Promise.resolve([])),
    findUnique: jest.fn(() => Promise.resolve(null)),
    findFirst: jest.fn(() => Promise.resolve(null)),
    create: jest.fn((data) => Promise.resolve({ id: 1, ...data.data })),
    update: jest.fn((params) => Promise.resolve({ id: 1, ...params.data })),
    upsert: jest.fn((params) => Promise.resolve({ 
      id: 1, 
      ...params.create,
      ...params.update 
    })),
    delete: jest.fn(() => Promise.resolve({ id: 1 })),
    deleteMany: jest.fn(() => Promise.resolve({ count: 0 }))
  },

  // ModerationConfig model with in-memory behavior
  moderationConfig: {
    findUnique: jest.fn((params) => {
      const key = params?.where?.guildId;
      return Promise.resolve(key ? (__db.moderationConfigs.get(key) || null) : null);
    }),
    upsert: jest.fn((params) => {
      const guildId = params?.where?.guildId;
      const payload = {
        guildId,
        strictnessLevel: params?.update?.strictnessLevel ?? params?.create?.strictnessLevel ?? 'medium',
        enabledFeatures: params?.update?.enabledFeatures ?? params?.create?.enabledFeatures ?? JSON.stringify(['text','image']),
        logChannelId: params?.update?.logChannelId ?? params?.create?.logChannelId ?? null,
        autoDeleteUnsafe: params?.update?.autoDeleteUnsafe ?? params?.create?.autoDeleteUnsafe ?? true,
        customKeywords: params?.update?.customKeywords ?? params?.create?.customKeywords ?? '[]'
      };
      __db.moderationConfigs.set(guildId, payload);
      return Promise.resolve(payload);
    }),
    delete: jest.fn((params) => {
      const key = params?.where?.guildId;
      const existed = __db.moderationConfigs.get(key) || null;
      __db.moderationConfigs.delete(key);
      return Promise.resolve(existed);
    }),
    deleteMany: jest.fn(() => {
      const count = __db.moderationConfigs.size;
      __db.moderationConfigs.clear();
      return Promise.resolve({ count });
    }),
    findMany: jest.fn(() => Promise.resolve(Array.from(__db.moderationConfigs.values())))
  },

  // ModerationIncident model with in-memory behavior
  moderationIncident: {
    create: jest.fn(({ data }) => {
      const id = __db.moderationIncidents.length + 1;
      const incident = {
        id,
        ...data,
        createdAt: data?.createdAt || new Date()
      };
      __db.moderationIncidents.push(incident);
      return Promise.resolve(incident);
    }),
    findMany: jest.fn((params = {}) => {
      let items = __db.moderationIncidents.slice();
      const where = params.where || {};
      if (where.guildId) items = items.filter(i => i.guildId === where.guildId);
      if (where.createdAt?.gte) items = items.filter(i => i.createdAt >= where.createdAt.gte);
      if (where.createdAt?.lt) items = items.filter(i => i.createdAt < where.createdAt.lt);
      if (params.orderBy?.createdAt === 'desc') items.sort((a,b) => b.createdAt - a.createdAt);
      if (params.take) items = items.slice(0, params.take);
      return Promise.resolve(items);
    }),
    deleteMany: jest.fn((params = {}) => {
      const before = __db.moderationIncidents.length;
      const where = params.where || {};
      if (where.createdAt?.lt) {
        __db.moderationIncidents = __db.moderationIncidents.filter(i => !(i.createdAt < where.createdAt.lt));
      } else {
        __db.moderationIncidents = [];
      }
      const after = __db.moderationIncidents.length;
      return Promise.resolve({ count: before - after });
    })
  },

  // Mock analyticsEvent model with in-memory behavior
  analyticsEvent: {
    create: jest.fn(({ data }) => {
      const id = __db.analytics.length + 1;
      const event = { id, ...data, timestamp: new Date() };
      __db.analytics.push(event);
      return Promise.resolve(event);
    }),
    findMany: jest.fn(() => Promise.resolve(__db.analytics.slice())),
    count: jest.fn(() => Promise.resolve(__db.analytics.length)),
    deleteMany: jest.fn(() => { const count = __db.analytics.length; __db.analytics = []; return Promise.resolve({ count }); })
  },

  // Mock transaction operations
  $transaction: jest.fn((operations) => {
    if (Array.isArray(operations)) {
      return Promise.resolve(operations.map(() => ({ success: true })));
    }
    if (typeof operations === 'function') {
      return operations(mockPrismaClient);
    }
    return Promise.resolve([]);
  }),

  // Mock database operations
  $connect: jest.fn(() => Promise.resolve()),
  $disconnect: jest.fn(() => Promise.resolve()),
  $executeRaw: jest.fn(() => Promise.resolve(0)),
  $queryRaw: jest.fn(() => Promise.resolve([])),

  // Helper methods for test utilities
  _reset: () => {
    Object.values(mockPrismaClient).forEach(model => {
      if (model && typeof model === 'object') {
        Object.values(model).forEach(method => {
          if (jest.isMockFunction(method)) {
            method.mockClear();
          }
        });
      }
    });
    __db.moderationConfigs.clear();
    __db.moderationIncidents = [];
    __db.userMemories.clear();
    __db.analytics = [];
  }
};

// Export as both default and named export for compatibility
module.exports = {
  PrismaClient: jest.fn(() => mockPrismaClient),
  mockPrismaClient
};

module.exports.default = mockPrismaClient;