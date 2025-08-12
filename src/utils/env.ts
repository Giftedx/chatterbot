// ESM-friendly env utils. Keep minimal and dependency-free.
export function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  const v = String(value).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export function getRequiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export function getOptionalEnv(name: string, fallback?: string): string | undefined {
  return process.env[name] ?? fallback;
}