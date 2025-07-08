# Discord Gemini Bot Copilot Instructions

## Current Project Status
- **Last Updated**: 2024-12-28
- **Build Status**: ✅ WORKING - Successfully refactored to unified command architecture
- **Bot Status**: ✅ OPERATIONAL - Single /optin command with AI-driven feature selection
- **Architecture**: Unified Intelligence Service with automatic capability detection

## Major Recent Changes
- **COMPLETED**: Removed all individual commands (/gemini, /persona, /stats, /moderation, /memory)
- **COMPLETED**: Implemented single `/optin` command that uses AI to automatically select features
- **COMPLETED**: Created UnifiedIntelligenceService with automatic:
  - Persona selection based on context
  - Moderation checking for safety
  - Admin feature detection for stats/configuration
  - Memory integration for personalized responses
  - Multimodal support for images/attachments
- **COMPLETED**: Simplified main bot entry point to just the unified service

## Current Command Structure
- **Single Command**: `/optin <prompt> [attachment]`
- **AI-Driven Features**: All functionality automatically selected by AI during response generation:
  - Persona switching based on conversation context
  - Automatic moderation without explicit commands
  - Admin features (stats, configuration) triggered by intent detection  
  - Memory and conversation history automatically integrated
  - Multimodal processing when attachments present

## Key Files and Architecture

### Core Architecture
- `src/index.ts` - Main bot entry point (simplified, only handles /optin)
- `src/services/unified-intelligence.service.ts` - Central service handling all functionality
- `src/services/gemini.service.ts` - Google Gemini AI integration  
- `src/services/context-manager.ts` - Conversation history management
- `src/services/persona-manager.ts` - Dynamic persona management
- `src/memory/user-memory.service.ts` - User memory and personalization
- `src/moderation/moderation-service.ts` - Safety and content moderation

### Legacy Files (Still Present But No Longer Used)
- `src/commands/` - Old individual command handlers
- `src/index-old.ts` - Previous multi-command architecture backup

## Key Technical Details

### TypeScript Configuration
- Target: ES2022 with downlevelIteration enabled
- Module: ES2022 with ESM imports/exports
- Strict mode enabled with comprehensive type checking
- Known Issue: Some package type definitions cause compilation warnings but don't affect runtime

### Database Schema (Prisma)
- SQLite database with comprehensive schema for:
  - User memory and preferences
  - Conversation history with multimodal support
  - Analytics and usage tracking
  - Persona and configuration storage

### Environment Variables
```bash
DISCORD_TOKEN=required
DISCORD_CLIENT_ID=required  
GEMINI_API_KEY=required
OPENAI_API_KEY=optional (for advanced moderation)
GOOGLE_CLOUD_VISION_API_KEY=optional (for image safety)
```

## Development Workflow

### Starting Development
```bash
npm run dev  # Uses tsx watch for hot reloading
```

### Testing
```bash
npm test  # Runs Jest test suite
npm run build  # TypeScript compilation check
```

### Key Capabilities in Unified Service
1. **Automatic Feature Detection**: AI analyzes user input to determine needed capabilities
2. **Dynamic Persona Selection**: Selects appropriate persona based on conversation context
3. **Integrated Moderation**: Automatically checks all content for safety
4. **Memory Integration**: Personalizes responses using user history
5. **Admin Detection**: Automatically provides admin features to authorized users
6. **Multimodal Support**: Handles text, images, and mixed content seamlessly

## Working Features
- ✅ Single /optin command with comprehensive functionality
- ✅ AI-driven automatic feature selection during response generation  
- ✅ Streaming responses with stop/regenerate buttons
- ✅ Dynamic persona switching based on context
- ✅ Automatic content moderation and safety checking
- ✅ User memory and conversation personalization
- ✅ Admin functionality through intent detection
- ✅ Multimodal image and text processing
- ✅ Analytics and usage tracking
- ✅ Conversation history management

## Development Guidelines

### Code Style
- Use ESM imports with .js extensions
- Prefer async/await over promises
- Implement proper error handling with user feedback
- Use TypeScript strict mode with proper typing
- Follow singleton pattern for services

### Adding New Capabilities
1. Extend the `UnifiedIntelligenceService` class
2. Add capability detection logic in `analyzeUserIntent()`
3. Implement processing in `processWithUnifiedIntelligence()`
4. Update the AI prompt to recognize new intent patterns
5. Maintain backwards compatibility with existing features

### Database Changes
```bash
npx prisma generate  # After schema changes
npx prisma db push   # Apply changes to database
```

### Known Issues
- TypeScript compilation shows Map iteration warnings (doesn't affect runtime)
- Some legacy services have unused imports (cleanup pending)
- Test suite needs updates for unified command architecture

## Performance Considerations
- Gemini API streaming for real-time responses
- Database connection pooling and caching
- Rate limiting and request throttling
- Memory-efficient conversation history management
- Optimized image processing pipeline

This refactoring successfully consolidates all bot functionality into a single, AI-driven command that automatically selects appropriate features based on user intent, greatly simplifying the user experience while maintaining full functionality.
