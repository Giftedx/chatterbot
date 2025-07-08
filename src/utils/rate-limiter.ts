/**
 * Simple in-memory per-user rate limiter using a token-bucket algorithm.
 *
 * Limits are expressed as N requests per time window (ms). The bucket refills
 * fully each window.
 */
export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private buckets: Map<string, { remaining: number; resetAt: number }> = new Map();

  constructor(options: { maxRequests: number; windowMs: number }) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
  }

  /**
   * Attempt to consume one request for the given user ID.
   * Throws an error if the limit is exceeded.
   */
  public async checkLimits(userId: string): Promise<void> {
    const now = Date.now();
    const bucket = this.buckets.get(userId);

    if (!bucket || now >= bucket.resetAt) {
      // Reset / create bucket
      this.buckets.set(userId, {
        remaining: this.maxRequests - 1,
        resetAt: now + this.windowMs,
      });
      return;
    }

    if (bucket.remaining <= 0) {
      const secondsLeft = Math.ceil((bucket.resetAt - now) / 1000);
      throw new Error(`Rate limit exceeded. Try again in ${secondsLeft}s.`);
    }

    bucket.remaining -= 1;
  }
}
