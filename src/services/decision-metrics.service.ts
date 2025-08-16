type DecisionRecord = {
  ts: number;
  userId: string;
  guildId: string | null;
  channelId: string;
  shouldRespond: boolean;
  reason: string;
  strategy: string;
  confidence: number;
  tokenEstimate: number;
};

const state = {
  total: 0,
  responded: 0,
  suppressed: 0,
  reasons: new Map<string, number>(),
  strategies: new Map<string, number>(),
  avgConfidence: 0,
  recent: [] as DecisionRecord[],
  maxRecent: 200,
};

function inc(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) || 0) + 1);
}

export function recordDecision(rec: DecisionRecord): void {
  state.total += 1;
  if (rec.shouldRespond) state.responded += 1; else state.suppressed += 1;
  // running average
  state.avgConfidence = ((state.avgConfidence * (state.total - 1)) + rec.confidence) / state.total;
  // reasons and strategies tallies (split on commas for multi-reasons)
  const reasons = rec.reason ? rec.reason.split(',').map(s => s.trim()).filter(Boolean) : [];
  if (reasons.length === 0) reasons.push('none');
  for (const r of reasons) inc(state.reasons, r);
  inc(state.strategies, rec.strategy || 'unknown');

  state.recent.push(rec);
  if (state.recent.length > state.maxRecent) state.recent.shift();
}

export function getDecisionMetrics() {
  const toObj = (m: Map<string, number>) => Array.from(m.entries()).sort((a,b) => b[1]-a[1]).reduce((o, [k,v]) => (o[k]=v, o), {} as Record<string, number>);
  return {
    total: state.total,
    responded: state.responded,
    suppressed: state.suppressed,
    responseRate: state.total ? state.responded / state.total : 0,
    avgConfidence: state.avgConfidence,
    topReasons: toObj(state.reasons),
    strategies: toObj(state.strategies),
    recent: state.recent.slice(-25),
    windowSize: state.maxRecent,
  };
}
