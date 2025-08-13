import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContext {
  traceId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithTrace<T>(traceId: string, fn: () => T): T {
  return storage.run({ traceId }, fn);
}

export function getTraceId(): string | undefined {
  return storage.getStore()?.traceId;
}