# Deployment Guide

## Docker Compose (recommended)
```bash
# 1) Configure environment
cp env.example .env
# or run the interactive wizard
npm run setup

# 2) Start
docker compose up -d --build

# 3) Verify
open http://localhost:3000/health
```

## GHCR image
Builds and publishes via `.github/workflows/docker-publish.yml`.
```bash
docker run -d --name chatterbot --env-file .env \
  -p 3000:3000 -p 3001:3001 \
  -v chatterbot-data:/data ghcr.io/giftedx/chatterbot:main
```

## Postgres (optional, for pgvector)
```bash
# Enable feature flag in .env
FEATURE_PGVECTOR=true
# Start with Postgres profile
docker compose --profile postgres up -d --build
```
Prisma remains on SQLite by default for application data. pgvector usage is independent and controlled via feature flag and `POSTGRES_*` variables.

## Health & Metrics
- Health: `GET /health` on port 3000
- Metrics: `GET /metrics` on port 3000
- Analytics API (optional): enable `ENABLE_ANALYTICS_DASHBOARD=true` → port 3001

## Railway (optional)
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```
Set env variables in Railway (at minimum: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `GEMINI_API_KEY`). 