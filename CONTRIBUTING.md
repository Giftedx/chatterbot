# Contributing

Thanks for contributing to Chatterbot!

## Dev setup
```bash
npm install
# Configure env
yarn setup # or: npm run setup
# or
cp env.example .env
npx prisma migrate dev --name init

# Run
yarn dev # or: npm run dev
```

## Tests
```bash
npm test
```

## Docker
```bash
docker compose up -d --build
```

Before creating a PR, please ensure typecheck/lint/tests pass.

## Ground rules
- Keep existing features working; prefer incremental, well-scoped changes
- Add or update tests for behavior changes (`npm test` must pass)
- Follow TypeScript code style from the repo (lint and typecheck must pass)
- Keep docs accurate; update `README.md` or relevant docs if behavior changes

## Getting started
1) Fork and clone the repo
2) Install deps: `npm ci`
3) Create a branch: `git checkout -b feat/your-change`
4) Run locally: `npm run dev`
5) Run tests: `npm test`
6) Lint/typecheck: `npm run lint && npm run typecheck`

## Commit & PR
- Use clear commit messages (e.g., chore, fix, feat, docs)
- Keep PRs small and focused; include a brief description and screenshots/logs if relevant
- Reference issues where applicable

## Security & docs
- Do not add runtime-controlled documentation updates (see `docs/SECURITY_GUIDELINES.md`)
- Put larger plans or proposals in `archive/plan` or an issue/PR description, not in runtime code

## Releasing
- Maintainers will update the changelog and version as needed