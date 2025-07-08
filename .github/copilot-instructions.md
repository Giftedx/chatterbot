# Copilot Instructions for Discord Gemini Bot

## 1. Triple Intelligence Architecture

This Discord bot has a layered intelligence system with three modes that work together:

### Core Entry Point: `/optin` Command
- **Single command activates everything** - users run `/optin` once and get intelligent conversation
- **Automatic mode selection** - bot chooses between Unified/Enhanced/Agentic intelligence based on env vars
- **Message-based interaction** - after optin, bot responds to all user messages naturally

### Intelligence Modes (in `src/index.ts`)
- **Basic Mode**: Direct Gemini API (fallback when other modes fail)
- **Unified Intelligence**: `UnifiedIntelligenceService` - core AI conversation with personas and context
- **Enhanced Intelligence**: `EnhancedInvisibleIntelligenceService` - adds MCP tools (web search, content extraction)
- **Agentic Intelligence**: `AgenticIntelligenceService` - adds knowledge base, escalation, confidence scoring

### Key Principle
**Never add new slash commands**. All new capabilities should be integrated into the intelligent conversation flow, triggered automatically based on context.

## 2. Critical Development Patterns

### ESM Module Imports (ALWAYS use .js extension)
```typescript
// ✅ Correct - use .js for all imports
import { UnifiedIntelligenceService } from './services/unified-intelligence.service.js';
import { intelligencePermissionService } from './services/intelligence/index.js';

// ❌ Wrong - will break at runtime
import { Service } from './service.ts';
import { Service } from './service';
```

### Dependency Injection for Jest ESM Testing
Static mocking is unreliable with ESM. Use constructor injection:

```typescript
export class StreamingResponseProcessor {
  constructor(
    private performanceMonitor: IPerformanceMonitor = new PerformanceMonitor()
  ) {}
}

// In tests: 
const mockMonitor = { monitor: jest.fn() };
const processor = new StreamingResponseProcessor(mockMonitor);
```

### Modular Intelligence Architecture
Core intelligence is split into focused services in `src/services/intelligence/`:
- `permission.service.ts` - RBAC and user capabilities
- `analysis.service.ts` - Message intent detection  
- `capability.service.ts` - Feature execution and MCP tool orchestration
- `admin.service.ts` - Administrative features
- `context.service.ts` - Enhanced context building

## 3. Development Workflow

### Critical Commands
- **Development**: `npm run dev` (uses `tsx` - the only reliable way to run)
- **Testing**: `npm test` (360 tests passing, comprehensive coverage)  
- **Production**: `npm start` (works with compiled JS)
- **Database**: `npx prisma db push` for schema changes, `npx prisma studio` to view data

### Known Issues
- **TypeScript Build Hangs**: `npm run build` may hang - use `tsx` for development and production
- **Test Performance**: Some property-based tests take 15-30s (normal for comprehensive coverage)

## 4. Environment Configuration

### Required Variables (copy from `env.example`)
```bash
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id  
GEMINI_API_KEY=your_gemini_api_key
```

### Intelligence Mode Controls
```bash
# Basic mode (default: all disabled)
ENABLE_ENHANCED_INTELLIGENCE=true    # Adds MCP tools
ENABLE_AGENTIC_INTELLIGENCE=true     # Adds knowledge base + escalation

# Optional API enhancements (bot works without these)
BRAVE_SEARCH_API_KEY=your_brave_key   # Web search capability
FIRECRAWL_API_KEY=your_firecrawl_key  # Content extraction
```

### Feature Flags for Components
```bash
ENABLE_MCP_INTEGRATION=true          # Global MCP tools toggle
ENABLE_MODERATION=true               # Content safety
ENABLE_ANALYTICS=false               # Usage tracking
```

## 5. MCP Tool Integration System

### Wrapper Pattern (`src/mcp/index.ts`)
MCP tools are accessed through typed wrappers that check for global function availability:

```typescript
// Safe wrapper approach
export async function braveWebSearch(params: BraveWebSearchParams) {
  if (typeof (globalThis as any).mcp_brave_search_brave_web_search === 'function') {
    return (globalThis as any).mcp_brave_search_brave_web_search(params);
  }
  throw new Error('mcp_brave_search_brave_web_search function not available');
}
```

### Available MCP Tools
- **Memory**: `memorySearchNodes()` - Knowledge graph search
- **Web Search**: `braveWebSearch()` - Internet search
- **Content**: `contentScrape()` - URL content extraction  
- **Thinking**: `sequentialThinking()` - Step-by-step reasoning
- **Automation**: `playwrightNavigate()` - Web interaction

### Adding New MCP Tools
1. Add typed wrapper in `src/mcp/index.ts`
2. Integrate into `capability.service.ts` 
3. Add tests with fallback mocks in `enhanced-intelligence/__tests__/`

## 6. Test Architecture

### Test Setup (`src/test/setup.ts`)
- **Global mocks** for Discord.js, Gemini API, fetch
- **Test utilities** like `mockDiscordMessage()`, `mockDiscordInteraction()`  
- **Environment isolation** with `NODE_ENV=test`

### Key Testing Patterns
- **Property-based tests** for MCP tool robustness
- **Integration tests** that verify component coordination
- **Graceful degradation tests** ensuring functionality without external APIs
- **Performance tests** for rate limiting and streaming

The test suite (360 tests) is the definitive source of truth for how components should work together.
