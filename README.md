# Chatterbot — Production‑Ready Discord AI Assistant

Chatterbot is a modern Discord bot that gives your server a helpful, safe, multimodal AI assistant. Users see one command: `/chat`. Everything else is automatic: moderation, analysis, retrieval, tools, model routing, verification, and memory.

## Highlights
- One visible command: `/chat` (prompt + optional attachment)
- Multi‑provider model routing (Gemini default; OpenAI, Anthropic, Groq, Mistral, OpenAI‑compatible supported)
- Long‑term memory and personalization (opt‑in, privacy-first)
- Advanced moderation (text/images/attachments)
- RAG with pgvector (optional Postgres profile)
- Health and metrics endpoints; optional analytics dashboard
- Turn‑key Docker Compose with volume‑backed SQLite and auto‑migrations

## System architecture (at a glance)
- Discord interface: `src/index.ts` registers `/chat` and handles interactions/messages
- Core pipeline: `src/services/core-intelligence.service.ts`
  - Moderation → Message analysis → MCP/Tools → Advanced capabilities → RAG → Model routing → Verification → Memory/Telemetry
- Providers and routing: `src/services/model-router.service.ts`, `src/config/models.ts`
- Knowledge base, embeddings, vector search: `src/services/knowledge-base*.ts`, `src/vector/*`
- Health/metrics: `src/health.ts`; analytics API: `src/services/analytics-dashboard.ts`
- Observability: OpenTelemetry (`src/telemetry.ts`)

## Quickstart (recommended: Docker)
1) Create environment
- Run the setup wizard (opens provider pages, collects keys, writes `.env`):
```bash
npm run setup
```
Or copy and edit:
```bash
cp env.example .env
```
Required minimum:
- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `GEMINI_API_KEY`

2) Start the bot
```bash
docker compose up -d --build
```
3) Verify
- Health: http://localhost:3000/health
- Metrics: http://localhost:3000/metrics
- Optional analytics dashboard: set `ENABLE_ANALYTICS_DASHBOARD=true` → http://localhost:3001

Invite URL template (replace CLIENT_ID):
```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&scope=bot%20applications.commands&permissions=274877975552
```

## Local development
```bash
npm install
cp env.example .env
npx prisma migrate dev --name init
npm run dev
```
Health-only server (for testing):
```bash
npm run dev:health
```

## Configuration
- Minimal `.env`:
```
DISCORD_TOKEN=...
DISCORD_CLIENT_ID=...
GEMINI_API_KEY=...
HEALTH_CHECK_PORT=3000
ENABLE_ENHANCED_INTELLIGENCE=true
ENABLE_AGENTIC_INTELLIGENCE=true
ENABLE_ANSWER_VERIFICATION=true
CROSS_MODEL_VERIFICATION=true
MAX_RERUNS=1
DEFAULT_PROVIDER=gemini
```
- Providers (optional): `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, `OPENAI_COMPAT_API_KEY/BASE_URL/MODEL`
- Tools (optional): `BRAVE_API_KEY` (web search), `FIRECRAWL_API_KEY` (content extraction)
- Media (optional): `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `TENOR_API_KEY`
- Retrieval options: `FEATURE_PGVECTOR`, `OPENAI_API_KEY` (embeddings path), `FEATURE_RERANK`, `COHERE_API_KEY`
- Other: `ENABLE_HYBRID_RETRIEVAL`, `ENABLE_ANALYTICS_DASHBOARD`, `ANALYTICS_DASHBOARD_PORT`

See `env.example` for a comprehensive list.

## Database
- Default: SQLite via Prisma; auto‑migrated at container startup; persisted to Docker volume `bot-data`.
- Docker sets `DATABASE_URL=file:/data/dev.db` (inside container). Locally, use `file:./prisma/dev.db`.
- Prisma models live in `prisma/schema.prisma`.

### Postgres (optional, for pgvector)
- Enable feature: `FEATURE_PGVECTOR=true`
- Start Postgres with compose profile:
```bash
docker compose --profile postgres up -d --build
```
- The vector repository reads `DATABASE_URL` or `POSTGRES_URL` and other `POSTGRES_*` vars for connections used by pgvector code paths. Prisma stays on SQLite unless you intentionally migrate it to Postgres.

## Observability
- Health: `GET /health` (JSON) on `HEALTH_CHECK_PORT` (default 3000)
- Metrics: `GET /metrics` (Prometheus text)
- Analytics API (optional): enable `ENABLE_ANALYTICS_DASHBOARD=true` (`ANALYTICS_DASHBOARD_PORT`, default 3001)

## Commands
- `/chat prompt [attachment]` — the only command registered by default
  - Creates a personal thread or DM (opt‑in, privacy-first)

## Feature flags (common)
- Enhanced/Agentic: `ENABLE_ENHANCED_INTELLIGENCE`, `ENABLE_AGENTIC_INTELLIGENCE`
- Verification: `ENABLE_ANSWER_VERIFICATION`, `CROSS_MODEL_VERIFICATION`, `MAX_RERUNS`
- Retrieval: `FEATURE_PGVECTOR`, `FEATURE_RERANK`, `ENABLE_HYBRID_RETRIEVAL`
- Providers/SDKs: `FEATURE_VERCEL_AI`, `FEATURE_OPENAI_RESPONSES`, `FEATURE_OPENAI_RESPONSES_TOOLS`, `FEATURE_LANGGRAPH`
- Orchestration: `FEATURE_TEMPORAL`

See `docs/FEATURE_FLAGS.md` for details.

## Advanced capabilities
- Orchestrated tools (MCP-inspired) with graceful fallbacks: web search, content extraction, sequential thinking, browser automation, image generation, GIF search, TTS
- Real API integrations where keys are provided; safe fallbacks otherwise
- Details: `docs/ADVANCED_CAPABILITIES.md`

## Deployment
- Docker Compose (recommended): see Quickstart
- GHCR image (publish via provided workflow):
```bash
docker run -d --name chatterbot --env-file .env \
  -p 3000:3000 -p 3001:3001 \
  -v chatterbot-data:/data ghcr.io/giftedx/chatterbot:main
```
- CI: `.github/workflows/ci.yml` (typecheck/lint/test/build), `.github/workflows/docker-publish.yml` (GHCR)
- Railway: see `DEPLOYMENT.md`

## Security and privacy
- Secrets live in `.env` (gitignored). Do not commit credentials.
- Privacy-first consent and data controls are built‑in (DM/thread opt-in, data export/delete triggers).
- See `docs/SECURITY_GUIDELINES.md`.

## Troubleshooting
- Prisma client missing: ensure `npx prisma generate` (Docker build does this) or run `npm run build` locally.
- `/health` returns 500: check `.env` and provider status in logs; ensure the bot has required Discord intents.
- Vector features inactive: ensure `FEATURE_PGVECTOR=true` and Postgres profile is running.

### Discord notes
- Enable "Message Content Intent" in your bot settings.
- Global command registration can take minutes to propagate. For faster iteration, use guild‑scoped registration during development.

## Provider quick links
- Discord: https://discord.com/developers/applications (Create app, Bot token, Application ID)
- Gemini: https://aistudio.google.com/app/apikey
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/settings/keys
- Groq: https://console.groq.com/keys
- Mistral: https://console.mistral.ai/api-keys/
- OpenAI‑compatible (OpenRouter): https://openrouter.ai/settings/keys
- Brave Search: https://api.search.brave.com/app/signup
- Firecrawl: https://www.firecrawl.dev/ (Docs: https://docs.firecrawl.dev/quickstart)
- ElevenLabs: https://elevenlabs.io/app/settings/api-keys
- Tenor: https://tenor.com/developer/keyregistration
- Cohere: https://dashboard.cohere.com/api-keys

## License
MIT © 2025
