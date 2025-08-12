# Temporal Orchestration Loader

This module provides a safe, feature-flagged orchestration loader. It does not import or require Temporal SDK unless `FEATURE_TEMPORAL=true`.

- Entry point: `startTemporalOrchestrationIfEnabled()` in `loader.js`
- Runtime: `runtime.js` (stubbed, no external deps yet)
- Flag: `FEATURE_TEMPORAL`

Enable locally:
```bash
FEATURE_TEMPORAL=true npm run dev
```