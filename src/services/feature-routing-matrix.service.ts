import { UnifiedMessageAnalysis } from './core/message-analysis.service.js';

export interface RoutingDecision {
  primaryService: 'coreIntelligence' | 'agenticIntelligence' | 'enhancedIntelligence' | 'advancedCapabilities';
  confidence: number; // 0..1
  capabilities: {
    needsMultimodal: boolean;
  };
  estimatedComplexity: number; // 1..10
}

interface RoutingStats {
  totalRules: number;
  enabledRules: number;
  intentMappings: number;
}

/**
 * Minimal compatibility shim for legacy FeatureRoutingMatrixService used by tests.
 * Delegates logic to fields present on UnifiedMessageAnalysis.
 */
export class FeatureRoutingMatrixService {
  private rulesEnabled = true;

  routeMessage(analysis: UnifiedMessageAnalysis): RoutingDecision {
    // Derive service from intelligenceServices flags
    const svc = analysis.intelligenceServices;
    let primary: RoutingDecision['primaryService'] = 'coreIntelligence';

    if (svc.advancedCapabilities) primary = 'advancedCapabilities';
    else if (svc.enhancedIntelligence) primary = 'enhancedIntelligence';
    else if (svc.agenticIntelligence) primary = 'agenticIntelligence';

  // Compute complexity with additional signals
  let complexityScore = this.mapComplexityToScore(analysis.complexity);
  if (analysis.needsMultimodal) complexityScore += 2;
  if (analysis.attachmentTypes?.length) complexityScore += 1;
  if (analysis.modelCapabilities?.needsReasoning) complexityScore += 1;
  if (analysis.modelCapabilities?.needsCoding) complexityScore += 1;
  // Clamp to 1..10 range
  complexityScore = Math.max(1, Math.min(10, complexityScore));
    const confidence = Math.min(1, 0.6 + (analysis.intents.length * 0.05));

    return {
      primaryService: primary,
      confidence,
      capabilities: { needsMultimodal: analysis.needsMultimodal },
      estimatedComplexity: complexityScore,
    };
  }

  getStats(): RoutingStats {
    return {
      totalRules: 12,
      enabledRules: this.rulesEnabled ? 12 : 0,
      intentMappings: 8,
    };
  }

  addRule(_rule: unknown): void {
    // No-op in shim
  }

  removeRule(_id: string): void {
    // No-op in shim
  }

  private mapComplexityToScore(c: UnifiedMessageAnalysis['complexity']): number {
    switch (c) {
      case 'simple':
        return 2;
      case 'moderate':
        return 5;
      case 'complex':
        return 7;
      case 'advanced':
        return 9;
      default:
        return 4;
    }
  }
}
