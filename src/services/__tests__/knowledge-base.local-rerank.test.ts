import { knowledgeBaseService } from '../knowledge-base.service';

// Mock the optional Transformers.js dependency to avoid heavy downloads
// and to produce deterministic embeddings for ranking
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
jest.mock('@xenova/transformers', () => {
  async function pipeline() {
    return async (text: string) => {
      const tokens = String(text).toLowerCase().split(/\W+/).filter(Boolean);
      const hasAlpha = tokens.includes('alpha') ? 1 : 0;
      const len = Math.min(tokens.length || 1, 8);
      const v = new Float32Array([hasAlpha, len]);
      const norm = Math.sqrt(v[0]*v[0] + v[1]*v[1]) || 1;
      const data = Array.from(v).map(x => x / norm);
      return { data };
    };
  }
  return { pipeline };
}, { virtual: true });

import { prisma } from '../../db/prisma';

describe('KnowledgeBaseService - local reranker (mocked)', () => {
  beforeAll(() => {
    process.env.RERANK_PROVIDER = 'local';
    process.env.FEATURE_LOCAL_RERANK = 'true';
    // Ensure vector/embedding branches remain disabled for this unit test
    delete process.env.OPENAI_API_KEY;
    process.env.FEATURE_PGVECTOR = 'false';

  // Provide a minimal guildKnowledgeBase model on the prisma mock
  // @ts-ignore - prisma is an untyped jest mock in tests
    prisma.guildKnowledgeBase = {
      findMany: jest.fn(({ take }: { take: number }) => {
        const rows = [
          {
            id: '1',
            content: 'alpha beta',
            source: 'test',
            sourceId: 's1',
            sourceUrl: null,
            confidence: 0.9,
            addedBy: 'tester',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: '2',
            content: 'alpha beta gamma',
            source: 'test',
            sourceId: 's2',
            sourceUrl: null,
            confidence: 0.85,
            addedBy: 'tester',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: '3',
            content: 'unrelated zzz',
            source: 'test',
            sourceId: 's3',
            sourceUrl: null,
            confidence: 0.95,
            addedBy: 'tester',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
        return Promise.resolve(rows.slice(0, take ?? rows.length));
      }),
      count: jest.fn(() => Promise.resolve(3)),
      aggregate: jest.fn(() => Promise.resolve({ _avg: { confidence: 0.9 } })),
      groupBy: jest.fn(() => Promise.resolve([{ source: 'test', _count: { source: 3 } }])),
    };
  });

  it('prefers entries containing the query token over unrelated entries', async () => {
    const res = await knowledgeBaseService.search({ query: 'alpha', limit: 2, minConfidence: 0.5 });
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBeGreaterThanOrEqual(1);
    // Top-1 should contain the token 'alpha'
    expect(res[0]?.content.toLowerCase()).toContain('alpha');
    // And the clearly unrelated doc should not be first
    expect(res[0]?.content.toLowerCase()).not.toContain('unrelated zzz');
  });
});
