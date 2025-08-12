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
- New: DM-only admin diagnose support (see Observability & Ops)

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
npx prisma migrate dev --name init

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

### Processing pipeline (robust, autonomous)
The bot runs a single, well-defined pipeline for every message:
1. Privacy and consent checks (opt-in with `/chat` once)
2. Moderation (text + attachments)
3. Unified message analysis (intents, domains, complexity, attachments)
4. Retrieval (conversation history, memories, knowledge base RAG)
5. Tool/MCP orchestration as needed (web search, scraping, browser, etc.)
6. Model routing across providers (OpenAI/Anthropic/Gemini/Groq/Mistral/compatible)
7. Answer verification (self-critique, cross-model comparison, optional auto-rerun)
8. Personalization and memory update (durable memory and summaries)
9. Response delivery with enhanced UI (threads/DMs, attachments)

---

### Observability & Ops
- Health: GET `/health`
- Metrics: GET `/metrics`
- Optional dashboard: set `ENABLE_ANALYTICS_DASHBOARD=true` and visit `http://localhost:3001`
- DM-only admin diagnose (no commands):
  - DM the bot with phrases like “diagnose”, “status”, “health”, “providers”, “telemetry”, or “kb”.
  - Only users recognized as admins (via RBAC) will receive a DM summary of provider availability, recent model usage, and knowledge base stats.
  - Configure keywords via `DIAGNOSE_KEYWORDS` env (comma-separated).
- Verification metrics (for tuning): exported via code (`getVerificationMetrics`) and can be logged periodically to observe low-agreement rates and reruns.

---

### Knowledge Base RAG
- Lightweight embeddings path using OpenAI `text-embedding-3-small` stored in `KBChunk.embedding` (bytes).
- Search prefers vector similarity if chunks exist; else keyword relevance.
- Ingestion helper: `KnowledgeBaseIngestService.addSource(guildId, title, content, url?)` to add and embed new content.
- Background ingestion (optional): set `KB_INGEST_CHANNEL_ID` to automatically ingest URLs posted in that channel.

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

## Multi-Provider Model Routing and Verification

- Model registry with model cards in `src/config/models.ts` supports: OpenAI, Anthropic, Gemini, Groq (Llama 3.x), Mistral, and OpenAI-compatible endpoints (e.g., OpenRouter/vLLM).
- Automatic routing selects the best model based on signals (coding, long context, safety, latency). Users do not choose providers; the AI selects automatically per message.
- Optional internal enhancements (flag-controlled):
  - LangGraph-driven intent conditioning (`FEATURE_LANGGRAPH=true`) to improve tone/precision.
  - OpenAI Responses API path (`FEATURE_OPENAI_RESPONSES=true`) for higher-quality generations.
  - OpenAI Responses Tools (`FEATURE_OPENAI_RESPONSES_TOOLS=true`) to allow the model to call internal MCP-like tools (memory/web/content extraction/browser/sequential thinking) via a function-calling loop.
  - Cohere Rerank (`FEATURE_RERANK=true` + `COHERE_API_KEY`) to improve RAG snippet ordering and reduce noise.

Environment flags (see `env.example`):

```
DEFAULT_PROVIDER=gemini
# Providers
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GROQ_API_KEY=...
MISTRAL_API_KEY=...
OPENAI_COMPAT_API_KEY=...
OPENAI_COMPAT_BASE_URL=...

# Verification
ENABLE_ANSWER_VERIFICATION=true
CROSS_MODEL_VERIFICATION=true
MAX_RERUNS=1

# Optional advanced SDK integrations
FEATURE_VERCEL_AI=false
FEATURE_LANGGRAPH=false
FEATURE_OPENAI_RESPONSES=false
FEATURE_OPENAI_RESPONSES_TOOLS=false
FEATURE_RERANK=false
COHERE_API_KEY=...
```

### Optional streaming (internal)
- When `FEATURE_VERCEL_AI=true`, slash interactions may stream responses using the internal streaming path for supported providers.
- This is automatic and does not expose new user options.
