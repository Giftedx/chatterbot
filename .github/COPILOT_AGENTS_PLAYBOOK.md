# Copilot Agents Playbook

This repository is configured for GitHub Copilot Agents to propose and implement changes safely and predictably.

## Conventions
- ESM imports: use `.js` extensions for local TypeScript imports.
- Validations (required in every agent PR):
  - `npm install`
  - `npm run lint`
  - `npm test`
  - `npm run dev:health`
- Feature flags for new subsystems; default OFF.

## Orchestration
- See `.github/copilot/agents/orchestrator.yaml` for phases and agent registry.
- Each task spec under `.github/copilot/agents/*.yaml` must include:
  - Problem statement
  - Scope (files to add/modify)
  - Validation commands
  - Risks
  - Acceptance criteria

## PR Expectations
- Use the template in `.github/pull_request_template.md`.
- Title format: `agent:<id> - <summary>`
- Include clear validation logs and a rollback plan.

## CI
- `.github/workflows/ci.yml` runs lint, tests, and a non-blocking build on push/PR.

## Security & Privacy
- Do not commit secrets.
- Long-term memory features MUST be opt-in and support export/delete.

## Extending
- Add new agents by creating a new `*.yaml` file under `.github/copilot/agents/` and referencing it in the orchestrator.