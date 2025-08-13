# pgvector setup for Chatterbot

Enable vector search with Postgres + pgvector.

1) Provision Postgres and set either `DATABASE_URL` or individual `POSTGRES_*` env vars.
2) Install extension and table (the adapter will attempt to auto-create):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS kb_vectors (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  guild_id TEXT,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS kb_vectors_embedding_idx ON kb_vectors USING ivfflat (embedding vector_l2_ops);
```

3) Enable feature flag:

```bash
FEATURE_PGVECTOR=true DATABASE_URL=postgres://user:pass@host:5432/db npm run dev
# Or using discrete vars
FEATURE_PGVECTOR=true POSTGRES_HOST=localhost POSTGRES_DB=chatterbot POSTGRES_USER=postgres POSTGRES_PASSWORD=... npm run dev
```

The system will mirror embeddings to pgvector and prefer vector-first retrieval when available.