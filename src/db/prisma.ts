// Create a single PrismaClient instance across the app to avoid exhausting DB connections.
// In a normal serverless environment you would guard with `globalThis`. For this long-running
// Discord bot process, a simple singleton is sufficient.

let prisma: any;

// Use mock in test environment or when Prisma client is not available
if (process.env.NODE_ENV === 'test') {
  try {
    // Try to import the real PrismaClient first
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
  } catch (error) {
    // Fall back to mock if PrismaClient is not available
    console.log('⚠️ Using mock Prisma client for tests (real client not available)');
    const { mockPrisma } = require('./prisma-mock.js');
    prisma = mockPrisma;
  }
} else {
  try {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
  } catch (error) {
    console.error('❌ PrismaClient not available. Run "npx prisma generate" to generate the client.');
    throw error;
  }
}

export { prisma };
