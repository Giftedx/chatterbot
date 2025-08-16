# Security Guidelines

This document outlines build and deployment processes, secret management, privacy posture, and risk controls for this project.

- Secrets: store in `.env` only; never commit, and rotate regularly. Treat exposure as a Security Risk and follow incident response.
- Docker: envs provided via `--env-file .env`; SQLite persisted to a Docker volume. Keep images minimal and scan regularly.
- Discord token and client ID are required; ensure scopes and intents are limited to need.
- Privacy: users must opt in; built‑in flows allow export/delete/pause/resume.
- Telemetry: model selection can be persisted only if `FEATURE_PERSIST_TELEMETRY=true`.
- Documentation updates: enable controlled updates with the feature gate `ENABLE_DOCUMENTATION_UPDATES=true` to allow automated docs refresh as part of build and deployment processes.

Operational Notes

- Build and deployment processes must never expose secrets in logs or artifacts. Use masked CI variables and restricted artifacts.
- For any suspected Security Risk, immediately revoke tokens and rotate keys. Audit access logs and open a tracked incident.
- Limit outbound network egress in CI and production to required domains only.
- Review dependencies regularly and patch promptly.
