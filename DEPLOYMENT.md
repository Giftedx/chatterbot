# Deployment Guide

## Recommended: Railway

- Simple GitHub integration
- Persistent environment variables
- Logs and metrics

Setup
```bash
npm install -g @railway/cli
railway login
railway init
railway up

# Set environment
railway variables set DISCORD_TOKEN=...
railway variables set DISCORD_CLIENT_ID=...
railway variables set GEMINI_API_KEY=...
```

## Environment
```env
# Required
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
GEMINI_API_KEY=your_gemini_api_key

# Optional
NODE_ENV=production
ENABLE_ENHANCED_INTELLIGENCE=false
```

## Health Check
GET /health returns JSON status including uptime, memory, environment, version, and feature flags.

## Docker
```bash
# Build
docker build -t chatterbot .
# Run
docker run --rm -it \
  -e DISCORD_TOKEN=... \
  -e DISCORD_CLIENT_ID=... \
  -e GEMINI_API_KEY=... \
  chatterbot
```

## Testing
```bash
npm test
npm run test:coverage
npm run test:watch
npm run test:ci
```

## Pre-deployment Checklist
- [ ] Tests pass (`npm run test:ci`)
- [ ] Env vars configured
- [ ] Discord permissions validated
- [ ] Health endpoint responds
- [ ] /chat command responds

## Optional CI (GitHub Actions)
```yaml
name: Deploy to Railway
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - uses: railwayapp/actions-deploy@v1
        with:
          service: your-railway-service
``` 