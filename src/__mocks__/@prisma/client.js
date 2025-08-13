// Jest mock for @prisma/client
// Provides mock implementations for Prisma client methods

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
  }
};

// Export as both default and named export for compatibility
module.exports = {
  PrismaClient: jest.fn(() => mockPrismaClient),
  mockPrismaClient
};

module.exports.default = mockPrismaClient;