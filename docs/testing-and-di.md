# Testing and Dependency Injection

This project prefers explicit dependency injection over reassignable singletons to make tests safer and more deterministic.

- Legacy convenience singletons still exist for backwards-compatibility (e.g., `geminiService`, `unifiedAnalyticsService`, `unifiedMessageAnalysisService`). Prefer constructing services directly in new code and tests.

## Recommended patterns

- Constructor injection: pass collaborators to a service constructor when possible.
- Local factory/providers: create small helper functions in tests to assemble services with fakes/mocks.

## Examples

- Injecting Gemini API client:

```ts
import { GeminiService } from '../src/services/gemini.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

const fakeGenAI = { getGenerativeModel: () => ({ generateContent: async () => ({ response: { text: () => 'ok' } }) }) } as unknown as GoogleGenerativeAI;
const svc = new GeminiService(undefined, undefined, undefined, undefined, fakeGenAI);
```

- Unified Analytics and Message Analysis default singletons exist for legacy callers; construct fresh instances for isolation:

```ts
import { UnifiedAnalyticsService } from '../src/services/core/unified-analytics.service';
import { UnifiedMessageAnalysisService } from '../src/services/core/message-analysis.service';

const analytics = new UnifiedAnalyticsService({ enableDashboard: false });
const analysis = new UnifiedMessageAnalysisService();
```

## MCP consent customId

Custom ID format for consent buttons: `mcp_consent_{action}_{userId}_{serverName}_{toolName}`. The security manager parses these and stores decisions.

## Open handle detection

Use `npm run test:detect` to run Jest with `--detectOpenHandles` to help find leaked timers, sockets, or streams.