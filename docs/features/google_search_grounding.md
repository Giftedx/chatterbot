# Google Search Grounding

## 1 · User Value / Problem
ChatGPT-style answers can hallucinate. By grounding responses with fresh web search results, the bot can:
* Provide up-to-date facts and citations.
* Boost user trust via source links.
* Answer broader questions without manual knowledge uploads.

## 2 · Technical Requirements
1. **Search Service** – Call Google Programmable Search API or SerpAPI.
2. **Snippet Extraction** – Grab title, URL, and short summary for top N (3-5) results.
3. **Prompt Orchestration** – Inject snippets (+ citations) into Gemini prompt under a "context" section.
4. **Citation Formatter** – Append reference numbers (\[1\]) in final text and list sources below.
5. **Rate-limit & Caching** – Cache per-query results for X minutes; throttle API.
6. **Config** – `.env` keys: `GOOGLE_CSE_ID`, `GOOGLE_API_KEY`.

## 3 · Dependencies / External Services
* SerpAPI **or** Google Programmable Search.
* `axios` for HTTP.
* Optional: Redis for caching.

## 4 · Implementation Plan
| Phase | Steps |
|-------|-------|
| MVP |1. Create `services/search.ts` wrapper.<br>2. Add `/google` command that returns first top-3 links as embed.<br>3. Add unit tests w/ mocked HTTP.|
|Grounded Response|4. Build `services/rag.ts` to fetch search snippets and craft prompt.<br>5. Expose flag `--with-web` or button "🔎 Web" to trigger.|
|Citations|6. Post-process Gemini response to enumerate citations.<br>7. Replace `[[URL]]` placeholders with markdown links.|
|Perf & Safety|8. Add cache.<br>9. Enforce safe-search parameter; filter NSFW results.|

## 5 · Risks & Mitigations
* **Cost** – SerpAPI paid; mitigate via daily quota env var.
* **Latency** – Extra HTTP; mitigate via parallel search & streaming.
* **TOS Compliance** – Follow Google license; include attribution line.
* **Hallucinated Citations** – Insert snippets *before* generation; validate URL format.
