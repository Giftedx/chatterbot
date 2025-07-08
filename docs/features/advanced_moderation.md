# Advanced Moderation

## User Value
Protect Discord communities by automatically detecting and blocking unsafe text or images **before** they reach other members or external AI APIs. Ensures compliance with Discord ToS and reduces liability for server owners.

## Technical Requirements
1. **Text Moderation**
   * Keyword blacklist (local JSON) for instant matches.
   * External ML API fallback (OpenAI Moderation or Google Perspective) for nuanced checks.
   * Severity scoring → `allow`, `warn`, or `block`.
2. **Image Moderation**
   * Download attachment and run Google Cloud Vision SafeSearch (free tier) or open-source nudity model.
   * Return safe/unsafe labels and confidence.
3. **Middleware**
   * `moderationMiddleware(interaction)` wraps command handlers; aborts, warns, or sanitises messages.
4. **Config**
   * Prisma `ModerationConfig` per-guild {guildId, strictness, logChannelId}.
   * Slash command `/moderation config` to view/update settings.
5. **Logging**
   * Prisma `ModerationIncident` stores {id, guildId, userId, type, detail, createdAt}.
   * Optionally forward to a dedicated Discord channel via webhook.

## Dependencies
* OpenAI Moderation API **or** Google Perspective (free tiers).
* Google Cloud Vision SafeSearch or `nsfwjs` for images.
* `file-type` and `node-fetch` for attachment handling.

## Implementation Plan
| Phase | Tasks |
|-------|-------|
| 1 | Create `src/moderation/text.ts` with keyword check + API fallback. |
|   | Add `src/moderation/types.ts` (SafetyVerdict). |
| 2 | Create `src/moderation/image.ts` using Vision SafeSearch. |
| 3 | Build `src/moderation/middleware.ts` that runs on `interactionCreate`, intercepting `/gemini`, `/persona`, `/voice`. |
| 4 | Add Prisma models `ModerationConfig` and `ModerationIncident`; migrate DB. |
| 5 | Implement `/moderation` admin commands: `config`, `stats`, `test`. |
| 6 | Logging: save incidents, forward to log channel if configured. |
| 7 | Unit tests: mock API responses; cover edge cases. |
| 8 | Feature flag: default off; enable per-guild; collect feedback. |

## Risks & Mitigations
* **False Positives** – Provide `/moderation test` and override ability; allow lower strictness levels.
* **API Latency** – Run keyword pass first; only call external API on uncertain messages.
* **Cost** – Use free quotas; cache results per content hash.
* **Privacy** – Do not store full message text in incidents; only hash or truncated excerpt.
