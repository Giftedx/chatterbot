# Admin Analytics Dashboard

## User Value
Give server owners visibility into bot usage: command counts, active users, API cost estimates, and moderation incidents. This transparency fosters trust and helps owners tune limits.

## Technical Requirements
1. **Backend API** – Secure REST endpoint `/api/stats/:guildId` returning JSON built from `AnalyticsEvent` + `VoiceLog` tables.
2. **Auth** – Discord OAuth2 flow; only guild owners (or members with MANAGE_GUILD) receive a JWT.
3. **Static Front-end** – Lightweight Astro site served from `web/dashboard`. Charts via Chart.js.
4. **Hosting** – Free-tier Vercel/Netlify. Build at CI time.
5. **Slash Command** – `/dashboard` returns an embed with the dashboard URL (guild scoped).

## Dependencies
* `@discordjs/oauth2` for token exchange
* `fastify` or `express` minimal API (same Node process as bot)
* `chart.js`, `astro`
* Prisma client (existing)

## Implementation Plan
| Phase | Description | Deliverables |
|-------|-------------|--------------|
| 1 | API Controller | `src/api/stats.ts` with schema validation & JWT middleware |
| 2 | OAuth Flow | `src/api/auth.ts` endpoint; use Discord oauth2 code grant; issue JWT signed with `BOT_SECRET` |
| 3 | Front-end | `web/dashboard/pages/index.astro` – fetch stats; display KPIs + donut per-command chart |
| 4 | Slash Command | Add `/dashboard` in `index.ts`; replies with guild-specific URL |
| 5 | Deployment | GitHub Actions build & deploy to Netlify (free) |
| 6 | Hardening | Rate-limit API, cache heavy queries, add CI test |

## Risks & Mitigations
* **Auth Spoofing** – Sign JWT with strong secret; verify guild ownership via Discord API.
* **API Abuse** – Implement per-IP rate limit (libre limiter) and caching.
* **Data Privacy** – Expose only aggregated counts, no raw prompt text.
* **Maintenance Overhead** – Keep front-end static; minimal JS.
