import { context as otContext, trace, SpanStatusCode } from '@opentelemetry/api';
import { getTraceId } from './async-context.js';

const tracer = trace.getTracer('chatterbot');

export async function withSpan<T>(name: string, fn: () => Promise<T>, attrs?: Record<string, unknown>): Promise<T> {
  const traceId = getTraceId();
  const span = tracer.startSpan(name, undefined, otContext.active());
  if (traceId) span.setAttribute('trace.id', traceId);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) span.setAttribute(k, v as never);
  }
  try {
    const res = await fn();
    span.setStatus({ code: SpanStatusCode.OK });
    return res;
  } catch (err) {
    span.recordException(err as Error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
    throw err;
  } finally {
    span.end();
  }
}