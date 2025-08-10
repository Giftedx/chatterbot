# TASK-002: Core Intelligence Service Dependency Mapping

## Current Service Dependencies

### Already Integrated Unified Services
✅ **UnifiedMessageAnalysisService**
- Import: `import { unifiedMessageAnalysisService, UnifiedMessageAnalysis, AttachmentInfo } from './core/message-analysis.service';`
- Usage: Line 333 - `const unifiedAnalysis = await unifiedMessageAnalysisService.analyzeMessage(...)`
- Instance: `private readonly messageAnalysisService: typeof unifiedMessageAnalysisService;`

✅ **UnifiedMCPOrchestratorService**
- Import: `import { UnifiedMCPOrchestratorService, MCPOrchestrationResult, MCPToolResult } from './core/mcp-orchestrator.service';`
- Usage: `private readonly mcpOrchestrator: UnifiedMCPOrchestratorService;`
- Instance: `this.mcpOrchestrator = new UnifiedMCPOrchestratorService(config.mcpManager);`

### Missing Unified Service Integration
❌ **UnifiedAnalyticsService** 
- Current analytics: Uses legacy `logInteraction` function from `'./analytics'`
- Current wrapper: `recordAnalyticsInteraction()` method that calls `logInteraction()`
- Integration needed: Replace with UnifiedAnalyticsService instance

## Modular Intelligence Service Dependencies

### Core Modular Services (Already Integrated)
✅ **intelligencePermissionService**
- Import: `intelligencePermissionService` from `'./intelligence'`
- Instance: `private readonly permissionService: typeof intelligencePermissionService;`
- Usage: Permission checks and user capability determination

✅ **intelligenceContextService**
- Import: `intelligenceContextService, EnhancedContext` from `'./intelligence'`
- Instance: `private readonly contextService: typeof intelligenceContextService;`
- Usage: Context building and management

✅ **intelligenceAdminService**
- Import: `intelligenceAdminService` from `'./intelligence'`
- Instance: `private readonly adminService: typeof intelligenceAdminService;`
- Usage: Administrative features and persona management

✅ **intelligenceCapabilityService**
- Import: `intelligenceCapabilityService` from `'./intelligence'`
- Instance: `private readonly capabilityService: typeof intelligenceCapabilityService;`
- Usage: Feature execution and capability management

## External Service Dependencies

### Core External Services
- **MCPManager**: `import { MCPManager } from './mcp-manager.service';`
- **AgenticIntelligenceService**: `import { AgenticIntelligenceService, AgenticQuery, AgenticResponse } from './agentic-intelligence.service';`
- **GeminiService**: `import { GeminiService } from './gemini.service';`

### Enhanced Intelligence Services (Conditional)
- **EnhancedMemoryService**: Used when enhanced features enabled
- **EnhancedUIService**: Enhanced UI interactions
- **EnhancedResponseService**: Advanced response generation
- **PersonalizationEngine**: User pattern learning
- **UserBehaviorAnalyticsService**: Behavior tracking

### Utility Dependencies
- **ModerationService**: Content safety
- **UserMemoryService**: Memory management
- **Context Manager**: History and chat management

## Integration Points for Unified Services

### Current Message Processing Flow
1. **Input Validation & Moderation** → Uses legacy analytics
2. **User Capability Fetching** → Uses intelligencePermissionService ✅
3. **Message Analysis** → Uses UnifiedMessageAnalysisService ✅ 
4. **MCP Tool Execution** → Uses UnifiedMCPOrchestratorService ✅
5. **Response Generation** → Uses legacy analytics
6. **Result Delivery** → Uses legacy analytics

### Required Integration Points for UnifiedAnalyticsService

1. **Method: `recordAnalyticsInteraction()`**
   - Current: Wraps `logInteraction()` function
   - Target: Use UnifiedAnalyticsService methods

2. **Analytics Data Collection Points**
   - Line 220: Initial analytics data creation
   - Line 223: Start processing logging
   - Line 227-230: Moderation status logging
   - Line 234-237: Capability and analysis logging

3. **Integration Strategy**
   - Replace `recordAnalyticsInteraction()` wrapper
   - Update analytics data collection to use unified service interfaces
   - Maintain compatibility with existing analytics data format

## Service Interface Compatibility

### UnifiedMessageAnalysisService Interface ✅
- Compatible with current `analyzeMessage()` usage
- Returns `UnifiedMessageAnalysis` type with enhanced data
- Handles attachments via `AttachmentInfo[]` parameter

### UnifiedMCPOrchestratorService Interface ✅ 
- Compatible with current orchestration patterns
- Returns `MCPOrchestrationResult` with tool results
- Integrates with MCPManager for tool execution

### UnifiedAnalyticsService Interface (Needs Integration)
- Provides comprehensive analytics tracking
- Dashboard and reporting capabilities
- User behavior pattern analysis
- Performance metrics collection

## Next Steps for Integration

1. **Add UnifiedAnalyticsService Import**
   - Import service from `'./core/unified-analytics.service'`
   - Add private instance property
   - Initialize in constructor

2. **Replace Analytics Wrapper**
   - Remove `recordAnalyticsInteraction()` method
   - Update all analytics calls to use unified service
   - Ensure data format compatibility

3. **Update Analytics Data Flow**
   - Map current analytics data to unified service interface
   - Maintain existing logging patterns
   - Add enhanced analytics capabilities

4. **Maintain Backward Compatibility**
   - Ensure no breaking changes to public interfaces
   - Preserve all current functionality
   - Add graceful fallback for analytics failures
