export interface RetryOptions {
  retries?: number;
  minDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  jitter?: boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const retries = options.retries ?? 3;
  const min = options.minDelayMs ?? 200;
  const max = options.maxDelayMs ?? 5000;
  const factor = options.factor ?? 2;
  const jitter = options.jitter ?? true;

  let attempt = 0;
  let delay = min;

  // First attempt
  try {
    return await fn();
  } catch (err) {
    attempt = 1;
    if (retries === 0) throw err;
    if (options.onRetry) options.onRetry(err, attempt, delay);
  }

  while (attempt <= retries) {
    await new Promise((r) => setTimeout(r, delay));

    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > retries) throw err;
      delay = Math.min(max, Math.floor(delay * factor));
      if (jitter) {
        const rand = Math.random() + 0.5; // 0.5..1.5
        delay = Math.min(max, Math.floor(delay * rand));
      }
      if (options.onRetry) options.onRetry(err, attempt, delay);
    }
  }

  // Should not reach here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  throw new Error('Retry failed') as any;
}