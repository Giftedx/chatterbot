# Architecture

## Overview
Chatterbot is a Discord bot that exposes a single command, `/chat`, backed by a modular AI pipeline:

1. Moderation (text/images)
2. Message analysis (intents, complexity, attachments, tool needs)
3. Tools (MCP‑style phases) and advanced capabilities
4. Retrieval (KB, optional pgvector, optional rerank)
5. Model routing (provider selection + retry/circuit breaker)
6. Answer verification (self‑critique, optional cross‑model reruns)
7. Personalization and memory updates
8. Telemetry, logging, analytics

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