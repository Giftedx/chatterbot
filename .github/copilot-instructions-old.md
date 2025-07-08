# AI Coding Agent Instructions - Discord Gemini Bot

## Project Overv### Working Development Commands
```bash
npm run dev          # ✅ TSX watcher - works despite TS errors
npm run lint         # ✅ ESLint with strict TypeScript rules  
npm test             # ⚠️ Jest tests - partial coverage, some pass/fail
npm run docker:build # ✅ Docker builds work

# Database workflows
npx prisma studio    # GUI for database inspection
npx prisma migrate dev --name <name>  # Schema migrations
npx prisma generate  # Regenerate client after schema changes
```

### Broken Workflows
```bash
npm run build        # ❌ TypeScript compilation errors (primarily enhanced services)
npm start           # ❌ Depends on successful build
```ypeScript Discord bot** using **discord.js v14** with **Google Gemini AI** integration. 89 TypeScript files with sophisticated architecture but significant compilation issues.

**Critical Status:**
- ✅ **Working Core:** AI conversation, streaming responses, persona system, user memory, multimodal processing
- ❌ **Build Broken:** TypeScript compilation errors across multiple files preventing `npm run build`
- 🔄 **Advanced Features:** Sophisticated cache infrastructure, MCP tool integration (mock implementations), conversation threading

**Architecture Philosophy:** Service-oriented with singleton patterns, comprehensive caching, modular command structure, and planned MCP integration.

## Essential Architecture Patterns

### 1. Discord Command Flow (Working Pattern)
**Entry Point:** `src/index.ts` - Central command dispatcher with streaming UI
```typescript
// ALL async Discord handlers must defer first
await interaction.deferReply();
// Use streaming response pattern for AI calls
await handleStreamingResponse(interaction, prompt, attachment?.url);
```

**Command Structure:**
- Commands defined inline in `src/index.ts` using `SlashCommandBuilder`
- Button interactions routed by `customId` (`REGENERATE_BUTTON_ID`, `STOP_BUTTON_ID`)
- Streaming responses with real-time edits using `createStreamingButtons()`

### 2. Service Layer Singleton Pattern
**Core Services (All Working):**
- `GeminiService` - AI integration with rate limiting, safety settings, streaming
- `ContextManager` - Per-channel conversation history with intelligent caching
- `PersonaManager` - Multi-guild persona management with in-memory + DB persistence
- `UserMemoryService` - Cross-conversation user context and preferences

**Service Initialization Pattern:**
```typescript
// Services are singletons initialized at module level
const geminiService = new GeminiService();
const userMemoryService = new UserMemoryService();
```

### 3. Database Integration (Prisma + SQLite)
**Working Models:** `Persona`, `AnalyticsEvent`, `UserMemory`, `ConversationThread`, `MediaFile`
**Access Pattern:** `import { prisma } from '../db/prisma'` - singleton client
**Migrations:** `npx prisma migrate dev --name <description>` for schema changes

### 4. Conversation Context Management
**Key Classes:**
- `ContextManager` - Handles per-channel history with 20 message pair limit
- `ChatMessage` interface matches Gemini API: `{ role: 'user' | 'model', parts: Part[] }`
- Multimodal support via `updateHistoryWithParts()` for image processing

**Context Flow:**
```typescript
const history = await getHistory(channelId);
// Process with persona system prompt prepending
const persona = getActivePersona(guildId);
const fullPrompt = `${persona.systemPrompt}\n\n${userPrompt}`;
```

### 5. Rate Limiting & Safety
- **Token bucket algorithm** in `RateLimiter` class (10 requests/minute per user)
- **Gemini safety settings** configured for content filtering
- **Per-user rate limits** stored in-memory with automatic reset

## Critical Development Workflows

### Working Development Commands
```bash
npm run dev          # ✅ TSX watcher - works despite TS errors
npm run lint         # ✅ ESLint with strict TypeScript rules  
npm test             # ⚠️ Jest tests - limited coverage
npm run docker:build # ✅ Docker builds work

# Database workflows
npx prisma studio    # GUI for database inspection
npx prisma migrate dev --name <name>  # Schema migrations
npx prisma generate  # Regenerate client after schema changes
```

### Broken Workflows
```bash
npm run build        # ❌ 274 TypeScript compilation errors
npm start           # ❌ Depends on successful build
```

## Project-Specific Conventions

### TypeScript & Module System
- **ESM modules:** `"type": "module"` in package.json, use `.js` imports for local files
- **Strict mode:** Comprehensive linting with `@typescript-eslint`
- **No path mapping:** Use relative imports exclusively
- **Error handling:** Services return error strings, don't throw in business logic

### Discord.js Patterns
- **Always defer:** `await interaction.deferReply()` for operations >3 seconds
- **Ephemeral responses:** Use for admin commands and error messages
- **Button state management:** Use `interaction.update()` for button state changes
- **Streaming UI:** `createStreamingButtons()` pattern with cursor indicator

### Service Communication
- **In-memory caches:** Active personas per guild, rate limits, last prompts
- **Database async:** All DB operations properly wrapped in try/catch
- **Event-driven:** Analytics logging through `logInteraction()` calls
- **Singleton access:** Services accessed through module-level exports

## Data Flow Architecture

### Request Processing Flow
1. **Discord interaction** → `src/index.ts` handler
2. **Content moderation** → `moderationService.moderateText()`
3. **Context resolution** → `getHistory()` + `getActivePersona()`  
4. **AI processing** → `GeminiService` with streaming or batch response
5. **Context update** → `updateHistory()` or `updateHistoryWithParts()`
6. **Analytics logging** → `logInteraction()` background task

### Cache Infrastructure (Advanced)
- **Multiple cache layers:** In-memory, persistent cache service, LRU policies
- **Content-aware caching:** Different TTLs for conversation types and priorities
- **Cache key generation:** Intelligent key generation with metadata inclusion
- **Metrics integration:** Cache hit rates, memory usage, cleanup analytics

### Multimodal Processing
- **Image handling:** `urlToGenerativePart()` utility converts Discord attachments
- **Content safety:** Image moderation through Google Cloud Vision integration
- **History management:** Separate limits for text (20 pairs) vs multimodal (10 items)

## Common Error Patterns & Solutions

### TypeScript Compilation Issues
**Root Causes:**
1. **Mock MCP implementations** - Enhanced invisible intelligence services have extensive mock MCP tool implementations with type mismatches
2. **Missing imports** - Enhanced services reference non-existent cache modules and multimodal services
3. **Incomplete advanced features** - `src/commands/super-invisible-intelligence.service.ts` and `src/services/enhanced-invisible-intelligence.service.ts` have broken imports
4. **Interface mismatches** - Command builders and async Promise handling issues in tests

**Fix Strategy:**
1. Start with core working services (`GeminiService`, `ContextManager`, `PersonaManager`)
2. Remove or properly stub broken enhanced intelligence services
3. Fix missing cache service imports in `src/services/gemini.service.ts`
4. Replace mock MCP implementations with proper abstractions
5. Test incrementally to avoid breaking working `/gemini` and `/optin` commands

### Discord API Patterns
- **Rate limiting:** Discord edits limited to 5 edits/5 seconds per message
- **Content length:** 2000 character limit for message content
- **Attachment processing:** Must validate file types before processing
- **Guild permissions:** Check `interaction.memberPermissions` for admin commands

### Database Migration Workflow
```bash
# After schema changes in schema.prisma
npx prisma migrate dev --name descriptive_name
npx prisma generate  # Update client types
# Test with npx prisma studio
```

## Integration Points

### External APIs
- **Google Gemini:** `@google/generative-ai` with `gemini-1.5-flash` model
- **Discord API:** v14 with `GatewayIntentBits.Guilds` and `MessageContent`
- **Prisma ORM:** SQLite in development, PostgreSQL for production

### Environment Configuration
```bash
# Required
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_app_id  
GEMINI_API_KEY=your_gemini_key

# Optional  
ENABLE_ANALYTICS_DASHBOARD=true
ANALYTICS_DASHBOARD_PORT=3001
```

### Testing Strategy
- **Jest configuration:** ESM preset with `ts-jest` transformer
- **Mock strategy:** External APIs mocked, Discord interactions use test fixtures
- **Integration tests:** Limited coverage in `src/services/__tests__/`

## Key Files to Reference

### Core Working Files
- `src/index.ts` - Main bot entry, command handlers, streaming UI
- `src/services/gemini.service.ts` - AI integration with rate limiting
- `src/services/context-manager.ts` - Conversation history with caching
- `src/services/persona-manager.ts` - Multi-guild persona system
- `src/ui/components.ts` - Discord UI components and button IDs

### Advanced Architecture
- `src/services/cache.service.ts` - Sophisticated caching infrastructure (has broken imports)
- `src/conversation/conversation-thread.service.ts` - Thread management
- `src/services/enhanced-invisible-intelligence.service.ts` - **BROKEN** - Mock MCP integration
- `src/commands/super-invisible-intelligence.service.ts` - **BROKEN** - Advanced features with compilation errors
- `src/commands/invisible-intelligence.service.ts` - **WORKING** - Basic invisible intelligence
- `prisma/schema.prisma` - Complete data model with multimodal support

### Configuration & Build
- `package.json` - ESM configuration and script definitions
- `tsconfig.json` - Strict TypeScript with ES2022 modules
- `jest.config.js` - ESM testing configuration

When working on this codebase, prioritize fixing TypeScript compilation errors before adding new features. The core functionality works well despite build issues, so preserve working patterns while resolving type errors.
