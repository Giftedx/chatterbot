/**
 * Merge Intervals Service
 * 
 * Implements the merge intervals algorithm from the refactoring guide
 * to identify and consolidate overlapping functionality across services.
 * 
 * Based on the algorithm provided in the problem statement:
 * 1. Sort intervals based on start times
 * 2. Initialize merged list with first interval
 * 3. Iterate and merge overlapping intervals
 */

export interface ServiceInterval {
  start: number;
  end: number;
  serviceName: string;
  functionality: string[];
  codeLines: number;
  dependencies: string[];
}

export interface MergedServiceResult {
  consolidatedIntervals: ServiceInterval[];
  originalCount: number;
  mergedCount: number;
  duplicateLines: number;
  recommendations: string[];
}

export class MergeIntervalsService {
  
  /**
   * Merge overlapping service intervals using the algorithm from the refactoring guide
   */
  mergeServiceIntervals(intervals: ServiceInterval[]): ServiceInterval[] {
    if (!intervals || intervals.length === 0) {
      return [];
    }

    // Sort the intervals based on their start times
    intervals.sort((a, b) => a.start - b.start);

    const merged: ServiceInterval[] = [intervals[0]];
    
    for (let i = 1; i < intervals.length; i++) {
      const currentInterval = intervals[i];
      const lastMergedInterval = merged[merged.length - 1];

      if (currentInterval.start <= lastMergedInterval.end) {
        // Overlapping intervals, merge them
        lastMergedInterval.end = Math.max(lastMergedInterval.end, currentInterval.end);
        
        // Combine functionality and dependencies
        lastMergedInterval.functionality = [
          ...new Set([...lastMergedInterval.functionality, ...currentInterval.functionality])
        ];
        lastMergedInterval.dependencies = [
          ...new Set([...lastMergedInterval.dependencies, ...currentInterval.dependencies])
        ];
        lastMergedInterval.codeLines += currentInterval.codeLines;
        lastMergedInterval.serviceName = `${lastMergedInterval.serviceName} + ${currentInterval.serviceName}`;
      } else {
        // Non-overlapping interval, add it to the list
        merged.push(currentInterval);
      }
    }

    return merged;
  }

  /**
   * Analyze services for overlapping functionality and provide consolidation recommendations
   */
  analyzeServiceOverlaps(services: ServiceInterval[]): MergedServiceResult {
    const originalCount = services.length;
    const merged = this.mergeServiceIntervals([...services]);
    const mergedCount = merged.length;
    
    // Calculate duplicate lines saved
    const duplicateLines = this.calculateDuplicateLines(services);

    const recommendations = this.generateConsolidationRecommendations(services, merged);

    return {
      consolidatedIntervals: merged,
      originalCount,
      mergedCount,
      duplicateLines,
      recommendations
    };
  }

  /**
   * Generate specific recommendations based on the analysis
   */
  private generateConsolidationRecommendations(
    original: ServiceInterval[], 
    merged: ServiceInterval[]
  ): string[] {
    const recommendations: string[] = [];
    
    const consolidationRatio = (original.length - merged.length) / original.length;
    
    if (consolidationRatio > 0.3) {
      recommendations.push('High overlap detected - significant consolidation opportunity');
    }
    
    if (consolidationRatio > 0.5) {
      recommendations.push('Critical overlap - prioritize immediate consolidation');
    }

    // Find common functionality patterns
    const functionalityMap = new Map<string, number>();
    original.forEach(service => {
      service.functionality.forEach(func => {
        functionalityMap.set(func, (functionalityMap.get(func) || 0) + 1);
      });
    });

    functionalityMap.forEach((count, func) => {
      if (count > 1) {
        recommendations.push(`Duplicate functionality "${func}" found in ${count} services`);
      }
    });

    // Find dependency overlaps
    const dependencyMap = new Map<string, number>();
    original.forEach(service => {
      service.dependencies.forEach(dep => {
        dependencyMap.set(dep, (dependencyMap.get(dep) || 0) + 1);
      });
    });

    dependencyMap.forEach((count, dep) => {
      if (count > 2) {
        recommendations.push(`Shared dependency "${dep}" - candidate for extraction to shared service`);
      }
    });

    return recommendations;
  }

  /**
   * Identify code smells based on the refactoring guide criteria
   */
  identifyCodeSmells(services: ServiceInterval[]): {
    duplicateCode: string[];
    largeClasses: string[];
    excessiveDependencies: string[];
    complexServices: string[];
  } {
    const duplicateCode: string[] = [];
    const largeClasses: string[] = [];
    const excessiveDependencies: string[] = [];
    const complexServices: string[] = [];

    services.forEach(service => {
      // Large classes (>500 lines)
      if (service.codeLines > 500) {
        largeClasses.push(`${service.serviceName}: ${service.codeLines} lines`);
      }

      // Excessive dependencies (>10)
      if (service.dependencies.length > 10) {
        excessiveDependencies.push(`${service.serviceName}: ${service.dependencies.length} dependencies`);
      }

      // Complex services (multiple overlapping functionalities)
      if (service.functionality.length > 8) {
        complexServices.push(`${service.serviceName}: ${service.functionality.length} responsibilities`);
      }
    });

    // Detect duplicate functionality
    const functionalityCount = new Map<string, string[]>();
    services.forEach(service => {
      service.functionality.forEach(func => {
        if (!functionalityCount.has(func)) {
          functionalityCount.set(func, []);
        }
        functionalityCount.get(func)!.push(service.serviceName);
      });
    });

    functionalityCount.forEach((serviceNames, func) => {
      if (serviceNames.length > 1) {
        duplicateCode.push(`"${func}" duplicated in: ${serviceNames.join(', ')}`);
      }
    });

    return {
      duplicateCode,
      largeClasses,
      excessiveDependencies,
      complexServices
    };
  }
}

// Singleton instance
export const mergeIntervalsService = new MergeIntervalsService();