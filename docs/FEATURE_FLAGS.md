# Feature Flags

Flags default to OFF. Enable selectively per environment.

- FEATURE_TEMPORAL: Enable orchestration loader and worker runtime.
- FEATURE_VERCEL_AI: Enable Vercel AI provider wrapper.
- FEATURE_PGVECTOR: Reserved for future pgvector integration.

Example:
```bash
FEATURE_VERCEL_AI=true AI_API_KEY=your-key npm run dev
```