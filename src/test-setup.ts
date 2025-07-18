/**
 * Test environment setup
 * Configures logging and other test-specific behaviors
 */

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
  
  // Ensure Prisma connections are closed after all tests to avoid open handles
  import('./db/prisma.js')
    .then(({ prisma }) => {
      afterAll(async () => {
        try {
          await prisma.$disconnect();
        } catch (_) {
          // ignore
        }
      });
    })
    .catch(() => {/* prisma not available */});

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
    if (typeof (id as any)?.unref === 'function') {
      (id as any).unref();
    }
    globalIntervals.push(id);
    return id;
  }) as typeof setInterval;

  global.setTimeout = ((fn: (...args: unknown[]) => unknown, delay?: number, ...args: unknown[]): ReturnType<typeof setTimeout> => {
    const id = originalSetTimeout(fn, delay as number, ...args);
    if (typeof (id as any)?.unref === 'function') {
      (id as any).unref();
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
