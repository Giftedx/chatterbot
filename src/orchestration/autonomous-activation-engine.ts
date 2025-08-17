/**
 * Autonomous Feature Activation Engine
 * Policy-governed autonomous system that selectively enables capabilities
 * at inference time based on context, performance, and strategic reasoning
 */

import { logger } from '../utils/logger.js';
import {
  capabilityRegistry,
  CapabilityMetadata,
  CapabilityState,
} from './autonomous-capability-registry.js';

export interface ActivationContext {
  messageContent: string;
  userIntent: string[];
  conversationHistory: string[];
  currentCapabilities: string[];
  performanceConstraints: {
    maxLatency?: number;
    maxMemory?: string;
    maxCpu?: string;
  };
  qualityRequirements: {
    accuracy: 'low' | 'medium' | 'high';
    freshness: 'any' | 'recent' | 'current';
    depth: 'shallow' | 'moderate' | 'deep';
  };
}

export interface ActivationDecision {
  capabilityId: string;
  action: 'activate' | 'deactivate' | 'maintain';
  confidence: number; // 0-1
  reasoning: string;
  expectedBenefit: number; // 0-1
  estimatedCost: number; // 0-1
  priority: number; // 0-1
  fallbacks?: string[];
}

export interface ActivationPolicy {
  id: string;
  name: string;
  description: string;
  priority: number;
  conditions: PolicyCondition[];
  actions: PolicyAction[];
  enabled: boolean;
}

export interface PolicyCondition {
  type: 'context_match' | 'capability_health' | 'performance_threshold' | 'custom';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists';
  field: string;
  value: any;
  weight?: number;
}

export interface PolicyAction {
  type: 'activate' | 'deactivate' | 'prefer' | 'avoid';
  target: string | string[];
  condition?: 'success' | 'failure' | 'timeout';
  parameters?: Record<string, any>;
}

export class AutonomousActivationEngine {
  private policies: Map<string, ActivationPolicy> = new Map();
  private activationHistory: ActivationDecision[] = [];
  private performanceMetrics = new Map<
    string,
    {
      avgBenefit: number;
      avgCost: number;
      successRate: number;
      activationCount: number;
    }
  >();

  constructor() {
    this.initializeDefaultPolicies();
    logger.info('Autonomous Activation Engine initialized');
  }

  private initializeDefaultPolicies(): void {
    // Core Intelligence Policy - Always active
    this.addPolicy({
      id: 'core-intelligence-mandatory',
      name: 'Core Intelligence Always Active',
      description: 'Ensures core intelligence service is always active',
      priority: 1000,
      conditions: [
        { type: 'capability_health', operator: 'exists', field: 'core-intelligence', value: true },
      ],
      actions: [{ type: 'activate', target: 'core-intelligence' }],
      enabled: true,
    });

    // Performance-Conscious Activation
    this.addPolicy({
      id: 'performance-optimization',
      name: 'Performance-First Activation',
      description: 'Prefer low-impact capabilities when performance is constrained',
      priority: 800,
      conditions: [
        { type: 'performance_threshold', operator: 'less_than', field: 'maxLatency', value: 5000 },
      ],
      actions: [
        { type: 'prefer', target: ['semantic-cache', 'web-search'] },
        { type: 'avoid', target: ['multimodal-analysis', 'knowledge-graph'] },
      ],
      enabled: true,
    });

    // Quality-First Policy
    this.addPolicy({
      id: 'quality-enhancement',
      name: 'Quality Enhancement Policy',
      description: 'Activate advanced capabilities for high-quality requirements',
      priority: 700,
      conditions: [
        {
          type: 'context_match',
          operator: 'equals',
          field: 'qualityRequirements.accuracy',
          value: 'high',
        },
      ],
      actions: [
        { type: 'activate', target: ['advanced-reasoning', 'web-search', 'content-extraction'] },
      ],
      enabled: true,
    });

    // Contextual Intelligence Activation
    this.addPolicy({
      id: 'contextual-intelligence',
      name: 'Context-Aware Feature Activation',
      description: 'Activate capabilities based on detected user intent',
      priority: 600,
      conditions: [
        {
          type: 'context_match',
          operator: 'contains',
          field: 'userIntent',
          value: 'factual_query',
        },
      ],
      actions: [
        { type: 'activate', target: 'web-search' },
        { type: 'prefer', target: 'semantic-cache' },
      ],
      enabled: true,
    });

    this.addPolicy({
      id: 'visual-content-policy',
      name: 'Visual Content Analysis Policy',
      description: 'Activate multimodal analysis for image/document content',
      priority: 650,
      conditions: [
        { type: 'context_match', operator: 'contains', field: 'messageContent', value: 'image' },
        {
          type: 'capability_health',
          operator: 'greater_than',
          field: 'multimodal-analysis.healthScore',
          value: 0.7,
        },
      ],
      actions: [{ type: 'activate', target: 'multimodal-analysis' }],
      enabled: true,
    });

    // Fallback and Recovery Policy
    this.addPolicy({
      id: 'fallback-activation',
      name: 'Intelligent Fallback Policy',
      description: 'Activate fallback capabilities when primary ones fail',
      priority: 900,
      conditions: [
        { type: 'capability_health', operator: 'less_than', field: 'healthScore', value: 0.3 },
      ],
      actions: [
        { type: 'deactivate', target: 'failed_capability', condition: 'failure' },
        { type: 'activate', target: 'fallback_capabilities' },
      ],
      enabled: true,
    });

    // Resource Conservation Policy
    this.addPolicy({
      id: 'resource-conservation',
      name: 'Resource Conservation Policy',
      description: 'Deactivate resource-intensive capabilities during high load',
      priority: 500,
      conditions: [
        {
          type: 'performance_threshold',
          operator: 'greater_than',
          field: 'systemLoad',
          value: 0.8,
        },
      ],
      actions: [
        {
          type: 'deactivate',
          target: ['vector-storage', 'knowledge-graph', 'temporal-orchestration'],
        },
      ],
      enabled: true,
    });

    logger.info(`Initialized ${this.policies.size} activation policies`);
  }

  addPolicy(policy: ActivationPolicy): void {
    this.policies.set(policy.id, policy);
  }

  removePolicy(policyId: string): void {
    this.policies.delete(policyId);
  }

  /**
   * Main decision engine - analyzes context and decides which capabilities to activate
   */
  async decideActivations(context: ActivationContext): Promise<ActivationDecision[]> {
    const decisions: ActivationDecision[] = [];
    const availableCapabilities = capabilityRegistry.getAllCapabilities();

    // Analyze each capability
    for (const capability of availableCapabilities) {
      const decision = await this.evaluateCapability(capability, context);
      decisions.push(decision);
    }

    // Apply policy-based adjustments
    const policyAdjustedDecisions = await this.applyPolicies(decisions, context);

    // Optimize based on constraints and dependencies
    const optimizedDecisions = await this.optimizeActivations(policyAdjustedDecisions, context);

    // Log decisions for learning
    this.logDecisions(optimizedDecisions, context);

    return optimizedDecisions;
  }

  private async evaluateCapability(
    capability: CapabilityMetadata,
    context: ActivationContext,
  ): Promise<ActivationDecision> {
    const state = capabilityRegistry.getCapabilityState(capability.id);

    // Base evaluation
    let confidence = 0.5;
    let expectedBenefit = 0.0;
    let estimatedCost = 0.0;
    let reasoning = '';

    // Context matching
    const contextScore = this.calculateContextScore(capability, context);
    confidence += contextScore * 0.3;
    expectedBenefit += contextScore;

    if (contextScore > 0.7) {
      reasoning += `High context relevance (${contextScore.toFixed(2)}). `;
    }

    // Health and reliability assessment
    const healthScore = state?.healthScore || 1.0;
    confidence += healthScore * 0.2;
    expectedBenefit *= healthScore;

    if (healthScore < 0.5) {
      reasoning += `Low health score (${healthScore.toFixed(2)}). `;
    }

    // Performance impact assessment
    const performanceImpact = this.calculatePerformanceImpact(capability, context);
    estimatedCost = performanceImpact;
    confidence -= performanceImpact * 0.15;

    if (performanceImpact > 0.7) {
      reasoning += `High performance impact (${performanceImpact.toFixed(2)}). `;
    }

    // Dependency analysis
    const dependencyScore = await this.evaluateDependencies(capability);
    confidence += dependencyScore * 0.15;

    if (dependencyScore < 0.3) {
      reasoning += `Dependency issues detected. `;
    }

    // Quality requirements alignment
    const qualityAlignment = this.calculateQualityAlignment(capability, context);
    expectedBenefit += qualityAlignment * 0.3;

    // Historical performance
    const historicalScore = this.getHistoricalPerformance(capability.id);
    confidence += historicalScore * 0.1;

    // Determine action based on evaluation
    let action: 'activate' | 'deactivate' | 'maintain' = 'maintain';

    if (capability.priority === 'critical') {
      action = 'activate';
      reasoning += 'Critical capability. ';
    } else if (expectedBenefit > 0.6 && confidence > 0.6 && estimatedCost < 0.8) {
      action = 'activate';
      reasoning += 'High benefit, good confidence, acceptable cost. ';
    } else if (expectedBenefit < 0.3 || confidence < 0.4) {
      action = 'deactivate';
      reasoning += 'Low benefit or confidence. ';
    } else if (state?.status === 'failed' || healthScore < 0.3) {
      action = 'deactivate';
      reasoning += 'Health issues detected. ';
    }

    // Handle fallbacks
    const fallbacks = capability.fallbackCapabilities || [];

    return {
      capabilityId: capability.id,
      action,
      confidence: Math.min(Math.max(confidence, 0), 1),
      reasoning: reasoning.trim(),
      expectedBenefit: Math.min(Math.max(expectedBenefit, 0), 1),
      estimatedCost: Math.min(Math.max(estimatedCost, 0), 1),
      priority: this.calculatePriority(capability, context),
      fallbacks: fallbacks.length > 0 ? fallbacks : undefined,
    };
  }

  private calculateContextScore(
    capability: CapabilityMetadata,
    context: ActivationContext,
  ): number {
    let score = 0.0;

    // Check suitable contexts
    const suitableContexts = capability.contexts.suitable;
    if (suitableContexts.includes('all')) {
      score += 0.5;
    } else {
      for (const intent of context.userIntent) {
        if (suitableContexts.some((suitable) => intent.includes(suitable))) {
          score += 0.3;
        }
      }
    }

    // Check message content relevance
    const messageContent = context.messageContent.toLowerCase();
    if (capability.inputs.some((input) => messageContent.includes(input.toLowerCase()))) {
      score += 0.3;
    }

    // Check inappropriate contexts
    const inappropriateContexts = capability.contexts.inappropriate;
    for (const intent of context.userIntent) {
      if (inappropriateContexts.some((inappropriate) => intent.includes(inappropriate))) {
        score -= 0.5;
      }
    }

    return Math.min(Math.max(score, 0), 1);
  }

  private calculatePerformanceImpact(
    capability: CapabilityMetadata,
    context: ActivationContext,
  ): number {
    const impact = capability.contexts.performance_impact;
    const constraints = context.performanceConstraints;

    let score = 0.0;

    switch (impact) {
      case 'none':
        score = 0.0;
        break;
      case 'low':
        score = 0.2;
        break;
      case 'medium':
        score = 0.5;
        break;
      case 'high':
        score = 0.8;
        break;
    }

    // Adjust based on constraints
    if (constraints.maxLatency && constraints.maxLatency < 3000) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private async evaluateDependencies(capability: CapabilityMetadata): Promise<number> {
    let score = 1.0;

    // Check hard dependencies
    for (const dep of capability.dependencies) {
      const depState = capabilityRegistry.getCapabilityState(dep);
      if (!depState || depState.status !== 'active') {
        score -= 0.3;
      }
    }

    // Check soft dependencies
    for (const softDep of capability.softDependencies) {
      const depState = capabilityRegistry.getCapabilityState(softDep);
      if (!depState || depState.status !== 'active') {
        score -= 0.1;
      }
    }

    return Math.min(Math.max(score, 0), 1);
  }

  private calculateQualityAlignment(
    capability: CapabilityMetadata,
    context: ActivationContext,
  ): number {
    const requirements = context.qualityRequirements;
    let alignment = 0.0;

    // Match quality requirements with capability characteristics
    if (requirements.accuracy === 'high' && capability.contexts.reliability === 'stable') {
      alignment += 0.4;
    }

    if (requirements.freshness === 'current' && capability.id === 'web-search') {
      alignment += 0.4;
    }

    if (requirements.depth === 'deep' && capability.category === 'intelligence') {
      alignment += 0.2;
    }

    return Math.min(alignment, 1.0);
  }

  private getHistoricalPerformance(capabilityId: string): number {
    const metrics = this.performanceMetrics.get(capabilityId);
    if (!metrics) return 0.5; // Neutral for new capabilities

    return (metrics.avgBenefit + metrics.successRate) / 2;
  }

  private calculatePriority(capability: CapabilityMetadata, context: ActivationContext): number {
    let priority = 0.5;

    switch (capability.priority) {
      case 'critical':
        priority = 1.0;
        break;
      case 'high':
        priority = 0.8;
        break;
      case 'medium':
        priority = 0.5;
        break;
      case 'low':
        priority = 0.2;
        break;
    }

    // Adjust based on context urgency
    if (
      context.performanceConstraints.maxLatency &&
      context.performanceConstraints.maxLatency < 2000
    ) {
      priority += 0.2;
    }

    return Math.min(priority, 1.0);
  }

  private async applyPolicies(
    decisions: ActivationDecision[],
    context: ActivationContext,
  ): Promise<ActivationDecision[]> {
    const sortedPolicies = Array.from(this.policies.values())
      .filter((policy) => policy.enabled)
      .sort((a, b) => b.priority - a.priority);

    let adjustedDecisions = [...decisions];

    for (const policy of sortedPolicies) {
      if (await this.evaluatePolicyConditions(policy, context)) {
        adjustedDecisions = this.applyPolicyActions(policy, adjustedDecisions);
      }
    }

    return adjustedDecisions;
  }

  private async evaluatePolicyConditions(
    policy: ActivationPolicy,
    context: ActivationContext,
  ): Promise<boolean> {
    for (const condition of policy.conditions) {
      if (!(await this.evaluateCondition(condition, context))) {
        return false;
      }
    }
    return true;
  }

  private async evaluateCondition(
    condition: PolicyCondition,
    context: ActivationContext,
  ): Promise<boolean> {
    // Implementation would evaluate various condition types
    // This is a simplified version
    switch (condition.type) {
      case 'context_match':
        const value = this.getNestedValue(context, condition.field);
        return this.compareValues(value, condition.value, condition.operator);
      case 'capability_health':
        const capId = condition.field;
        const state = capabilityRegistry.getCapabilityState(capId);
        return state
          ? this.compareValues(state.healthScore, condition.value, condition.operator)
          : false;
      default:
        return true;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private compareValues(actual: any, expected: any, operator: string): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'contains':
        if (Array.isArray(actual)) return actual.includes(expected);
        if (typeof actual === 'string') return actual.includes(expected);
        return false;
      case 'greater_than':
        return actual > expected;
      case 'less_than':
        return actual < expected;
      case 'exists':
        return actual !== undefined && actual !== null;
      default:
        return false;
    }
  }

  private applyPolicyActions(
    policy: ActivationPolicy,
    decisions: ActivationDecision[],
  ): ActivationDecision[] {
    const adjustedDecisions = [...decisions];

    for (const action of policy.actions) {
      const targets = Array.isArray(action.target) ? action.target : [action.target];

      for (const target of targets) {
        const decision = adjustedDecisions.find((d) => d.capabilityId === target);
        if (decision) {
          switch (action.type) {
            case 'activate':
              decision.action = 'activate';
              decision.confidence = Math.max(decision.confidence, 0.8);
              decision.reasoning += ` Policy ${policy.name} enforced activation.`;
              break;
            case 'deactivate':
              decision.action = 'deactivate';
              decision.reasoning += ` Policy ${policy.name} enforced deactivation.`;
              break;
            case 'prefer':
              decision.priority += 0.2;
              decision.expectedBenefit += 0.1;
              break;
            case 'avoid':
              decision.priority -= 0.2;
              decision.estimatedCost += 0.1;
              break;
          }
        }
      }
    }

    return adjustedDecisions;
  }

  private async optimizeActivations(
    decisions: ActivationDecision[],
    context: ActivationContext,
  ): Promise<ActivationDecision[]> {
    // Sort by priority and benefit
    const sortedDecisions = decisions.sort((a, b) => {
      const scoreA = a.priority * 0.4 + a.expectedBenefit * 0.6 - a.estimatedCost * 0.3;
      const scoreB = b.priority * 0.4 + b.expectedBenefit * 0.6 - b.estimatedCost * 0.3;
      return scoreB - scoreA;
    });

    // Apply resource constraints
    let totalEstimatedCost = 0;
    const constraintLimit = this.calculateResourceLimit(context);

    for (const decision of sortedDecisions) {
      if (decision.action === 'activate') {
        totalEstimatedCost += decision.estimatedCost;

        if (totalEstimatedCost > constraintLimit) {
          decision.action = 'deactivate';
          decision.reasoning += ' Resource constraints exceeded.';
        }
      }
    }

    return sortedDecisions;
  }

  private calculateResourceLimit(context: ActivationContext): number {
    // Base limit
    let limit = 1.0;

    // Adjust based on performance constraints
    if (
      context.performanceConstraints.maxLatency &&
      context.performanceConstraints.maxLatency < 5000
    ) {
      limit *= 0.7;
    }

    return limit;
  }

  private logDecisions(decisions: ActivationDecision[], context: ActivationContext): void {
    this.activationHistory.push(...decisions);

    // Keep only recent history
    if (this.activationHistory.length > 1000) {
      this.activationHistory = this.activationHistory.slice(-1000);
    }

    logger.info(`Activation decisions made: ${decisions.length} capabilities evaluated`);
  }

  /**
   * Execute activation decisions by interfacing with capability services
   */
  async executeActivations(decisions: ActivationDecision[]): Promise<void> {
    const activations = decisions.filter((d) => d.action === 'activate');
    const deactivations = decisions.filter((d) => d.action === 'deactivate');

    // Execute deactivations first
    for (const decision of deactivations) {
      await this.deactivateCapability(decision.capabilityId, decision.reasoning);
    }

    // Execute activations with dependency order
    const sortedActivations = this.sortByDependencies(activations);
    for (const decision of sortedActivations) {
      await this.activateCapability(decision.capabilityId, decision.reasoning);
    }
  }

  private async activateCapability(capabilityId: string, reasoning: string): Promise<void> {
    try {
      const capability = capabilityRegistry.getCapability(capabilityId);
      const state = capabilityRegistry.getCapabilityState(capabilityId);

      if (!capability || !state) {
        logger.warn(`Cannot activate unknown capability: ${capabilityId}`);
        return;
      }

      if (state.status === 'active') {
        return; // Already active
      }

      logger.info(`Activating capability: ${capabilityId} - ${reasoning}`);

      capabilityRegistry.updateCapabilityState(capabilityId, {
        status: 'initializing',
        lastActivated: new Date(),
      });

      // This would interface with actual capability services
      // For now, we'll simulate activation
      await new Promise((resolve) => setTimeout(resolve, 100));

      capabilityRegistry.updateCapabilityState(capabilityId, {
        status: 'active',
        activationCount: (state.activationCount || 0) + 1,
      });

      capabilityRegistry.logActivation(capabilityId, 'activate', [], reasoning);

      logger.info(`✅ Capability activated: ${capabilityId}`);
    } catch (error) {
      logger.error(`Failed to activate capability ${capabilityId}:`, error);

      capabilityRegistry.updateCapabilityState(capabilityId, {
        status: 'failed',
        failureCount: (capabilityRegistry.getCapabilityState(capabilityId)?.failureCount || 0) + 1,
      });
    }
  }

  private async deactivateCapability(capabilityId: string, reasoning: string): Promise<void> {
    try {
      const state = capabilityRegistry.getCapabilityState(capabilityId);
      if (!state || state.status === 'inactive') {
        return; // Already inactive
      }

      logger.info(`Deactivating capability: ${capabilityId} - ${reasoning}`);

      capabilityRegistry.updateCapabilityState(capabilityId, {
        status: 'inactive',
        lastDeactivated: new Date(),
      });

      capabilityRegistry.logActivation(capabilityId, 'deactivate', [], reasoning);

      logger.info(`⏹ Capability deactivated: ${capabilityId}`);
    } catch (error) {
      logger.error(`Failed to deactivate capability ${capabilityId}:`, error);
    }
  }

  private sortByDependencies(decisions: ActivationDecision[]): ActivationDecision[] {
    // Simple dependency sorting - would be more sophisticated in practice
    return decisions.sort((a, b) => {
      const capA = capabilityRegistry.getCapability(a.capabilityId);
      const capB = capabilityRegistry.getCapability(b.capabilityId);

      const depsA = capA?.dependencies.length || 0;
      const depsB = capB?.dependencies.length || 0;

      return depsA - depsB; // Capabilities with fewer dependencies first
    });
  }

  // Public methods for external control

  getAllPolicies(): ActivationPolicy[] {
    return Array.from(this.policies.values());
  }

  getActivationHistory(): ActivationDecision[] {
    return this.activationHistory.slice(-100); // Last 100 decisions
  }

  getPerformanceMetrics(): Map<string, any> {
    return new Map(this.performanceMetrics);
  }

  async runHealthChecks(): Promise<void> {
    await capabilityRegistry.runHealthChecks();
  }

  exportState(): object {
    return {
      policies: Object.fromEntries(this.policies),
      activationHistory: this.activationHistory.slice(-50),
      performanceMetrics: Object.fromEntries(this.performanceMetrics),
    };
  }
}

// Global activation engine instance
export const autonomousActivationEngine = new AutonomousActivationEngine();
