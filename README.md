# Chatterbot — Production‑Ready Discord AI Assistant

Chatterbot is a modern Discord bot that gives your server a helpful, safe, multimodal AI assistant. Users see one command: `/chat` (initial opt-in only). Everything else is automatic: moderation, analysis, retrieval, tools, model routing, verification, and memory.

## Highlights
- One visible command: `/chat` (initial opt-in only)
- Multi‑provider model routing (Gemini default; OpenAI, Anthropic, Groq, Mistral, OpenAI‑compatible supported)
- Long‑term memory and personalization (opt‑in, privacy-first)
- Advanced moderation (text/images/attachments)
- RAG with pgvector (optional Postgres profile)
- Health and metrics endpoints; optional analytics dashboard
- Turn‑key Docker Compose with volume‑backed SQLite and auto‑migrations

## System architecture (at a glance)
- Discord interface: `src/index.ts` registers `/chat` and handles interactions/messages
- **Enhanced AI Pipeline**: `src/services/core-intelligence.service.ts`
  - **Multi-layered Processing**: Semantic caching → Enhanced observability → Message analysis → Multimodal processing → Knowledge graph integration → RAG optimization → Model routing → AI evaluation → Performance monitoring
  - **10 AI Enhancement Services**: Advanced capabilities including sentiment analysis, context memory, conversation threading, predictive responses, and more
- Providers and routing: `src/services/model-router.service.ts`, `src/config/models.ts`
- **Enhanced Knowledge Systems**: 
  - Vector search: `src/services/qdrant-vector.service.ts` (Qdrant integration)
  - Knowledge graph: `src/services/neo4j-knowledge-graph.service.ts` (Neo4j integration)
  - Semantic caching: `src/services/enhanced-semantic-caching.service.ts`
  - Web content: `src/services/crawl4ai-web.service.ts`
- **Performance & Analytics**: 
  - Performance monitoring: `src/services/performance-monitoring.service.ts`
  - Enhanced observability: `src/services/enhanced-langfuse.service.ts`
  - Health/metrics: `src/health.ts`; analytics API: `src/services/analytics-dashboard.ts`
- **AI Evaluation**: `src/services/ai-evaluation.service.ts` - A/B testing and quality assessment

See also: the detailed auto-reply decision policy and token-aware pipeline in `docs/ARCHITECTURE.md` (Decision tree and auto-reply policy) and `docs/spec-token-efficient-pipeline.md`.

## AI Enhancement Services

Chatterbot includes 10 advanced AI enhancement services that create a sophisticated multi-layered processing pipeline:

### Core Enhancement Services
1. **Enhanced Semantic Caching** (`src/services/enhanced-semantic-caching.service.ts`)
   - Embeddings-based similarity matching with 85% similarity threshold
   - TTL management and intelligent cache invalidation
   - Response caching with rich metadata for performance optimization

2. **Enhanced Observability** (`src/services/enhanced-langfuse.service.ts`)
   - Comprehensive conversation tracing and analytics
   - Model performance tracking with usage metrics
   - MCP tool monitoring and observability

3. **Multi-Provider Tokenization** (`src/services/multi-provider-tokenization.service.ts`)
   - Accurate token counting for OpenAI, Anthropic, Google, and Qwen models
   - Both synchronous and asynchronous token estimation methods
   - Enhanced DecisionEngine integration with precise token budgets

### Advanced Cognitive Services
4. **Sentiment Analysis Service** (`src/services/sentiment-analysis.service.ts`)
   - Real-time emotion and sentiment detection
   - Context-aware mood analysis for personalized responses

5. **Context Memory Service** (`src/services/context-memory.service.ts`)
   - Long-term conversation memory with intelligent retrieval
   - User preference learning and context preservation

6. **Conversation Summarization** (`src/services/conversation-summarization.service.ts`)
   - Automatic conversation summarization for context efficiency
   - Key point extraction and topic tracking

7. **Intent Recognition Service** (`src/services/intent-recognition.service.ts`)
   - Advanced intent classification and routing
   - Context-aware intent understanding

8. **Response Personalization** (`src/services/response-personalization.service.ts`)
   - User-specific response adaptation
   - Learning from interaction patterns

### Specialized Intelligence Services
9. **Learning System Service** (`src/services/learning-system.service.ts`)
   - Continuous learning from user interactions
   - Model performance optimization based on feedback

10. **Conversation Threading** (`src/services/conversation-threading.service.ts`)
    - Intelligent conversation flow management
    - Thread continuity and context preservation

### External Integration Services
11. **Qdrant Vector Service** (`src/services/qdrant-vector.service.ts`)
    - Advanced vector storage and similarity search
    - Hybrid search capabilities for enhanced context retrieval

12. **Neo4j Knowledge Graph** (`src/services/neo4j-knowledge-graph.service.ts`)
    - Entity relationship mapping and semantic analysis
    - Graph-based context building and knowledge storage

13. **Qwen VL Multimodal Service** (`src/services/qwen-vl-multimodal.service.ts`)
    - Advanced image analysis with OCR and object detection
    - Visual reasoning and mood analysis from images

14. **Crawl4AI Web Service** (`src/services/crawl4ai-web.service.ts`)
    - Intelligent web scraping and content extraction
    - Automatic URL detection and content integration

15. **DSPy RAG Optimization** (`src/services/dspy-rag-optimization.service.ts`)
    - Query analysis and adaptive retrieval optimization
    - A/B testing for RAG performance improvement

### Monitoring & Evaluation Services
16. **AI Evaluation Service** (`src/services/ai-evaluation.service.ts`)
    - Comprehensive performance benchmarking
    - Quality assessment and A/B testing framework

17. **Performance Monitoring Service** (`src/services/performance-monitoring.service.ts`)
    - Real-time performance tracking and alerting
    - Dashboard generation and metrics export
    - CLI interface for monitoring operations

### Feature Flag Control
All AI enhancement services are controlled by feature flags for safe deployment:
- Each service can be individually enabled/disabled
- Graceful degradation when services are unavailable
- Production-ready with comprehensive error handling

See the **Environment Configuration Guide** section below for detailed configuration options.

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
  - OpenAI-compatible presets: You can also route to Gemma 3 and GPT-OSS via any OpenAI-compatible endpoint.
    - Set `OPENAI_COMPAT_API_KEY` and `OPENAI_COMPAT_BASE_URL`.
    - Use `OPENAI_COMPAT_MODEL_GEMMA3` (default `google/gemma-3-27b-it`) or `OPENAI_COMPAT_MODEL_GPT_OSS` (default `deepseek-ai/DeepSeek-R1-Distill-Qwen-32B`).
    - The router will consider these as additional OpenAI-compatible model cards if the compat provider is configured.

### OpenAI-compatible examples

OpenRouter (Gemma 3 + GPT-OSS):

```
OPENAI_COMPAT_BASE_URL=https://openrouter.ai/api/v1
OPENAI_COMPAT_API_KEY=sk-or-...
# Optional: pick exact models exposed by the backend
OPENAI_COMPAT_MODEL_GEMMA3=google/gemma-3-27b-it
OPENAI_COMPAT_MODEL_GPT_OSS=deepseek-ai/DeepSeek-R1-Distill-Qwen-32B
# Optional router bias
DEFAULT_PROVIDER=openai_compat
# DISALLOW_PROVIDERS=gemini,openai,anthropic,groq,mistral
```

Together (Gemma 3 + GPT-OSS):

```
OPENAI_COMPAT_BASE_URL=https://api.together.xyz/v1
OPENAI_COMPAT_API_KEY=sk-together-...
OPENAI_COMPAT_MODEL_GEMMA3=google/gemma-3-27b-it
OPENAI_COMPAT_MODEL_GPT_OSS=deepseek-ai/DeepSeek-R1-Distill-Qwen-32B
DEFAULT_PROVIDER=openai_compat
```

Local vLLM (self-hosted):

```
OPENAI_COMPAT_BASE_URL=http://localhost:8000/v1
# If vLLM serves a single model, set OPENAI_COMPAT_MODEL to that id; or use the presets below
OPENAI_COMPAT_MODEL_GEMMA3=gemma-3:27b-instruct
OPENAI_COMPAT_MODEL_GPT_OSS=deepseek-r1:32b
DEFAULT_PROVIDER=openai_compat
```

Ollama (OpenAI-compatible proxy):

```
OPENAI_COMPAT_BASE_URL=http://localhost:11434/v1
OPENAI_COMPAT_MODEL_GEMMA3=gemma3:27b-instruct
OPENAI_COMPAT_MODEL_GPT_OSS=deepseek-r1:32b
DEFAULT_PROVIDER=openai_compat
```
- Tools (optional): `BRAVE_API_KEY` (web search), `FIRECRAWL_API_KEY` (content extraction)
- Media (optional): `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `TENOR_API_KEY`
- Retrieval options: `FEATURE_PGVECTOR`, `OPENAI_API_KEY` (embeddings path), `FEATURE_RERANK`, `COHERE_API_KEY`
  - Optional self-hosted reranker: set `FEATURE_LOCAL_RERANK=true` and `RERANK_PROVIDER=local` to use a local Sentence Transformers model via Transformers.js (CPU by default). Override model with `LOCAL_RERANK_MODEL`.
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

### Helicone (optional proxy for OpenAI/compatible)
If you want request-level observability, caching, and rate policies on OpenAI or OpenAI-compatible providers, you can route traffic via Helicone:

- Set in `.env`:
  - `HELICONE_BASE_URL=https://oai.helicone.ai/v1` (for OpenAI)
  - `HELICONE_API_KEY=...`
  - Optional: `HELICONE_CACHE_ENABLED=true` and `HELICONE_CACHE_MAX_AGE=300`

Our OpenAI and OpenAI-compatible providers automatically add the required headers and base URL when these variables are present.

### Semantic cache persistence (optional)
You can persist semantic cache entries (embeddings + outputs) in Redis to survive restarts and share across instances:

- Set in `.env`:
  - `FEATURE_SEMANTIC_CACHE=true`
  - `REDIS_URL=redis://localhost:6379`
  - `FEATURE_SEMANTIC_CACHE_PERSIST=true`
  - Optionally tune: `SEMANTIC_CACHE_TTL_MS`, `SEMANTIC_CACHE_MAX_ENTRIES`, `SEMANTIC_CACHE_DISTANCE`

### Langfuse telemetry (optional)
Enable lightweight telemetry events to Langfuse. Safe no-op unless enabled and keys provided.

- Set in `.env`:
  - `FEATURE_LANGFUSE=true`
  - `LANGFUSE_PUBLIC_KEY=...`
  - `LANGFUSE_SECRET_KEY=...`
  - Optional: `LANGFUSE_BASE_URL=https://cloud.langfuse.com`

## Commands
- `/chat` — initial opt-in only (sets up consent and a DM or personal thread)
  - After opting in, just send messages directly (DM or your personal thread). You don't need to use `/chat` again.

## Evaluations (CI + local)
- We ship a lightweight Promptfoo harness to catch regressions in PRs.
- To run locally: set OPENAI_API_KEY in your environment, then run `npm run eval`.
- CI workflow auto-runs on PRs and uploads artifacts; it skips gracefully if no key is present.
- Config lives in `promptfooconfig.yaml`.

### Reranker benchmarking (optional)
- Compare Cohere vs Voyage on a tiny labeled dataset (JSONL).
- Set one or both keys: `COHERE_API_KEY`, `VOYAGE_API_KEY`.
- Then run:
  - `npm run bench:rerank`
- Output prints average NDCG@3/5 and MRR@3/5 for available providers.
 - For a free, fully self-hosted option, you can set `RERANK_PROVIDER=local` and enable `FEATURE_LOCAL_RERANK=true` to use a local Sentence Transformers model for reranking. (Bench script currently compares hosted providers.)
   - Note: On first use, Transformers.js will download the model specified by `LOCAL_RERANK_MODEL` (default `Xenova/all-MiniLM-L6-v2`). Subsequent runs use a local cache. To pre-warm in production, you can trigger a dummy search at startup with the flag enabled.

CI support:
- A dedicated workflow runs the benchmark on PRs that touch the dataset or script and on manual dispatch.
- It skips gracefully if neither key is present. When keys are available, it uploads `rerank-bench.json` as a build artifact.

## Decision pipeline (auto-reply policy)
Chatterbot uses a unified, token-aware decision engine to determine when and how to respond:

- Opt-in and privacy: Only opted-in users are processed. Users can pause/resume, export, or delete data with natural-language triggers.
- Priority signals: DMs, direct mentions, and replies to the bot generally trigger a response. Safety exceptions apply (e.g., mass-mentions).
- Ambient channels: The engine scores messages based on questions, code/stack traces, urgency, and length; it now also considers recent channel activity to avoid chattiness in busy channels.
- Token-aware strategy: Short prompts → quick reply; medium prompts → deep reasoning; near token limits → defer/confirm.
- Per-guild overrides: Tune behavior via env JSON `DECISION_OVERRIDES_JSON` and (optionally) DB-backed overrides for thresholds like `ambientThreshold`, `burstCountThreshold`, and `defaultModelTokenLimit`.

Entry points: `src/index.ts`. Decision engine: `src/services/decision-engine.service.ts`. Wiring and pipeline: `src/services/core-intelligence.service.ts`.

## Feature flags (common)
- **Core AI**: `ENABLE_ENHANCED_INTELLIGENCE`, `ENABLE_AGENTIC_INTELLIGENCE`
- **Verification**: `ENABLE_ANSWER_VERIFICATION`, `CROSS_MODEL_VERIFICATION`, `MAX_RERUNS`
- **AI Enhancement Services** (17 advanced capabilities) - **All enabled by default**:
  - `ENABLE_SENTIMENT_ANALYSIS` - Real-time emotion and mood detection
  - `ENABLE_CONTEXT_MEMORY` - Long-term conversation memory and user preferences  
  - `ENABLE_CONVERSATION_SUMMARIZATION` - Automatic conversation summarization
  - `ENABLE_INTENT_RECOGNITION` - Advanced intent classification and routing
  - `ENABLE_RESPONSE_PERSONALIZATION` - User-specific response adaptation
  - `ENABLE_LEARNING_SYSTEM` - Continuous learning from interactions
  - `ENABLE_MULTIMODAL_PROCESSING` - Advanced image analysis and visual reasoning
  - `ENABLE_CONVERSATION_THREADING` - Intelligent conversation flow management
  - `ENABLE_KNOWLEDGE_GRAPH` - Entity relationship mapping and semantic analysis
  - `ENABLE_PREDICTIVE_RESPONSES` - Proactive response generation
  - `ENABLE_PERFORMANCE_MONITORING` - Real-time performance tracking and alerting
- **Retrieval**: `FEATURE_PGVECTOR`, `FEATURE_RERANK`, `ENABLE_HYBRID_RETRIEVAL`
- **Providers/SDKs**: `FEATURE_VERCEL_AI`, `FEATURE_OPENAI_RESPONSES`, `FEATURE_OPENAI_RESPONSES_TOOLS`, `FEATURE_LANGGRAPH`
- **Orchestration**: `FEATURE_TEMPORAL`

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
