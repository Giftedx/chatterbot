// Pre-setup for Jest executed before the test framework and test files are loaded
// Ensure environment variables and global Prisma mock are available during module evaluation

// Env defaults for tests
process.env.NODE_ENV = 'test';
// Intentionally avoid setting provider API keys in tests to prevent accidental network calls
if (!('OPENAI_API_KEY' in process.env)) delete process.env.OPENAI_API_KEY;
if (!('GEMINI_API_KEY' in process.env)) delete process.env.GEMINI_API_KEY;
if (!('ANTHROPIC_API_KEY' in process.env)) delete process.env.ANTHROPIC_API_KEY;
if (!('GROQ_API_KEY' in process.env)) delete process.env.GROQ_API_KEY;
if (!('MISTRAL_API_KEY' in process.env)) delete process.env.MISTRAL_API_KEY;
process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'test-token';
process.env.DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || 'test-client-id';
process.env.DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || 'test-guild';

// Feature flags default to false for deterministic tests unless explicitly enabled
process.env.ENABLE_AGENTIC_INTELLIGENCE = process.env.ENABLE_AGENTIC_INTELLIGENCE || 'false';
process.env.ENABLE_ENHANCED_INTELLIGENCE = process.env.ENABLE_ENHANCED_INTELLIGENCE || 'false';
process.env.ENABLE_ANSWER_VERIFICATION = process.env.ENABLE_ANSWER_VERIFICATION || 'false';
process.env.FEATURE_LANGGRAPH = process.env.FEATURE_LANGGRAPH || 'false';
process.env.FEATURE_VERCEL_AI = process.env.FEATURE_VERCEL_AI || 'false';
process.env.FEATURE_PGVECTOR = process.env.FEATURE_PGVECTOR || 'false';

// Inject Prisma Jest mock globally so modules that import prisma at top-level can see it immediately
try {
  const { mockPrismaClient } = require('../src/__mocks__/@prisma/client.js');
  global.__TEST_PRISMA__ = mockPrismaClient;
} catch (e) {
  // Ignore if mock not available; tests that need prisma will fail explicitly
}
