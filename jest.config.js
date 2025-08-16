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
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: [
    '**/__tests__/**/*.test.{ts,js}',
    '**/?(*.)+(spec|test).{ts,js}'
  ],
  // Prevent picking up compiled output which can duplicate manual mocks
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/build/'],
  testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/build/'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: '<rootDir>/tsconfig.test.json'
    }],
    '^.+\\.(js|jsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: '<rootDir>/tsconfig.test.json'
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|discord\\.js|@discordjs))'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testTimeout: 30000
};