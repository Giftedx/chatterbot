# Copilot Instructions for Discord Gemini Bot

## 1. Core Architecture: Unified Intelligence

The primary user interaction is through the `/optin` command, which activates a **Unified Intelligence Service** (`src/services/unified-intelligence.service.ts`). This service provides a natural conversation experience, automatically selecting the right tools and personas based on context.

- **User Entry Point**: Everything starts with `/optin`. After that, the bot responds to all messages from the user.
- **Core Logic**: `src/services/unified-intelligence.service.ts` orchestrates all features.
- **Key Principle**: Avoid adding new slash commands. Instead, integrate new capabilities into the unified service to be triggered contextually.

## 2. Development Workflow

- **Run Dev Server**: `npm run dev` (uses `tsx` for hot-reloading).
- **Run Tests**: `npm test`. The suite is comprehensive (320+ tests).
- **Database**: `npx prisma db push` to apply schema changes. Use `npx prisma studio` to view the database.
- **Build Issue**: `npm run build` may hang. This is a known issue; development and production runtimes work correctly using `tsx` and `npm start`.

## 3. Critical Code Patterns

### ESM Imports with `.js` Extension
This project uses ES2022 modules. **Always** import TypeScript files using a `.js` extension. Jest is configured to handle this mapping.
```typescript
// Correct:
import { UnifiedIntelligenceService } from './services/unified-intelligence.service.js';

// Incorrect:
import { UnifiedIntelligenceService } from './services/unified-intelligence.service.ts';
import { UnifiedIntelligenceService } from './services/unified-intelligence.service';
```

### Dependency Injection for Testability
Static method mocking in Jest with ESM is unreliable. This project uses **constructor-based dependency injection** to ensure services are testable. When adding dependencies to a service, inject them via the constructor.

```typescript
// src/services/streaming-response-processor.ts
export class StreamingResponseProcessor {
  private performanceMonitor: IPerformanceMonitor;

  constructor(performanceMonitor: IPerformanceMonitor = new PerformanceMonitor()) {
    this.performanceMonitor = performanceMonitor;
  }
  // ...
}
```

### Service Architecture
Services are modular and located in `src/services/`. The core logic is composed of smaller, single-responsibility services found in `src/services/intelligence/`.

- **Main Service**: `unified-intelligence.service.ts`
- **AI Integration**: `gemini.service.ts`
- **Context & Memory**: `context-manager.ts`, `memory/user-memory.service.ts`
- **Modular Features**: `services/intelligence/*.service.ts` (permissions, analysis, capabilities)

### Error Handling
Wrap all user-facing operations in a `try/catch` block to provide a graceful fallback message. Never expose raw errors to the user.

```typescript
try {
  // Processing logic
} catch (error) {
  console.error('Internal error:', error);
  // Provide a user-friendly response
  await interaction.reply('I encountered an issue but I\'m here to help!');
}
```

## 4. Environment & Configuration

- Copy `.env.example` to `.env`.
- Required variables: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `GEMINI_API_KEY`.
- The bot is designed to degrade gracefully if optional API keys are missing.

## 5. MCP Integration (Enhanced Intelligence)

For environments where it's enabled (`ENABLE_ENHANCED_INTELLIGENCE="true"`), the bot uses a more advanced, MCP-based architecture.

- **Entry Point**: `src/services/enhanced-intelligence/index.ts`
- **Execution**: `direct-mcp-executor.service.ts` contains the actual (or mock) MCP calls.
- **Activation**: To enable a real MCP tool, replace its mock implementation in the executor service with the actual function call.
- **Testing**: MCP-related tests use fallbacks to ensure they pass even without a live MCP environment.
