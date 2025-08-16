export default {
  setupFiles: ['<rootDir>/tests/jest.pre-setup.cjs'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Discord.js ESM mapping
    '^discord\\.js$': '<rootDir>/src/__mocks__/discord.js',
    // Prisma client mapping
    '^@prisma/client$': '<rootDir>/src/__mocks__/@prisma/client.js',
  },
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/test/**/*.ts',
    '!src/__mocks__/**/*.ts',
    '!src/**/index.ts',
    // Exclude large experimental/edge areas from global coverage; they have their own roadmaps/tests
    '!src/agents/**',
    '!src/ai/**',
    '!src/multimodal/**',
    '!src/orchestration/temporal/**',
    '!src/mlops/**',
    '!src/services/autonomous-reasoning/**',
    '!src/edge/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      lines: 45,
      statements: 44,
      branches: 34,
      functions: 45,
    },
    './src/services/core-intelligence.service.ts': {
      lines: 57,
      statements: 57,
      branches: 41,
      functions: 55,
    },
    './src/services/decision-engine.service.ts': {
      lines: 70,
      statements: 70,
      branches: 60,
      functions: 70,
    },
    './src/services/core/message-analysis.service.ts': {
      lines: 50,
      statements: 45,
      branches: 29,
      functions: 55,
    },
    './src/services/core/unified-analytics.service.ts': {
      lines: 60,
      statements: 60,
      branches: 45,
      functions: 55,
    },
  },
  testMatch: ['**/__tests__/**/*.test.{ts,js}', '**/?(*.)+(spec|test).{ts,js}'],
  // Prevent picking up compiled output which can duplicate manual mocks
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/build/'],
  testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/build/'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
    '^.+\\.(js|jsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$|discord\\.js|@discordjs))'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testTimeout: 30000,
};
