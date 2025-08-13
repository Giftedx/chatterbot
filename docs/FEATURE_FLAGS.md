# Feature Flags

Flags default to OFF. Enable selectively per environment.

- FEATURE_TEMPORAL: Enable orchestration loader and worker runtime.
- FEATURE_VERCEL_AI: Enable Vercel AI provider wrapper and streaming path.
- FEATURE_PGVECTOR: Enable Postgres pgvector repository for vector-first retrieval.
- FEATURE_LANGGRAPH: Enable LangGraph intent conditioning in response generation.
- FEATURE_OPENAI_RESPONSES: Use OpenAI Responses API path for generations.
- FEATURE_OPENAI_RESPONSES_TOOLS: Enable Responses API tools loop (function-calling). Optionally pair with FEATURE_TOOL_SUMMARY.
- FEATURE_TOOL_SUMMARY: Append tool-call summaries in the final answer.
- FEATURE_RERANK: Enable reranking (Cohere) for RAG candidates.
- FEATURE_PERSIST_TELEMETRY: Persist model selection telemetry in database.

Examples:
```bash
FEATURE_PGVECTOR=true DATABASE_URL=postgres://user:pass@host/db npm run dev
FEATURE_VERCEL_AI=true AI_API_KEY=sk-... npm run dev
FEATURE_OPENAI_RESPONSES=true OPENAI_API_KEY=sk-... npm run dev
FEATURE_RERANK=true COHERE_API_KEY=... npm run dev
```