// Create a single PrismaClient instance across the app to avoid exhausting DB connections.
// In a normal serverless environment you would guard with `globalThis`. For this long-running
// Discord bot process, a simple singleton is sufficient.

// Use dynamic import to avoid compile-time dependency on generated Prisma client types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any;

async function createRealClient() {
  try {
    const mod: any = await import('@prisma/client');
    const ClientCtor = mod?.PrismaClient || mod?.default?.PrismaClient || mod;
    if (!ClientCtor) throw new Error('PrismaClient constructor not found');
    return new ClientCtor();
  } catch (error) {
    throw new Error('❌ PrismaClient not available. Run "npx prisma generate" to generate the client.');
  }
}

// Initialize Prisma client depending on environment
async function initializePrisma() {
  if (process.env.NODE_ENV === 'test') {
    try {
      prisma = await createRealClient();
    } catch {
      // Fall back to mock if PrismaClient is not available
      const { mockPrisma } = await import('./prisma-mock.js');
      prisma = mockPrisma;
    }
  } else {
    prisma = await createRealClient();
  }
  return prisma;
}

// Initialize synchronously for non-test environments, mock for tests
if (process.env.NODE_ENV === 'test') {
  try {
    // Prefer jest manual mock if provided
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jestMock = require('@prisma/client');
    const MockCtor = jestMock?.PrismaClient;
    if (MockCtor) {
      prisma = new MockCtor();
    }
  } catch {
    // Fall back to our local mock
  }
  if (!prisma) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    import('./prisma-mock.js').then(({ mockPrisma }) => { prisma = mockPrisma; });
  }
} else {
  // Best-effort initialize real client synchronously
  // Note: top-level await not available here, so keep uninitialized until first get
}

// Helper function to get prisma instance, initializing if needed
async function getPrisma() {
  if (!prisma) {
    return await initializePrisma();
  }
  return prisma;
}

export { prisma, getPrisma };
