# Chatterbot — Advanced Discord AI with 34 AI Capabilities

> A production-ready Discord bot powered by cutting-edge AI frameworks including AutoGen Multi-Agent, DSPy, Semantic Routing, Neural-Symbolic Reasoning, MoE Architecture, RAG 2.0, Constitutional AI, and Quantum-Inspired AI. End users see just one command: `/chat`. Everything else happens automatically behind the scenes.

## 🚀 Advanced AI Framework Integration (2025)

**34 Total AI Capabilities** spanning the entire spectrum of modern AI technology:

### Core Advanced Frameworks (16)
- **AutoGen Multi-Agent Framework** - Microsoft's collaborative AI with 5 specialized agents
- **DSPy Structured Prompting** - Stanford's systematic AI reasoning with optimization pipelines  
- **Semantic Routing & Intent Classification** - Intelligent query routing with OpenAI embeddings
- **Neural-Symbolic Reasoning** - Hybrid TensorFlow.js + symbolic logic system
- **LangGraph Agentic Workflows** - Complex multi-step reasoning workflows
- **CrewAI Specialists** - Domain-specific collaborative AI teams
- **Long-term Memory Subsystem** - Persistent episodic and semantic memory
- **Enhanced Multimodal GPT-4o** - Advanced vision, audio, and document processing
- **Real-time Streaming Backbone** - Live AI interactions with WebSocket support
- **Hardened Audio Processing** - Speech-to-text, text-to-speech, and audio analysis
- **MLOps Lifecycle Management** - Automated model training and deployment
- **Edge AI Deployment** - Sub-50ms inference with geographic load balancing
- **Advanced Vector Database** - Multi-modal semantic search with HNSW indexing
- **Temporal Workflow Orchestration** - Durable, fault-tolerant AI operations
- **Constitutional AI Safety** - 7-principle ethical framework with real-time filtering
- **Comprehensive Analytics** - Real-time performance monitoring and optimization

### 2025 Cutting-Edge Frameworks (10)
- **Mixture of Experts (MoE)** - Dynamic expert routing across 6 specialized domains
- **RAG 2.0 with Hybrid Search** - Next-generation retrieval with multi-modal embeddings
- **Compound AI Systems** - Multi-component orchestration with parallel workflows
- **Federated Learning** - Privacy-preserving distributed ML with 8 simulated clients
- **Causal AI & Reasoning** - Automated causal discovery with PC, GES, LiNGAM algorithms
- **LangChain Expression Language (LCEL)** - Advanced prompt engineering framework
- **Graph Neural Networks** - Knowledge graph processing with GCN, GraphSAGE, GAT, GIN
- **Meta-Learning Framework** - Few-shot learning with MAML, Reptile, Prototypical Networks
- **Quantum-Inspired AI** - Quantum annealing and superposition for optimization
- **Multi-Agent Conversation Systems** - Advanced coordination and collaboration

### Enhanced Core Features (8)
- **Intelligent Framework Selection** - Automatic optimal capability routing
- **Cross-Modal Processing** - Seamless text, image, audio, video, and structured data
- **Constitutional Safety Layer** - All outputs filtered through comprehensive ethical AI
- **Real-time Performance Monitoring** - Health checks across all 34 capabilities
- **Multi-Framework Collaboration** - Complex problems solved using coordinated frameworks
- **Advanced Memory Systems** - Episodic, semantic, and procedural memory integration
- **Enterprise-Grade Orchestration** - Production-ready scalability and reliability
- **Comprehensive Error Handling** - Graceful degradation and automatic recovery

### What users experience
- Type `/chat` once to opt in. You’ll get a short, friendly consent message.
- The bot replies only in a personal thread (or DM if you choose “Move to DM?”). No channel clutter.
- After that, just talk normally in your thread/DM and the bot replies when addressed.
- Say things like “pause for 30 minutes”, “resume”, “delete my data”, “export my data”, or “what do you know about me?” at any time; the bot handles it quietly via DM.

### Key Highlights
- **Single visible command**: `/chat` (prompt + optional attachment) powered by 34 AI capabilities
- **Intelligent AI Framework Selection**: Automatic routing to optimal capabilities based on query analysis
- **Advanced Multi-Agent Systems**: AutoGen and CrewAI for collaborative problem solving
- **Next-Generation RAG**: Hybrid search with multi-modal embeddings and constitutional safety
- **Real-time Edge AI**: Sub-50ms inference with geographic load balancing
- **Comprehensive Memory**: Long-term episodic, semantic, and procedural memory systems
- **Production-Ready**: Enterprise-grade reliability, monitoring, and scalability
- **Constitutional AI Safety**: 7-principle ethical framework protecting all interactions

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

### Production Postgres + pgvector (recommended)
- Set `DATABASE_URL` to your Postgres connection string and set `FEATURE_PGVECTOR=true`.
- Ensure pgvector extension is available:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
- The app will auto-create table/indexes for vector search on first run. To pre-create:
```sql
CREATE TABLE IF NOT EXISTS kb_vectors (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  guild_id TEXT,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS kb_vectors_embedding_idx ON kb_vectors USING ivfflat (embedding vector_l2_ops);
```

### OpenTelemetry Tracing
- Export traces to an OTLP endpoint by setting `OTEL_EXPORTER_OTLP_ENDPOINT` (default `http://localhost:4318/v1/traces`).
- Tracing is initialized at startup and shut down gracefully on exit.

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
3. Unified message analysis (intents, domains, complexity, attachments) with input sanitization and length limiting
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
- Vector-first retrieval when `FEATURE_PGVECTOR=true` and OpenAI embeddings are configured; falls back to Prisma chunks or keyword search.
- Optional Cohere reranking when `FEATURE_RERANK=true` and `COHERE_API_KEY` is set.
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
  - OpenAI Responses Tools (`FEATURE_OPENAI_RESPONSES_TOOLS=true`) to allow the model to call internal MCP-like tools (memory/web/content extraction/browser/sequential thinking) via a function-calling loop. Optionally append tool summaries in the final answer with `FEATURE_TOOL_SUMMARY=true`.
  - Cohere Rerank (`FEATURE_RERANK=true` + `COHERE_API_KEY`) to improve RAG snippet ordering and reduce noise.
  - Edge AI deployment (`EDGE_*` envs) for low-latency responses with health-checked nodes.

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
FEATURE_TOOL_SUMMARY=false
FEATURE_RERANK=false
FEATURE_PERSIST_TELEMETRY=false
FEATURE_PGVECTOR=false
FEATURE_TEMPORAL=false
COST_TIER_MAX=medium   # one of: low|medium|high (max spend)
SPEED_TIER_MIN=medium  # one of: slow|medium|fast (min speed)
COHERE_API_KEY=...

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Edge AI deployment
EDGE_MAX_NODES=5
EDGE_LOAD_THRESHOLD=0.8
EDGE_SYNC_INTERVAL_MS=30000
EDGE_FAILOVER_ENABLED=true
EDGE_MODEL_REPLICATION=2
EDGE_UPTIME_SUCCESS_RATE=0.95
EDGE_MAX_SIMULATED_LOAD_FACTOR=0.9
```

### Optional streaming (internal)
- When `FEATURE_VERCEL_AI=true`, slash interactions may stream responses using the internal streaming path for supported providers.
- This is automatic and does not expose new user options.
