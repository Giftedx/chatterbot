#!/usr/bin/env node
/*
  Simple reranker benchmark comparing Cohere vs Voyage.
  - Reads benchmarks/rerank-dataset.jsonl
  - Computes NDCG@k and MRR@k for k=3,5
  - Skips gracefully if a provider key is missing
*/
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dataPath = path.join(root, 'benchmarks', 'rerank-dataset.jsonl');

function ndcg(relevances, k = 5) {
  const rel = relevances.slice(0, k);
  const dcg = rel.reduce((acc, r, i) => acc + ((Math.pow(2, r) - 1) / Math.log2(i + 2)), 0);
  const ideal = [...relevances].sort((a,b)=>b-a).slice(0, k);
  const idcg = ideal.reduce((acc, r, i) => acc + ((Math.pow(2, r) - 1) / Math.log2(i + 2)), 0) || 1;
  return dcg / idcg;
}

function mrr(relevances, k = 5) {
  for (let i = 0; i < Math.min(k, relevances.length); i++) {
    if (relevances[i] > 0) return 1 / (i + 1);
  }
  return 0;
}

async function* readJsonl(filePath) {
  const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    yield JSON.parse(t);
  }
}

async function run() {
  const hasCohere = !!process.env.COHERE_API_KEY;
  const hasVoyage = !!process.env.VOYAGE_API_KEY;
  if (!hasCohere && !hasVoyage) {
    console.log('No reranker keys found. Set COHERE_API_KEY or VOYAGE_API_KEY to run.');
    process.exit(0);
  }

  let cohereClient, voyageFetch;
  if (hasCohere) {
    try { ({ default: cohereClient } = await import('cohere-ai')); } catch {}
  }
  if (hasVoyage) {
    voyageFetch = globalThis.fetch || (await import('node-fetch')).default;
  }

  const results = {
    cohere: { ndcg3: [], ndcg5: [], mrr3: [], mrr5: [] },
    voyage: { ndcg3: [], ndcg5: [], mrr3: [], mrr5: [] },
  };

  for await (const row of readJsonl(dataPath)) {
    const { query, documents } = row;
    const candidates = documents.map(d => ({ id: d.id, text: d.text, rel: d.rel }));

    if (hasCohere) {
      try {
        const co = new cohereClient({ token: process.env.COHERE_API_KEY });
        const resp = await co.rerank({ model: process.env.COHERE_RERANK_MODEL || 'rerank-3.5-mini', query, documents: candidates.map(c => c.text) });
        const ranked = resp.result ? resp.result : resp; // sdk shape compatibility
        const order = ranked?.results?.map((r, i) => ({ idx: r.index ?? i })) || candidates.map((_, i) => ({ idx: i }));
        const rels = order.map(o => candidates[o.idx].rel);
        results.cohere.ndcg3.push(ndcg(rels, 3));
        results.cohere.ndcg5.push(ndcg(rels, 5));
        results.cohere.mrr3.push(mrr(rels, 3));
        results.cohere.mrr5.push(mrr(rels, 5));
      } catch (e) {
        console.warn('Cohere rerank failed:', String(e));
      }
    }

    if (hasVoyage) {
      try {
        const body = {
          model: process.env.VOYAGE_RERANK_MODEL || 'rerank-2.5',
          query,
          documents: candidates.map(c => ({ text: c.text })),
        };
        const r = await voyageFetch('https://api.voyageai.com/v1/rerank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}` },
          body: JSON.stringify(body)
        });
        const jr = await r.json();
        const order = jr?.data?.map((d, i) => ({ idx: d.index ?? i })) || candidates.map((_, i) => ({ idx: i }));
        const rels = order.map(o => candidates[o.idx].rel);
        results.voyage.ndcg3.push(ndcg(rels, 3));
        results.voyage.ndcg5.push(ndcg(rels, 5));
        results.voyage.mrr3.push(mrr(rels, 3));
        results.voyage.mrr5.push(mrr(rels, 5));
      } catch (e) {
        console.warn('Voyage rerank failed:', String(e));
      }
    }
  }

  function avg(arr) { return arr.length ? (arr.reduce((a,b)=>a+b,0) / arr.length) : 0; }
  const out = {
    cohere: hasCohere ? { ndcg3: avg(results.cohere.ndcg3), ndcg5: avg(results.cohere.ndcg5), mrr3: avg(results.cohere.mrr3), mrr5: avg(results.cohere.mrr5) } : null,
    voyage: hasVoyage ? { ndcg3: avg(results.voyage.ndcg3), ndcg5: avg(results.voyage.ndcg5), mrr3: avg(results.voyage.mrr3), mrr5: avg(results.voyage.mrr5) } : null,
  };
  console.log(JSON.stringify(out, null, 2));
}

run().catch(e => { console.error(e); process.exit(1); });
