# Copilot Instructions for Discord Gemini Bot

## 1. Triple Intelligence Architecture

This Discord bot implements a sophisticated AI system with layered intelligence that automatically scales capabilities based on environment configuration:

### Core Entry Point: `/optin` Command
- **Single command activates everything** - users run `/optin` once and get intelligent conversation
- **Automatic mode selection** - bot chooses between Unified/Enhanced/Agentic intelligence based on env vars
- **Message-based interaction** - after optin, bot responds to all user messages naturally with contextual capability selection

### Intelligence Modes (orchestrated in `src/index.ts`)
- **Basic Mode**: Direct Gemini API (emergency fallback only)
- **Unified Intelligence**: `UnifiedIntelligenceService` - modular AI with permission-gated features via `src/services/intelligence/`
- **Enhanced Intelligence**: `EnhancedInvisibleIntelligenceService` - adds real MCP tools (web search, content extraction, sequential thinking)
- **Agentic Intelligence**: `AgenticIntelligenceService` - adds knowledge base, confidence scoring, auto-escalation, and self-improvement

### Key Architecture Principle
**Never add new slash commands**. All capabilities integrate into the intelligent conversation flow through automatic context analysis and permission-based feature activation.

## 2. Critical Development Patterns

### ESM Module Requirements (MANDATORY)
```typescript
// ✅ ALWAYS use .js extension for imports in TypeScript files
import { UnifiedIntelligenceService } from './services/unified-intelligence.service.js';
import { intelligencePermissionService } from './services/intelligence/index.js';

// ❌ NEVER use these - will break at runtime in production
import { Service } from './service.ts';
import { Service } from './service';
```

### Dependency Injection for ESM Testing
ESM makes static mocking unreliable. All services use constructor injection for testability:

```typescript
export class StreamingResponseProcessor {
  constructor(
    private performanceMonitor: IPerformanceMonitor = new PerformanceMonitor()
  ) {}
}

// In tests: inject mocks instead of global mocking
const mockMonitor = { monitor: jest.fn() };
const processor = new StreamingResponseProcessor(mockMonitor);
```

### Modular Intelligence Pattern (`src/services/intelligence/`)
Core intelligence split into focused, composable services:
- `permission.service.ts` - RBAC, user capabilities, Discord role mapping
- `analysis.service.ts` - Message intent detection, complexity analysis
- `capability.service.ts` - Feature execution, MCP tool orchestration  
- `admin.service.ts` - Administrative features, persona management
- `context.service.ts` - Enhanced context building, memory integration

### MCP Tool Integration (`src/mcp/index.ts`)
```typescript
// Safe wrapper pattern for global MCP functions
export async function braveWebSearch(params: BraveWebSearchParams) {
  if (typeof (globalThis as any).mcp_brave_search_brave_web_search === 'function') {
    return (globalThis as any).mcp_brave_search_brave_web_search(params);
  }
  throw new Error('mcp_brave_search_brave_web_search function not available');
}
```

## 3. Development Workflow & Commands

### Essential Commands
- **Development**: `npm run dev` (uses `tsx` - THE ONLY reliable way to run TypeScript)
- **Testing**: `npm test` (391 tests, ~97% pass rate with property-based tests)
- **Production**: `npm start` (runs compiled JS - works perfectly)
- **Database**: `npx prisma db push` for schema changes, `npx prisma studio` to view data

### Critical Build Issue
- **TypeScript Build**: `npm run build` hangs indefinitely - use `tsx` for development and production
- **Workaround**: Bot runs perfectly with `tsx` in all environments, compilation not needed
- **Tests**: Property-based tests take 15-30s (comprehensive coverage with fast-check)

### Test Architecture (`src/test/setup.ts`)
- **Global mocks** for Discord.js, Gemini API, and fetch with proper ESM typing
- **Test utilities**: `mockDiscordMessage()`, `mockDiscordInteraction()`, `mockGeminiResponse()`
- **Environment isolation**: `NODE_ENV=test` with 30-second timeouts
- **Property-based testing**: Uses `fast-check` for robust edge case validation
- **Integration testing**: Services coordinate correctly across intelligence layers

## 4. Environment Configuration & Intelligence Control

### Required Variables (copy from `env.example`)
```bash
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id  
GEMINI_API_KEY=your_gemini_api_key
```

### Intelligence Mode Hierarchy
```bash
# Intelligence activation (hierarchical - each enables the previous)
ENABLE_ENHANCED_INTELLIGENCE=true    # Adds MCP tools + advanced processing
ENABLE_AGENTIC_INTELLIGENCE=true     # Adds knowledge base + auto-escalation + confidence scoring

# External API Integration (bot works perfectly without these)
BRAVE_SEARCH_API_KEY=your_brave_key   # Real-time web search capability
FIRECRAWL_API_KEY=your_firecrawl_key  # Advanced content extraction
```

### Feature Control Flags
```bash
ENABLE_MCP_INTEGRATION=true          # Global MCP tools toggle
ENABLE_MODERATION=true               # Content safety systems
ENABLE_ANALYTICS=false               # Usage tracking and insights

# Agentic-specific configuration
AGENTIC_CHANNELS=channel_id_1,channel_id_2           # Auto-respond channels
AGENTIC_ESCALATION_CHANNEL=moderator_channel_id      # Escalation notifications
AGENTIC_MODERATOR_ROLES=role_id_1,role_id_2         # Auto-escalation permissions
```

## 5. MCP Tool Integration System

### Safe Wrapper Pattern (`src/mcp/index.ts`)
MCP tools accessed through typed wrappers that check global function availability:

```typescript
// Safe wrapper pattern prevents runtime crashes
export async function braveWebSearch(params: BraveWebSearchParams) {
  if (typeof (globalThis as any).mcp_brave_search_brave_web_search === 'function') {
    return (globalThis as any).mcp_brave_search_brave_web_search(params);
  }
  throw new Error('mcp_brave_search_brave_web_search function not available');
}
```

### Available MCP Tool Categories
- **Memory**: `memorySearchNodes()` - Knowledge graph search and entity management
- **Web Intelligence**: `braveWebSearch()` - Real-time web search with result processing
- **Content Processing**: `contentScrape()` - URL analysis and content extraction  
- **Advanced Reasoning**: `sequentialThinking()` - Multi-step logical analysis
- **Browser Automation**: `playwrightNavigate()` - Web interaction and data collection

### MCP Integration Architecture
1. **Global Function Detection**: Wrappers check `globalThis` for MCP function availability
2. **Graceful Degradation**: Services provide intelligent fallbacks when MCP tools unavailable
3. **Typed Interfaces**: All MCP interactions use TypeScript interfaces for safety
4. **Error Boundaries**: MCP failures don't crash the bot - fallback responses provided

### Adding New MCP Tools
1. Add typed wrapper in `src/mcp/index.ts` with safety checks
2. Integrate via `capability.service.ts` with permission gating
3. Add comprehensive tests in `enhanced-intelligence/__tests__/` with mock fallbacks
4. Document fallback behavior for when external tools unavailable

## 6. Test Architecture & Quality Assurance

### Test Infrastructure (`src/test/setup.ts`)
- **Global mocks** for Discord.js, Gemini API, and fetch with ESM-compatible typing
- **Test utilities**: `mockDiscordMessage()`, `mockDiscordInteraction()`, `mockGeminiResponse()`
- **Environment isolation**: `NODE_ENV=test` with 30-second timeouts for property-based tests
- **Console silencing**: Reduces noise while preserving error visibility

### Testing Patterns & Philosophy
- **Property-based testing**: Uses `fast-check` for robust edge case discovery
- **Integration testing**: Verifies cross-service coordination and data flow
- **Graceful degradation testing**: Ensures functionality without external dependencies
- **Performance testing**: Validates streaming, rate limiting, and batch processing
- **ESM mocking strategy**: Dependency injection over global mocking for reliability

### Test Categories & Coverage (391 tests, ~97% pass)
- **Unit tests**: Individual service functionality and business logic
- **Integration tests**: Cross-component communication and workflow validation
- **Property tests**: Edge case discovery through generative testing
- **Performance tests**: Rate limiting, streaming, and optimization validation
- **Regression tests**: Known issue prevention and stability maintenance

### Test Development Guidelines
- **Inject dependencies** via constructors for testable services
- **Mock external APIs** at the service boundary, not globally
- **Test fallback paths** to ensure graceful degradation
- **Use property testing** for complex data transformations
- **Validate cross-service integration** to catch architectural issues

The test suite serves as the **definitive source of truth** for component interaction patterns and expected behaviors.
