// jest.config.js
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts', // Main entry point
    '!src/config/config.ts' // Configuration file
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};

// tests/setup.ts
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global test setup
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Suppress logs during tests
});

// tests/utils/mocks.ts
import { jest } from '@jest/globals';

export const mockDiscordInteraction = {
  isChatInputCommand: jest.fn(() => true),
  commandName: 'chat',
  options: {
    getString: jest.fn(),
    getAttachment: jest.fn()
  },
  user: {
    id: 'test-user-123',
    displayName: 'TestUser'
  },
  deferReply: jest.fn(),
  editReply: jest.fn(),
  reply: jest.fn()
};

export const mockGeminiResponse = {
  text: 'This is a test response from Gemini AI',
  finishReason: 'STOP',
  safetyRatings: []
};

export const mockRedisClient = {
  connect: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  setEx: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn()
};

// Mock Gemini AI SDK
export const mockGeminiAPI = {
  getGenerativeModel: jest.fn(() => ({
    generateContent: jest.fn().mockResolvedValue({
      response: {
        text: () => mockGeminiResponse.text,
        candidates: [{
          finishReason: mockGeminiResponse.finishReason,
          safetyRatings: mockGeminiResponse.safetyRatings
        }]
      }
    }))
  }))
};

// tests/services/gemini.service.test.ts
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { GeminiService } from '../../src/services/gemini.service.js';
import { RateLimiter } from '../../src/utils/rate-limiter.js';
import { mockGeminiAPI, mockGeminiResponse } from '../utils/mocks.js';

// Mock external dependencies
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => mockGeminiAPI)
}));

jest.mock('../../src/utils/rate-limiter.js');
jest.mock('../../src/config/config.js', () => ({
  config: {
    gemini: {
      apiKey: 'test-api-key',
      model: 'gemini-2.5-flash'
    }
  }
}));

describe('GeminiService', () => {
  let geminiService: GeminiService;
  let mockRateLimiter: jest.Mocked<RateLimiter>;

  beforeEach(() => {
    mockRateLimiter = {
      checkLimits: jest.fn(),
      recordUsage: jest.fn(),
      getUserUsage: jest.fn(),
      getUsageStats: jest.fn(),
      initialize: jest.fn()
    } as any;

    geminiService = new GeminiService(mockRateLimiter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateResponse', () => {
    it('should generate a successful response', async () => {
      const prompt = 'Hello, how are you?';
      const userId = 'test-user-123';

      mockRateLimiter.checkLimits.mockResolvedValue(undefined);
      mockRateLimiter.recordUsage.mockResolvedValue(undefined);

      const result = await geminiService.generateResponse(prompt, userId);

      expect(result).toEqual(mockGeminiResponse);
      expect(mockRateLimiter.checkLimits).toHaveBeenCalledWith(userId, prompt.length);
      expect(mockRateLimiter.recordUsage).toHaveBeenCalledWith(
        userId, 
        prompt.length, 
        mockGeminiResponse.text.length
      );
    });

    it('should handle rate limit errors gracefully', async () => {
      const prompt = 'Test prompt';
      const userId = 'test-user-123';

      mockRateLimiter.checkLimits.mockRejectedValue(new Error('USER_MINUTE_LIMIT'));

      const result = await geminiService.generateResponse(prompt, userId);

      expect(result.text).toContain('Rate limit exceeded');
      expect(mockRateLimiter.recordUsage).not.toHaveBeenCalled();
    });

    it('should handle API errors with appropriate messages', async () => {
      const prompt = 'Test prompt';
      const userId = 'test-user-123';

      mockRateLimiter.checkLimits.mockResolvedValue(undefined);
      
      // Mock API error
      const apiError = new Error('API Error');
      (apiError as any).status = 400;
      mockGeminiAPI.getGenerativeModel().generateContent.mockRejectedValue(apiError);

      const result = await geminiService.generateResponse(prompt, userId);

      expect(result.text).toContain('Invalid request');
      expect(mockRateLimiter.recordUsage).not.toHaveBeenCalled();
    });

    it('should handle image analysis requests', async () => {
      const prompt = 'Analyze this image';
      const userId = 'test-user-123';
      const imageData = Buffer.from('fake-image-data');

      mockRateLimiter.checkLimits.mockResolvedValue(undefined);
      mockRateLimiter.recordUsage.mockResolvedValue(undefined);

      const result = await geminiService.generateResponse(prompt, userId, { imageData });

      expect(result).toEqual(mockGeminiResponse);
      expect(mockGeminiAPI.getGenerativeModel().generateContent).toHaveBeenCalledWith([
        { text: prompt },
        {
          inlineData: {
            data: imageData.toString('base64'),
            mimeType: 'image/jpeg'
          }
        }
      ]);
    });
  });

  describe('analyzeImage', () => {
    it('should call generateResponse with image analysis prompt', async () => {
      const imageData = Buffer.from('fake-image-data');
      const prompt = 'What do you see?';
      const userId = 'test-user-123';

      mockRateLimiter.checkLimits.mockResolvedValue(undefined);
      mockRateLimiter.recordUsage.mockResolvedValue(undefined);

      const result = await geminiService.analyzeImage(imageData, prompt, userId);

      expect(result).toEqual(mockGeminiResponse);
      expect(mockGeminiAPI.getGenerativeModel().generateContent).toHaveBeenCalledWith([
        { text: `Analyze this image: ${prompt}` },
        {
          inlineData: {
            data: imageData.toString('base64'),
            mimeType: 'image/jpeg'
          }
        }
      ]);
    });
  });
});

// tests/utils/rate-limiter.test.ts
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { RateLimiter } from '../../src/utils/rate-limiter.js';
import { mockRedisClient } from '../utils/mocks.js';

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient)
}));

jest.mock('../../src/config/config.js', () => ({
  config: {
    redis: { url: 'redis://localhost:6379' },
    rateLimits: {
      requestsPerMinute: 8,
      requestsPerDay: 200,
      tokensPerMinute: 200000,
      maxConcurrentUsers: 50
    }
  }
}));

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(async () => {
    mockRedisClient.connect.mockResolvedValue(undefined);
    rateLimiter = new RateLimiter();
    await rateLimiter.initialize();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkLimits', () => {
    it('should allow requests within limits', async () => {
      const userId = 'test-user-123';
      const estimatedTokens = 100;

      // Mock user usage within limits
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify({
        requestsThisMinute: 0,
        requestsToday: 0,
        tokensThisMinute: 0,
        lastRequestTime: Date.now() - 120000, // 2 minutes ago
        totalRequests: 0
      }));

      // Mock global usage within limits
      mockRedisClient.get.mockResolvedValueOnce('3');

      await expect(rateLimiter.checkLimits(userId, estimatedTokens)).resolves.not.toThrow();
    });

    it('should throw error when global rate limit exceeded', async () => {
      const userId = 'test-user-123';
      const estimatedTokens = 100;

      // Mock global usage at limit
      mockRedisClient.get.mockResolvedValueOnce('8');

      await expect(rateLimiter.checkLimits(userId, estimatedTokens))
        .rejects.toThrow('GLOBAL_RATE_LIMIT');
    });

    it('should throw error when user minute limit exceeded', async () => {
      const userId = 'test-user-123';
      const estimatedTokens = 100;

      // Mock user at minute limit
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify({
        requestsThisMinute: 2, // At per-user limit
        requestsToday: 5,
        tokensThisMinute: 1000,
        lastRequestTime: Date.now() - 30000, // 30 seconds ago (same minute)
        totalRequests: 10
      }));

      // Mock global usage OK
      mockRedisClient.get.mockResolvedValueOnce('3');

      await expect(rateLimiter.checkLimits(userId, estimatedTokens))
        .rejects.toThrow('USER_MINUTE_LIMIT');
    });

    it('should reset counters when time periods change', async () => {
      const userId = 'test-user-123';
      const estimatedTokens = 100;

      // Mock user usage from previous minute/day
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify({
        requestsThisMinute: 5,
        requestsToday: 10,
        tokensThisMinute: 5000,
        lastRequestTime: Date.now() - 120000, // 2 minutes ago
        totalRequests: 20
      }));

      // Mock global usage OK
      mockRedisClient.get.mockResolvedValueOnce('2');

      await expect(rateLimiter.checkLimits(userId, estimatedTokens)).resolves.not.toThrow();
    });
  });

  describe('recordUsage', () => {
    it('should update user usage statistics', async () => {
      const userId = 'test-user-123';
      const inputTokens = 50;
      const outputTokens = 100;

      // Mock existing usage
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify({
        requestsThisMinute: 1,
        requestsToday: 5,
        tokensThisMinute: 200,
        lastRequestTime: Date.now() - 30000,
        totalRequests: 10
      }));

      mockRedisClient.setEx.mockResolvedValue('OK');
      mockRedisClient.incr.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      await rateLimiter.recordUsage(userId, inputTokens, outputTokens);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `user:${userId}:usage`,
        3600,
        expect.stringContaining('"requestsThisMinute":2')
      );
      expect(mockRedisClient.incr).toHaveBeenCalled();
    });
  });

  describe('getUsageStats', () => {
    it('should return formatted usage statistics', async () => {
      const userId = 'test-user-123';

      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify({
        requestsThisMinute: 1,
        requestsToday: 5,
        tokensThisMinute: 200,
        lastRequestTime: Date.now(),
        totalRequests: 15
      }));

      const stats = await rateLimiter.getUsageStats(userId);

      expect(stats).toHaveProperty('userUsage');
      expect(stats).toHaveProperty('dailyQuotaUsed');
      expect(stats).toHaveProperty('minuteQuotaUsed');
      expect(typeof stats.dailyQuotaUsed).toBe('number');
      expect(typeof stats.minuteQuotaUsed).toBe('number');
    });
  });
});

// tests/handlers/command.handler.test.ts
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { CommandHandler } from '../../src/handlers/command.handler.js';
import { GeminiService } from '../../src/services/gemini.service.js';
import { DatabaseService } from '../../src/services/database.service.js';
import { mockDiscordInteraction, mockGeminiResponse } from '../utils/mocks.js';

// Mock services
jest.mock('../../src/services/gemini.service.js');
jest.mock('../../src/services/database.service.js');

describe('CommandHandler', () => {
  let commandHandler: CommandHandler;
  let mockGeminiService: jest.Mocked<GeminiService>;
  let mockDatabaseService: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    mockGeminiService = {
      generateResponse: jest.fn(),
      analyzeImage: jest.fn(),
      rateLimiter: {
        getUsageStats: jest.fn()
      }
    } as any;

    mockDatabaseService = {
      logInteraction: jest.fn()
    } as any;

    commandHandler = new CommandHandler(mockGeminiService, mockDatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should handle chat command successfully', async () => {
      const interaction = {
        ...mockDiscordInteraction,
        commandName: 'chat',
        options: {
          getString: jest.fn().mockReturnValue('Hello, how are you?')
        }
      };

      mockGeminiService.generateResponse.mockResolvedValue(mockGeminiResponse);
      mockDatabaseService.logInteraction.mockResolvedValue(undefined);

      await commandHandler.handle(interaction as any);

      expect(interaction.deferReply).toHaveBeenCalled();
      expect(mockGeminiService.generateResponse).toHaveBeenCalledWith(
        'Hello, how are you?',
        'test-user-123'
      );
      expect(mockDatabaseService.logInteraction).toHaveBeenCalledWith(
        'test-user-123',
        'chat',
        'Hello, how are you?',
        mockGeminiResponse.text
      );
      expect(interaction.editReply).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              title: '🤖 Gemini AI Response'
            })
          })
        ])
      });
    });

    it('should handle analyze command with valid image', async () => {
      const mockAttachment = {
        contentType: 'image/jpeg',
        size: 1024 * 1024, // 1MB
        url: 'https://example.com/image.jpg',
        name: 'test-image.jpg'
      };

      const interaction = {
        ...mockDiscordInteraction,
        commandName: 'analyze',
        options: {
          getAttachment: jest.fn().mockReturnValue(mockAttachment),
          getString: jest.fn().mockReturnValue('What do you see?')
        }
      };

      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
      } as any);

      mockGeminiService.analyzeImage.mockResolvedValue(mockGeminiResponse);
      mockDatabaseService.logInteraction.mockResolvedValue(undefined);

      await commandHandler.handle(interaction as any);

      expect(mockGeminiService.analyzeImage).toHaveBeenCalledWith(
        expect.any(Buffer),
        'What do you see?',
        'test-user-123'
      );
      expect(interaction.editReply).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              title: '🔍 Image Analysis'
            })
          })
        ])
      });
    });

    it('should reject invalid image files', async () => {
      const mockAttachment = {
        contentType: 'text/plain',
        size: 1024,
        url: 'https://example.com/file.txt',
        name: 'test-file.txt'
      };

      const interaction = {
        ...mockDiscordInteraction,
        commandName: 'analyze',
        options: {
          getAttachment: jest.fn().mockReturnValue(mockAttachment),
          getString: jest.fn().mockReturnValue('What do you see?')
        }
      };

      await commandHandler.handle(interaction as any);

      expect(interaction.editReply).toHaveBeenCalledWith(
        '❌ Please upload a valid image file (JPEG, PNG, etc.)'
      );
      expect(mockGeminiService.analyzeImage).not.toHaveBeenCalled();
    });

    it('should handle usage command', async () => {
      const mockUsageStats = {
        userUsage: {
          requestsThisMinute: 1,
          requestsToday: 5,
          tokensThisMinute: 200,
          lastRequestTime: Date.now(),
          totalRequests: 15
        },
        dailyQuotaUsed: 50,
        minuteQuotaUsed: 25
      };

      const interaction = {
        ...mockDiscordInteraction,
        commandName: 'usage'
      };

      mockGeminiService.rateLimiter.getUsageStats.mockResolvedValue(mockUsageStats);

      await commandHandler.handle(interaction as any);

      expect(interaction.editReply).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              title: '📊 Your Usage Statistics'
            })
          })
        ])
      });
    });

    it('should handle help command', async () => {
      const interaction = {
        ...mockDiscordInteraction,
        commandName: 'help'
      };

      await commandHandler.handle(interaction as any);

      expect(interaction.editReply).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              title: '🤖 Gemini AI Bot - Help'
            })
          })
        ])
      });
    });

    it('should handle unknown commands gracefully', async () => {
      const interaction = {
        ...mockDiscordInteraction,
        commandName: 'unknown'
      };

      await commandHandler.handle(interaction as any);

      expect(interaction.editReply).toHaveBeenCalledWith('❌ Unknown command');
    });
  });

  describe('getCommands', () => {
    it('should return array of Discord slash commands', () => {
      const commands = commandHandler.getCommands();

      expect(Array.isArray(commands)).toBe(true);
      expect(commands).toHaveLength(4);
      
      const commandNames = commands.map(cmd => cmd.name);
      expect(commandNames).toContain('chat');
      expect(commandNames).toContain('analyze');
      expect(commandNames).toContain('usage');
      expect(commandNames).toContain('help');
    });
  });
});

// tests/services/database.service.test.ts
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { DatabaseService } from '../../src/services/database.service.js';

// Mock Prisma Client
const mockPrismaClient = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $queryRaw: jest.fn(),
  interactionLog: {
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn()
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient)
}));

describe('DatabaseService', () => {
  let databaseService: DatabaseService;

  beforeEach(() => {
    databaseService = new DatabaseService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to database successfully', async () => {
      mockPrismaClient.$connect.mockResolvedValue(undefined);

      await expect(databaseService.connect()).resolves.not.toThrow();
      expect(mockPrismaClient.$connect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockPrismaClient.$connect.mockRejectedValue(error);

      await expect(databaseService.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('logInteraction', () => {
    it('should log interaction successfully', async () => {
      const mockInteraction = {
        id: 'test-id',
        userId: 'test-user-123',
        command: 'chat',
        input: 'Hello',
        output: 'Hi there!',
        timestamp: expect.any(Date)
      };

      mockPrismaClient.interactionLog.create.mockResolvedValue(mockInteraction);

      await databaseService.logInteraction('test-user-123', 'chat', 'Hello', 'Hi there!');

      expect(mockPrismaClient.interactionLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'test-user-123',
          command: 'chat',
          input: 'Hello',
          output: 'Hi there!',
          timestamp: expect.any(Date)
        }
      });
    });

    it('should handle logging errors gracefully', async () => {
      const error = new Error('Database error');
      mockPrismaClient.interactionLog.create.mockRejectedValue(error);

      // Should not throw - logging failures shouldn't break the bot
      await expect(databaseService.logInteraction('test-user-123', 'chat', 'Hello', 'Hi there!'))
        .resolves.not.toThrow();
    });

    it('should truncate long input/output', async () => {
      const longInput = 'a'.repeat(2000);
      const longOutput = 'b'.repeat(3000);

      await databaseService.logInteraction('test-user-123', 'chat', longInput, longOutput);

      expect(mockPrismaClient.interactionLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'test-user-123',
          command: 'chat',
          input: 'a'.repeat(1000), // Truncated to 1000
          output: 'b'.repeat(2000), // Truncated to 2000
          timestamp: expect.any(Date)
        }
      });
    });
  });

  describe('getUserInteractionCount', () => {
    it('should return interaction count for user', async () => {
      mockPrismaClient.interactionLog.count.mockResolvedValue(42);

      const count = await databaseService.getUserInteractionCount('test-user-123');

      expect(count).toBe(42);
      expect(mockPrismaClient.interactionLog.count).toHaveBeenCalledWith({
        where: { userId: 'test-user-123' }
      });
    });

    it('should handle count with date filter', async () => {
      const since = new Date('2024-01-01');
      mockPrismaClient.interactionLog.count.mockResolvedValue(10);

      const count = await databaseService.getUserInteractionCount('test-user-123', since);

      expect(count).toBe(10);
      expect(mockPrismaClient.interactionLog.count).toHaveBeenCalledWith({
        where: { 
          userId: 'test-user-123',
          timestamp: { gte: since }
        }
      });
    });

    it('should return 0 on database errors', async () => {
      mockPrismaClient.interactionLog.count.mockRejectedValue(new Error('DB Error'));

      const count = await databaseService.getUserInteractionCount('test-user-123');

      expect(count).toBe(0);
    });
  });

  describe('healthCheck', () => {
    it('should return true for healthy database', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const healthy = await databaseService.healthCheck();

      expect(healthy).toBe(true);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalled();
    });

    it('should return false for unhealthy database', async () => {
      mockPrismaClient.$queryRaw.mockRejectedValue(new Error('DB Error'));

      const healthy = await databaseService.healthCheck();

      expect(healthy).toBe(false);
    });
  });
});

// .env.test
NODE_ENV=test
DISCORD_TOKEN=test_discord_token
DISCORD_CLIENT_ID=test_discord_client_id
GEMINI_API_KEY=test_gemini_api_key
DATABASE_URL=postgresql://test:test@localhost:5432/test_db
REDIS_URL=redis://localhost:6379
LOG_LEVEL=error

// .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_USER: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Setup test database
      run: |
        npx prisma migrate deploy
        npx prisma generate
      env:
        DATABASE_URL: postgresql://test:test@localhost:5432/test_db

    - name: Run linting
      run: npm run lint

    - name: Run tests
      run: npm test -- --coverage
      env:
        NODE_ENV: test
        DATABASE_URL: postgresql://test:test@localhost:5432/test_db
        REDIS_URL: redis://localhost:6379
        DISCORD_TOKEN: test_token
        DISCORD_CLIENT_ID: test_client_id
        GEMINI_API_KEY: test_api_key

    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella

    - name: Build project
      run: npm run build

  integration-test:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build Docker image
      run: |
        npm run build
        docker build -t discord-bot-test .

    - name: Test Docker container
      run: |
        docker run --rm --name test-container \
          -e NODE_ENV=test \
          -e DISCORD_TOKEN=test \
          -e DISCORD_CLIENT_ID=test \
          -e GEMINI_API_KEY=test \
          -e DATABASE_URL=sqlite:///tmp/test.db \
          discord-bot-test \
          npm test