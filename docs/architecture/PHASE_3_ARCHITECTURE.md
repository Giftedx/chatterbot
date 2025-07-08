# Phase 3 Architecture – Advanced Features

> Goal: Evolve the MVP into an "unbelievably good" production bot by layering advanced capabilities while preserving maintainability and cost-efficiency.

---

## 1. Personality Engine

### Objective
Allow administrators to define multiple personas (tone, style, system prompts) and switch them per channel or per command.

### Proposed Architecture
```
src/
  personas/
    index.ts            // singleton PersonaRegistry
    built-ins.ts        // curated defaults (friendly, sarcastic, mentor…)
  commands/
    persona.ts          // /persona set <name> & /persona list
```

### Key Components
| Component | Responsibility |
|-----------|---------------|
| `Persona` interface | `{ name: string; systemPrompt: string; styleHints?: string[] }` |
| `PersonaRegistry` | CRUD in-memory + persistence (JSON file or DB) |
| `applyPersona(prompt, persona)` | Prepend system prompt & style hints before Gemini call |

### Dependencies
* SQLite via **Prisma ORM** (default) or external Postgres

### Challenges
* Exposing safe controls so untrusted users cannot craft malicious system prompts.
* Storing per-guild preferences (requires persistent DB).

---

## 2. Advanced Moderation

### Objective
Proactively detect & handle unsafe content (NSFW images, hate speech, private info) before sending to Gemini or posting replies.

### Proposed Architecture
```
src/moderation/
  text-filters.ts       // keyword & ML API checks
  image-safety.ts       // Google Cloud Vision SafeSearch or Replicate model
  middleware.ts         // wraps command handler with checks
```

### Key Components
* `checkTextSafety(content: string): Promise<SafetyVerdict>`
* `checkImageSafety(part: Part): Promise<SafetyVerdict>`
* `ModerationMiddleware.handle(interaction)` – aborts or sanitises.

### Dependencies
* Google Cloud Vision, OpenAI Moderation, or a local model via `@dqbd/tiktoken`

### Challenges
* Latency vs accuracy.
* Cost of external APIs.
* False-positive management & admin overrides.

---

## 3. UX Polish

### Objective
Deliver a delightful in-chat experience (streaming responses, message edits, buttons for regenerate / stop).

### Proposed Architecture
```
src/ui/
  stream-utils.ts       // incremental editReply()
  buttons.ts            // createButtonRow(id)
  interaction-router.ts // central dispatcher for button customIds
```

### Key Components
* `streamGemini(prompt,…): AsyncIterable<string>` – yields chunks.
* `sendStream(interaction, stream)` – edits message every ~1 s.
* `customId` schema → `ButtonAction` enum.

### Dependencies
* Discord.js `MessageComponentBuilder`

### Challenges
* Discord rate limits on message edits (2000 chars, 5 edits/5 s).
* Cancelling streams when user presses **Stop**.

---

## 4. Analytics Dashboard

### Objective
Provide server owners with metrics (usage counts, top prompts, API cost).

### Proposed Architecture
```
prisma/schema.prisma    // UsageEvent model
src/analytics/
  collector.ts          // fire-and-forget saveUsage()
  api.ts                // REST JSON for dashboard
web/
  dashboard/            // Next.js or Astro static site
```

### Key Components
* `UsageEvent` { id, guildId, userId, tokens, costUsd, createdAt }
* `aggregateStats(guildId)` returns monthly totals.
* `GET /stats/:guildId` secured by bot JWT.

### Dependencies
* Prisma + Postgres (use free Railway or Neon)
* Simple dashboard UI (Next.js + Tailwind)

### Challenges
* GDPR & data retention.
* Auth between Discord guild owner and dashboard (OAuth2).

---

## Cross-Cutting Concerns
* **Config management** – move secrets to `.env`, consider Vault for prod.
* **Testing** – expand Jest coverage & add integration tests with Discord sandbox guild.
* **Deployment** – Dockerfile ‑> fly.io or render.com.

---

_This architecture is intentionally modular; each feature can be developed and rolled-out independently behind feature flags._
