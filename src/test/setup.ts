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
(global as any).fetch = jest.fn();

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Global test utilities with proper typing
(global as any).testUtils = {
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
  
  mockDiscordInteraction: (commandName: string, options: any = {}) => ({
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
  
  mockOpenAIResponse: (flagged: boolean, categories: any = {}) => ({
    results: [{
      flagged,
      categories,
      category_scores: Object.keys(categories).reduce((acc, key) => {
        acc[key] = categories[key] ? 0.9 : 0.1;
        return acc;
      }, {} as any)
    }]
  })
}; 