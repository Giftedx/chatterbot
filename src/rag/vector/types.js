// Minimal vector interfaces for pluggable stores (ESM).
// Keep this dependency-free and deterministic.

export class VectorRecord {
  /**
   * @param {Object} params
   * @param {string} params.id
   * @param {number[]} params.embedding
   * @param {Record<string, any>=} params.metadata
   */
  constructor({ id, embedding, metadata }) {
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error('VectorRecord requires a non-empty string id.');
    }
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('VectorRecord requires a non-empty embedding array.');
    }
    // Light validation: ensure numeric embeddings
    if (!embedding.every((x) => typeof x === 'number' && Number.isFinite(x))) {
      throw new Error('VectorRecord embedding must contain only finite numbers.');
    }
    this.id = id;
    this.embedding = embedding;
    this.metadata = metadata ?? {};
  }
}

export class VectorStore {
  /**
   * Upsert an array of vector-like records.
   * @param {Array<{id:string, embedding:number[], metadata?:Record<string, any>}>} records
   * @returns {Promise<{ upserted: number }>}
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async upsert(records) {
    throw new Error('Not implemented');
  }

  /**
   * Perform a similarity search.
   * @param {number[]} queryEmbedding
   * @param {number} [k=5]
   * @returns {Promise<{ neighbors: Array<{ id:string, score:number, metadata?:Record<string, any> }>, k:number, count:number }>}
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async similaritySearch(queryEmbedding, k = 5) {
    throw new Error('Not implemented');
  }
}