# Security Guidelines

- Secrets: store in `.env` only; never commit.
- Docker: envs provided via `--env-file .env`; SQLite persisted to a Docker volume.
- Discord token and client ID are required; ensure scopes and intents are limited to need.
- Privacy: users must opt in; built‑in flows allow export/delete/pause/resume.
- Telemetry: model selection can be persisted only if `FEATURE_PERSIST_TELEMETRY=true`.
