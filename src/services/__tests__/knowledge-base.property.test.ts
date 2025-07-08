import fc from 'fast-check';
import { knowledgeBaseService } from '../knowledge-base.service';

describe('KnowledgeBaseService property-based tests', () => {
  // Property 1: For any string input, search should not throw and should return an array
  it('should not throw and should return an array for any string input', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (query) => {
        let result: unknown;
        let threw = false;
        try {
          result = await knowledgeBaseService.search({ query });
        } catch (e) {
          threw = true;
        }
        expect(threw).toBe(false);
        expect(Array.isArray(result)).toBe(true);
      })
    );
  });

  // Property 2: For empty queries, the result should be empty or have no relevant entries
  it('should return an empty array or no relevant entries for empty queries', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(''), async (query) => {
        const result = await knowledgeBaseService.search({ query });
        // Accept either empty array or all entries have low relevance
        expect(Array.isArray(result)).toBe(true);
        expect(result.length === 0 || result.every((entry: any) => entry.confidence < 0.5)).toBe(true);
      })
    );
  });

  // Property 3: For any string input, all returned entries should have confidence >= minConfidence if specified
  it('should only return entries with confidence >= minConfidence', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), fc.float({ min: 0, max: 1 }), async (query, minConfidence) => {
        const result = await knowledgeBaseService.search({ query, minConfidence });
        expect(Array.isArray(result)).toBe(true);
        expect(result.every((entry: any) => entry.confidence >= minConfidence)).toBe(true);
      })
    );
  });
}); 