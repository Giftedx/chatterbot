/**
 * Test environment setup
 * Configures logging and other test-specific behaviors
 */

// Setup global mocks before other imports
// Note: @prisma/client is mapped via jest.config.js moduleNameMapper to our manual mock

// Suppress console output during tests except for errors
if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === undefined) {
  // Provide safe default env vars to avoid throwing in integration paths during tests
  process.env.NODE_ENV = 'test';
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key';
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key';
  process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || 'test-key';
  process.env.MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || 'test-key';
  process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'test-token';
  process.env.DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || 'test-client-id';
  process.env.DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || 'test-guild';
  // Feature flags default off for deterministic tests unless a test enables them
  process.env.ENABLE_AGENTIC_INTELLIGENCE = process.env.ENABLE_AGENTIC_INTELLIGENCE || 'false';
  process.env.ENABLE_ENHANCED_INTELLIGENCE = process.env.ENABLE_ENHANCED_INTELLIGENCE || 'false';
  process.env.ENABLE_ANSWER_VERIFICATION = process.env.ENABLE_ANSWER_VERIFICATION || 'false';
  process.env.FEATURE_LANGGRAPH = process.env.FEATURE_LANGGRAPH || 'false';
  process.env.FEATURE_VERCEL_AI = process.env.FEATURE_VERCEL_AI || 'false';
  process.env.FEATURE_PGVECTOR = process.env.FEATURE_PGVECTOR || 'false';

  // Override console methods to be silent except for errors and warnings
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalDebug = console.debug;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};

  // Keep errors and warnings visible for debugging test failures
  // console.error remains unchanged; console.warn is filtered to reduce noise from expected fallbacks
  // Filter only specific, known-noisy error patterns from external providers so tests remain readable
  console.error = (...args: unknown[]) => {
    const text = args
      .map((a) => {
        if (typeof a === 'string') return a;
        if (a && typeof a === 'object' && 'message' in (a as Record<string, unknown>)) {
          const m = (a as { message?: unknown }).message;
          return typeof m === 'string' ? m : '';
        }
        try {
          return JSON.stringify(a);
        } catch {
          return '';
        }
      })
      .join(' ');

    const silenceErrorPatterns = [
      'MODEL_AUTHENTICATION',
      'invalid_api_key',
      'Incorrect API key provided',
      'AI intent classification failed:',
      // LangGraph analysis fallback noise under tests
      'Analysis failed:',
      // Unified analytics negative-path test noise
      'Failed to log interaction:',
      // Provider-only auth failures that are expected in CI without real keys
      'API key not valid. Please pass a valid API key.',
      // Property-based web tests intentionally trigger invalid URL branches
      'TypeError: Invalid URL',
      // Core intelligence service intentionally exercised failure branches
      // in tests produce critical error logs; keep assertions visible while
      // silencing these known noisy messages
      'Critical Error in _processPromptAndGenerateResponse',
      'Critical: Failed to generate agentic response',
      'Critical: Failed to analyze input',
      'Critical: Failed to aggregate agentic context',
    ];
    if (silenceErrorPatterns.some((p) => text.includes(p))) return;
    originalError(...(args as Parameters<typeof console.error>));
  };
  console.warn = (...args: unknown[]) => {
    // Build a combined text snapshot from warn args for simple pattern checks
    const text = args
      .map((a) => {
        if (typeof a === 'string') return a;
        if (a && typeof a === 'object' && 'message' in (a as Record<string, unknown>)) {
          const m = (a as { message?: unknown }).message;
          return typeof m === 'string' ? m : '';
        }
        try {
          return JSON.stringify(a);
        } catch {
          return '';
        }
      })
      .join(' ');

    // Silence noisy expected warnings from external provider fallbacks during tests
    // Examples:
    //  - 'Gemini AI failed, using local reasoning: ... API key not valid ...'
    //  - 'Failed to generate embedding, using fallback: AuthenticationError: 401 Incorrect API key provided'
    //  - Messages containing MODEL_AUTHENTICATION / invalid_api_key
    const silencePatterns = [
      'Gemini AI failed, using local reasoning',
      'API key not valid. Please pass a valid API key.',
      'Failed to generate embedding, using fallback',
      'Incorrect API key provided',
      'MODEL_AUTHENTICATION',
      'invalid_api_key',
      // Property-based web interaction tests generate random strings that are not valid URLs
      // and intentionally exercise the fallback path. Silence those expected warnings.
      'Web interaction failed, using fallback',
      'Failed to scrape ',
      'TypeError: Invalid URL',
      'ERR_INVALID_URL',
      // MCP production integration tests trigger fallback logs intentionally
      'function not available in current environment',
      'function not available',
      'fallback for test',
      'MCP Tools Service initialization failed',
      // TFJS Node advisory
      'TensorFlow.js in Node.js',
      // Provider/client mock advisories
      'OpenAI client not available, using mock response',
      // Qdrant noisy client/network warnings surfaced after tests complete
      // (not all messages include the word "Qdrant", so include the concrete phrases)
      'Failed to obtain server version',
      'Unable to check client-server compatibility',
      'checkCompatibility=false to skip version check',
      'Qdrant',
      'QDRANT',
      'qdrant',
      // Jest prints this when something logs after teardown; swallow to keep output clean
      'Cannot log after tests are done',
    ];
    if (silencePatterns.some((p) => text.includes(p))) {
      return; // ignore expected provider warnings in test mode
    }
    originalWarn(...(args as Parameters<typeof console.warn>));
  };

  // Optionally restore logging for specific test cases if needed
  (global as unknown as { restoreConsole: () => void }).restoreConsole = () => {
    console.log = originalLog;
    console.info = originalInfo;
    console.debug = originalDebug;
    console.warn = originalWarn;
    console.error = originalError;
  };

  // Setup mocked Prisma for tests
  let mockPrismaInstance: any;

  beforeAll(async () => {
    try {
      // Use the mocked prisma client
      const { mockPrismaClient } = await import('./__mocks__/@prisma/client.js');
      mockPrismaInstance = mockPrismaClient;
      // Make prisma available synchronously for modules that import prisma at top-level
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).__TEST_PRISMA__ = mockPrismaInstance;
      // Also attach to a shape compatible with require('../../db/prisma.js') consumers once loaded
      // Consumers import { prisma } from '../../db/prisma.js'; once the module evaluates, it will read this

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
  global.setInterval = ((
    fn: (...args: unknown[]) => unknown,
    delay?: number,
    ...args: unknown[]
  ): ReturnType<typeof setInterval> => {
    const id = originalSetInterval(fn, delay as number, ...args);
    if (typeof (id as { unref?: () => void })?.unref === 'function') {
      (id as { unref: () => void }).unref();
    }
    globalIntervals.push(id);
    return id;
  }) as typeof setInterval;

  global.setTimeout = ((
    fn: (...args: unknown[]) => unknown,
    delay?: number,
    ...args: unknown[]
  ): ReturnType<typeof setTimeout> => {
    const id = originalSetTimeout(fn, delay as number, ...args);
    if (typeof (id as { unref?: () => void })?.unref === 'function') {
      (id as { unref: () => void }).unref();
    }
    globalIntervals.push(id);
    return id;
  }) as typeof setTimeout;

  global.setImmediate = ((
    fn: (...args: unknown[]) => unknown,
    ...args: unknown[]
  ): ReturnType<typeof setImmediate> => {
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
