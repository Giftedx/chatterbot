# Agent Brief

This brief equips AI agents with the context needed to work effectively.

## Repository Contract
- Language: TypeScript
- Testing: Jest (jest.config.js)
- Linting: ESLint
- Docs: TypeDoc
- Infra: Dockerfile; Railway config

## Working Agreements
- Make no breaking changes without an upgrade path.
- Maintain testability and small, composable units.
- Follow existing folder structure and naming conventions.
- Prefer dependency injection for external services to facilitate testing.

## Commands (if available)
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Build: `npm run build`
- Test: `npm test`
- Format: `npm run format`

## Utilities
- Generate snapshot: `node scripts/context-snapshot.mjs` (writes docs/context/snapshot.md)
- Verify env: `node scripts/verify-env.mjs`

## Definitions of Done
- Code compiles, lints, and is formatted.
- Tests (unit/integration) added or updated with meaningful assertions.
- Documentation updated (user-facing or developer docs).
- CI is green.

## Sensitive Data
- Never commit secrets. Use env vars defined by env.example.
- Avoid logging sensitive values (tokens, API keys, PII).