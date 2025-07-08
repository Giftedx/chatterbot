# Internal Reasoning & Contextual Problem-Solving

## User Value
Enable the bot to **explain its thought process**, break down complex questions into intermediate reasoning steps, and solve tasks that require multi-hop logic. This boosts transparency, trust, and answer quality.

## Technical Requirements
1. **Chain-of-Thought Prompting**  
   • Add a `reasoning:true` flag (or auto-detect) that instructs Gemini to think step-by-step using CoT prompts (`Think step by step …`).
2. **Self-Consistency**  
   • Run multiple reasoning samples in parallel (n=3) and choose majority or highest confidence answer.
3. **Tool Invocation**  
   • Introduce “tool” schema: the model can request `SEARCH`, `CALCULATE`, or `LOOKUP_MEMORY`, we execute, then feed result back (ReAct pattern).
4. **Context Window Management**  
   • Summarise prior messages; inject only relevant snippets to stay under token limit.
5. **Explain Mode**  
   • If `explain:true`, include a collapse-able embed with the reasoning trace.

## Dependencies
* Google Gemini 1.5-flash (supports multi-turn JSON tool calls).  
* Existing `google_search_grounding` + `personal_user_memory` services.  
* Small math parser (`mathjs`) for `CALCULATE` tool.

## Implementation Plan
| Phase | Steps |
|-------|-------|
| 1 |Extend `gemini.service.ts` with optional CoT prompt wrapper; expose `/gemini reason:true`. |
| 2 |Add `ReasoningTool` interface; implement basic `SEARCH` (uses search service) & `CALCULATE`. |
| 3 |Implement ReAct loop: while Gemini returns `tool_call` → execute → append result → continue. |
| 4 |Self-consistency: run 3 parallel completions when `reasoning` flag set; pick majority answer. |
| 5 |Embed trace: Collect reasoning steps; on success, send hidden spoiler embed or thread reply. |
| 6 |Unit tests with hard logic questions; compare accuracy vs baseline. |

## Risks & Mitigations
* **Token Overrun** – Limit reasoning depth; summarise traces.
* **Latency** – Parallel Tool calls; early stop when confidence high.
* **Information Leakage** – Filter reasoning trace to avoid exposing private context.
* **Complexity** – Start with opt-in flag; iterate based on feedback.
