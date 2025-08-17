import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies used by the unified pipeline orchestrator
jest.mock('../../src/services/core/message-analysis.service.js', () => ({
  unifiedMessageAnalysisService: {
    analyzeMessage: jest.fn(async () => ({ intents: ['chat'], estimatedComplexity: 0.2 })),
  },
}));

jest.mock('../../src/services/feature-routing-matrix.service.js', () => ({
  featureRoutingMatrixService: {
    routeMessage: jest.fn(async () => ({
      preferredProvider: 'openai',
      primaryService: 'generation',
      confidence: 0.8,
      estimatedComplexity: 0.3,
      capabilities: { web: true, code: false, memory: true },
      reasoning: 'Basic chat detected. Use generation with retrieval support.',
    })),
  },
}));

jest.mock('../../src/services/model-router.service.js', () => ({
  modelRouterService: {
    generate: jest.fn(async () => 'draft response'),
  },
}));

jest.mock('../../src/memory/user-memory.service.js', () => ({
  UserMemoryService: jest.fn().mockImplementation(() => ({
    getMemoryContext: jest.fn(async () => ({ contextPrompt: 'Likes concise answers.' })),
    processConversation: jest.fn(async () => true),
  })),
}));

jest.mock('../../src/services/knowledge-base.service.js', () => ({
  knowledgeBaseService: {
    search: jest.fn(async () => [{ id: 'kb1', content: 'Known fact from KB', confidence: 0.9 }]),
  },
}));

jest.mock('../../src/services/self-critique.service.js', () => ({
  SelfCritiqueService: jest.fn().mockImplementation(() => ({
    critiqueAndRefine: jest.fn(async () => 'refined response'),
  })),
}));

// Under test
const importPipeline = async () =>
  await import('../../src/services/unified-cognitive-pipeline.service.js');

beforeEach(() => {
  process.env.ENABLE_SELF_CRITIQUE = 'true';
});

describe('UnifiedCognitivePipeline', () => {
  test('message + processing path composes expected modules and returns refined content', async () => {
    const { unifiedCognitivePipeline } = await importPipeline();

    const result = await unifiedCognitivePipeline.execute({
      inputType: 'message',
      operation: 'processing',
      userId: 'u1',
      guildId: 'g1',
      channelId: 'c1',
      prompt: 'Hello there! Can you summarize this?',
      attachments: [],
      history: [],
    });

    expect(result.status).toBe('complete');
    expect(result.content).toBe('refined response');
    expect(result.confidence).toBeGreaterThan(0.7);

    // reasoning trace contains key steps
    const steps = result.reasoningTrace.map((t) => t.step);
    expect(steps).toEqual(
      expect.arrayContaining([
        'featureExtraction',
        'retrieveMemory',
        'routeCapabilities',
        'retrieveKnowledge',
        'generateDraft',
        'deliberateRefine',
        'extractAndStoreMemory',
      ]),
    );

    // used capabilities derived from routing mock
    expect(result.usedCapabilities).toEqual(expect.arrayContaining(['web', 'memory']));
    expect(result.provider).toBe('openai');
    expect(result.memoryUpdated).toBe(true);
  });

  test('task + research prioritizes retrieval before memory and generation', async () => {
    const { unifiedCognitivePipeline } = await importPipeline();

    const result = await unifiedCognitivePipeline.execute({
      inputType: 'task',
      operation: 'research',
      userId: 'u2',
      guildId: null,
      channelId: 'c2',
      prompt: 'Research the latest LLM techniques',
      attachments: [],
      history: [],
    });

    expect(result.status).toBe('complete');
    expect(typeof result.content).toBe('string');

    const steps = result.reasoningTrace.map((t) => t.step);
    const retrieveIdx = steps.indexOf('retrieveKnowledge');
    const memoryIdx = steps.indexOf('retrieveMemory');
    const generateIdx = steps.indexOf('generateDraft');
    expect(retrieveIdx).toBeGreaterThanOrEqual(0);
    expect(memoryIdx).toBeGreaterThanOrEqual(0);
    expect(generateIdx).toBeGreaterThanOrEqual(0);
    // ensure retrieval happens before memory and generation in this path
    expect(retrieveIdx).toBeLessThan(memoryIdx);
    expect(retrieveIdx).toBeLessThan(generateIdx);
  });
});
