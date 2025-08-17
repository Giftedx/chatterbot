// B4: Comprehensive decision reasoning trace system for debugging and optimization

export interface DecisionTrace {
  id: string;
  timestamp: Date;
  userId: string;
  sessionId: string;
  step: 'initial-decision' | 'strategy-mapping' | 'operation-selection' | 'module-execution' | 'result-evaluation';
  component: string;
  data: any;
  metadata: {
    executionTime?: number;
    confidence?: number;
    success?: boolean;
    errorMessage?: string;
  };
}

export interface DecisionPath {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  initialPrompt: string;
  traces: DecisionTrace[];
  finalResult?: {
    success: boolean;
    response?: string;
    totalExecutionTime: number;
  };
  performance: {
    totalSteps: number;
    successfulSteps: number;
    averageStepTime: number;
    bottleneckSteps: string[];
  };
}

export interface TraceAnalysis {
  commonPatterns: Array<{
    pattern: string;
    frequency: number;
    averagePerformance: number;
  }>;
  performanceInsights: {
    fastestPaths: string[];
    slowestPaths: string[];
    mostReliablePaths: string[];
    optimizationRecommendations: string[];
  };
  errorAnalysis: {
    commonErrors: Array<{ error: string; frequency: number; components: string[] }>;
    errorRecoveryPatterns: Array<{ pattern: string; successRate: number }>;
  };
}

/**
 * B4: Decision reasoning tracer for comprehensive pipeline debugging and optimization
 */
export class DecisionTracer {
  private traces: Map<string, DecisionPath>;
  private maxTraceHistory: number;
  private analysisCache: Map<string, TraceAnalysis>;
  private cacheExpiry: number = 300000; // 5 minutes

  constructor(maxTraceHistory: number = 1000) {
    this.traces = new Map();
    this.maxTraceHistory = maxTraceHistory;
    this.analysisCache = new Map();
  }

  /**
   * B4: Start a new decision session trace
   */
  startSession(userId: string, promptText: string): string {
    const sessionId = this.generateSessionId();
    const path: DecisionPath = {
      sessionId,
      userId,
      startTime: new Date(),
      initialPrompt: promptText,
      traces: [],
      performance: {
        totalSteps: 0,
        successfulSteps: 0,
        averageStepTime: 0,
        bottleneckSteps: []
      }
    };

    this.traces.set(sessionId, path);
    this.cleanupOldTraces();

    console.log('B4: Decision tracing session started', {
      sessionId,
      userId,
      promptLength: promptText.length
    });

    return sessionId;
  }

  /**
   * B4: Add a trace entry to the current session
   */
  addTrace(sessionId: string, trace: Omit<DecisionTrace, 'id' | 'timestamp' | 'sessionId'>): void {
    const path = this.traces.get(sessionId);
    if (!path) {
      console.warn('B4: Cannot add trace - session not found', { sessionId });
      return;
    }

    const fullTrace: DecisionTrace = {
      ...trace,
      id: this.generateTraceId(),
      timestamp: new Date(),
      sessionId
    };

    path.traces.push(fullTrace);
    path.performance.totalSteps++;

    if (fullTrace.metadata.success !== false) {
      path.performance.successfulSteps++;
    }

    // Update performance metrics
    if (fullTrace.metadata.executionTime) {
      const totalTime = path.traces.reduce((sum, t) => sum + (t.metadata.executionTime || 0), 0);
      path.performance.averageStepTime = totalTime / path.traces.length;

      // Identify bottleneck steps (execution time > 2 * average)
      if (fullTrace.metadata.executionTime > path.performance.averageStepTime * 2) {
        path.performance.bottleneckSteps.push(`${fullTrace.component}:${fullTrace.step}`);
      }
    }

    console.log('B4: Decision trace added', {
      sessionId,
      step: fullTrace.step,
      component: fullTrace.component,
      executionTime: fullTrace.metadata.executionTime,
      success: fullTrace.metadata.success !== false
    });
  }

  /**
   * B4: End a decision session and record final result
   */
  endSession(sessionId: string, result: { success: boolean; response?: string }): void {
    const path = this.traces.get(sessionId);
    if (!path) {
      console.warn('B4: Cannot end session - session not found', { sessionId });
      return;
    }

    path.endTime = new Date();
    path.finalResult = {
      ...result,
      totalExecutionTime: path.endTime.getTime() - path.startTime.getTime()
    };

    console.log('B4: Decision tracing session ended', {
      sessionId,
      totalTime: path.finalResult.totalExecutionTime,
      totalSteps: path.performance.totalSteps,
      successRate: `${((path.performance.successfulSteps / path.performance.totalSteps) * 100).toFixed(1)}%`,
      success: result.success
    });

    // Invalidate analysis cache when new session completes
    this.analysisCache.clear();
  }

  /**
   * B4: Get trace history for a specific session
   */
  getSessionTrace(sessionId: string): DecisionPath | undefined {
    return this.traces.get(sessionId);
  }

  /**
   * B4: Get all traces for a user
   */
  getUserTraces(userId: string, limit: number = 10): DecisionPath[] {
    return Array.from(this.traces.values())
      .filter(path => path.userId === userId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  /**
   * B4: Get comprehensive analysis of decision traces
   */
  getTraceAnalysis(timeRangeHours: number = 24): TraceAnalysis {
    const cacheKey = `analysis_${timeRangeHours}`;
    const cached = this.analysisCache.get(cacheKey);
    
    if (cached) {
      console.log('B4: Returning cached trace analysis');
      return cached;
    }

    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const recentPaths = Array.from(this.traces.values())
      .filter(path => path.startTime >= cutoffTime && path.endTime);

    const analysis: TraceAnalysis = {
      commonPatterns: this.analyzeCommonPatterns(recentPaths),
      performanceInsights: this.analyzePerformance(recentPaths),
      errorAnalysis: this.analyzeErrors(recentPaths)
    };

    // Cache the analysis
    this.analysisCache.set(cacheKey, analysis);
    setTimeout(() => this.analysisCache.delete(cacheKey), this.cacheExpiry);

    console.log('B4: Generated fresh trace analysis', {
      pathsAnalyzed: recentPaths.length,
      timeRange: `${timeRangeHours}h`,
      commonPatterns: analysis.commonPatterns.length,
      optimizationRecommendations: analysis.performanceInsights.optimizationRecommendations.length
    });

    return analysis;
  }

  /**
   * B4: Get detailed trace visualization for debugging
   */
  getTraceVisualization(sessionId: string): {
    sessionId: string;
    timeline: Array<{
      timestamp: string;
      step: string;
      component: string;
      duration: number;
      success: boolean;
      data: any;
    }>;
    flowDiagram: string;
    performanceSummary: any;
  } | undefined {
    const path = this.traces.get(sessionId);
    if (!path) return undefined;

    const timeline = path.traces.map(trace => ({
      timestamp: trace.timestamp.toISOString(),
      step: trace.step,
      component: trace.component,
      duration: trace.metadata.executionTime || 0,
      success: trace.metadata.success !== false,
      data: trace.data
    }));

    const flowDiagram = this.generateFlowDiagram(path);

    return {
      sessionId,
      timeline,
      flowDiagram,
      performanceSummary: {
        totalTime: path.finalResult?.totalExecutionTime,
        totalSteps: path.performance.totalSteps,
        successRate: (path.performance.successfulSteps / path.performance.totalSteps * 100).toFixed(1) + '%',
        averageStepTime: path.performance.averageStepTime.toFixed(2) + 'ms',
        bottlenecks: path.performance.bottleneckSteps
      }
    };
  }

  /**
   * B4: Export traces for external analysis
   */
  exportTraces(format: 'json' | 'csv' = 'json', timeRangeHours: number = 24): string {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const recentPaths = Array.from(this.traces.values())
      .filter(path => path.startTime >= cutoffTime);

    if (format === 'json') {
      return JSON.stringify(recentPaths, null, 2);
    } else {
      // CSV format
      const headers = ['sessionId', 'userId', 'startTime', 'endTime', 'totalSteps', 'successRate', 'totalTime'];
      const rows = recentPaths.map(path => [
        path.sessionId,
        path.userId,
        path.startTime.toISOString(),
        path.endTime?.toISOString() || 'incomplete',
        path.performance.totalSteps,
        (path.performance.successfulSteps / path.performance.totalSteps * 100).toFixed(1) + '%',
        path.finalResult?.totalExecutionTime || 'incomplete'
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\\n');
    }
  }

  // B4: Private helper methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupOldTraces(): void {
    if (this.traces.size <= this.maxTraceHistory) return;

    const sortedEntries = Array.from(this.traces.entries())
      .sort((a, b) => b[1].startTime.getTime() - a[1].startTime.getTime());

    // Keep only the most recent traces
    const toKeep = sortedEntries.slice(0, this.maxTraceHistory);
    this.traces.clear();
    toKeep.forEach(([id, path]) => this.traces.set(id, path));

    console.log('B4: Cleaned up old traces', {
      kept: toKeep.length,
      removed: sortedEntries.length - toKeep.length
    });
  }

  private analyzeCommonPatterns(paths: DecisionPath[]): Array<{ pattern: string; frequency: number; averagePerformance: number }> {
    const patternCounts = new Map<string, { count: number; totalTime: number; totalSteps: number }>();

    paths.forEach(path => {
      const pattern = path.traces
        .map(trace => `${trace.step}:${trace.component}`)
        .join(' -> ');

      if (!patternCounts.has(pattern)) {
        patternCounts.set(pattern, { count: 0, totalTime: 0, totalSteps: 0 });
      }

      const stats = patternCounts.get(pattern)!;
      stats.count++;
      stats.totalTime += path.finalResult?.totalExecutionTime || 0;
      stats.totalSteps += path.performance.totalSteps;
    });

    return Array.from(patternCounts.entries())
      .map(([pattern, stats]) => ({
        pattern,
        frequency: stats.count,
        averagePerformance: stats.totalTime / stats.count
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10); // Top 10 patterns
  }

  private analyzePerformance(paths: DecisionPath[]): TraceAnalysis['performanceInsights'] {
    const completedPaths = paths.filter(p => p.finalResult);
    
    // Sort by performance metrics
    const bySpeed = [...completedPaths].sort((a, b) => 
      (a.finalResult?.totalExecutionTime || 0) - (b.finalResult?.totalExecutionTime || 0));
    
    const byReliability = [...completedPaths].sort((a, b) => 
      (b.performance.successfulSteps / b.performance.totalSteps) - 
      (a.performance.successfulSteps / a.performance.totalSteps));

    const fastestPaths = bySpeed.slice(0, 3).map(p => p.sessionId);
    const slowestPaths = bySpeed.slice(-3).map(p => p.sessionId);
    const mostReliablePaths = byReliability.slice(0, 3).map(p => p.sessionId);

    // Generate optimization recommendations
    const recommendations: string[] = [];
    
    const avgTime = completedPaths.reduce((sum, p) => sum + (p.finalResult?.totalExecutionTime || 0), 0) / completedPaths.length;
    const slowPaths = completedPaths.filter(p => (p.finalResult?.totalExecutionTime || 0) > avgTime * 1.5);
    
    if (slowPaths.length > completedPaths.length * 0.2) {
      recommendations.push(`${slowPaths.length} paths are >50% slower than average - investigate bottlenecks`);
    }

    const lowReliabilityPaths = completedPaths.filter(p => 
      p.performance.successfulSteps / p.performance.totalSteps < 0.8);
    
    if (lowReliabilityPaths.length > 0) {
      recommendations.push(`${lowReliabilityPaths.length} paths have <80% success rate - review error handling`);
    }

    return {
      fastestPaths,
      slowestPaths,
      mostReliablePaths,
      optimizationRecommendations: recommendations
    };
  }

  private analyzeErrors(paths: DecisionPath[]): TraceAnalysis['errorAnalysis'] {
    const errorCounts = new Map<string, { count: number; components: Set<string> }>();
    const recoveryPatterns = new Map<string, { attempts: number; successes: number }>();

    paths.forEach(path => {
      path.traces.forEach(trace => {
        if (trace.metadata.errorMessage) {
          const error = trace.metadata.errorMessage;
          if (!errorCounts.has(error)) {
            errorCounts.set(error, { count: 0, components: new Set() });
          }
          errorCounts.get(error)!.count++;
          errorCounts.get(error)!.components.add(trace.component);
        }

        // Analyze recovery patterns
        if (trace.metadata.success === false) {
          const nextTrace = path.traces[path.traces.indexOf(trace) + 1];
          if (nextTrace) {
            const pattern = `${trace.component}->${nextTrace.component}`;
            if (!recoveryPatterns.has(pattern)) {
              recoveryPatterns.set(pattern, { attempts: 0, successes: 0 });
            }
            recoveryPatterns.get(pattern)!.attempts++;
            if (nextTrace.metadata.success !== false) {
              recoveryPatterns.get(pattern)!.successes++;
            }
          }
        }
      });
    });

    const commonErrors = Array.from(errorCounts.entries())
      .map(([error, stats]) => ({
        error,
        frequency: stats.count,
        components: Array.from(stats.components)
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    const errorRecoveryPatterns = Array.from(recoveryPatterns.entries())
      .map(([pattern, stats]) => ({
        pattern,
        successRate: stats.successes / stats.attempts
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    return {
      commonErrors,
      errorRecoveryPatterns
    };
  }

  private generateFlowDiagram(path: DecisionPath): string {
    const steps = path.traces.map(trace => {
      const success = trace.metadata.success !== false ? '✓' : '✗';
      const time = trace.metadata.executionTime ? `(${trace.metadata.executionTime}ms)` : '';
      return `[${trace.step}] ${trace.component} ${success} ${time}`;
    });

    return steps.join(' -> ');
  }
}