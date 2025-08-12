// No-op vector store adapter. Safe default until a real adapter (e.g., pgvector) is integrated.
import { VectorStore } from './types.js';

export class NullVectorStore extends VectorStore {
  /**
   * @param {Array<{id:string, embedding:number[], metadata?:Record<string, any>}>} records
   * @returns {Promise<{ upserted: number }>}
   */
  async upsert(records) {
    const count = Array.isArray(records) ? records.length : 0;
    return { upserted: count };
  }

  /**
   * @param {number[]} queryEmbedding
   * @param {number} [k=5]
   * @returns {Promise<{ neighbors: Array<{ id:string, score:number, metadata?:Record<string, any> }>, k:number, count:number }>}
   */
  async similaritySearch(queryEmbedding, k = 5) {
    // Deterministic empty result ensures tests are stable and behavior is predictable.
    return { neighbors: [], k, count: 0 };
  }
}