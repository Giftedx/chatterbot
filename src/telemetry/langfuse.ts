// Optional Langfuse shim. No-ops unless FEATURE_LANGFUSE and keys are set.
import { getEnvAsBoolean } from '../utils/env.js';

let client: any = null;
async function init() {
  if (client || !getEnvAsBoolean('FEATURE_LANGFUSE', false)) return null;
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const baseUrl = process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com';
  if (!publicKey || !secretKey) return null;
  try {
    const mod: any = await import('langfuse');
    const { Langfuse } = mod;
    client = new Langfuse({ publicKey, secretKey, baseUrl });
  } catch {
    client = null;
  }
  return client;
}

export async function trackModelCall({ provider, model, latencyMs, success, traceId, error }: { provider: string; model: string; latencyMs: number; success: boolean; traceId?: string; error?: string }) {
  try {
    const c = await init();
    if (!c) return;
    await c.event({
      name: 'model_call',
      timestamp: new Date(),
      input: { provider, model, traceId },
      output: { success, latencyMs, error },
      level: success ? 'info' : 'error'
    });
  } catch {}
}
