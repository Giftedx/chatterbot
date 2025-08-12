// @ts-nocheck
export async function llmDraft(input: { prompt: string }): Promise<string> {
  const p = input?.prompt || '';
  let hash = 0;
  for (let i = 0; i < p.length; i++) hash = (hash * 31 + p.charCodeAt(i)) >>> 0;
  return `[draft:${hash.toString(16)}] ${p.slice(0, 160)}`;
}