# Architecture

## Overview
Chatterbot is a Discord bot that exposes a single command, `/chat` (used only for initial opt-in), backed by a modular AI pipeline:

1. Moderation (text/images)
2. Message analysis (intents, complexity, attachments, tool needs)
3. Tools (MCP‑style phases) and advanced capabilities
4. Retrieval (KB, optional pgvector, optional rerank)
5. Model routing (provider selection + retry/circuit breaker)
6. Answer verification (self‑critique, optional cross‑model reruns)
7. Personalization and memory updates
8. Telemetry, logging, analytics

### Decision tree and auto-reply policy
- A token-aware Decision Engine evaluates every message from opted-in users across channels.
- High-priority paths that generally trigger a reply (with exceptions for spam/mentions-everyone):
	- Direct Messages (DMs)
	- Mentions of the bot
	- Replies to the bot
- In regular channels, the bot replies when overall context score passes a threshold (questions, code/error mentions, urgency, personal thread history, etc.). After the initial `/chat` opt-in, users converse by sending normal messages; no additional commands are required.
- Cooldown is applied per user after the bot replies; DMs/mentions/replies bypass cooldown to feel responsive.
- Extremely long inputs are handled with a defer strategy that asks the user to choose a summary or a deep dive.

Details and defaults:
- Exceptions: `@everyone` always suppresses replies; “too many mentions” suppresses replies when total mentions across users + roles + channels exceeds `maxMentionsAllowed` (default 6).
- Token-aware strategy selection (default `defaultModelTokenLimit` = 8000 tokens):
	- `quick-reply` for short inputs (< ~100 tokens)
	- `deep-reason` when input > 50% of model limit
	- `defer` when input > 90% of model limit
- Ambient reply threshold: requires score ≥ 25 to avoid chattiness when not a DM/mention/reply.
- Anti-noise: light penalty for very short interjections (< 3 chars) unless directly addressed.
- Cooldown and burst: per-user cooldown `cooldownMs` default 8000 ms; recent message bursts (≥ 3) apply a small penalty.

### Persona-driven voice and evolving behavior
- The active persona is guild-scoped and injected into the system prompt for all responses, shaping tone and style.
- `src/services/persona-manager.ts` reads built-in personas and can persist custom personas via Prisma.
- Personalization adapts responses per user and updates memory over time, enabling an evolving personality feel while respecting consent and pause/export/delete controls.

## Key modules
- Entrypoint: `src/index.ts`
- Pipeline: `src/services/core-intelligence.service.ts`
- Tools orchestration: `src/services/core/mcp-orchestrator.service.ts`
- Advanced capabilities manager: `src/services/advanced-capabilities/advanced-capabilities-manager.service.ts`
- Knowledge base: `src/services/knowledge-base.service.ts`
- Vector search: `src/vector/pgvector*.ts`
- Model router: `src/services/model-router.service.ts`
- Verification: `src/services/verification/answer-verification.service.ts`
- Health/Metrics: `src/health.ts`
- Analytics API: `src/services/analytics-dashboard.ts`

Decision Engine:
- `src/services/decision-engine.service.ts` contains the scoring and strategy selection (quick-reply | deep-reason | defer | ignore).
- Token-aware branching: estimates tokens (~4 chars/token) and upgrades to deep-reason (>50% of limit) or defer (>90% of limit) for very long inputs.
- Exception handling: suppress on `@everyone` or excessive mentions (users + roles + channels) even if mentioned; per-user cooldown and recent burst penalty.
- Integrated via `shouldRespond()` in `src/services/core-intelligence.service.ts`, which now tracks recent per-user bursts across a 5s sliding window.
 - Opt-in/consent and pause/resume are enforced via `UserConsentService` before evaluation; the decision engine only runs for opted-in users.

Heuristics quick reference:
- High priority: DM, direct mention, reply to the bot, and personal threads (with explicit exceptions for `@everyone` and mass mentions).
- Ambient threshold: score must reach `ambientThreshold` (default 25) to avoid chattiness in public channels.
- Anti-noise: very short interjections (< `shortMessageMinLen`, default 3 chars) are ignored unless directly addressed; personal threads can counterbalance the penalty.
- Burst control: recent rapid messages (≥ `burstCountThreshold`, default 3) apply a small penalty to ambient scoring.
- Strategy selection: `quick-reply` for short inputs, `deep-reason` past 50% of token limit, and `defer` above 90% of limit.

Contributor note: See `src/services/__tests__/decision-engine.heuristics.test.ts` for targeted heuristics cases and `src/services/__tests__/decision-engine-routing.permutation.test.ts` for routing permutations.

## Data layer
- Prisma (SQLite by default; Postgres optional for pgvector)
- Prisma models: see `prisma/schema.prisma`

## Observability
- Health and metrics HTTP server on `HEALTH_CHECK_PORT`
- OpenTelemetry traces via `src/telemetry.ts`

## Feature flags
See `docs/FEATURE_FLAGS.md`.

## Diagram
A simple block diagram:
- Discord (events) → Core Pipeline → Providers/Tools → Verification → Persistence/Telemetry → Discord (reply)

Health endpoints: see `src/health.ts`. Analytics API: `src/services/analytics-dashboard.ts`.

Further reading: token-lean pipeline and decision heuristics are summarized in `docs/spec-token-efficient-pipeline.md`.

### Evaluations and guardrails
- A small Promptfoo evaluation harness runs in CI and locally (with OPENAI_API_KEY) to catch regressions on safety, JSON validity, and latency/cost budgets.
- Token-budget guardrails (opt-in) in the model router trim conversation history and truncate overly long user prompts to fit each model’s context window while reserving output tokens. When `FEATURE_PRECISE_TOKENIZER` is enabled, precise token counts are used; otherwise a heuristic fallback (~4 chars/token) applies.

### Configuration knobs (environment variables)
- `DECISION_COOLDOWN_MS` (default 8000)
- `DECISION_MODEL_TOKEN_LIMIT` (default 8000)
- `DECISION_MAX_MENTIONS` (default 6)
- `DECISION_AMBIENT_THRESHOLD` (default 25)
- `DECISION_BURST_COUNT_THRESHOLD` (default 3)
- `DECISION_SHORT_MSG_MIN_LEN` (default 3)
 - `DECISION_OVERRIDES_JSON` (optional JSON mapping of guildId to overrides)

These knobs allow per-deployment tuning without code changes. Values are read at service initialization.

Per-guild overrides example:
```
DECISION_OVERRIDES_JSON={
	"123456789012345678": { "ambientThreshold": 35, "maxMentionsAllowed": 4 },
	"234567890123456789": { "cooldownMs": 6000 }
}
```
Note: keys inside DECISION_OVERRIDES_JSON use the option names without the `DECISION_` prefix in code (e.g., `ambientThreshold`, `maxMentionsAllowed`, `cooldownMs`). See `DecisionEngineOptions` for the exact property names.

Optional DB-backed overrides:
- If the Prisma table `guild_decision_overrides` exists, per-guild overrides can be stored there and will take precedence over `DECISION_OVERRIDES_JSON` for that guild.
- The core service constructs a provisional engine from env/defaults and asynchronously swaps in DB-backed settings when fetched.
- A TTL cache avoids repeated queries. Control cache TTL with `DECISION_OVERRIDES_TTL_MS` (default 60000 ms).
- Periodic refresh: engines are re-evaluated roughly every `DECISION_OVERRIDES_TTL_MS`; if effective options change, the per-guild engine is hot-swapped.

Testing tip: `CoreIntelligenceService` accepts an optional dependency `fetchGuildDecisionOverrides` to inject a fake DB fetcher in unit tests. At runtime, the built-in fetcher is used by default.

Optional CLI upsert (no admin commands):
- Seed or update a guild’s overrides via CLI:
- Example: npm run db:upsert-decision-overrides -- 123456789012345678 '{"ambientThreshold":30,"maxMentionsAllowed":5}'

### Enabling DB-backed overrides (Prisma)

Schema model (already included in `prisma/schema.prisma`):

- Model name: `GuildDecisionOverride`
- Table: `guild_decision_overrides`
- Fields: `guildId` (string, unique), `overrides` (Json), `createdAt`, `updatedAt`

Migration steps:

1) Generate client and apply migrations locally
	- Ensure your database URL is set in `.env`.
	- Run:
	  - npm run prisma:generate (if present) or npx prisma generate
	  - npx prisma migrate dev --name add_guild_decision_overrides

2) For production environments
	- Use: npx prisma migrate deploy

3) Upsert overrides from CLI (no admin commands required)
	- npm run db:upsert-decision-overrides -- <guildId> '{"ambientThreshold": 35, "cooldownMs": 6000}'
	- Changes will be picked up after the TTL elapses or on the next periodic refresh.