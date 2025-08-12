import { VercelAIClient } from '../src/ai/providers/vercel/client.js';

describe('VercelAIClient', () => {
  const prevFlag = process.env.FEATURE_VERCEL_AI;
  const prevKey = process.env.AI_API_KEY;

  beforeEach(() => {
    delete process.env.FEATURE_VERCEL_AI;
    delete process.env.AI_API_KEY;
  });

  afterAll(() => {
    if (prevFlag !== undefined) process.env.FEATURE_VERCEL_AI = prevFlag;
    if (prevKey !== undefined) process.env.AI_API_KEY = prevKey;
  });

  it('throws when disabled', async () => {
    const client = new VercelAIClient();
    await expect(client.generateText({ prompt: 'hello' })).rejects.toThrow(/disabled/);
  });

  it('throws when enabled without API key', async () => {
    process.env.FEATURE_VERCEL_AI = 'true';
    const client = new VercelAIClient();
    await expect(client.generateText({ prompt: 'hello' })).rejects.toThrow(/AI_API_KEY/);
  });

  it('returns deterministic stub when enabled with key', async () => {
    process.env.FEATURE_VERCEL_AI = 'true';
    process.env.AI_API_KEY = 'test-key';
    const client = new VercelAIClient();
    const res = await client.generateText({ prompt: 'hello world' });
    expect(res.output).toContain('[AI-STUB:');
    expect(res.output).toContain('hello world');
  });
});