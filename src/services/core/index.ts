/**
 * Core Services Index
 * 
 * Exports all unified core services that replace overlapping functionality
 * across the intelligence system. These services provide a clean, consistent
 * API for all intelligence tiers.
 */

// Unified core services
export { UnifiedMessageAnalysisService, unifiedMessageAnalysisService } from './message-analysis.service.js';
export { UnifiedMCPOrchestratorService, mcpOrchestratorService } from './mcp-orchestrator.service.js';
export { UnifiedCacheService, unifiedCacheService } from './cache.service.js';
export { UnifiedAnalyticsService, unifiedAnalyticsService } from './unified-analytics.service.js';

// Re-export types for easier consumption
export type { 
  UnifiedMessageAnalysis,
  AttachmentAnalysis,
  AttachmentInfo
} from './message-analysis.service.js';

export type {
  MCPToolResult,
  MCPToolDefinition,
  MCPExecutionContext,
  MCPOrchestrationResult,
  MCPPhaseConfiguration
} from './mcp-orchestrator.service.js';

export type {
  CacheEntry,
  CacheOptions,
  CacheStats
} from './cache.service.js';

export type {
  InteractionLog,
  DetailedStats,
  UsageMetrics,
  DashboardConfig,
  AnalyticsOptions
} from './unified-analytics.service.js';
