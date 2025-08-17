# Token‑Lean Unified Pipeline (concise)

- Goal: Human‑like, evolving persona; strict opt‑in; token‑aware.
- Inputs: DM/mention/reply/ambient; opt‑in/paused; thread; cooldown/burst; memory/persona; cache; attachments/URLs.
- Gates (first): consent → moderation (block/warn/allow).
- Decision (self‑directed):
  - Priority: DM > mention > reply‑to‑bot > personal thread > ambient (opt‑in only).
  - Exceptions: @everyone or too‑many‑mentions → ignore.
  - Heuristics: question +25; code/error +15; urgency +10; too‑short −20; cooldown −30; burst −15.
  - Strategy: quick (small) | deep (50%+) | defer (90%+ of model limit).
- Analysis: extract text/URLs/attachments; detect intents; complexity; map intents → tools/MCP; flags (verify/personalize).
- Orchestration: Moderation → DecisionEngine → MessageAnalysis → MCP/tools (if needed) → Model Router (retry/fallback) → optional Verify → Personalization → Analytics/Delivery.
- Context: pull minimal, recent, relevant; cache by user/thread; avoid broad scans.
- Prompting: role + objective + constraints + minimal facts + ask; bullets over prose; avoid repeats.
- Memory/Persona: summarize updates; store deltas; short persona guides.
- Output: brief answer + bullets; cite tools/sources; long → lead with summary.
- Metrics: log reasons, tokens, strategy, route; incidents; cache hit‑rate; alerts on moderation/model/token issues.
- Failures: safety trip → stop; router cascade → retry/fallback; budget overflow → defer/clarify.
