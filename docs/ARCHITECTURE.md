# Architecture Overview

This document orients contributors and AI agents to the system at a high level.

## 1. System Context
- Language: TypeScript
- Tooling: ESLint, Jest, TypeDoc, Docker
- Data/ORM: Prisma
- Deployment: Docker, Railway (railway.json)

## 2. High-Level Components
- src/: Application code (domain, services, adapters).
- prisma/: Database schema and migrations.
- docs/: Project documentation.
- examples/: Usage examples and snippets.
- tests/: (If present) automated tests.
- scripts/: Utility scripts (context, env verification).

## 3. Cross-Cutting Concerns
- Error handling: Fail fast, surface actionable messages; prefer typed errors.
- Configuration: .env with keys outlined in env.example; use scripts/verify-env.mjs.
- Logging: Prefer structured logs; avoid sensitive data.
- Security: See SECURITY.md; never commit secrets.

## 4. Build & Test Pipelines
- CI: .github/workflows/ci.yml runs install, lint, and tests. Typecheck/Build are allowed to fail due to known Prisma issues.
- Coverage: Uploaded as artifact if generated.

## 5. Coding Standards
- Formatting: Prettier (.prettierrc.json).
- Linting: ESLint (.eslintrc.json).
- Types: Strict TypeScript recommended; keep public surfaces well-typed.

## 6. Documentation Strategy
- Agent brief: docs/context/agent-brief.md
- Snapshot: docs/context/snapshot.md (generated)
- Changelog: CHANGELOG.md