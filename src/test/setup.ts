/**
 * Jest Test Setup
 * Global configuration for all tests
 */

import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.BOT_TOKEN = 'test-bot-token';
process.env.GEMINI_API_KEY = 'test-gemini-key';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock fetch globally with proper typing
(global as { fetch: jest.Mock }).fetch = jest.fn();

// Mock Prisma Client - commented out for now due to type issues
// Will be re-enabled once Prisma client is properly generated
/*
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    // Mock implementation
  })),
}));
*/

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Global test utilities with proper typing
(global as { testUtils: Record<string, unknown> }).testUtils = {
  mockDiscordMessage: (content: string, author = 'test-user') => ({
    content,
    author: { id: author, username: author },
    channel: { id: 'test-channel' },
    guild: { id: 'test-guild' },
    member: { 
      roles: { 
        cache: new Map(),
        highest: { name: 'user' }
      },
      permissions: {
        has: jest.fn().mockReturnValue(true)
      }
    }
  }),
  
  mockDiscordInteraction: (commandName: string, options: Record<string, unknown> = {}) => ({
    commandName,
    options,
    user: { id: 'test-user', username: 'test-user' },
    channel: { id: 'test-channel' },
    guild: { id: 'test-guild' },
    member: {
      roles: { 
        cache: new Map(),
        highest: { name: 'user' }
      },
      permissions: {
        has: jest.fn().mockReturnValue(true)
      }
    },
    deferReply: jest.fn().mockResolvedValue(undefined as never),
    editReply: jest.fn().mockResolvedValue(undefined as never),
    reply: jest.fn().mockResolvedValue(undefined as never)
  }),
  
  mockGeminiResponse: (content: string) => ({
    candidates: [{
      content: {
        parts: [{ text: content }]
      }
    }]
  }),
  
  mockOpenAIResponse: (flagged: boolean, categories: Record<string, boolean> = {}) => ({
    results: [{
      flagged,
      categories,
      category_scores: Object.keys(categories).reduce((acc, key) => {
        acc[key] = categories[key] ? 0.9 : 0.1;
        return acc;
      }, {} as Record<string, number>)
    }]
  })
}; 