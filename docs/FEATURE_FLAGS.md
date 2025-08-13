# Feature Flags

Flags default to OFF unless stated. Enable selectively via environment variables.

## Core
- ENABLE_ENHANCED_INTELLIGENCE: Personalization, enhanced memory, MCP‑backed features
- ENABLE_AGENTIC_INTELLIGENCE: Agent behaviors and tools

## Verification
- ENABLE_ANSWER_VERIFICATION: Enable post‑generation verification
- CROSS_MODEL_VERIFICATION: Compare with alternative model outputs
- MAX_RERUNS: Reruns if low agreement (default 1)

## Retrieval & RAG
- FEATURE_PGVECTOR: Enable Postgres pgvector repository for vector‑first retrieval
- FEATURE_RERANK: Enable reranking (Cohere) for RAG candidates
- ENABLE_HYBRID_RETRIEVAL: Combine web + KB grounding path

## Providers / SDKs
- FEATURE_VERCEL_AI: Enable Vercel AI provider wrapper and streaming path
- FEATURE_OPENAI_RESPONSES: Use OpenAI Responses API path
- FEATURE_OPENAI_RESPONSES_TOOLS: Enable Responses API tools loop (pair with FEATURE_OPENAI_RESPONSES)
- FEATURE_LANGGRAPH: Enable LangGraph intent conditioning in response generation

## Orchestration
- FEATURE_TEMPORAL: Enable Temporal worker/runtime

## Telemetry
- FEATURE_PERSIST_TELEMETRY: Persist model selection telemetry in DB

Examples:
```bash
ENABLE_ANSWER_VERIFICATION=true CROSS_MODEL_VERIFICATION=true MAX_RERUNS=1 npm run dev
FEATURE_PGVECTOR=true docker compose --profile postgres up -d
FEATURE_VERCEL_AI=true AI_API_KEY=sk-... npm run dev
FEATURE_RERANK=true COHERE_API_KEY=... npm run dev
```

## Related environment keys
- Providers: OPENAI_API_KEY, ANTHROPIC_API_KEY, GROQ_API_KEY, MISTRAL_API_KEY, OPENAI_COMPAT_API_KEY/BASE_URL/MODEL
- Tools: BRAVE_API_KEY, FIRECRAWL_API_KEY, ELEVENLABS_API_KEY, TENOR_API_KEY, STABILITY_API_KEY
- Verification: ENABLE_ANSWER_VERIFICATION, CROSS_MODEL_VERIFICATION, MAX_RERUNS
- Observability: ENABLE_ANALYTICS_DASHBOARD, ANALYTICS_DASHBOARD_PORT, HEALTH_CHECK_PORT