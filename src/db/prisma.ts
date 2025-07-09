// Create a single PrismaClient instance across the app to avoid exhausting DB connections.
// In a normal serverless environment you would guard with `globalThis`. For this long-running
// Discord bot process, a simple singleton is sufficient.

import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | any;

// Use mock in test environment when needed
if (process.env.NODE_ENV === 'test') {
  try {
    // Try to create the real PrismaClient first
    prisma = new PrismaClient();
  } catch (error) {
    // Fall back to mock if PrismaClient is not available
    console.log('⚠️ Using mock Prisma client for tests (real client not available)');
    const { mockPrisma } = await import('./prisma-mock.js');
    prisma = mockPrisma;
  }
} else {
  try {
    prisma = new PrismaClient();
  } catch (error) {
    console.error('❌ PrismaClient not available. Run "npx prisma generate" to generate the client.');
    throw error;
  }
}

export { prisma };
