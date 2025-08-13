# Security Guidelines for Documentation Updates

This document outlines security considerations related to documentation generation and updates in this repository.

- Runtime documentation updates are a Security Risk and are prohibited in production code paths.
- Documentation content and updates should be handled exclusively by build and deployment processes, CI/CD pipelines, or developer tooling — not by the running application.
- The application must not accept runtime flags or environment variables to enable documentation mutation.

Prohibited patterns:
- Using environment variables such as ENABLE_DOCUMENTATION_UPDATES to toggle writing to Markdown files at runtime
- Writing to README files or any docs/ content during request handling
- Executing shell commands that mutate documentation (e.g., git commit docs) at runtime

Allowed patterns:
- Generating docs via TypeDoc during build
- Committing documentation updates through standard development workflows
- CI steps that generate and publish documentation to a static site or artifact storage

Verification:
- Security tests ensure that no runtime code references ENABLE_DOCUMENTATION_UPDATES and that suspicious file write patterns to documentation do not appear in application code paths.

# Security & Privacy Guidelines

- Only `/chat` is exposed by default. All other controls (pause/resume/delete/export/move DM/new topic) are handled via natural language and completed quietly via DM.
- The bot avoids channel clutter by responding only in user-specific threads or DMs.
- Moderation runs pre- and post-generation; unsafe content is blocked or safe-completed.
- Input sanitization removes common prompt-injection patterns and length-limits user inputs before analysis.
- Per-user rate limiting is applied to inbound interactions to reduce abuse and load spikes.
- No chain-of-thought is logged or stored. Durable state consists of message logs, intent logs, memories, summaries, and optional embeddings.
- Deletion requests wipe user memories, summaries, logs, and media for that user. Exports are DM’d as JSON.
- Respect Discord rate limits. The orchestrator uses backoffs and short cooldowns per user.
- Production note: Prefer Postgres with pgvector for embeddings; fall back to SQLite bytes or external stores if unavailable.
