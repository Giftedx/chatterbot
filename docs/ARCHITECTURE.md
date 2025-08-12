# Architecture Overview

This document orients contributors and AI agents to the system at a high level.

## 1. System Context
- Language: TypeScript
- Tooling: ESLint, Jest, TypeDoc, Docker
- Data/ORM: Prisma (SQLite by default)
- Deployment: Docker, Railway (railway.json)

## 2. High-Level Components
- `src/`: Application code (domain, services, adapters)
  - `services/core-intelligence.service.ts`: single entry orchestrator for `/chat` and free-form messages
  - `services/model-router.service.ts`: multi-provider routing + telemetry
  - `services/verification/answer-verification.service.ts`: critique + cross-model verification
  - `services/knowledge-base.service.ts`: KB search + lightweight RAG via `KBChunk` embeddings
  - `providers/*`: LLM provider wrappers
- `prisma/`: Database schema and migrations
- `docs/`: Project documentation
- `scripts/`: Utility scripts (context, env verification)

## 3. Interaction Model
- Single visible command: `/chat` (opt-in and message entry)
- After opt-in, all user messages in thread/DM are processed through the same unified pipeline automatically.
- DM-only admin diagnose: natural-language triggers (“diagnose”, “status”, “health”, “providers”, “telemetry”, “kb”) respond with provider/telemetry/KB summaries only if the user is an admin (RBAC).

## 4. Pipeline Overview
1. Privacy & consent check
2. Moderation (text and attachments)
3. Unified message analysis (intents, domains, complexity)
4. Retrieval (history, durable memory, KB via `KBChunk` + embeddings)
5. MCP/tool orchestration (web, scraping, browser) as needed
6. Model routing (OpenAI/Anthropic/Gemini/Groq/Mistral/compatible) with telemetry
7. Answer verification (self-critique, cross-model, optional auto-rerun)
8. Personalization & memory updates
9. Response delivery with thread/DM UX

## 5. Cross-Cutting Concerns
- Error handling: Fail fast, typed errors where possible
- Configuration: `.env` (see `env.example`)
- Logging: Structured logs, avoid sensitive data
- Security: See `SECURITY.md` (RBAC, consent, moderation)

## 6. Build & Test Pipelines
- CI runs install, lint, tests. Typecheck/Build are expected to pass locally.
- Coverage via Jest when enabled.

## 7. Coding Standards
- Formatting: Prettier (.prettierrc.json)
- Linting: ESLint (.eslintrc.json)
- Types: Strict TypeScript

## 8. Documentation Strategy
- Agent brief: docs/context/agent-brief.md
- Snapshot: docs/context/snapshot.md (generated)
- Changelog: CHANGELOG.md