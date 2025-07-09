# Discord Gemini Bot - AI Agent Instructions

## Core Architecture & Entry Points

This is a **production-ready Discord AI bot** with triple intelligence architecture:

### Primary Entry Point: `/chat` Command
- **Main interface**: Users run `/chat <prompt>` for AI conversation
- **Auto-opt-in**: First-time users automatically enrolled
- **Intelligence routing**: Automatically selects Core/Enhanced/Agentic based on environment flags
- **MCP tool integration**: Real-time web search, memory, content extraction via Model Context Protocol

### Intelligence Levels (hierarchical activation)
1. **Core**: `CoreIntelligenceService` - base conversation with modular `src/services/intelligence/`
2. **Enhanced**: Advanced MCP tools (web search, content extraction) via `ENABLE_ENHANCED_INTELLIGENCE=true`
3. **Agentic**: Knowledge base + auto-escalation via `ENABLE_AGENTIC_INTELLIGENCE=true`

## 2. Critical Development Patterns

### ESM Module Requirements (MANDATORY)
```typescript
// ✅ ALWAYS use .js extension for imports in TypeScript files
import { CoreIntelligenceService } from './services/core-intelligence.service.js';
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
if (enableAgenticFeatures && interaction.isChatInputCommand()) {
  const agenticCommand = agenticCommands.find(cmd => cmd.data.name === interaction.commandName);
  if (agenticCommand) {
    await agenticCommand.execute(interaction);
    return;
  }
}

// 2. Route all other interactions (including core /chat) to CoreIntelligenceService
await coreIntelligenceService.handleInteraction(interaction);
```

#### Intelligence Service Pattern
Each intelligence service follows a consistent interface:
- `buildCommands()` - builds the `/chat` command with service-specific capabilities
- `handleInteraction(interaction)` - processes slash command interactions
- `handleMessage(message)` - processes natural conversations from opted-in users
- Graceful degradation when external dependencies fail

#### Automatic Opt-in System
The current `/chat` command automatically opts users in when they first use it:
```typescript
if (!this.optedInUsers.has(userId)) {
     this.optedInUsers.add(userId);
     await this.saveOptedInUsers();
}
```

#### MCP Manager Integration (Enhanced Mode)
```typescript
// MCP Manager initializes during bot startup and provides tools to services
await mcpManager.initialize();
const status = mcpManager.getStatus();
console.log(`✅ MCP Manager initialized: ${status.connectedServers}/${status.totalServers} servers connected`);

// Services check for MCP availability and fallback gracefully
coreIntelligenceService = new CoreIntelligenceService(coreIntelConfig);
```

## 3. Development Workflow & Commands

### Essential Commands
- **Development**: `npm run dev` (uses `tsx` - THE ONLY reliable way to run TypeScript)
- **Testing**: `npm test` (447+ tests across 51+ suites, comprehensive coverage with property-based tests)
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

### Additional Configuration
```bash
# Environment and Health Checks
NODE_ENV=production
HEALTH_CHECK_PORT=3000

# Rate Limiting and Logging
MAX_REQUESTS_PER_MINUTE=60
MAX_REQUESTS_PER_HOUR=1000
LOG_LEVEL=info
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

### Test Categories & Coverage (447+ tests, comprehensive coverage)
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

## 10. Current Project Status & Architecture Evolution

### Recent Architecture Evolution
This project has evolved from a legacy `/optin` command system to a sophisticated `/chat` command architecture:

**Previous State (archived)**:
- Legacy `/optin` command for user activation
- `UnifiedIntelligenceService` as primary handler
- Manual opt-in required for users

**Current State (production)**:
- `/chat` command as primary entry point with automatic opt-in
- `CoreIntelligenceService` as main orchestrator
- Hierarchical intelligence levels (Core → Enhanced → Agentic)
- Modular intelligence services in `src/services/intelligence/`

### Current Implementation Status
**Fully Operational**:
- ✅ Core Intelligence with `/chat` command
- ✅ Modular service architecture with dependency injection
- ✅ MCP tool integration with safe wrappers
- ✅ Comprehensive test suite (447+ tests)
- ✅ TypeScript ESM modules with `.js` import requirements
- ✅ Environment-based feature flag system
- ✅ Performance monitoring and analytics
- ✅ Graceful degradation patterns throughout

**Current Development Focus**:
- ✅ Unified Architecture Migration: Core Intelligence Service integrated with UnifiedMessageAnalysisService, UnifiedMCPOrchestratorService, and UnifiedAnalyticsService
- ✅ Comprehensive Testing Infrastructure: Created performance benchmarks, error handling tests, and integration tests for unified services
- Enhanced Intelligence activation through feature flags
- Agentic Intelligence with confidence scoring and escalation  
- Personalization Engine with MCP tool recommendations
- Production deployment optimization with `tsx` workflow

### Unified Architecture Pattern (NEW)
The Core Intelligence Service now uses a unified architecture integrating three core services:

```typescript
// Unified service integration pattern in CoreIntelligenceService
class CoreIntelligenceService {
  constructor(config: CoreIntelligenceConfig) {
    this.unifiedAnalytics = new UnifiedAnalyticsService();
    this.unifiedMessageAnalysis = new UnifiedMessageAnalysisService();
    this.mcpOrchestrator = new UnifiedMCPOrchestratorService();
  }

  // Unified processing pipeline
  private async _processMessagePipeline(uiContext, promptText, commonAttachments, userId, channelId, guildId) {
    // 1. Unified message analysis
    const unifiedAnalysis = await this.unifiedMessageAnalysis.analyzeMessage(messageForPipeline, analysisAttachmentsData, capabilities);
    
    // 2. Unified MCP orchestration
    const mcpOrchestrationResult = await this.mcpOrchestrator.processMessage(messageForAnalysis, unifiedAnalysis, capabilities);
    
    // 3. Adapter pattern for modular intelligence services
    const adaptedAnalysisForContext = this.contextService.adaptUnifiedAnalysis(unifiedAnalysis);
    const adaptedMcpResultsForContext = this.contextService.convertUnifiedMCPResults(mcpOrchestrationResult);
    
    // 4. Enhanced context building with unified results
    const agenticContextData = await this.contextService.buildEnhancedContext(messageForAnalysis, adaptedAnalysisForContext, capabilities, adaptedMcpResultsForContext);
  }
}
```

### Adapter Pattern for Backward Compatibility
Modular intelligence services use adapter methods to maintain compatibility:

```typescript
// In capability.service.ts and context.service.ts
class IntelligenceCapabilityService {
  // Adapter method for unified analysis
  adaptUnifiedAnalysis(unifiedAnalysis: UnifiedMessageAnalysis): IntelligenceAnalysis {
    return {
      complexity: unifiedAnalysis.complexity,
      intents: unifiedAnalysis.detectedIntents,
      topics: unifiedAnalysis.topics,
      requiresPersona: unifiedAnalysis.requiresPersona,
      suggestedTools: unifiedAnalysis.suggestedMCPTools
    };
  }

  // Adapter method for unified MCP results
  convertMCPOrchestrationResults(mcpResult: MCPOrchestrationResult) {
    const adaptedResults = new Map<string, any>();
    for (const [toolId, toolResult] of mcpResult.toolResults) {
      if (toolResult.success && toolResult.data) {
        adaptedResults.set(toolId, toolResult.data);
      }
    }
    return adaptedResults;
  }
}
```

### Message Processing Architecture Pattern
```typescript
// Standard message flow in src/index.ts
client.on('messageCreate', async (message) => {
  // Message handling is now primarily through CoreIntelligenceService
  await coreIntelligenceService.handleMessage(message);
});
```

### Service Interface Pattern
All intelligence services implement this consistent interface:
```typescript
class SomeIntelligenceService {
  buildCommands() // Build /chat command with service capabilities
  handleInteraction(interaction) // Process slash command interactions
  handleMessage(message) // Process natural conversations from opted-in users
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

## 11. Project-Specific Conventions & Patterns

## 12. Project Structure & Key Files
- `src/index.ts` - **Main entry point** with intelligence routing and graceful shutdown handling
- `src/services/core-intelligence.service.ts` - **Core conversation handler** with modular intelligence pattern
- `src/services/enhanced-intelligence/index.ts` - **Advanced MCP-enabled service** with timeout protection
- `src/services/agentic-intelligence.service.ts` - **Knowledge base and escalation** with confidence scoring
- `src/mcp/index.ts` - **Type-safe MCP tool wrappers** with availability checks

### Critical Architecture Files (Read These First)
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


---

This is a **production-ready Discord AI bot** with sophisticated architecture designed for scalability, reliability, and extensibility. The modular design allows adding new intelligence capabilities without disrupting existing functionality.

**Key Insights for AI Collaboration:**
- **Use `tsx` for all development** - it's the most reliable way to run the bot
- **Test-Driven Development** - The comprehensive test suite makes refactoring safe
- **Modular Architecture** - Easy to add new intelligence capabilities without breaking existing features
- **Environment Configuration** - Feature flags allow gradual capability rollout
- **Graceful Degradation** - Bot works even when external services are unavailable
- **Automatic User Onboarding** - `/chat` command automatically opts users in for seamless experience

**Current Command Structure**:
- **Primary**: `/chat <prompt> [attachment]` - Main entry point with automatic opt-in
- **Agentic**: Additional commands when `ENABLE_AGENTIC_INTELLIGENCE=true`
- **Natural Messages**: Opted-in users can chat normally without commands

REMEMBER: After every memory reset, I begin completely fresh. The Memory Bank is my only link to previous work. It must be maintained with precision and clarity, as my effectiveness depends entirely on its accuracy.
