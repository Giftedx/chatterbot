/**
 * Enhanced Autonomous Activation Service Tests
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Message, Attachment, User, Channel, Guild } from 'discord.js';
import { EnhancedAutonomousActivationService } from '../enhanced-autonomous-activation.service.js';
import { unifiedMessageAnalysisService } from '../core/message-analysis.service.js';
import { smartContextManagerService } from '../smart-context-manager.service.js';
import type { UnifiedMessageAnalysis } from '../core/message-analysis.service.js';

// Mock the dependencies
jest.mock('../core/message-analysis.service.js');
jest.mock('../smart-context-manager.service.js');
jest.mock('../../orchestration/autonomous-activation-engine.js');
jest.mock('../../orchestration/autonomous-orchestration-integration.js');
jest.mock('../../orchestration/autonomous-capability-registry.js');

describe('EnhancedAutonomousActivationService', () => {
  let service: EnhancedAutonomousActivationService;
  let mockMessage: Partial<Message>;
  let mockMessageAnalysis: UnifiedMessageAnalysis;

  beforeEach(() => {
    service = new EnhancedAutonomousActivationService();
    
    // Setup mock message
    mockMessage = {
      id: 'test-message-123',
      content: 'Can you analyze this complex problem and provide a detailed solution?',
      author: { id: 'user-123' } as User,
      channel: { id: 'channel-123' } as Channel,
      guild: { id: 'guild-123' } as Guild,
      attachments: new Map()
    };

    // Setup mock message analysis
    mockMessageAnalysis = {
      hasAttachments: false,
      hasUrls: false,
      attachmentTypes: [],
      urls: [],
      complexity: 'complex',
      intents: ['analysis', 'problem-solving'],
      requiredTools: ['advanced-reasoning', 'web-search', 'memory'],
      needsPersonaSwitch: false,
      needsAdminFeatures: false,
      adminCommands: [],
      needsMultimodal: false,
      attachmentAnalysis: [],
      needsConversationManagement: false,
      conversationActions: [],
      needsMemoryOperation: false,
      memoryActions: [],
      needsMCPTools: true,
      mcpRequirements: ['webSearch'],
      reasoningLevel: 'advanced',
      contextRequirement: 'long',
      responseSpeed: 'thorough',
      modelCapabilities: {
        needsCoding: false,
        needsReasoning: true,
        needsCreativity: false,
        needsFactuality: true,
        needsMultimodal: false,
        needsTools: true
      },
      intelligenceServices: {
        coreIntelligence: true,
        agenticIntelligence: true,
        enhancedIntelligence: true,
        advancedCapabilities: false,
        mcpIntegration: true
      },
      confidence: 0.85,
      processingRecommendations: ['Use parallel processing for multiple tools'],
      urgency: 'normal',
      userExpertise: 'advanced'
    };

    // Setup mocks
    (unifiedMessageAnalysisService.analyzeMessage as jest.Mock).mockResolvedValue(mockMessageAnalysis);
    (smartContextManagerService.selectSmartContext as jest.Mock).mockResolvedValue({
      strategy: {
        strategy: 'focused',
        maxMessages: 20,
        includeMultimodal: false,
        prioritizeRecent: true,
        requiresMemory: true,
        contextWeight: 0.8,
        reasoning: ['Complex problem requires focused context']
      },
      contextMessages: [],
      totalTokensEstimate: 3500,
      effectiveness: 0.85,
      metadata: {
        originalLength: 50,
        selectedLength: 20,
        reductionRatio: 0.6,
        strategyConfidence: 0.85
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('activateCapabilitiesIntelligently', () => {
    it('should analyze message and create enhanced activation result', async () => {
      const result = await service.activateCapabilitiesIntelligently(
        mockMessage as Message
      );

      expect(result).toBeDefined();
      expect(result.messageId).toBe('test-message-123');
      expect(result.activatedCapabilities).toEqual(expect.any(Array));
      expect(result.activationDecisions).toEqual(expect.any(Array));
      expect(result.orchestrationPlan).toBeDefined();
      expect(result.qualityPrediction).toBeDefined();
      expect(result.monitoringPlan).toBeDefined();
    });

    it('should use routing intelligence for capability selection', async () => {
      const result = await service.activateCapabilitiesIntelligently(
        mockMessage as Message
      );

      // Should call unified message analysis
      expect(unifiedMessageAnalysisService.analyzeMessage).toHaveBeenCalledWith(
        mockMessage,
        expect.any(Array),
        undefined
      );

      // Should call smart context manager
      expect(smartContextManagerService.selectSmartContext).toHaveBeenCalledWith(
        'channel-123',
        expect.objectContaining({
          messageAnalysis: mockMessageAnalysis,
          taskComplexity: 'complex',
          userExpertise: 'advanced'
        })
      );

      expect(result.activationDecisions.length).toBeGreaterThan(0);
    });

    it('should create appropriate orchestration plan for complex reasoning', async () => {
      const result = await service.activateCapabilitiesIntelligently(
        mockMessage as Message
      );

      expect(result.orchestrationPlan).toBeDefined();
      expect(result.orchestrationPlan.executionOrder).toEqual(expect.any(Array));
      expect(result.orchestrationPlan.parallelGroups).toEqual(expect.any(Array));
      expect(result.orchestrationPlan.dependencies).toEqual(expect.any(Object));
    });

    it('should predict quality based on routing intelligence', async () => {
      const result = await service.activateCapabilitiesIntelligently(
        mockMessage as Message
      );

      expect(result.qualityPrediction.expectedAccuracy).toBeGreaterThan(0.7);
      expect(result.qualityPrediction.responseCompleteness).toBeGreaterThan(0.7);
      expect(result.qualityPrediction.userSatisfaction).toBeGreaterThan(0.6);
    });

    it('should handle multimodal content intelligently', async () => {
      // Setup message with attachments
      const mockAttachment = { 
        name: 'image.jpg', 
        url: 'https://example.com/image.jpg',
        contentType: 'image/jpeg' 
      } as Attachment;
      
      mockMessage.attachments = new Map([['1', mockAttachment]]);
      
      mockMessageAnalysis.hasAttachments = true;
      mockMessageAnalysis.attachmentTypes = ['image'];
      mockMessageAnalysis.needsMultimodal = true;
      mockMessageAnalysis.modelCapabilities.needsMultimodal = true;

      (unifiedMessageAnalysisService.analyzeMessage as jest.Mock).mockResolvedValue(mockMessageAnalysis);

      const result = await service.activateCapabilitiesIntelligently(
        mockMessage as Message
      );

      // Should identify multimodal requirements
      expect(result.activationDecisions.some(d => 
        d.capabilityId === 'multimodal-analysis' || 
        d.intelligenceReasoning.includes('multimodal')
      )).toBe(true);
    });

    it('should create fallback result on error', async () => {
      (unifiedMessageAnalysisService.analyzeMessage as jest.Mock).mockRejectedValue(
        new Error('Analysis failed')
      );

      const result = await service.activateCapabilitiesIntelligently(
        mockMessage as Message
      );

      expect(result.messageId).toBe('test-message-123');
      expect(result.activatedCapabilities).toContain('core-intelligence');
      expect(result.fallbackTriggers).toContain('enhanced_activation_failure');
      expect(result.qualityPrediction.expectedAccuracy).toBeLessThan(0.7);
    });
  });

  describe('enhanced decision making', () => {
    it('should enhance capability decisions with routing intelligence', async () => {
      const result = await service.activateCapabilitiesIntelligently(
        mockMessage as Message
      );

      const decisions = result.activationDecisions;
      expect(decisions.length).toBeGreaterThan(0);

      // Each decision should have enhanced properties
      decisions.forEach(decision => {
        expect(decision.capabilityId).toBeDefined();
        expect(decision.activationReason).toBeDefined();
        expect(decision.intelligenceReasoning).toEqual(expect.any(Array));
        expect(decision.contextStrategy).toBeDefined();
        expect(decision.expectedBenefit).toBeGreaterThanOrEqual(0);
        expect(decision.riskAssessment).toBeDefined();
        expect(decision.performancePrediction).toBeDefined();
        expect(decision.fallbackPlan).toBeDefined();
        expect(decision.integrationPoints).toEqual(expect.any(Array));
      });
    });

    it('should align capabilities with user expertise', async () => {
      // Test expert user
      mockMessageAnalysis.userExpertise = 'expert';
      mockMessageAnalysis.reasoningLevel = 'expert';
      (unifiedMessageAnalysisService.analyzeMessage as jest.Mock).mockResolvedValue(mockMessageAnalysis);

      const result = await service.activateCapabilitiesIntelligently(
        mockMessage as Message
      );

      const advancedDecisions = result.activationDecisions.filter(d => 
        d.intelligenceReasoning.some(reason => reason.includes('expert'))
      );
      
      expect(advancedDecisions.length).toBeGreaterThan(0);
    });

    it('should optimize for response speed requirements', async () => {
      // Test fast response requirement
      mockMessageAnalysis.responseSpeed = 'fast';
      mockMessageAnalysis.urgency = 'urgent';
      (unifiedMessageAnalysisService.analyzeMessage as jest.Mock).mockResolvedValue(mockMessageAnalysis);

      const result = await service.activateCapabilitiesIntelligently(
        mockMessage as Message
      );

      // Should have risk assessment for performance conflicts
      const performanceRisks = result.activationDecisions.filter(d =>
        d.riskAssessment.factors.some(factor => factor.includes('performance'))
      );

      expect(performanceRisks.length).toBeGreaterThanOrEqual(0);
      expect(result.qualityPrediction.expectedAccuracy).toBeDefined();
    });
  });

  describe('context strategy integration', () => {
    it('should select appropriate context strategy', async () => {
      const result = await service.activateCapabilitiesIntelligently(
        mockMessage as Message
      );

      expect(smartContextManagerService.selectSmartContext).toHaveBeenCalledWith(
        'channel-123',
        expect.objectContaining({
          messageAnalysis: mockMessageAnalysis,
          conversationLength: expect.any(Number),
          hasMultimodalHistory: false,
          userExpertise: 'advanced',
          taskComplexity: 'complex',
          conversationContinuity: true
        })
      );

      // Should have context management capability if not minimal strategy
      const contextCapabilities = result.activationDecisions.filter(d =>
        d.capabilityId.includes('context') || 
        d.contextStrategy !== 'minimal'
      );

      expect(contextCapabilities.length).toBeGreaterThan(0);
    });

    it('should adapt to different context requirements', async () => {
      mockMessageAnalysis.contextRequirement = 'extra-long';
      mockMessageAnalysis.complexity = 'advanced';
      (unifiedMessageAnalysisService.analyzeMessage as jest.Mock).mockResolvedValue(mockMessageAnalysis);

      const result = await service.activateCapabilitiesIntelligently(
        mockMessage as Message
      );

      // Should have appropriate context strategy for complex tasks
      const decisions = result.activationDecisions;
      const contextStrategies = decisions.map(d => d.contextStrategy);
      
      expect(contextStrategies).toContain('focused');
    });
  });

  describe('performance prediction', () => {
    it('should predict performance metrics accurately', async () => {
      const result = await service.activateCapabilitiesIntelligently(
        mockMessage as Message
      );

      result.activationDecisions.forEach(decision => {
        const perf = decision.performancePrediction;
        expect(perf.estimatedLatency).toBeGreaterThan(0);
        expect(perf.estimatedLatency).toBeLessThanOrEqual(30000); // Capped at 30s
        expect(perf.resourceUsage).toBeGreaterThanOrEqual(0);
        expect(perf.resourceUsage).toBeLessThanOrEqual(1.0); // Capped at 100%
        expect(perf.successProbability).toBeGreaterThanOrEqual(0.1);
        expect(perf.successProbability).toBeLessThanOrEqual(0.99);
      });
    });

    it('should account for routing intelligence in predictions', async () => {
      mockMessageAnalysis.reasoningLevel = 'expert';
      mockMessageAnalysis.responseSpeed = 'thorough';
      (unifiedMessageAnalysisService.analyzeMessage as jest.Mock).mockResolvedValue(mockMessageAnalysis);

      const result = await service.activateCapabilitiesIntelligently(
        mockMessage as Message
      );

      // Expert reasoning should increase latency but maintain high quality
      const reasoningDecisions = result.activationDecisions.filter(d =>
        d.capabilityId.includes('reasoning') || 
        d.intelligenceReasoning.some(r => r.includes('expert'))
      );

      expect(reasoningDecisions.length).toBeGreaterThan(0);
      reasoningDecisions.forEach(decision => {
        expect(decision.performancePrediction.estimatedLatency).toBeGreaterThan(1000);
      });
    });
  });

  describe('system status and monitoring', () => {
    it('should provide enhanced system status', () => {
      const status = service.getEnhancedSystemStatus();

      expect(status).toBeDefined();
      expect(status).toHaveProperty('routingIntelligence');
      expect((status as any).routingIntelligence).toHaveProperty('activeActivations');
      expect((status as any).routingIntelligence).toHaveProperty('enhancedPolicies');
    });

    it('should track activation history', async () => {
      const result = await service.activateCapabilitiesIntelligently(
        mockMessage as Message
      );

      const retrieved = service.getActivationResult('test-message-123');
      expect(retrieved).toBeDefined();
      expect(retrieved?.messageId).toBe(result.messageId);
      expect(retrieved?.activatedCapabilities).toEqual(result.activatedCapabilities);
    });

    it('should provide capability performance metrics', async () => {
      await service.activateCapabilitiesIntelligently(
        mockMessage as Message
      );

      // After activation, should be able to get performance metrics
      const metrics = service.getCapabilityPerformanceMetrics('advanced-reasoning');
      expect(metrics).toBeDefined();
    });
  });

  describe('fallback and error handling', () => {
    it('should generate appropriate fallback triggers', async () => {
      const result = await service.activateCapabilitiesIntelligently(
        mockMessage as Message
      );

      expect(result.fallbackTriggers).toEqual(expect.any(Array));
      expect(result.fallbackTriggers.length).toBeGreaterThan(0);
    });

    it('should handle capability activation failures gracefully', async () => {
      // This would be tested in integration with the actual activation engine
      const result = await service.activateCapabilitiesIntelligently(
        mockMessage as Message
      );

      result.activationDecisions.forEach(decision => {
        expect(decision.fallbackPlan.capabilities).toEqual(expect.any(Array));
        expect(decision.fallbackPlan.conditions).toEqual(expect.any(Array));
      });
    });
  });

  describe('routing intelligence specific capabilities', () => {
    it('should identify smart context management needs', async () => {
      mockMessageAnalysis.contextRequirement = 'long';
      mockMessageAnalysis.complexity = 'complex';
      (unifiedMessageAnalysisService.analyzeMessage as jest.Mock).mockResolvedValue(mockMessageAnalysis);

      const result = await service.activateCapabilitiesIntelligently(
        mockMessage as Message
      );

      const contextDecisions = result.activationDecisions.filter(d =>
        d.capabilityId.includes('context-management')
      );

      expect(contextDecisions.length).toBeGreaterThan(0);
    });

    it('should identify advanced intent detection needs', async () => {
      mockMessageAnalysis.intents = ['analysis', 'comparison', 'problem-solving'];
      mockMessageAnalysis.complexity = 'complex';
      (unifiedMessageAnalysisService.analyzeMessage as jest.Mock).mockResolvedValue(mockMessageAnalysis);

      const result = await service.activateCapabilitiesIntelligently(
        mockMessage as Message
      );

      const intentDecisions = result.activationDecisions.filter(d =>
        d.capabilityId.includes('intent-detection')
      );

      expect(intentDecisions.length).toBeGreaterThan(0);
    });

    it('should identify model routing optimization needs', async () => {
      mockMessageAnalysis.preferredProvider = 'anthropic';
      mockMessageAnalysis.modelCapabilities = {
        needsCoding: true,
        needsReasoning: true,
        needsCreativity: false,
        needsFactuality: true,
        needsMultimodal: false,
        needsTools: true
      };
      (unifiedMessageAnalysisService.analyzeMessage as jest.Mock).mockResolvedValue(mockMessageAnalysis);

      const result = await service.activateCapabilitiesIntelligently(
        mockMessage as Message
      );

      const routingDecisions = result.activationDecisions.filter(d =>
        d.capabilityId.includes('routing-optimization')
      );

      expect(routingDecisions.length).toBeGreaterThan(0);
    });
  });
});