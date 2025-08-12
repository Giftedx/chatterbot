export function getDiagnoseKeywords(): string[] {
  const raw = process.env.DIAGNOSE_KEYWORDS || 'diagnose,status,health,providers,telemetry,kb';
  return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}