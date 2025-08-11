# Chatterbot — Discord AI with Single `/chat` UX

> A production-ready Discord bot built with TypeScript and discord.js v14. End users see just one command: `/chat`. Everything else happens automatically behind the scenes.

### What users experience
- Type `/chat` once to opt in. You’ll get a short, friendly consent message.
- The bot replies only in a personal thread (or DM if you choose “Move to DM?”). No channel clutter.
- After that, just talk normally in your thread/DM and the bot replies when addressed.
- Say things like “pause for 30 minutes”, “resume”, “delete my data”, “export my data”, or “what do you know about me?” at any time; the bot handles it quietly via DM.

### Highlights
- Single visible command: `/chat` (prompt + optional attachment)
- Automatic memory, summarization, and RAG over shared files/links
- Strong moderation, graceful degradation, model fallback
- Observability: health, metrics, analytics dashboard (optional)
- New: Smart media generation (images, GIFs) and speech replies (TTS)

---

### Quick Start
```bash
# 1) Install dependencies
npm install

# 2) Configure environment
cp env.example .env
# Set: DISCORD_TOKEN, DISCORD_CLIENT_ID, GEMINI_API_KEY
# Optional: STABILITY_API_KEY (images), TENOR_API_KEY (GIFs), ELEVENLABS_API_KEY (TTS)

# 3) Initialize database (SQLite by default)
npx prisma migrate dev --name init  # first time
# If you’ve pulled recent changes with new models:
npx prisma migrate dev --name single_chat_models

# 4) Run in dev
npm run dev
```

---

### The only command
- `/chat prompt [attachment]`
  - On first use: you’ll see a short ephemeral consent and the bot will create a personal thread and offer “Move to DM?”.
  - After that: just talk in your thread or DM. Ask to “switch to DMs” or “talk here” to move.

Note: No other slash commands are exposed by default. Natural-language privacy controls work any time (delete/export/pause/resume/new topic).

---

### Configuration
Required
```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_app_id
GEMINI_API_KEY=your_google_gemini_key
```

Optional
```env
# Feature flags
ENABLE_ENHANCED_INTELLIGENCE=false

# Analytics dashboard
ENABLE_ANALYTICS_DASHBOARD=false
ANALYTICS_DASHBOARD_PORT=3001

# Logging
LOG_LEVEL=info
NODE_ENV=development

# Media providers
STABILITY_API_KEY=your_stability_ai_api_key_here
TENOR_API_KEY=your_tenor_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

Notes
- Default DB is SQLite. Set `DATABASE_URL` to switch (e.g., Postgres). If Postgres+pgvector is available, embeddings can be stored there; otherwise remain in SQLite bytes fields or external stores.
- Media generation and TTS gracefully degrade when provider keys are missing (placeholders or disable feature).

---

### Architecture (high level)
- Gateway: discord.js v14 with Message Content intent
- Orchestrator: gating → moderation → intent detect → retrieve (history + memories + KB) → plan/answer/critique → post-process → auto-learn → log
- Memory engine: durable facts/preferences/projects/relationships/style; summaries per user; time-decayed recency
- Guild Knowledge Base (RAG): auto-ingests shared files/links, chunks+embeds, ranks by recency and relevance
- Moderation: pre/post filters, safe-complete
- Observability: metrics, traces, transcripts (sampling), feature flags, A/B harness
- Media: Phase 4 tools for image generation, GIF search, and TTS with intelligent triggers

Key models (Prisma)
- `User` with `dmPreferred`, `lastThreadId`, `pauseUntil`
- `Memory`, `Summary`, `KBSource`, `KBChunk`, `MessageLog`, `IntentLog`, `StyleProfile`
- Existing aggregates remain (`UserMemory`, etc.) for backward compatibility

---

### Privacy (short, friendly)
- The bot remembers helpful, long-lived details to personalize replies.
- You can say “delete my data” or “export my data” any time; the bot will DM you and complete it quietly.

For administrators: internals and guardrails live in code; end users only see `/chat` and natural language controls.

---

### Observability & Ops
- Health: GET `/health`
- Metrics: GET `/metrics`
- Optional dashboard: set `ENABLE_ANALYTICS_DASHBOARD=true` and visit `http://localhost:3001`

---

### Development
- Build: `npm run build`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Test: `npm test`
- Docs: `npm run docs`

### Docker
```bash
docker build -t chatterbot .
docker run --rm -it \
  -e DISCORD_TOKEN=... \
  -e DISCORD_CLIENT_ID=... \
  -e GEMINI_API_KEY=... \
  chatterbot
```

MIT © 2025
