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

## Critical Development Patterns

### ESM Module Requirements (MANDATORY)
```typescript
// ✅ ALWAYS use .js extension for imports in TypeScript files
import { CoreIntelligenceService } from './services/core-intelligence.service.js';

// ❌ NEVER use .ts - will break at runtime
import { Service } from './service.ts';
```

### Development Workflow
- **Development**: `npm run dev` (uses `tsx` - THE ONLY reliable way to run TypeScript)
- **Testing**: `npm test` (43/50 test suites passing, production ready)
- **Build**: `npm run build` hangs - use `tsx` directly for development and production
- **Database**: `npx prisma db push` for schema changes

### Service Architecture Pattern
All intelligence services follow this interface:
```typescript
class SomeIntelligenceService {
  buildCommands() // Build /chat command with capabilities
  handleInteraction(interaction) // Process slash commands
  handleMessage(message) // Process natural conversations
}
```

### MCP Tool Integration (`src/mcp/index.ts`)
Safe wrapper pattern for external tools:
```typescript
export async function someExternalTool(params) {
  if (typeof (globalThis as any).mcp_tool_function === 'function') {
    return (globalThis as any).mcp_tool_function(params);
  }
  throw new Error('External tool not available - using fallback');
}
```

### Key Files to Understand First
- `src/index.ts` - Main entry point with intelligence routing
- `src/services/core-intelligence.service.ts` - Core conversation handler
- `src/services/intelligence/` - Modular AI components (permission, analysis, capability)
- `src/mcp/index.ts` - Type-safe external tool wrappers
- `env.example` - Complete environment configuration

### Environment Configuration
```bash
# Required
DISCORD_TOKEN=your_token
GEMINI_API_KEY=your_key

# Intelligence activation (hierarchical)
ENABLE_ENHANCED_INTELLIGENCE=true    # Adds MCP tools
ENABLE_AGENTIC_INTELLIGENCE=true     # Adds knowledge base + escalation
```

## Project-Specific Conventions

- **Dependency Injection**: All services use constructor injection for ESM testing compatibility
- **Graceful Degradation**: Services always provide fallback responses when external APIs fail
- **Performance Monitoring**: Use `PerformanceMonitor.monitor()` for operation tracking
- **Test Architecture**: Global mocks in `src/test/setup.ts` with proper ESM typing
