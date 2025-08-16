# Test Coverage & Policy

Goal: maximize meaningful coverage of the live pipeline while not counting legacy/experimental modules that are not wired into the runtime decision flow.

Scope counted by Jest (see `collectCoverageFrom` in `jest.config.js`):

- src/\*_/_.ts, excluding declaration files, mocks, and index barrels

Policy:

- Priority-1: Core pipeline files must be well-covered (thresholds enforced):
  - `src/services/core-intelligence.service.ts`
  - `src/services/decision-engine.service.ts`
  - `src/services/core/message-analysis.service.ts`
  - `src/services/core/unified-analytics.service.ts`
- Priority-2: Safety paths (moderation, consent, privacy UI) must have basic coverage.
- Legacy/experimental directories (large research modules) are not required for thresholds; we will track opportunistically.

How to improve coverage:

- Add scenario-driven integration tests in `tests/pipeline` that take realistic inputs through the end-to-end flow (slash, message, control intents) with deterministic provider/MCP stubs.
- Add focused unit tests for uncovered branches after running `npm run test:coverage`.
