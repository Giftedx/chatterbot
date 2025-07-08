# Personal User Memory

## 1 · User Value / Problem
The bot currently treats every interaction statelessly. Remembering user preferences improves:
* Personalised tone, language, and examples.
* Shorter prompts (implicit context).
* Continuity: recall past projects or preferences.

## 2 · Technical Requirements
1. **Memory Schema** – Table `UserMemory` (userId PK, json data, updatedAt).
2. **Capture Points** – After each successful prompt, run heuristics / classifier to extract stable facts (name, timezone, favourite tech stack).
3. **Prompt Injection** – Prepend summary to system prompt when user is author.
4. **Expiry / Size Control** – Summarise older memories, keep <4k tokens per user.
5. **Privacy Controls** – `/memory view|delete` commands.

## 3 · Dependencies
* Prisma migration adding `UserMemory`.
* Optional: OpenAI `function_calling` to extract entities.

## 4 · Implementation Plan
| Phase | Steps |
|-------|-------|
| MVP |1. Add Prisma model & service.<br>2. Manual `/remember key value` command.<br>3. Inject memory into prompt.|
| Auto Extract |4. After response, run regex/classifier to pull preferences.<br>5. Update memory store.|
| UX |6. Slash command `/memory` with subcommands list/delete.<br>7. Button "Forget this" on messages.|

## 5 · Risks & Mitigations
* **Privacy** – Offer opt-out; store minimal data.
* **Prompt Bloat** – Summarise & prune memories.
* **Incorrect Assumptions** – Provide user controls to correct or delete.
