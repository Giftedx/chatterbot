// Create a single PrismaClient instance across the app to avoid exhausting DB connections.
// In a normal serverless environment you would guard with `globalThis`. For this long-running
// Discord bot process, a simple singleton is sufficient.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any;

const isTest = process.env.NODE_ENV === 'test';

if (isTest) {
  // If the test environment pre-injected a prisma instance, use it
  // This is set in jest setupFiles to avoid ESM/CJS interop timing issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const injected = (globalThis as any).__TEST_PRISMA__;
  if (injected) {
    prisma = injected;
  } else {
    // Fallback to manual mock
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { mockPrismaClient } = require('../__mocks__/@prisma/client.js');
    prisma = mockPrismaClient;
  }
} else {
  // Non-test environments: create a real Prisma client when first requested
  // Use dynamic import to avoid hard dependency on generated client at load time
  // This allows the app to show a clear error if generate hasn't been run yet
}

async function createRealClient() {
  try {
    // Dynamic import to avoid compile-time dependency on generated Prisma client types
    const mod: any = await import('@prisma/client');
    const ClientCtor = mod?.PrismaClient || mod?.default?.PrismaClient || mod;
    if (!ClientCtor) throw new Error('PrismaClient constructor not found');
    return new ClientCtor();
  } catch (error) {
    throw new Error('❌ PrismaClient not available. Run "npx prisma generate" to generate the client.');
  }
}

// Helper: get prisma instance, initializing real client in non-test envs as needed
async function getPrisma() {
  if (!prisma) {
    prisma = await createRealClient();
  }
  return prisma;
}

export { prisma, getPrisma };

// CommonJS interop for test files that use require('../../db/prisma.js')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;
try {
  if (typeof module !== 'undefined' && module?.exports != null) {
    module.exports = { prisma, getPrisma };
  }
} catch {
  // ignore if not available
}
