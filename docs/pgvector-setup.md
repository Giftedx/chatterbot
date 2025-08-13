# pgvector Setup (Optional)

Chatterbot supports vector‑first retrieval backed by Postgres + pgvector.

## Enable
1) Set in `.env`:
```
FEATURE_PGVECTOR=true
POSTGRES_URL=postgresql://chatterbot:chatterbot@postgres:5432/chatterbot
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=chatterbot
POSTGRES_USER=chatterbot
POSTGRES_PASSWORD=chatterbot
POSTGRES_SSL=false
```
2) Start with compose profile:
```bash
docker compose --profile postgres up -d --build
```

The vector repository will connect using `DATABASE_URL` or `POSTGRES_URL` (and `POSTGRES_*` overrides). Prisma remains on SQLite by default for app data.

## Manual Postgres
If you manage your own Postgres, ensure the extension is enabled:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```