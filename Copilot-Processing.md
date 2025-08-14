# User Request Details

The user has requested a comprehensive stabilization and enablement of the Discord AI bot project. Key details of the request include:

- Review all features that are not working or currently disabled, then fix or enable them.
- Provide clear guidance for any required external setup (e.g., API keys, service credentials) with exact steps.
- Install and run orchestration (Temporal) on Linux.
- Fix Discord consent flow error: “This interaction failed” on Agree & Start.
- Resolve TypeScript and telemetry issues; ensure typecheck/build pass cleanly.
- Run Prisma generate/migrate; stabilize database usage (SQLite by default; optional Postgres/pgvector).
- Address runtime errors: knowledge base queries, pgvector initialization without Postgres, LangGraph missing thread_id, model registry mismatches.
- Harden model/provider routing; handle provider billing/availability failures gracefully (Gemini/OpenAI/Anthropic, etc.).
- Perform a documentation-driven full pass across integrations (LangGraph persistence, OpenAI Responses tools, discord.js interactions, Prisma, pgvector) and finalize all interactions.
- Summarize recent progress and next steps on request.

Environment and context provided by the user:

- OS: Linux
- Default shell: zsh
- Workspace root: /home/chatterbot/chatterbot
- Project stack highlights: Discord.js v14, Prisma (SQLite default), optional Postgres + pgvector, LangGraph with MemorySaver, Temporal, OpenTelemetry, multiple AI providers (Gemini/OpenAI/Anthropic), optional Vercel AI SDK, MCP tools.

Referenced feature flags and optional modes:

- FEATURE_LANGGRAPH, FEATURE_PGVECTOR, FEATURE_OPENAI_RESPONSES, FEATURE_OPENAI_RESPONSES_TOOLS, and others driving conditional behavior.

Requested outcome:

- A robust, end-to-end working system where all critical interactions function reliably, optional features degrade gracefully when not configured, and clear instructions are provided for any required secrets or service setup.

---

# Action Plan

1) Validate runtime stability end-to-end
- Objective: Prove the core chat flow works reliably with graceful degradation for optional features.
- Scope: Discord interactions, LangGraph persistence, Knowledge Base fallback, pgvector guard, model routing, OpenAI Responses Tools.

2) Harden provider routing and environment defaults
- Objective: Avoid outages from unavailable/billed providers by selecting sane defaults and fallbacks.
- Scope: Default provider, API key detection, provider disallow list, feature flags.

3) Fix minor Discord deprecations and UX polish
- Objective: Remove deprecation warnings and ensure ephemeral/flags usage is correct; keep UX responsive.
- Scope: Interaction replies/edit/followUp flags, message visibility.

4) Documentation and environment guidance
- Objective: Make setup obvious and copy-pasteable for Linux zsh; ensure env.example and README map to code paths.
- Scope: env.example updates, README snippets, provider-specific notes, feature flag matrix.

5) Observability and tests
- Objective: Keep typecheck/build green; add smoke tests; verify telemetry wiring.
- Scope: Build/lint/tests, OpenTelemetry minimal sanity, CI considerations.

---

# Task Tracker (Detailed)

## 1. Runtime Validation
- [ ] 1.1 Restart bot and run a simple /chat prompt
  - Description: Verify no immediate interaction errors and prompt acknowledgment works.
  - Dependencies: Build passes; Discord bot token configured.
- [ ] 1.2 LangGraph persistence thread_id check
  - Description: Confirm no "missing configurable.thread_id"; see MemorySaver checkpoint logs.
  - Dependencies: FEATURE_LANGGRAPH=true (if enabled), advanced workflow wired.
- [ ] 1.3 Knowledge Base fallback path
  - Description: Trigger KB grounding and ensure Prisma queries use guildKnowledgeBase; no undefined prisma; results or clean empty fallback.
  - Dependencies: Prisma generated; DB present; optional seed.
- [ ] 1.4 pgvector guard behavior
  - Description: With Postgres env absent or FEATURE_PGVECTOR=false, confirm single info log and no init spam.
  - Dependencies: None beyond current config.
- [ ] 1.5 OpenAI Responses Tools run
  - Description: Exercise tool-use path; ensure no 400 Missing tools[0].name; verify tool loop submits outputs.
  - Dependencies: FEATURE_OPENAI_RESPONSES_TOOLS=true, OPENAI_API_KEY set.

## 2. Provider Routing Hardening
- [ ] 2.1 Default provider safety
  - Description: Ensure DEFAULT_PROVIDER favors Gemini or another available provider; avoid Anthropic if billing blocked.
  - Dependencies: env present; model-registry constraints.
- [ ] 2.2 Disallow unavailable providers
  - Description: If API key missing or provider errors persist, add to disallowProviders dynamically or via config.
  - Dependencies: Routing constraints plumbed to model-router.
- [ ] 2.3 Clear env guidance for providers
  - Description: Document required env vars per provider and expected behavior if missing.
  - Dependencies: Docs update.

## 3. Discord UX and Deprecations
- [ ] 3.1 Replace deprecated ephemeral option with flags
  - Description: Audit reply/edit/followUp calls; use flags to mark ephemeral responses.
  - Dependencies: Source audit in services handling interactions.
- [ ] 3.2 Ensure prompt, resilient acks
  - Description: Keep deferReply + editReply pattern; add followUp fallback where needed.
  - Dependencies: Existing patterns in core-intelligence service.

## 4. Docs and Environment
- [ ] 4.1 Update env.example
  - Description: Add/clarify keys: OPENAI_API_KEY, GOOGLE_API_KEY, ANTHROPIC_API_KEY, POSTGRES_URL, FEATURE_* toggles.
  - Dependencies: None.
- [ ] 4.2 README quickstart (Linux zsh)
  - Description: Minimal steps to run: install, generate prisma, run dev; optional Temporal and Postgres sections.
  - Dependencies: Confirm commands.
- [ ] 4.3 Feature matrix and degradation
  - Description: Document what happens when a feature flag or key is missing (clean skip vs. error).
  - Dependencies: Code behavior validated in 1.x tasks.

## 5. Observability and Tests
- [ ] 5.1 Build/typecheck gate
  - Description: Ensure npm run build and typecheck are green post-edits.
  - Dependencies: Local run.
- [ ] 5.2 Minimal smoke tests
  - Description: Add 1-2 tests for model routing selection and KB fallback mapping.
  - Dependencies: Jest setup present.
- [ ] 5.3 Telemetry sanity
  - Description: Start bot with OTEL exporter off; confirm SDK init doesn’t crash.
  - Dependencies: Current telemetry config.

---

# Dependencies & Prerequisites
- Required base env: DISCORD_BOT_TOKEN, DATABASE_URL (SQLite default), NODE_ENV.
- Optional providers (enable if used):
  - OPENAI_API_KEY (for OpenAI + Responses Tools)
  - GOOGLE_API_KEY (Gemini)
  - ANTHROPIC_API_KEY (Anthropic; avoid if billing blocked)
  - POSTGRES_URL + FEATURE_PGVECTOR=true (pgvector)
- Feature flags:
  - FEATURE_LANGGRAPH, FEATURE_PGVECTOR, FEATURE_OPENAI_RESPONSES, FEATURE_OPENAI_RESPONSES_TOOLS

---

# Notes
- Prior fixes implemented: consent flow acks, Prisma guildKnowledgeBase alignment, pgvector guard, LangGraph thread_id wiring, OpenAI Responses Tools schema fix.
- Next execution step: run through 1.x validation tasks and adjust configs/providers per findings.
