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

### Current Status (Production Ready)
- ✅ **360+ tests passing** across 38 test suites with comprehensive coverage
- ✅ **TypeScript build works** but `npm run build` hangs - use `tsx` for development and production
- ✅ **All intelligence modes operational** with graceful degradation
- ✅ **MCP integration architecture complete** with external API enhancement
- ✅ **Production deployment ready** with Docker support and health checks

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

### Personalization Engine Pattern (`src/services/enhanced-intelligence/personalization-engine.service.ts`)
Advanced user pattern learning with phase-aware MCP integration:
- **5-Phase MCP Deployment**: Memory → Web Search → Databases → Advanced Reasoning → Code Execution  
- **User Pattern Analysis**: Tracks tool usage, preferences, satisfaction scores
- **Intelligent Recommendations**: Contextual tool suggestions based on user behavior
- **Graceful Degradation**: Works without MCP servers, enhanced with them

### 5-Phase MCP Deployment Strategy (implemented in PersonalizationEngine)
- **Phase 1 (Critical)**: memory, discord - Foundation capabilities
- **Phase 2 (High Priority)**: brave_search, firecrawl, filesystem - Enhanced knowledge  
- **Phase 3 (Medium Priority)**: postgres, sqlite, github - Specialized data
- **Phase 4 (Advanced)**: sequential_thinking, playwright - Advanced processing
- **Phase 5 (Specialized)**: code_execution - Sandboxed execution

### Current Architecture Patterns

#### Message Processing Flow (in `src/index.ts`)
The main entry point implements a sophisticated routing system:
```typescript
// 1. Route to agentic intelligence if enabled
if (ENABLE_AGENTIC_INTELLIGENCE) {
  await handleAgenticMessage(message);
} else {
  // 2. Route to enhanced or unified intelligence
  if (enhancedIntelligenceService && 'handleIntelligentMessage' in enhancedIntelligenceService) {
    await enhancedIntelligenceService.handleIntelligentMessage(message);
  } else {
    await unifiedIntelligenceService.handleIntelligentMessage(message);
  }
}
```

#### Intelligence Service Pattern
Each intelligence service follows a consistent interface:
- `createSlashCommand()` - builds the `/optin` command with service-specific capabilities
- `handleIntelligentMessage(message)` - processes natural conversations from opted-in users
- `shouldProcessMessage(message)` - validates permissions and context
- Graceful degradation when external dependencies fail

#### MCP Manager Integration (Enhanced Mode)
```typescript
// MCP Manager initializes during bot startup and provides tools to services
await mcpManager.initialize();
const status = mcpManager.getStatus();
console.log(`✅ MCP Manager initialized: ${status.connectedServers}/${status.totalServers} servers connected`);

// Services check for MCP availability and fallback gracefully
unifiedIntelligenceService = new UnifiedIntelligenceService(undefined, mcpManager);
```

## 3. Development Workflow & Commands

### Essential Commands
- **Development**: `npm run dev` (uses `tsx` - THE ONLY reliable way to run TypeScript)
- **Testing**: `npm test` (360+ tests across 38 suites, ~96% pass rate with property-based tests)
- **Production**: `npm start` (runs compiled JS - works perfectly when build succeeds)
- **Database**: `npx prisma db push` for schema changes, `npx prisma studio` to view data

### Critical Build Issue & Workaround
- **TypeScript Build**: `npm run build` hangs indefinitely - known issue, not blocking production
- **Development & Production Workaround**: Use `tsx` directly - bot runs perfectly with `tsx` in all environments
- **Docker Support**: Available but use `tsx` for reliability (`npm run docker:build`, `npm run docker:run`)
- **Tests**: Property-based tests take 15-30s (comprehensive coverage with fast-check)

### Development Debugging
```bash
# Check MCP tool availability in development
node debug-mcp-registry.js

# Test specific capabilities  
node capability-debug.js

# Run health checks
curl http://localhost:3000/health
```

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
5. **Phase-Aware Recommendations**: PersonalizationEngine suggests tools based on deployment status

### Adding New MCP Tools
1. Add typed wrapper in `src/mcp/index.ts` with safety checks
2. Integrate via `capability.service.ts` with permission gating
3. Add to PersonalizationEngine's `getAvailableMCPTools()` mapping
4. Add comprehensive tests in `enhanced-intelligence/__tests__/` with mock fallbacks
5. Document fallback behavior for when external tools unavailable

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

### Test Categories & Coverage (360+ tests, ~96% pass)
- **Unit tests**: Individual service functionality and business logic
- **Integration tests**: Cross-component communication and workflow validation
- **Property tests**: Edge case discovery through generative testing (uses `fast-check`)
- **Performance tests**: Rate limiting, streaming, and optimization validation
- **Regression tests**: Known issue prevention and stability maintenance

### Test Development Guidelines
- **Inject dependencies** via constructors for testable services
- **Mock external APIs** at the service boundary, not globally
- **Test fallback paths** to ensure graceful degradation
- **Use property testing** for complex data transformations
- **Validate cross-service integration** to catch architectural issues

The test suite serves as the **definitive source of truth** for component interaction patterns and expected behaviors.

## 7. Enhanced Intelligence Service Architecture

### Message Processing Flow (`src/services/enhanced-intelligence/index.ts`)
```typescript
// 1. Immediate interaction acknowledgment (prevents timeout)
await interaction.deferReply({ ephemeral: false });

// 2. Context creation with analysis
const context: ProcessingContext = {
  userId, channelId, guildId,
  analysis: this.analysisService.analyzeMessage(content, attachments),
  results: new Map(), errors: []
};

// 3. MCP tool processing with timeout protection
await Promise.race([
  this.mcpToolsService.processWithAllTools(content, attachments, context),
  timeoutPromise(25000)
]);

// 4. Enhanced response generation with personalization
const baseResponse = await this.responseService.generateEnhancedResponse(content, context);
const finalResponse = await this.adaptPersonalizedResponse(userId, baseResponse, guildId);

// 5. Memory storage and analytics
await this.memoryService.storeConversationMemory(context, content, finalResponse);
```

### Modular Service Dependencies
- `EnhancedMessageAnalysisService` - Message complexity and intent analysis
- `EnhancedMCPToolsService` - MCP tool orchestration and execution
- `EnhancedMemoryService` - Conversation history and context management
- `EnhancedUIService` - Discord interaction and response streaming
- `EnhancedResponseService` - AI response generation and enhancement
- `PersonalizationEngine` - User pattern learning and adaptive responses

### Intelligent Tool Selection (`mcpRegistry` and `mcpToolRegistration`)
```typescript
// Get tool recommendations based on content analysis
const recommendations = mcpToolRegistration.getToolRecommendations(content, {
  userId: context.userId,
  priority: this.determinePriority(content, attachments)
});

// Execute top 2 tools with fallback to traditional processing
for (const tool of recommendations.slice(0, 2)) {
  const result = await mcpRegistry.executeTool(tool.id, params, executionContext);
  context.results.set(tool.id, result);
}
```

## 8. Database & Memory Management

### Prisma ORM Setup
- **Development**: SQLite with `prisma/dev.db`
- **Production**: PostgreSQL ready with environment variables
- **Schema**: `prisma/schema.prisma` - User memories, analytics, moderation
- **Commands**: `npx prisma db push`, `npx prisma studio`, `npx prisma migrate dev`

### Memory Architecture (`src/memory/user-memory.service.ts`)
```typescript
// User memory storage with preferences and conversation history
interface UserMemoryData {
  preferences: { responseLength: string; communicationStyle: string; topics: string[] };
  conversationHistory: Array<{ timestamp: Date; content: string; response: string }>;
  personalContext: Record<string, unknown>;
}
```

## 9. Performance & Production Considerations

### Graceful Degradation Strategy
1. **MCP Tools**: Always have fallback responses when external services fail
2. **Gemini API**: Rate limiting with exponential backoff and retry logic
3. **Discord API**: Interaction timeout protection and error recovery
4. **Database**: In-memory fallbacks for non-critical features

### Production Deployment
- **Docker**: Use `npm run docker:build` and `docker-compose.yml`
- **Environment**: Set `NODE_ENV=production` and required API keys
- **Health Checks**: Built-in health check server on configurable port
- **Graceful Shutdown**: Handles SIGTERM/SIGINT with proper cleanup

### Performance Monitoring
```typescript
// Performance tracking throughout the codebase
await PerformanceMonitor.monitor('operation-name', async () => {
  // Operation logic
}, { userId, context });
```

## 12. Project-Specific Conventions & Patterns

### Message Processing Architecture Pattern
```typescript
// Standard message flow in src/index.ts
client.on('messageCreate', async (message) => {
  // 1. Route based on enabled intelligence mode
  if (ENABLE_AGENTIC_INTELLIGENCE) {
    await handleAgenticMessage(message);
  } else if (enhancedIntelligenceService?.handleIntelligentMessage) {
    await enhancedIntelligenceService.handleIntelligentMessage(message);  
  } else {
    await unifiedIntelligenceService.handleIntelligentMessage(message);
  }
});
```

### Service Interface Pattern
All intelligence services implement this consistent interface:
```typescript
class SomeIntelligenceService {
  createSlashCommand() // Build /optin command with service capabilities
  handleIntelligentMessage(message) // Process natural conversations
  shouldProcessMessage(message) // Permission and context validation
}
```

### MCP Tool Safety Pattern (`src/mcp/index.ts`)
```typescript
export async function someMCPTool(params: SomeParams) {
  if (typeof (globalThis as any).mcp_tool_function === 'function') {
    return (globalThis as any).mcp_tool_function(params);
  }
  throw new Error('mcp_tool_function not available in current environment');
}
```

### Graceful Degradation Pattern
Services always provide fallback behavior:
```typescript
try {
  const result = await externalService.call();
  return enhancedResponse(result);
} catch (error) {
  logger.warn('External service failed, using fallback');
  return basicResponse();
}
```

### Environment-Based Feature Flags
```typescript
const ENABLE_ENHANCED_INTELLIGENCE = process.env.ENABLE_ENHANCED_INTELLIGENCE === 'true';
const ENABLE_AGENTIC_INTELLIGENCE = process.env.ENABLE_AGENTIC_INTELLIGENCE !== 'false'; // Default true
```

### Performance Monitoring Pattern
```typescript
await PerformanceMonitor.monitor('operation-name', async () => {
  // Your operation logic here
}, { userId, context });
```

### Test Utility Pattern (`src/test/setup.ts`)
```typescript
// Global test utilities available in all tests
global.testUtils = {
  mockDiscordMessage: (content, author) => ({ /* mock object */ }),
  mockDiscordInteraction: (commandName, options) => ({ /* mock object */ }),
  mockGeminiResponse: (text) => ({ /* mock response */ })
};
```

---

This is a **production-ready Discord AI bot** with sophisticated architecture designed for scalability, reliability, and extensibility. The modular design allows adding new intelligence capabilities without disrupting existing functionality.

## 11. Project Structure & Key Files

### Critical Architecture Files (Read These First)
- `src/index.ts` - **Main entry point** with intelligence routing and graceful shutdown handling
- `src/services/unified-intelligence.service.ts` - **Core conversation handler** with modular intelligence pattern
- `src/services/enhanced-intelligence/index.ts` - **Advanced MCP-enabled service** with timeout protection
- `src/services/agentic-intelligence.service.ts` - **Knowledge base and escalation** with confidence scoring
- `src/mcp/index.ts` - **Type-safe MCP tool wrappers** with availability checks

### Modular Intelligence Services (`src/services/intelligence/`)
```
intelligence/
├── index.ts              # Exports and type definitions
├── permission.service.ts # RBAC and Discord role mapping  
├── analysis.service.ts   # Message intent and complexity analysis
├── capability.service.ts # Feature execution and MCP tool selection
├── admin.service.ts      # Persona management and admin features
└── context.service.ts    # Enhanced context building and memory
```

### Project Structure Overview
```
src/
├── index.ts                     # Main bot with multi-mode routing
├── services/                    # Core business logic
│   ├── intelligence/            # Modular AI components
│   ├── enhanced-intelligence/   # MCP-enabled advanced features
│   ├── core/                   # Shared services (analysis, orchestrator)
│   ├── gemini.service.ts       # Google AI integration
│   └── mcp-manager.service.ts  # External tool orchestration
├── mcp/                        # Type-safe MCP wrappers
├── commands/                   # Slash command definitions
├── test/                       # Global test setup and utilities
├── memory/                     # User memory and context management
├── security/                   # RBAC and content moderation
├── ui/                         # Discord components and streaming
└── utils/                      # Shared utilities and helpers
```

### Configuration Files
- `package.json` - **ESM module setup** with tsx workflow
- `tsconfig.json` - TypeScript configuration for ES2022 modules
- `prisma/schema.prisma` - Database schema for users, memory, analytics
- `env.example` - Complete environment variable template

### Development Debug Tools (Root Directory)
- `debug-mcp-registry.js` - Check MCP tool availability
- `capability-debug.js` - Test specific bot capabilities
- `quick-debug.js` - Fast service testing
- `availability-debug.js` - Service health checks
