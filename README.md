# Chatterbot — Production‑Ready Discord AI Bot

[![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/Giftedx/chatterbot/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Giftedx/chatterbot/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-jest-informational)](jest.config.js)

> A modern Discord bot with agentic intelligence, multi‑provider model routing, long‑term memory, multimodal analysis, safety moderation, analytics, and optional durable orchestration. Users see one command: `/chat`. Everything else is automatic.

### Highlights
- One visible command: `/chat` (prompt + optional attachment)
- Automatic provider routing across OpenAI, Anthropic, Gemini, Groq, Mistral, and OpenAI‑compatible endpoints
- Long‑term memory and personalized responses (opt‑in, revocable)
- Advanced moderation for text, images, and attachments
- Health and metrics endpoints; optional analytics dashboard
- Optional Temporal worker for durable orchestration
- Vector search with pgvector (optional)

### Feature matrix

| Feature | Status / Flag | Notes |
|---|---|---|
| Multi‑provider model routing | On by default | `src/config/models.ts` selects best model per message |
| Long‑term memory & personalization | ENABLE_ENHANCED_INTELLIGENCE | Prisma `UserMemory`, per‑user opt‑in |
| Moderation (text/image/attachments) | ENABLE_MODERATION | Per‑guild config in DB |
| Multimodal (image/audio/docs) | On | `src/multimodal/*` |
| RAG with pgvector | FEATURE_PGVECTOR | Requires Postgres + `DATABASE_URL` |
| Cohere rerank | FEATURE_RERANK | `COHERE_API_KEY` required |
| Temporal orchestration | FEATURE_TEMPORAL | Durable workflows (optional) |
| MCP tooling (web, scrape, memory) | ENABLE_ENHANCED_INTELLIGENCE + keys | Consent prompts for higher‑risk tools |
| Analytics dashboard API | ENABLE_ANALYTICS_DASHBOARD | Port `ANALYTICS_DASHBOARD_PORT` |
| OpenTelemetry tracing | On by default | `OTEL_EXPORTER_OTLP_ENDPOINT` |

## Stack
- Runtime: Node.js 18+ (ESM), TypeScript
- Discord: `discord.js@14`
- AI Providers: `openai`, `@google/generative-ai` (Gemini), `@anthropic-ai/sdk`, `groq-sdk`, `@mistralai/mistralai`, OpenAI‑compatible endpoints
- Orchestration: Optional Temporal (`@temporalio/*`) behind feature flag
- Data: Prisma (default SQLite), optional Postgres + pgvector
- Observability: OpenTelemetry (OTLP HTTP exporter)
- Tests: Jest + ts‑jest

## Quick start
```bash
# 1) Install deps
npm install

# 2) Configure environment
cp env.example .env
# Required at minimum:
# DISCORD_TOKEN=...
# DISCORD_CLIENT_ID=...
# GEMINI_API_KEY=...    # default provider; see Providers below

# 3) Initialize Prisma (SQLite default)
npx prisma migrate dev --name init

# 4) Run in dev (tsx)
npm run dev
```

Minimal .env
```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=development
HEALTH_CHECK_PORT=3000
ENABLE_MODERATION=true
ENABLE_ENHANCED_INTELLIGENCE=false
```

What to expect
- On first `/chat`, the bot posts a brief consent notice and creates a personal thread (or offers “Move to DM?”).
- Continue talking in your thread/DM; the bot replies when addressed.
- Natural‑language privacy controls work anytime: “delete my data”, “export my data”, “pause for 30 minutes”, “resume”.

## Getting the bot into a server
1) Create an application at the Discord Developer Portal and add a Bot. Copy the Bot Token to `.env` as `DISCORD_TOKEN`.
2) Enable intents: in Bot settings, toggle “Message Content Intent”.
3) Generate an invite URL (replace CLIENT_ID and adjust permissions as needed):
   - `https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&scope=bot%20applications.commands&permissions=274877975552`
   - Use the [Discord Permissions Calculator](https://discordapi.com/permissions.html) and see [OAuth2 scopes](https://discord.com/developers/docs/topics/oauth2#shared-resources-oauth2-scopes) to tailor permissions.
4) Invite the bot to your server using that URL.
5) Run the bot (`npm run dev`) and use `/chat` in your server.

## Commands
- `/chat prompt [attachment]`
  - Only command registered by default. Registration happens at startup via application commands (global). Propagation can take minutes.

### Faster dev registration (guild‑scoped)
For faster propagation during development, register commands to a single guild. Set `DISCORD_GUILD_ID` and use this route in your registration step:
```ts
await rest.put(
  Routes.applicationGuildCommands(DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID!),
  { body: allCommands }
);
```
Revert to global registration for production:
```ts
await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: allCommands });
```

## Health, metrics, analytics
- Health server: `GET /health` (JSON) on `HEALTH_CHECK_PORT` (default 3000)
- Prometheus metrics: `GET /metrics`
- Optional analytics dashboard API: set `ENABLE_ANALYTICS_DASHBOARD=true` (port `ANALYTICS_DASHBOARD_PORT`, default 3001)

Relevant files
- `src/health.ts`
- `src/services/analytics-dashboard.ts`

## Providers and model routing
Provider and model selection is automatic based on task signals (coding, long context, multimodal, safety, latency). Supported providers are defined in `src/config/models.ts`.

Environment (see `env.example` for all keys)
```env
# Default provider (used when routing ties)
DEFAULT_PROVIDER=gemini

# OpenAI
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini

# Anthropic
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-3-5-sonnet-latest

# Gemini
GEMINI_API_KEY=...

# Groq (Llama 3.x)
GROQ_API_KEY=...
GROQ_MODEL=llama-3.1-70b-versatile

# Mistral
MISTRAL_API_KEY=...
MISTRAL_MODEL=mistral-large-latest

# OpenAI-compatible (e.g., OpenRouter, vLLM)
OPENAI_COMPAT_API_KEY=...
OPENAI_COMPAT_BASE_URL=https://your-endpoint/v1
OPENAI_COMPAT_MODEL=qwen2.5-32b-instruct
```

### Provider compatibility

| Provider | Example model | Modalities | Function calling | Notes |
|---|---|---|---|---|
| OpenAI | gpt-4o-mini | text, image, tools | yes | fast, low cost |
| Anthropic | claude-3-5-sonnet-latest | text, tools | no | long context, high safety |
| Gemini | gemini-1.5-pro | text, image, tools | no | multimodal, very long context |
| Groq | llama-3.1-70b-versatile | text | no | very low latency |
| Mistral | mistral-large-latest | text, tools | yes | coding/tools |
| OpenAI‑compatible | qwen2.5-32b-instruct | text, tools | yes | custom endpoints |

Notes reflect defaults from `src/config/models.ts`; behavior can change with provider updates.

## Memory and personalization
- Long‑term memory is stored via Prisma models (see `prisma/schema.prisma` → `UserMemory`, conversations, topics, media).
- Personalized responses are enabled when `ENABLE_ENHANCED_INTELLIGENCE=true`.
- Background consolidation and maintenance run on intervals (`MEMORY_CONSOLIDATION_INTERVAL`, `VECTOR_MAINTENANCE_INTERVAL`).

Key files
- `src/memory/user-memory.service.ts`
- `src/services/advanced-memory/*`
- `src/services/schedulers/*`

## Moderation and safety
- Text and image moderation with configurable strictness, incident logging, and optional auto‑delete.
- Attachment safety checks and type validation.

Key files
- `src/moderation/moderation-service.ts`
- `src/moderation/advanced-text-moderation.ts`
- `src/moderation/advanced-image-moderation.ts`
- `prisma/schema.prisma` (incidents, configs)

Env (examples)
```env
ENABLE_MODERATION=true
# Per‑guild config is stored in DB; defaults can be adjusted via code
```

## Multimodal analysis
Process images, audio, and documents; integrate results into conversation, RAG, and verification flows.

Key files
- `src/multimodal/` (image, audio, document, integration)
- `src/audio/hardened-processing.service.ts`

## RAG and vector search (optional)
- Use Postgres + pgvector to enable semantic search across knowledge base entries.
- Enable with `FEATURE_PGVECTOR=true` and set `DATABASE_URL` or `POSTGRES_*` envs.
- Optional Cohere rerank: `FEATURE_RERANK=true` + `COHERE_API_KEY`.

Minimal setup
```sql
-- on your Postgres db
CREATE EXTENSION IF NOT EXISTS vector;
```

Railway (pgvector)
```bash
# Connect to your Railway Postgres and enable pgvector
# Option A: open a psql shell then run the SQL above
railway connect

# Option B: run psql non‑interactively if psql is available and DATABASE_URL is set
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

Docker Postgres (pgvector)
```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16
    environment:
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_USER=postgres
      - POSTGRES_DB=chatterbot
    ports:
      - "5432:5432"
    volumes:
      - ./pg-initdb:/docker-entrypoint-initdb.d

# ./pg-initdb/01-pgvector.sql
# CREATE EXTENSION IF NOT EXISTS vector;
```

Key files
- Basic: `src/vector/pgvector.repository.ts`
- Enhanced: `src/vector/pgvector-enhanced.repository.ts`
- Docs: `docs/pgvector-setup.md`

## Orchestration (optional)
- Temporal worker for durable, multi‑step AI workflows; feature‑flagged to avoid runtime deps unless enabled.
- Enable with `FEATURE_TEMPORAL=true`. Configure `TEMPORAL_*` envs.

Key files
- `src/orchestration/temporal/loader.ts` (flag‑gated)
- `src/orchestration/temporal/runtime.ts` (worker)
- `src/orchestration/temporal/workflows/*`, `activities/*`
- `src/orchestration/temporal/README.md`

Run locally (example)
```bash
FEATURE_TEMPORAL=true npm run dev
```

## MCP integration (tools)
- Real MCP clients via `@modelcontextprotocol/sdk` for web search, content extraction, and memory tools.
- Consent prompts are shown for higher‑risk tools (web search, scraping, DB), handled via Discord buttons.

Key files
- `src/services/mcp-manager.service.ts`
- `src/services/mcp-integration.service.ts`
- `src/config/mcp-servers.config.ts`
- Examples: `examples/mcp-integration-examples.ts`, `examples/personalization-mcp-examples.ts`

Related env (examples)
```env
# MCP servers (examples)
BRAVE_API_KEY=...
FIRECRAWL_API_KEY=...
ENABLE_ENHANCED_INTELLIGENCE=true
```

## Observability
- OpenTelemetry tracing is enabled at startup; shutdown is handled gracefully.
- Configure exporter:
```env
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

Key file
- `src/telemetry.ts`

## Rate limiting
Per‑user rate limiting for interactions and free‑form messages.
```env
MAX_REQUESTS_PER_MINUTE=60
```

## Project structure (selected)
- `src/index.ts`: Entry point, command registration, event handlers, schedulers, analytics, health server
- `src/services/core-intelligence.service.ts`: Core pipeline for `/chat`
- `src/services/*`: Advanced capabilities, memory, routing, ingestion, verification, etc.
- `src/agents/*`: AutoGen/CrewAI/LangGraph/DSPy scaffolding and workflows
- `src/multimodal/*`: Image, audio, and document processing
- `src/conversation/*`: Context windows, summarization, topic detection
- `src/providers/*`: Provider adapters (OpenAI, OpenAI‑compatible, etc.)
- `src/db/*`, `prisma/*`: Prisma setup

## Environment reference
- A comprehensive reference is in `env.example` (over 150 keys across features).
- Common, safe defaults are provided; advanced features are opt‑in via `FEATURE_*` and `ENABLE_*` flags.

## Local development
Scripts (`package.json`)
```bash
# Dev
npm run dev            # tsx watch src/index.ts
npm run dev:health     # health server only

# Quality
npm run typecheck
npm run lint

# Tests
npm test
npm run test:watch
npm run test:coverage
npm run test:ci

# Build and run
npm run build
npm start

# Prisma
npm run db:migrate     # npx prisma migrate deploy
npm run db:studio      # npx prisma studio

# Docs
npm run docs           # typedoc
```

Husky pre‑commit
- `./.husky/pre-commit` runs `lint` and `typecheck`.

Makefile conveniences
```bash
make verify-env
make agent-setup
make test
make clean
```

## Docker
```bash
docker build -t chatterbot .
docker run --rm -it \
  -e DISCORD_TOKEN=... \
  -e DISCORD_CLIENT_ID=... \
  -e GEMINI_API_KEY=... \
  -p 3000:3000 -p 3001:3001 \
  chatterbot
```
- Image exposes 3000 (/health, /metrics) and 3001 (analytics API if enabled).
- Uses a non‑root user.

## One-Command Docker Deployment

1. Install Docker Desktop (Win/Mac) or Docker Engine (Linux).
2. Clone this repo and create `.env`:
   ```bash
   cp env.example .env
   # Fill in DISCORD_TOKEN, DISCORD_CLIENT_ID, and one provider key (e.g., GEMINI_API_KEY)
   ```
3. Start the bot (SQLite persisted by default):
   ```bash
   docker compose up -d --build
   ```
4. Observability:
   - Health: http://localhost:3000/health
   - Metrics: http://localhost:3000/metrics
   - Optional dashboard: set `ENABLE_ANALYTICS_DASHBOARD=true` → http://localhost:3001

### Postgres (optional)

If you want to use Postgres for vector search features (pgvector), enable the profile:
```bash
# Ensure FEATURE_PGVECTOR=true in .env
docker compose --profile postgres up -d --build
```
Set Postgres connection info (for pgvector code paths):
```env
POSTGRES_URL=postgresql://chatterbot:chatterbot@postgres:5432/chatterbot
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=chatterbot
POSTGRES_USER=chatterbot
POSTGRES_PASSWORD=chatterbot
```
Note: Prisma remains SQLite by default for app data. Do not change `DATABASE_URL` to Postgres unless you intend to migrate Prisma.

### Updating
```bash
docker compose pull && docker compose up -d
```

### Data persistence
- SQLite DB lives in a Docker volume (`bot-data`). Compose sets `DATABASE_URL=file:/data/dev.db` inside the container.
- Logs: `./logs` on your host.
- Knowledge base files: `./kb` on your host.

## Deployment
- See `DEPLOYMENT.md` for Railway‑based deployment and CI examples.
- GitHub Actions: `CI` (typecheck/lint/test/build) and `CI-CD` (Docker build + optional GHCR push).

## Permissions and intents
- Enable “Message Content Intent” for your application in the Discord Developer Portal.
- The bot requests `Guilds`, `GuildMessages`, and `MessageContent` intents.

## Data and privacy
- Users opt in once via `/chat`. Consent buttons are used where required by tools.
- Users can request deletion via a modal (“DELETE ALL MY DATA” confirmation).
- See `src/ui/privacy-consent.handlers.ts` and `src/ui/privacy-consent.ts`.

## Further reading
- Architecture: `docs/ARCHITECTURE.md`
- Advanced capabilities: `docs/ADVANCED_CAPABILITIES.md`
- Feature flags: `docs/FEATURE_FLAGS.md`
- Security guidelines: `docs/SECURITY_GUIDELINES.md`
- pgvector setup: `docs/pgvector-setup.md`
- Temporal orchestration: `src/orchestration/temporal/README.md`

## Troubleshooting
- Global command registration can take time to propagate. Prefer guild‑scoped during development if needed.
- Prisma client missing: run `npx prisma generate` (Dockerfile already does this in build stage).
- Missing envs: run `node scripts/verify-env.mjs` or `make verify-env`.
- Temporal worker requires `FEATURE_TEMPORAL=true` and `@temporalio/*` runtime; see `src/orchestration/temporal/README.md`.

## Contributing
- See `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`.

## Security
- See `SECURITY.md` and `docs/SECURITY_GUIDELINES.md`.

## License
MIT © 2025
