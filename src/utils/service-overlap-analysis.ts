/**
 * Service Overlap Analysis
 * 
 * Analyzes the current codebase to identify remaining overlapping services
 * and applies the merge intervals algorithm to provide consolidation recommendations.
 */

import { ServiceInterval, mergeIntervalsService } from '../utils/merge-intervals.service.js';

// Define current service intervals based on codebase analysis
const currentServices: ServiceInterval[] = [
  // Core Services (already consolidated)
  {
    start: 1,
    end: 50,
    serviceName: 'UnifiedMessageAnalysisService',
    functionality: ['message-analysis', 'intent-detection', 'complexity-analysis', 'attachment-processing'],
    codeLines: 474,
    dependencies: ['discord.js', 'utils']
  },
  {
    start: 51,
    end: 100,
    serviceName: 'UnifiedMCPOrchestratorService', 
    functionality: ['mcp-coordination', 'tool-execution', 'fallback-handling', 'performance-monitoring'],
    codeLines: 650,
    dependencies: ['mcp-sdk', 'utils', 'cache']
  },
  {
    start: 101,
    end: 150,
    serviceName: 'UnifiedCacheService',
    functionality: ['caching', 'memory-management', 'ttl-handling', 'performance-tracking'],
    codeLines: 320,
    dependencies: ['utils']
  },

  // Intelligence Services
  {
    start: 200,
    end: 350,
    serviceName: 'UnifiedIntelligenceService',
    functionality: ['conversation-handling', 'response-generation', 'permission-management', 'context-building'],
    codeLines: 580,
    dependencies: ['gemini', 'discord.js', 'core-services', 'intelligence-modules']
  },
  {
    start: 300,
    end: 500,
    serviceName: 'EnhancedInvisibleIntelligenceService',
    functionality: ['advanced-processing', 'mcp-integration', 'context-building', 'response-generation'],
    codeLines: 750,
    dependencies: ['gemini', 'discord.js', 'core-services', 'mcp-tools']
  },
  {
    start: 450,
    end: 600,
    serviceName: 'AgenticIntelligenceService',
    functionality: ['knowledge-base', 'escalation-handling', 'confidence-scoring', 'response-generation'],
    codeLines: 420,
    dependencies: ['gemini', 'discord.js', 'core-services', 'knowledge-base']
  },

  // Moderation Services (potential overlap)
  {
    start: 700,
    end: 850,
    serviceName: 'ModerationService',
    functionality: ['content-filtering', 'rule-enforcement', 'incident-logging', 'analytics'],
    codeLines: 480,
    dependencies: ['discord.js', 'prisma', 'utils']
  },
  {
    start: 800,
    end: 950,
    serviceName: 'IncidentService',
    functionality: ['incident-logging', 'analytics', 'reporting', 'user-tracking'],
    codeLines: 380,
    dependencies: ['prisma', 'utils', 'logging']
  },
  {
    start: 900,
    end: 1000,
    serviceName: 'SmartFlaggingService',
    functionality: ['content-analysis', 'rule-enforcement', 'escalation-handling', 'analytics'],
    codeLines: 240,
    dependencies: ['ai-services', 'utils', 'moderation']
  },

  // Multimodal Services (potential overlap)
  {
    start: 1100,
    end: 1300,
    serviceName: 'ImageAnalysisService',
    functionality: ['image-processing', 'content-analysis', 'metadata-extraction', 'database-storage'],
    codeLines: 520,
    dependencies: ['ai-vision', 'prisma', 'file-handling']
  },
  {
    start: 1200,
    end: 1400,
    serviceName: 'AudioAnalysisService',
    functionality: ['audio-processing', 'transcription', 'metadata-extraction', 'database-storage'],
    codeLines: 670,
    dependencies: ['ai-audio', 'prisma', 'file-handling']
  },
  {
    start: 1300,
    end: 1500,
    serviceName: 'DocumentProcessingService',
    functionality: ['document-parsing', 'content-extraction', 'metadata-extraction', 'database-storage'],
    codeLines: 590,
    dependencies: ['document-parsers', 'prisma', 'file-handling']
  },

  // Analytics Services (potential overlap)
  {
    start: 1600,
    end: 1750,
    serviceName: 'AnalyticsService',
    functionality: ['data-collection', 'metrics-tracking', 'performance-monitoring', 'reporting'],
    codeLines: 350,
    dependencies: ['prisma', 'utils', 'metrics']
  },
  {
    start: 1700,
    end: 1850,
    serviceName: 'AnalyticsDashboardService',
    functionality: ['data-visualization', 'metrics-tracking', 'performance-monitoring', 'reporting'],
    codeLines: 280,
    dependencies: ['analytics', 'ui-components', 'metrics']
  }
];

/**
 * Analyze current service overlaps and generate consolidation plan
 */
export function analyzeServiceOverlaps() {
  console.log('🔍 Analyzing Service Overlaps Using Merge Intervals Algorithm\n');
  
  // Step 1: Identify code smells
  const codeSmells = mergeIntervalsService.identifyCodeSmells(currentServices);
  
  console.log('📊 Code Smells Identified:');
  console.log('==========================');
  
  if (codeSmells.duplicateCode.length > 0) {
    console.log('🔄 Duplicate Code:');
    codeSmells.duplicateCode.forEach(item => console.log(`  - ${item}`));
    console.log();
  }
  
  if (codeSmells.largeClasses.length > 0) {
    console.log('📏 Large Classes/Services:');
    codeSmells.largeClasses.forEach(item => console.log(`  - ${item}`));
    console.log();
  }
  
  if (codeSmells.excessiveDependencies.length > 0) {
    console.log('🔗 Excessive Dependencies:');
    codeSmells.excessiveDependencies.forEach(item => console.log(`  - ${item}`));
    console.log();
  }
  
  if (codeSmells.complexServices.length > 0) {
    console.log('🧩 Complex Services:');
    codeSmells.complexServices.forEach(item => console.log(`  - ${item}`));
    console.log();
  }

  // Step 2: Apply merge intervals algorithm
  const analysis = mergeIntervalsService.analyzeServiceOverlaps(currentServices);
  
  console.log('🔀 Merge Intervals Analysis Results:');
  console.log('====================================');
  console.log(`Original Services: ${analysis.originalCount}`);
  console.log(`After Consolidation: ${analysis.mergedCount}`);
  console.log(`Potential Line Reduction: ${analysis.duplicateLines} lines`);
  console.log(`Consolidation Ratio: ${((analysis.originalCount - analysis.mergedCount) / analysis.originalCount * 100).toFixed(1)}%\n`);
  
  console.log('📋 Consolidation Recommendations:');
  console.log('==================================');
  analysis.recommendations.forEach(rec => console.log(`  - ${rec}`));
  console.log();
  
  // Step 3: Show consolidated intervals
  console.log('🎯 Suggested Consolidated Services:');
  console.log('===================================');
  analysis.consolidatedIntervals.forEach((interval, index) => {
    console.log(`${index + 1}. ${interval.serviceName}`);
    console.log(`   Range: ${interval.start}-${interval.end}`);
    console.log(`   Lines: ${interval.codeLines}`);
    console.log(`   Functionality: ${interval.functionality.join(', ')}`);
    console.log(`   Dependencies: ${interval.dependencies.length} total`);
    console.log();
  });

  return analysis;
}

// Export for use in other modules
export { currentServices };