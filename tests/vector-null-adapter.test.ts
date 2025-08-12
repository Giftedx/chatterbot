import { describe, it, expect } from '@jest/globals';
import { NullVectorStore } from '../src/rag/vector/null.adapter.js';

describe('NullVectorStore', () => {
  it('upsert returns the number of records provided', async () => {
    const store = new NullVectorStore();
    const res = await store.upsert([
      { id: '1', embedding: [0.1, 0.2] },
      { id: '2', embedding: [0.3, 0.4], metadata: { tag: 'a' } },
    ]);
    expect(res.upserted).toBe(2);
  });

  it('upsert treats non-arrays as zero records', async () => {
    const store = new NullVectorStore();
    // @ts-expect-error intentionally passing wrong type
    const res = await store.upsert(null);
    expect(res.upserted).toBe(0);
  });

  it('similaritySearch returns a deterministic empty result', async () => {
    const store = new NullVectorStore();
    const res = await store.similaritySearch([0.1, 0.2], 3);
    expect(res.neighbors).toEqual([]);
    expect(res.k).toBe(3);
    expect(res.count).toBe(0);
  });
});