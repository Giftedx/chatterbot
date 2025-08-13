/**
 * Test environment setup
 * Configures logging and other test-specific behaviors
 */

// Setup global mocks before other imports
jest.mock('@prisma/client', () => require('./__mocks__/@prisma/client.js'));

// Suppress console output during tests except for errors
if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === undefined) {
  // Override console methods to be silent except for errors and warnings
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalDebug = console.debug;
  
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  
  // Keep errors and warnings visible for debugging test failures
  // console.error and console.warn remain unchanged
  
  // Optionally restore logging for specific test cases if needed
  (global as unknown as { restoreConsole: () => void }).restoreConsole = () => {
    console.log = originalLog;
    console.info = originalInfo;
    console.debug = originalDebug;
  };
  
  // Setup mocked Prisma for tests
  let mockPrismaInstance: any;
  
  beforeAll(async () => {
    try {
      // Use the mocked prisma client
      const { mockPrismaClient } = await import('./__mocks__/@prisma/client.js');
      mockPrismaInstance = mockPrismaClient;
      
      // Setup test database if real prisma is available  
      try {
        const { prisma } = await import('./db/prisma.js');
        // If real prisma is available, we can still use it for integration tests
        if (process.env.TEST_WITH_REAL_DB !== 'true') {
          // Override with mock for unit tests
          (global as any).mockPrisma = mockPrismaInstance;
        }
      } catch (_) {
        // Real prisma not available, use mock
        (global as any).mockPrisma = mockPrismaInstance;
      }
    } catch (error) {
      console.warn('Failed to setup test database:', error);
    }
  });
  
  afterAll(async () => {
    if (mockPrismaInstance?._reset) {
      mockPrismaInstance._reset();
    }
    
    // Cleanup real prisma connections if used
    try {
      const { prisma } = await import('./db/prisma.js');
      if (prisma && typeof prisma.$disconnect === 'function') {
        await prisma.$disconnect();
      }
    } catch (_) {
      // ignore cleanup errors
    }
  });

  // Reset mocks between tests
  beforeEach(() => {
    if (mockPrismaInstance?._reset) {
      mockPrismaInstance._reset();
    }
  });

  // --- Global timer tracking to clean up handles that keep Node alive ---
  type TimerHandle = NodeJS.Timeout;
  const globalIntervals: TimerHandle[] = [];
  const originalSetInterval = global.setInterval;
  const originalSetTimeout = global.setTimeout;
  const originalSetImmediate = global.setImmediate;

  const hasUnref = (h: unknown): h is { unref: () => void } =>
    typeof (h as { unref?: () => void }).unref === 'function';
  global.setInterval = ((fn: (...args: unknown[]) => unknown, delay?: number, ...args: unknown[]): ReturnType<typeof setInterval> => {
    const id = originalSetInterval(fn, delay as number, ...args);
    if (typeof (id as { unref?: () => void })?.unref === 'function') {
      (id as { unref: () => void }).unref();
    }
    globalIntervals.push(id);
    return id;
  }) as typeof setInterval;

  global.setTimeout = ((fn: (...args: unknown[]) => unknown, delay?: number, ...args: unknown[]): ReturnType<typeof setTimeout> => {
    const id = originalSetTimeout(fn, delay as number, ...args);
    if (typeof (id as { unref?: () => void })?.unref === 'function') {
      (id as { unref: () => void }).unref();
    }
    globalIntervals.push(id);
    return id;
  }) as typeof setTimeout;

  global.setImmediate = ((fn: (...args: unknown[]) => unknown, ...args: unknown[]): ReturnType<typeof setImmediate> => {
    const id = originalSetImmediate(fn, ...args);
    if (hasUnref(id)) {
      id.unref();
    }
    return id;
  }) as typeof setImmediate;

  afterAll(() => {
    for (const id of globalIntervals) {
      clearInterval(id);
    }
  });
}
