/**
 * Enhanced Autonomous Capability Activation Service
 * 
 * Integrates advanced routing intelligence with autonomous capability system
 * for intelligent feature activation based on comprehensive message analysis
 */

import { Message, Attachment } from 'discord.js';
import { logger } from '../utils/logger.js';
import { unifiedMessageAnalysisService } from './core/message-analysis.service.js';
import { advancedIntentDetectionService } from './advanced-intent-detection.service.js';
import { smartContextManagerService } from './smart-context-manager.service.js';
import { autonomousActivationEngine, ActivationContext } from '../orchestration/autonomous-activation-engine.js';
import { autonomousOrchestration } from '../orchestration/autonomous-orchestration-integration.js';
import { capabilityRegistry } from '../orchestration/autonomous-capability-registry.js';
import type { UnifiedMessageAnalysis } from './core/message-analysis.service.js';
import type { UserCapabilities } from './intelligence/permission.service.js';

export interface EnhancedActivationContext extends ActivationContext {
  // Enhanced context from routing intelligence
  messageAnalysis: UnifiedMessageAnalysis;
  routingIntelligence: {
    preferredProvider?: string;
    reasoningLevel: string;
    contextStrategy: string;
    intelligenceServices: string[];
    modelCapabilities: string[];
  };
  userProfile: {
    expertise: string;
    preferences: Record<string, any>;
    recentInteractions: string[];
  };
  systemState: {
    availableProviders: string[];
    resourceUtilization: number;
    activeCapabilities: string[];
  };
}

export interface EnhancedActivationDecision {
  capabilityId: string;
  activationReason: string;
  intelligenceReasoning: string[];
  contextStrategy: string;
  expectedBenefit: number;
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    mitigation: string[];
  };
  performancePrediction: {
    estimatedLatency: number;
    resourceUsage: number;
    successProbability: number;
  };
  fallbackPlan: {
    capabilities: string[];
    conditions: string[];
  };
  integrationPoints: string[];
}

export interface AutonomousActivationResult {
  messageId: string;
  activatedCapabilities: string[];
  activationDecisions: EnhancedActivationDecision[];
  orchestrationPlan: {
    executionOrder: string[];
    parallelGroups: string[][];
    dependencies: Record<string, string[]>;
  };
  qualityPrediction: {
    expectedAccuracy: number;
    responseCompleteness: number;
    userSatisfaction: number;
  };
  monitoringPlan: {
    checkpoints: string[];
    metrics: string[];
    thresholds: Record<string, number>;
  };
  fallbackTriggers: string[];
}

export class EnhancedAutonomousActivationService {
  private activationHistory = new Map<string, AutonomousActivationResult>();
  private performanceMetrics = new Map<string, {
    averageLatency: number;
    successRate: number;
    userSatisfactionScore: number;
    activationCount: number;
    lastUpdated: Date;
  }>();

  constructor() {
    this.initializeEnhancedPolicies();
    logger.info('Enhanced Autonomous Capability Activation Service initialized');
  }

  private initializeEnhancedPolicies(): void {
    // Add enhanced policies for routing intelligence integration
    
    // Advanced Intent-Based Activation Policy
    autonomousActivationEngine.addPolicy({
      id: 'intent-driven-activation',
      name: 'Advanced Intent-Driven Capability Activation',
      description: 'Activates capabilities based on advanced intent classification and routing intelligence',
      priority: 950,
      conditions: [{
        type: 'context_match',
        operator: 'exists',
        field: 'messageAnalysis.intents',
        value: true
      }],
      actions: [{
        type: 'activate',
        target: 'routing-intelligence-capabilities'
      }],
      enabled: true
    });

    // Context Strategy Optimization Policy
    autonomousActivationEngine.addPolicy({
      id: 'context-strategy-optimization',
      name: 'Context Strategy-Based Capability Selection',
      description: 'Optimizes capability activation based on smart context management strategy',
      priority: 900,
      conditions: [{
        type: 'context_match',
        operator: 'contains',
        field: 'routingIntelligence.contextStrategy',
        value: 'focused'
      }],
      actions: [{
        type: 'prefer',
        target: ['advanced-reasoning', 'knowledge-graph']
      }],
      enabled: true
    });

    // User Expertise Adaptation Policy
    autonomousActivationEngine.addPolicy({
      id: 'user-expertise-adaptation',
      name: 'User Expertise-Based Capability Adaptation',
      description: 'Adapts capability selection based on user expertise and preferences',
      priority: 850,
      conditions: [{
        type: 'context_match',
        operator: 'equals',
        field: 'userProfile.expertise',
        value: 'expert'
      }],
      actions: [{
        type: 'activate',
        target: ['advanced-reasoning', 'knowledge-graph', 'temporal-orchestration']
      }],
      enabled: true
    });

    // Multimodal Intelligence Policy
    autonomousActivationEngine.addPolicy({
      id: 'multimodal-intelligence-activation',
      name: 'Intelligent Multimodal Capability Activation',
      description: 'Activates multimodal capabilities based on content analysis and user intent',
      priority: 800,
      conditions: [{
        type: 'context_match',
        operator: 'equals',
        field: 'messageAnalysis.needsMultimodal',
        value: true
      }],
      actions: [{
        type: 'activate',
        target: 'multimodal-analysis'
      }],
      enabled: true
    });

    logger.info('Enhanced autonomous activation policies initialized');
  }

  /**
   * Main enhanced autonomous activation method
   */
  public async activateCapabilitiesIntelligently(
    message: Message,
    userCapabilities?: UserCapabilities
  ): Promise<AutonomousActivationResult> {
    const messageId = message.id;
    logger.info(`🚀 Starting enhanced autonomous activation for message ${messageId}`);

    try {
      // Phase 1: Comprehensive Message Analysis
      const messageAnalysis = await unifiedMessageAnalysisService.analyzeMessage(
        message,
        Array.from(message.attachments.values()),
        userCapabilities
      );

      // Phase 2: Advanced Context Strategy Selection
      const contextResult = await smartContextManagerService.selectSmartContext(
        message.channel.id,
        {
          messageAnalysis,
          conversationLength: 50, // Estimate
          hasMultimodalHistory: messageAnalysis.hasAttachments,
          userExpertise: messageAnalysis.userExpertise as 'beginner' | 'intermediate' | 'advanced' | 'expert',
          taskComplexity: messageAnalysis.complexity as 'simple' | 'moderate' | 'complex' | 'advanced',
          conversationContinuity: true
        }
      );
      const contextStrategy = contextResult.strategy;

      // Phase 3: Create Enhanced Activation Context
      const enhancedContext = await this.createEnhancedActivationContext(
        message,
        messageAnalysis,
        contextStrategy.strategy,
        userCapabilities
      );

      // Phase 4: Intelligent Capability Decision Making
      const activationDecisions = await this.makeIntelligentActivationDecisions(enhancedContext);

      // Phase 5: Create Orchestration Plan
      const orchestrationPlan = await this.createOrchestrationPlan(
        activationDecisions,
        enhancedContext
      );

      // Phase 6: Execute Autonomous Activation
      const executionResult = await this.executeEnhancedActivation(
        messageId,
        orchestrationPlan,
        enhancedContext
      );

      // Phase 7: Create Monitoring Plan
      const monitoringPlan = this.createMonitoringPlan(activationDecisions, enhancedContext);

      // Phase 8: Generate Final Result
      const result: AutonomousActivationResult = {
        messageId,
        activatedCapabilities: executionResult.activated,
        activationDecisions,
        orchestrationPlan,
        qualityPrediction: await this.predictQuality(activationDecisions, enhancedContext),
        monitoringPlan,
        fallbackTriggers: this.generateFallbackTriggers(activationDecisions)
      };

      // Store for tracking and learning
      this.activationHistory.set(messageId, result);
      await this.updatePerformanceMetrics(result);

      logger.info(`✅ Enhanced autonomous activation completed for message ${messageId}`, {
        operation: 'enhanced-autonomous-activation',
        metadata: {
          activatedCapabilities: result.activatedCapabilities.length,
          contextStrategy: enhancedContext.routingIntelligence.contextStrategy,
          reasoningLevel: enhancedContext.routingIntelligence.reasoningLevel,
          expectedAccuracy: result.qualityPrediction.expectedAccuracy
        }
      });

      return result;

    } catch (error) {
      logger.error(`❌ Enhanced autonomous activation failed for message ${messageId}:`, error);
      return this.createFallbackActivationResult(messageId, error);
    }
  }

  /**
   * Create enhanced activation context with routing intelligence
   */
  private async createEnhancedActivationContext(
    message: Message,
    messageAnalysis: UnifiedMessageAnalysis,
    contextStrategy: string,
    userCapabilities?: UserCapabilities
  ): Promise<EnhancedActivationContext> {
    
    // Extract routing intelligence insights
    const routingIntelligence = {
      preferredProvider: messageAnalysis.preferredProvider,
      reasoningLevel: messageAnalysis.reasoningLevel,
      contextStrategy,
      intelligenceServices: Object.entries(messageAnalysis.intelligenceServices)
        .filter(([, enabled]) => enabled)
        .map(([service]) => service),
      modelCapabilities: Object.entries(messageAnalysis.modelCapabilities)
        .filter(([, needed]) => needed)
        .map(([capability]) => capability)
    };

    // Create user profile
    const userProfile = {
      expertise: messageAnalysis.userExpertise,
      preferences: {
        responseSpeed: messageAnalysis.responseSpeed,
        contextLength: messageAnalysis.contextRequirement,
        complexity: messageAnalysis.complexity
      },
      recentInteractions: [] // Would be populated from conversation history
    };

    // Get system state
    const systemState = {
      availableProviders: ['openai', 'anthropic', 'gemini', 'groq'], // Would be dynamic
      resourceUtilization: 0.3, // Would be from monitoring
      activeCapabilities: Array.from(capabilityRegistry.getAllCapabilities())
        .filter(cap => capabilityRegistry.getCapabilityState(cap.id)?.status === 'active')
        .map(cap => cap.id)
    };

    // Create base activation context
    const baseContext: ActivationContext = {
      messageContent: message.content,
      userIntent: messageAnalysis.intents,
      conversationHistory: [], // Would be populated from context manager
      currentCapabilities: systemState.activeCapabilities,
      performanceConstraints: {
        maxLatency: messageAnalysis.responseSpeed === 'fast' ? 3000 : 10000,
        maxMemory: '1GB',
        maxCpu: 'high'
      },
      qualityRequirements: {
        accuracy: messageAnalysis.reasoningLevel === 'expert' ? 'high' : 'medium',
        freshness: messageAnalysis.intents.includes('search') ? 'current' : 'any',
        depth: messageAnalysis.complexity === 'advanced' ? 'deep' : 'moderate'
      }
    };

    return {
      ...baseContext,
      messageAnalysis,
      routingIntelligence,
      userProfile,
      systemState
    };
  }

  /**
   * Make intelligent activation decisions using routing intelligence
   */
  private async makeIntelligentActivationDecisions(
    context: EnhancedActivationContext
  ): Promise<EnhancedActivationDecision[]> {
    
    // Get base decisions from autonomous engine
    const baseDecisions = await autonomousActivationEngine.decideActivations(context);
    
    // Enhance decisions with routing intelligence
    const enhancedDecisions: EnhancedActivationDecision[] = [];

    for (const baseDecision of baseDecisions) {
      if (baseDecision.action !== 'activate') continue;

      const capability = capabilityRegistry.getCapability(baseDecision.capabilityId);
      if (!capability) continue;

      // Create enhanced decision with routing intelligence
      const enhancedDecision = await this.enhanceCapabilityDecision(
        baseDecision,
        capability,
        context
      );

      enhancedDecisions.push(enhancedDecision);
    }

    // Add routing intelligence specific capabilities
    const routingCapabilities = await this.identifyRoutingIntelligenceCapabilities(context);
    for (const routingCap of routingCapabilities) {
      enhancedDecisions.push(routingCap);
    }

    return enhancedDecisions.sort((a, b) => b.expectedBenefit - a.expectedBenefit);
  }

  /**
   * Enhance capability decision with routing intelligence
   */
  private async enhanceCapabilityDecision(
    baseDecision: any,
    capability: any,
    context: EnhancedActivationContext
  ): Promise<EnhancedActivationDecision> {
    
    // Analyze how routing intelligence affects this capability
    const intelligenceReasoning = this.analyzeIntelligenceAlignment(capability, context);
    
    // Determine context strategy for this capability
    const contextStrategy = this.determineCapabilityContextStrategy(capability, context);
    
    // Assess risks with routing intelligence
    const riskAssessment = this.assessCapabilityRisks(capability, context);
    
    // Predict performance with routing intelligence
    const performancePrediction = await this.predictCapabilityPerformance(capability, context);
    
    // Create fallback plan
    const fallbackPlan = this.createCapabilityFallbackPlan(capability, context);
    
    // Identify integration points
    const integrationPoints = this.identifyIntegrationPoints(capability, context);

    return {
      capabilityId: capability.id,
      activationReason: baseDecision.reasoning,
      intelligenceReasoning,
      contextStrategy,
      expectedBenefit: Math.min(baseDecision.expectedBenefit * this.calculateIntelligenceMultiplier(capability, context), 1.0),
      riskAssessment,
      performancePrediction,
      fallbackPlan,
      integrationPoints
    };
  }

  /**
   * Analyze how routing intelligence aligns with capability
   */
  private analyzeIntelligenceAlignment(capability: any, context: EnhancedActivationContext): string[] {
    const reasoning: string[] = [];
    
    // Check intelligence service alignment
    if (context.routingIntelligence.intelligenceServices.includes('enhancedIntelligence') && 
        capability.category === 'intelligence') {
      reasoning.push('Aligned with enhanced intelligence service routing');
    }
    
    // Check model capability alignment
    if (context.routingIntelligence.modelCapabilities.includes('needsReasoning') && 
        capability.id === 'advanced-reasoning') {
      reasoning.push('Direct match with reasoning capability requirement');
    }
    
    // Check context strategy alignment
    if (context.routingIntelligence.contextStrategy === 'focused' && 
        capability.category === 'storage') {
      reasoning.push('Supports focused context strategy with efficient retrieval');
    }
    
    // Check user expertise alignment
    if (context.userProfile.expertise === 'expert' && capability.priority === 'high') {
      reasoning.push('Matches expert user capability expectations');
    }

    return reasoning;
  }

  /**
   * Determine context strategy for capability
   */
  private determineCapabilityContextStrategy(capability: any, context: EnhancedActivationContext): string {
    // Map capability to optimal context strategy
    if (capability.category === 'storage') return 'selective';
    if (capability.id === 'advanced-reasoning') return context.routingIntelligence.contextStrategy;
    if (capability.category === 'intelligence') return 'focused';
    return 'minimal';
  }

  /**
   * Assess capability risks with routing intelligence
   */
  private assessCapabilityRisks(capability: any, context: EnhancedActivationContext): {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    mitigation: string[];
  } {
    const factors: string[] = [];
    const mitigation: string[] = [];
    
    // Performance risk assessment
    if (capability.contexts.performance_impact === 'high' && 
        context.messageAnalysis.responseSpeed === 'fast') {
      factors.push('High performance impact conflicts with fast response requirement');
      mitigation.push('Use parallel processing and caching');
    }
    
    // Reliability risk assessment
    if (capability.contexts.reliability === 'experimental' && 
        context.messageAnalysis.urgency === 'urgent') {
      factors.push('Experimental capability used for urgent request');
      mitigation.push('Prepare fallback capabilities');
    }
    
    // Resource risk assessment
    if (context.systemState.resourceUtilization > 0.8) {
      factors.push('High system resource utilization');
      mitigation.push('Queue capability activation or use fallback');
    }

    const level = factors.length > 2 ? 'high' : factors.length > 0 ? 'medium' : 'low';
    
    return { level, factors, mitigation };
  }

  /**
   * Predict capability performance with routing intelligence
   */
  private async predictCapabilityPerformance(capability: any, context: EnhancedActivationContext): Promise<{
    estimatedLatency: number;
    resourceUsage: number;
    successProbability: number;
  }> {
    let estimatedLatency = 1000; // Base latency
    let resourceUsage = 0.1; // Base resource usage
    let successProbability = 0.9; // Base success probability
    
    // Adjust based on capability characteristics
    switch (capability.contexts.performance_impact) {
      case 'high':
        estimatedLatency *= 3;
        resourceUsage *= 4;
        break;
      case 'medium':
        estimatedLatency *= 2;
        resourceUsage *= 2;
        break;
      case 'low':
        estimatedLatency *= 1.2;
        resourceUsage *= 1.1;
        break;
    }
    
    // Adjust based on routing intelligence
    if (context.routingIntelligence.reasoningLevel === 'expert') {
      estimatedLatency *= 1.5;
      resourceUsage *= 1.3;
      successProbability *= 0.95; // Slightly lower due to complexity
    }
    
    // Adjust based on context strategy
    if (context.routingIntelligence.contextStrategy === 'full') {
      estimatedLatency *= 1.3;
      resourceUsage *= 1.4;
    }
    
    // Historical performance adjustment
    const historicalMetrics = this.performanceMetrics.get(capability.id);
    if (historicalMetrics) {
      successProbability = (successProbability + historicalMetrics.successRate) / 2;
      estimatedLatency = (estimatedLatency + historicalMetrics.averageLatency) / 2;
    }

    return {
      estimatedLatency: Math.min(estimatedLatency, 30000), // Cap at 30s
      resourceUsage: Math.min(resourceUsage, 1.0), // Cap at 100%
      successProbability: Math.min(Math.max(successProbability, 0.1), 0.99) // 10%-99%
    };
  }

  /**
   * Create fallback plan for capability
   */
  private createCapabilityFallbackPlan(capability: any, context: EnhancedActivationContext): {
    capabilities: string[];
    conditions: string[];
  } {
    const capabilities: string[] = [];
    const conditions: string[] = [];
    
    // Add explicit fallback capabilities
    if (capability.fallbackCapabilities) {
      capabilities.push(...capability.fallbackCapabilities);
      conditions.push('primary_capability_failure');
    }
    
    // Add routing intelligence fallbacks
    if (capability.id === 'advanced-reasoning' && context.messageAnalysis.reasoningLevel === 'expert') {
      capabilities.push('core-intelligence', 'web-search');
      conditions.push('reasoning_timeout', 'complexity_reduction_needed');
    }
    
    if (capability.id === 'multimodal-analysis') {
      capabilities.push('core-intelligence');
      conditions.push('multimodal_service_unavailable');
    }

    return { capabilities, conditions };
  }

  /**
   * Identify integration points for capability
   */
  private identifyIntegrationPoints(capability: any, context: EnhancedActivationContext): string[] {
    const integrationPoints: string[] = [];
    
    // Core integration points
    integrationPoints.push('core-intelligence');
    
    // Add routing intelligence integration points
    if (context.routingIntelligence.intelligenceServices.includes('enhancedIntelligence')) {
      integrationPoints.push('enhanced-intelligence-orchestration');
    }
    
    if (context.routingIntelligence.contextStrategy !== 'minimal') {
      integrationPoints.push('smart-context-manager');
    }
    
    // Add capability-specific integration points
    if (capability.category === 'storage') {
      integrationPoints.push('data-pipeline', 'semantic-cache');
    }
    
    if (capability.category === 'intelligence') {
      integrationPoints.push('message-analysis', 'intent-detection');
    }

    return Array.from(new Set(integrationPoints));
  }

  /**
   * Calculate intelligence multiplier for expected benefit
   */
  private calculateIntelligenceMultiplier(capability: any, context: EnhancedActivationContext): number {
    let multiplier = 1.0;
    
    // Boost for alignment with routing intelligence
    if (context.routingIntelligence.intelligenceServices.includes('enhancedIntelligence') && 
        capability.category === 'intelligence') {
      multiplier += 0.2;
    }
    
    // Boost for user expertise alignment
    if (context.userProfile.expertise === 'expert' && capability.priority === 'high') {
      multiplier += 0.15;
    }
    
    // Boost for model capability alignment
    const modelCapabilities = context.routingIntelligence.modelCapabilities;
    if ((modelCapabilities.includes('needsReasoning') && capability.id === 'advanced-reasoning') ||
        (modelCapabilities.includes('needsMultimodal') && capability.id === 'multimodal-analysis')) {
      multiplier += 0.25;
    }

    return Math.min(multiplier, 1.5); // Cap boost at 50%
  }

  /**
   * Identify routing intelligence specific capabilities
   */
  private async identifyRoutingIntelligenceCapabilities(
    context: EnhancedActivationContext
  ): Promise<EnhancedActivationDecision[]> {
    const capabilities: EnhancedActivationDecision[] = [];
    
    // Smart context management capability
    if (context.routingIntelligence.contextStrategy !== 'minimal') {
      capabilities.push({
        capabilityId: 'smart-context-management',
        activationReason: `Context strategy '${context.routingIntelligence.contextStrategy}' requires intelligent context management`,
        intelligenceReasoning: ['Smart context strategy selected by routing intelligence'],
        contextStrategy: context.routingIntelligence.contextStrategy,
        expectedBenefit: 0.8,
        riskAssessment: { level: 'low', factors: [], mitigation: [] },
        performancePrediction: { estimatedLatency: 200, resourceUsage: 0.05, successProbability: 0.95 },
        fallbackPlan: { capabilities: ['basic-context'], conditions: ['smart_context_failure'] },
        integrationPoints: ['message-analysis', 'core-intelligence']
      });
    }
    
    // Advanced intent detection capability
    if (context.messageAnalysis.intents.length > 1 && context.messageAnalysis.complexity !== 'simple') {
      capabilities.push({
        capabilityId: 'advanced-intent-detection',
        activationReason: 'Multiple intents with complex analysis requirements',
        intelligenceReasoning: ['Complex intent classification needed for accurate routing'],
        contextStrategy: 'selective',
        expectedBenefit: 0.75,
        riskAssessment: { level: 'low', factors: [], mitigation: [] },
        performancePrediction: { estimatedLatency: 150, resourceUsage: 0.03, successProbability: 0.92 },
        fallbackPlan: { capabilities: ['basic-intent-detection'], conditions: ['advanced_detection_failure'] },
        integrationPoints: ['message-analysis', 'routing-intelligence']
      });
    }
    
    // Model routing optimization capability
    if (context.messageAnalysis.preferredProvider && 
        context.routingIntelligence.modelCapabilities.length > 2) {
      capabilities.push({
        capabilityId: 'model-routing-optimization',
        activationReason: 'Multiple model capabilities with provider preference detected',
        intelligenceReasoning: ['Optimal model selection based on capability analysis'],
        contextStrategy: 'focused',
        expectedBenefit: 0.7,
        riskAssessment: { level: 'medium', factors: ['Provider availability'], mitigation: ['Fallback providers'] },
        performancePrediction: { estimatedLatency: 100, resourceUsage: 0.02, successProbability: 0.88 },
        fallbackPlan: { capabilities: ['default-model-selection'], conditions: ['provider_unavailable'] },
        integrationPoints: ['model-router', 'provider-management']
      });
    }

    return capabilities;
  }

  /**
   * Create orchestration plan with routing intelligence
   */
  private async createOrchestrationPlan(
    decisions: EnhancedActivationDecision[],
    context: EnhancedActivationContext
  ): Promise<{
    executionOrder: string[];
    parallelGroups: string[][];
    dependencies: Record<string, string[]>;
  }> {
    const executionOrder: string[] = [];
    const parallelGroups: string[][] = [];
    const dependencies: Record<string, string[]> = {};
    
    // Group capabilities by priority and dependencies
    const highPriorityCapabilities = decisions
      .filter(d => d.expectedBenefit > 0.7)
      .map(d => d.capabilityId);
    
    const mediumPriorityCapabilities = decisions
      .filter(d => d.expectedBenefit > 0.4 && d.expectedBenefit <= 0.7)
      .map(d => d.capabilityId);
    
    const lowPriorityCapabilities = decisions
      .filter(d => d.expectedBenefit <= 0.4)
      .map(d => d.capabilityId);
    
    // Create execution order based on routing intelligence
    if (context.routingIntelligence.reasoningLevel === 'expert') {
      // Sequential execution for complex reasoning
      executionOrder.push(...highPriorityCapabilities, ...mediumPriorityCapabilities);
    } else {
      // Parallel execution for simpler tasks
      if (highPriorityCapabilities.length > 0) {
        parallelGroups.push(highPriorityCapabilities);
      }
      if (mediumPriorityCapabilities.length > 0) {
        parallelGroups.push(mediumPriorityCapabilities);
      }
    }
    
    // Add low priority capabilities at the end
    if (lowPriorityCapabilities.length > 0) {
      executionOrder.push(...lowPriorityCapabilities);
    }
    
    // Build dependency map
    for (const decision of decisions) {
      dependencies[decision.capabilityId] = decision.integrationPoints;
    }

    return { executionOrder, parallelGroups, dependencies };
  }

  /**
   * Execute enhanced activation with routing intelligence
   */
  private async executeEnhancedActivation(
    messageId: string,
    orchestrationPlan: any,
    context: EnhancedActivationContext
  ): Promise<{ activated: string[]; failed: string[] }> {
    const activated: string[] = [];
    const failed: string[] = [];
    
    logger.info(`⚡ Executing enhanced capability activation for message ${messageId}`);
    
    try {
      // Execute parallel groups first
      for (const parallelGroup of orchestrationPlan.parallelGroups) {
        const groupPromises = parallelGroup.map(async (capabilityId: string) => {
          try {
            await this.activateCapabilityWithIntelligence(capabilityId, context);
            activated.push(capabilityId);
            logger.debug(`✅ Capability activated: ${capabilityId}`);
          } catch (error) {
            failed.push(capabilityId);
            logger.error(`❌ Capability activation failed: ${capabilityId}`, error);
          }
        });
        
        await Promise.allSettled(groupPromises);
      }
      
      // Execute sequential capabilities
      for (const capabilityId of orchestrationPlan.executionOrder) {
        try {
          await this.activateCapabilityWithIntelligence(capabilityId, context);
          activated.push(capabilityId);
          logger.debug(`✅ Capability activated sequentially: ${capabilityId}`);
        } catch (error) {
          failed.push(capabilityId);
          logger.error(`❌ Sequential capability activation failed: ${capabilityId}`, error);
          
          // Check if we should continue or abort
          if (this.shouldAbortOnFailure(capabilityId, context)) {
            logger.warn(`🛑 Aborting activation due to critical capability failure: ${capabilityId}`);
            break;
          }
        }
      }
      
      logger.info(`🎯 Enhanced activation completed for message ${messageId}`, {
        activated: activated.length,
        failed: failed.length
      });
      
    } catch (error) {
      logger.error(`❌ Enhanced activation execution failed for message ${messageId}:`, error);
    }

    return { activated, failed };
  }

  /**
   * Activate capability with routing intelligence
   */
  private async activateCapabilityWithIntelligence(
    capabilityId: string,
    context: EnhancedActivationContext
  ): Promise<void> {
    const capability = capabilityRegistry.getCapability(capabilityId);
    if (!capability) {
      throw new Error(`Unknown capability: ${capabilityId}`);
    }
    
    // Check if capability is already active
    const state = capabilityRegistry.getCapabilityState(capabilityId);
    if (state?.status === 'active') {
      logger.debug(`Capability already active: ${capabilityId}`);
      return;
    }
    
    // Apply routing intelligence optimizations
    await this.optimizeCapabilityForRoutingIntelligence(capabilityId, context);
    
    // Activate capability through autonomous activation engine
    await autonomousActivationEngine.executeActivations([{
      capabilityId,
      action: 'activate' as const,
      confidence: 0.8,
      reasoning: `Enhanced activation with routing intelligence`,
      expectedBenefit: 0.8,
      estimatedCost: 0.2,
      priority: 0.8
    }]);
  }

  /**
   * Optimize capability for routing intelligence
   */
  private async optimizeCapabilityForRoutingIntelligence(
    capabilityId: string,
    context: EnhancedActivationContext
  ): Promise<void> {
    // Apply context strategy optimizations
    if (capabilityId === 'smart-context-management') {
      // Configure context manager for this capability
      logger.debug(`Optimizing context management for capability: ${capabilityId}`);
    }
    
    // Apply model routing optimizations
    if (capabilityId === 'model-routing-optimization') {
      // Configure model router based on analysis
      logger.debug(`Optimizing model routing for ${context.routingIntelligence.preferredProvider}`);
    }
    
    // Apply performance optimizations
    if (context.messageAnalysis.responseSpeed === 'fast') {
      // Configure for fast response
      logger.debug(`Optimizing ${capabilityId} for fast response`);
    }
  }

  /**
   * Check if activation should abort on capability failure
   */
  private shouldAbortOnFailure(capabilityId: string, context: EnhancedActivationContext): boolean {
    const capability = capabilityRegistry.getCapability(capabilityId);
    
    // Abort on critical capability failure
    if (capability?.priority === 'critical') return true;
    
    // Abort if urgent request and core capability fails
    if (context.messageAnalysis.urgency === 'urgent' && 
        capability?.category === 'core') return true;
    
    return false;
  }

  /**
   * Create monitoring plan for activated capabilities
   */
  private createMonitoringPlan(
    decisions: EnhancedActivationDecision[],
    context: EnhancedActivationContext
  ): {
    checkpoints: string[];
    metrics: string[];
    thresholds: Record<string, number>;
  } {
    const checkpoints = ['activation_complete', 'first_response', 'task_completion'];
    const metrics = ['latency', 'accuracy', 'user_satisfaction', 'resource_usage'];
    const thresholds: Record<string, number> = {
      max_latency: context.messageAnalysis.responseSpeed === 'fast' ? 3000 : 10000,
      min_accuracy: context.messageAnalysis.reasoningLevel === 'expert' ? 0.9 : 0.7,
      max_resource_usage: 0.8,
      min_user_satisfaction: 0.7
    };

    return { checkpoints, metrics, thresholds };
  }

  /**
   * Predict quality with routing intelligence
   */
  private async predictQuality(
    decisions: EnhancedActivationDecision[],
    context: EnhancedActivationContext
  ): Promise<{
    expectedAccuracy: number;
    responseCompleteness: number;
    userSatisfaction: number;
  }> {
    let expectedAccuracy = 0.7; // Base accuracy
    let responseCompleteness = 0.8; // Base completeness
    let userSatisfaction = 0.75; // Base satisfaction
    
    // Factor in capability quality contributions
    for (const decision of decisions) {
      expectedAccuracy += decision.expectedBenefit * 0.1;
      responseCompleteness += decision.performancePrediction.successProbability * 0.05;
    }
    
    // Factor in routing intelligence optimizations
    if (context.routingIntelligence.reasoningLevel === 'expert') {
      expectedAccuracy += 0.15;
      responseCompleteness += 0.1;
    }
    
    // Factor in user profile alignment
    if (context.userProfile.expertise === 'expert' && 
        context.routingIntelligence.reasoningLevel === 'expert') {
      userSatisfaction += 0.2;
    }
    
    // Factor in context strategy effectiveness
    if (context.routingIntelligence.contextStrategy === 'focused') {
      expectedAccuracy += 0.1;
      userSatisfaction += 0.05;
    }

    return {
      expectedAccuracy: Math.min(expectedAccuracy, 0.99),
      responseCompleteness: Math.min(responseCompleteness, 0.99),
      userSatisfaction: Math.min(userSatisfaction, 0.99)
    };
  }

  /**
   * Generate fallback triggers
   */
  private generateFallbackTriggers(decisions: EnhancedActivationDecision[]): string[] {
    const triggers: string[] = [];
    
    for (const decision of decisions) {
      if (decision.riskAssessment.level === 'high') {
        triggers.push(`${decision.capabilityId}_high_risk`);
      }
      
      if (decision.performancePrediction.successProbability < 0.7) {
        triggers.push(`${decision.capabilityId}_low_success_probability`);
      }
      
      triggers.push(...decision.fallbackPlan.conditions.map(condition => 
        `${decision.capabilityId}_${condition}`
      ));
    }
    
    return Array.from(new Set(triggers));
  }

  /**
   * Update performance metrics based on activation result
   */
  private async updatePerformanceMetrics(result: AutonomousActivationResult): Promise<void> {
    // This would be called after message processing completes
    // For now, we'll update with predicted values
    
    for (const decision of result.activationDecisions) {
      const existing = this.performanceMetrics.get(decision.capabilityId) || {
        averageLatency: 0,
        successRate: 0,
        userSatisfactionScore: 0,
        activationCount: 0,
        lastUpdated: new Date()
      };
      
      existing.activationCount++;
      existing.averageLatency = (existing.averageLatency * (existing.activationCount - 1) + 
                                decision.performancePrediction.estimatedLatency) / existing.activationCount;
      existing.successRate = (existing.successRate * (existing.activationCount - 1) + 
                             decision.performancePrediction.successProbability) / existing.activationCount;
      existing.lastUpdated = new Date();
      
      this.performanceMetrics.set(decision.capabilityId, existing);
    }
  }

  /**
   * Create fallback activation result
   */
  private createFallbackActivationResult(messageId: string, error: any): AutonomousActivationResult {
    logger.warn(`Creating fallback activation result for message ${messageId}`);
    
    return {
      messageId,
      activatedCapabilities: ['core-intelligence'],
      activationDecisions: [{
        capabilityId: 'core-intelligence',
        activationReason: 'Fallback activation due to enhanced activation failure',
        intelligenceReasoning: ['Emergency fallback to core functionality'],
        contextStrategy: 'minimal',
        expectedBenefit: 0.5,
        riskAssessment: { level: 'low', factors: [], mitigation: [] },
        performancePrediction: { estimatedLatency: 2000, resourceUsage: 0.2, successProbability: 0.8 },
        fallbackPlan: { capabilities: [], conditions: [] },
        integrationPoints: ['message-processing']
      }],
      orchestrationPlan: {
        executionOrder: ['core-intelligence'],
        parallelGroups: [],
        dependencies: {}
      },
      qualityPrediction: { expectedAccuracy: 0.6, responseCompleteness: 0.5, userSatisfaction: 0.4 },
      monitoringPlan: { checkpoints: ['basic_response'], metrics: ['latency'], thresholds: { max_latency: 5000 } },
      fallbackTriggers: ['enhanced_activation_failure']
    };
  }

  /**
   * Get activation result for message
   */
  public getActivationResult(messageId: string): AutonomousActivationResult | undefined {
    return this.activationHistory.get(messageId);
  }

  /**
   * Get performance metrics for capability
   */
  public getCapabilityPerformanceMetrics(capabilityId: string) {
    return this.performanceMetrics.get(capabilityId);
  }

  /**
   * Get system status with routing intelligence insights
   */
  public getEnhancedSystemStatus(): object {
    const baseStatus = autonomousOrchestration.getSystemStatus();
    
    return {
      ...baseStatus,
      routingIntelligence: {
        activeActivations: this.activationHistory.size,
        averageCapabilitiesPerMessage: Array.from(this.activationHistory.values())
          .reduce((sum, result) => sum + result.activatedCapabilities.length, 0) / 
          Math.max(this.activationHistory.size, 1),
        performanceMetrics: Object.fromEntries(this.performanceMetrics),
        enhancedPolicies: 4 // Number of enhanced policies added
      }
    };
  }
}

// Global enhanced autonomous activation service instance
export const enhancedAutonomousActivationService = new EnhancedAutonomousActivationService();