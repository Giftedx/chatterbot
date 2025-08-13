# Advanced Capabilities

Chatterbot includes an MCP‑inspired orchestration layer that executes tools with intelligent fallbacks. Tools are grouped by phases and run based on message analysis, user capabilities, and feature flags.

## Phases
1) Critical Foundation
- Memory search (KB lookup)
- Discord integration

2) Enhanced Knowledge
- Web search (Brave API if configured; graceful fallback)
- Content extraction (Firecrawl if configured; enhanced scraping fallback)

3) Advanced Processing
- Sequential thinking (Gemini if configured; structured local reasoning fallback)
- Browser automation (HTTP fetch + heuristics)

4) Media Output
- Image generation (Stability if configured; placeholder fallback)
- GIF search (Tenor if configured; default fallback)
- Text‑to‑speech (ElevenLabs; requires key)

## Real APIs and fallbacks
- When API keys are present, real integrations are used.
- When missing/unavailable, the system degrades gracefully to safe, deterministic fallbacks.

## Configuration
- Web search: `BRAVE_API_KEY`
- Content extraction: `FIRECRAWL_API_KEY`
- Sequential thinking: `GEMINI_API_KEY`
- Image generation: `STABILITY_API_KEY`
- GIFs: `TENOR_API_KEY`
- TTS: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`

See `src/services/core/mcp-orchestrator.service.ts` and `src/services/enhanced-intelligence/direct-mcp-executor.service.ts`.

## Analytics
The analytics server can emit verification metrics snapshots periodically. Enable `ENABLE_ANALYTICS_DASHBOARD=true` to expose a basic API on port 3001.