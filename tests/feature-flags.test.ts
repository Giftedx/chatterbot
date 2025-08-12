import { features } from '../src/config/feature-flags.js';

describe('feature flags', () => {
  it('exposes boolean flags', () => {
    expect(typeof features.temporal).toBe('boolean');
    expect(typeof features.vercelAI).toBe('boolean');
    expect(typeof features.pgvector).toBe('boolean');
  });
});