import { PerformanceMonitor } from '../../utils/resilience';

describe('PerformanceMonitor (isolation)', () => {
  it('should execute the wrapped function and return the result', async () => {
    const result = await PerformanceMonitor.monitor('isolation-test', async () => {
      console.log('[DEBUG] isolation test: inside wrapped function');
      return { test: true };
    });
    console.log('[DEBUG] isolation test: after monitor', result);
    expect(result).toEqual({ test: true });
  });
}); 