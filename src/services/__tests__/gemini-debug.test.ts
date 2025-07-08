/**
 * Debug test to isolate Gemini mock issues
 */

// Define shared mock factory for resilience utilities so both path variants resolve
function resilienceMockFactory() {
  const monitor = jest.fn(async (op: string, fn: () => any) => {
    const res = await fn();
    console.log(`[DIAG] PerformanceMonitor.monitor op: ${op}, result:`, res);
    return res;
  });
  return {
    CircuitBreaker: jest.fn(() => ({ execute: jest.fn(async (fn: () => Promise<any>) => await fn()), getState: jest.fn(() => 'CLOSED') })),
    RetryUtility: { withRetry: jest.fn(async (fn: () => Promise<any>) => await fn()) },
    PerformanceMonitor: { monitor }
  };
}

// Mock resilience utilities matching import path used inside gemini.service.ts
jest.mock('../utils/resilience.js', resilienceMockFactory, { virtual: true });
// Also support mapper stripped variant
jest.mock('../utils/resilience', resilienceMockFactory, { virtual: true });



// Mock cache service to always return cache miss
jest.mock('../cache.service.js', () => ({
  CacheService: jest.fn().mockImplementation(() => ({
    get: jest.fn(() => {
      console.log('==> CACHE.get() called - returning null (cache miss)');
      return Promise.resolve(null);
    }),
    set: jest.fn((key, value, ttl) => {
      console.log('==> CACHE.set() called with:', { key: key.substring(0, 20), valueLength: String(value).length, ttl });
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      console.log('==> CACHE.clear() called');
      return Promise.resolve();
    }),
    delete: jest.fn(() => Promise.resolve(true)),
    getMetrics: jest.fn(() => ({ hits: 0, misses: 0, evictions: 0, totalRequests: 0, avgResponseTime: 0, memoryUsage: 0, hitRate: 0 })),
    getStatus: jest.fn(() => ({ size: 0, memoryUsage: 0, memoryUtilization: 0, sizeUtilization: 0 }))
  }))
}));

import { GeminiService } from '../gemini.service.js';
// No need to import GoogleGenerativeAI directly – GeminiService will create its own instance
import { CacheService } from '../cache.service.js';

// Simple mock to test basic functionality
jest.mock('@google/generative-ai', () => {
  console.log('Mocking GoogleGenerativeAI');
  return {
    GoogleGenerativeAI: jest.fn(() => {
      console.log('Creating GoogleGenerativeAI instance');
      return {
        getGenerativeModel: jest.fn((options) => {
          console.log('getGenerativeModel called with:', options);
          return {
            startChat: jest.fn((chatOptions) => {
              console.log('startChat called with:', chatOptions);
              return {
                sendMessage: jest.fn().mockImplementation(async (prompt) => {
                  console.log('==> MOCK sendMessage called with prompt:', prompt.substring(0, 50));
                  const result = {
                    response: {
                      text: jest.fn().mockReturnValue('TEST RESPONSE STRING')
                    }
                  };
                  console.log('==> MOCK sendMessage returning:', result);
                  return result;
                })
              };
            }),
            generateContent: jest.fn().mockImplementation(async (prompt) => {
              console.log('==> MOCK generateContent called with prompt:', prompt.substring(0, 50));
              const result = {
                response: {
                  text: jest.fn().mockReturnValue('TEST RESPONSE STRING')
                }
              };
              console.log('==> MOCK generateContent returning:', result);
              return result;
            })
          };
        })
      };
    }),
    HarmBlockThreshold: {
      BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    HarmCategory: {
      HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
      HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT'
    }
  };
});

jest.mock('../persona-manager.js', () => ({
  getActivePersona: jest.fn(() => ({
    name: 'Test Assistant',
    systemPrompt: 'You are a helpful assistant.'
  }))
}));

jest.mock('../utils/rate-limiter.js', () => ({
  RateLimiter: jest.fn(() => ({
    checkLimits: jest.fn().mockResolvedValue(undefined)
  }))
}));




// Mock cache utilities
jest.mock('../utils/cache-key-generator.js', () => ({
  CacheKeyGenerator: jest.fn(() => ({
    generateKey: jest.fn(() => 'test-cache-key')
  }))
}));

jest.mock('../utils/cache-metrics.js', () => ({
  CacheMetrics: jest.fn(() => ({
    recordHit: jest.fn(),
    recordMiss: jest.fn()
  }))
}));

jest.mock('../../config/cache-policies.js', () => ({
  CachePolicyManager: jest.fn(() => ({
    evaluatePolicy: jest.fn(() => ({ ttl: 300, name: 'test-policy' }))
  }))
}));

describe('Gemini Debug Test', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-api-key';
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it('should debug the full call flow', async () => {
    console.log('Starting debug test');
    
    // Create a mock CacheService instance
    const mockCacheService = {
      get: jest.fn(() => Promise.resolve(null)),
      set: jest.fn(() => Promise.resolve()),
      clear: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve(true)),
      getMetrics: jest.fn(() => ({ hits: 0, misses: 0, evictions: 0, totalRequests: 0, avgResponseTime: 0, memoryUsage: 0, hitRate: 0 })),
      getStatus: jest.fn(() => ({ size: 0, memoryUsage: 0, memoryUtilization: 0, sizeUtilization: 0 }))
    };

    process.env.GEMINI_API_KEY = 'dummy-key';
    const geminiService = new GeminiService(
      mockCacheService as unknown as CacheService
    );
    console.log('GeminiService created');
    
    // Clear cache to force generation
    geminiService.clearCache();
    console.log('Cache cleared');
    
    // Use unique values to avoid cache collisions
    const uniqueId = Date.now().toString();
    const result = await geminiService.generateResponse(
      `Test prompt ${uniqueId}`,
      [],
      `test-user-${uniqueId}`,
      `test-guild-${uniqueId}`
    );
    
    console.log('Final result:', JSON.stringify(result));
    expect(result).toBe('TEST RESPONSE STRING');
  });
});
