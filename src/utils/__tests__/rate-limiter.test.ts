import { RateLimiter } from '../rate-limiter';

jest.useFakeTimers();

describe('RateLimiter', () => {
  const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });
  const user = 'user-1';

  it('allows requests under the limit', async () => {
    await expect(limiter.checkLimits(user)).resolves.toBeUndefined();
    await expect(limiter.checkLimits(user)).resolves.toBeUndefined();
    await expect(limiter.checkLimits(user)).resolves.toBeUndefined();
  });

  it('blocks requests over the limit', async () => {
    await expect(limiter.checkLimits(user)).rejects.toThrow('Rate limit exceeded');
  });

  it('resets after window', async () => {
    // advance time beyond window
    jest.advanceTimersByTime(1000);
    await expect(limiter.checkLimits(user)).resolves.toBeUndefined();
  });
});
