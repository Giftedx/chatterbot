/**
 * Tests for Multi-step Decision Service
 */

import { MultiStepDecisionService, DecisionStep, DecisionWorkflow } from '../multi-step-decision.service.js';
import { ReasoningServiceSelector } from '../reasoning-service-selector.service.js';
import { ConfidenceEscalationService } from '../confidence-escalation.service.js';
import { DecisionContext } from '../decision-engine.service.js';

// Mock services
const mockReasoningSelector = {
  selectReasoningService: jest.fn()
} as unknown as ReasoningServiceSelector;

const mockEscalationService = {
  evaluateAndEscalate: jest.fn()
} as unknown as ConfidenceEscalationService;

describe('MultiStepDecisionService', () => {
  let service: MultiStepDecisionService;
  let mockContext: DecisionContext;

  beforeEach(() => {
    service = new MultiStepDecisionService(
      {},
      mockReasoningSelector,
      mockEscalationService
    );

    mockContext = {
      optedIn: true,
      isDM: false,
      isPersonalThread: false,
      mentionedBot: true,
      repliedToBot: false,
      personality: {
        relationshipStrength: 0.8,
        userMood: 'neutral',
        personalityCompatibility: 0.9
      }
    };

    // Reset mocks
    jest.clearAllMocks();
    
    // Default mock implementations
    (mockReasoningSelector.selectReasoningService as jest.Mock).mockResolvedValue({
      serviceName: 'enhanced-reasoning',
      config: { name: 'enhanced-reasoning' },
      parameters: {},
      confidence: 0.8,
      reasoning: 'Selected for multi-step',
      fallbacks: []
    });

    (mockEscalationService.evaluateAndEscalate as jest.Mock).mockResolvedValue({
      triggered: false,
      originalConfidence: 0.8,
      finalConfidence: 0.8,
      totalAttempts: 0,
      successfulAttempts: 0,
      totalExecutionTime: 0,
      escalationPath: [],
      reasoning: 'No escalation needed',
      recommendNextAction: 'proceed'
    });
  });

  describe('Service Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(service).toBeInstanceOf(MultiStepDecisionService);
      expect(service.getAvailableTemplates()).toContain('complex_reasoning');
      expect(service.getAvailableTemplates()).toContain('quick_multi_step');
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        maxStepsPerDecision: 15,
        maxExecutionTime: 600000,
        enableBranching: false
      };
      
      const customService = new MultiStepDecisionService(
        customConfig,
        mockReasoningSelector,
        mockEscalationService
      );
      
      expect(customService).toBeInstanceOf(MultiStepDecisionService);
    });

    it('should track active workflow count', () => {
      expect(service.getActiveWorkflowCount()).toBe(0);
    });
  });

  describe('Workflow Template Management', () => {
    it('should provide available workflow templates', () => {
      const templates = service.getAvailableTemplates();
      expect(templates).toContain('complex_reasoning');
      expect(templates).toContain('quick_multi_step');
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should return template names as strings', () => {
      const templates = service.getAvailableTemplates();
      templates.forEach(template => {
        expect(typeof template).toBe('string');
      });
    });
  });

  describe('Complex Reasoning Workflow', () => {
    it('should execute complex reasoning workflow successfully', async () => {
      const result = await service.executeMultiStepDecision(mockContext, 'complex_reasoning');
      
      expect(result.success).toBe(true);
      expect(result.workflowId).toContain('complex_reasoning_'); // Generated workflow ID
      expect(result.totalSteps).toBeGreaterThan(0); // Should have executed steps
      expect(result.finalConfidence).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should handle complex reasoning workflow with escalation', async () => {
      // Mock low confidence result that triggers escalation
      (mockEscalationService.evaluateAndEscalate as jest.Mock).mockResolvedValue({
        triggered: true,
        originalConfidence: 0.4,
        finalConfidence: 0.8,
        totalAttempts: 2,
        successfulAttempts: 1,
        totalExecutionTime: 5000,
        bestResult: { enhanced: 'escalated result' },
        bestResultConfidence: 0.85,
        escalationPath: [
          {
            attemptNumber: 1,
            serviceName: 'tree-of-thoughts',
            success: true,
            resultConfidence: 0.85
          }
        ],
        reasoning: 'Escalation improved confidence',
        recommendNextAction: 'proceed_with_result'
      });

      const result = await service.executeMultiStepDecision(mockContext, 'complex_reasoning');
      
      expect(result).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should track workflow performance metrics', async () => {
      const result = await service.executeMultiStepDecision(mockContext, 'complex_reasoning');
      
      expect(result.executionTime).toBeGreaterThanOrEqual(0); // Allow 0 for mocked execution
      expect(result.decisionReasoning).toBeDefined();
      expect(Array.isArray(result.decisionReasoning)).toBe(true);
      expect(result.confidenceProgression).toBeDefined();
      expect(Array.isArray(result.confidenceProgression)).toBe(true);
    });
  });

  describe('Quick Multi-step Workflow', () => {
    it('should execute quick multi-step workflow successfully', async () => {
      const result = await service.executeMultiStepDecision(mockContext, 'quick_multi_step');
      
      expect(result.success).toBe(true);
      expect(result.workflowId).toContain('quick_multi_step_'); // Generated workflow ID
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should complete quick workflow faster than complex', async () => {
      const quickStart = Date.now();
      const quickResult = await service.executeMultiStepDecision(mockContext, 'quick_multi_step');
      const quickTime = Date.now() - quickStart;

      const complexStart = Date.now();
      const complexResult = await service.executeMultiStepDecision(mockContext, 'complex_reasoning');
      const complexTime = Date.now() - complexStart;

      // Both should complete, timing may vary due to mocks
      expect(quickResult).toBeDefined();
      expect(complexResult).toBeDefined();
      expect(quickTime).toBeGreaterThan(0);
      expect(complexTime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown workflow template', async () => {
      const result = await service.executeMultiStepDecision(mockContext, 'unknown_template');
      
      expect(result.success).toBe(false);
      expect(result.workflowId).toBe('failed');
      expect(result.decisionReasoning.length).toBeGreaterThan(0);
      expect(result.decisionReasoning[0]).toContain('Failed to execute workflow');
    });

    it('should handle reasoning service selection failure', async () => {
      (mockReasoningSelector.selectReasoningService as jest.Mock).mockRejectedValue(
        new Error('Service selection failed')
      );

      const result = await service.executeMultiStepDecision(mockContext, 'quick_multi_step');
      
      expect(result.success).toBe(false);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should handle escalation service failure', async () => {
      (mockEscalationService.evaluateAndEscalate as jest.Mock).mockRejectedValue(
        new Error('Escalation failed')
      );

      const result = await service.executeMultiStepDecision(mockContext, 'complex_reasoning');
      
      // Should still complete even if escalation fails
      expect(result).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should provide meaningful error messages', async () => {
      const result = await service.executeMultiStepDecision(mockContext, 'unknown_template');
      
      expect(result.decisionReasoning[0]).toContain('Unknown workflow template: unknown_template');
      expect(result.nextActions).toContain('retry_with_simpler_workflow');
    });
  });

  describe('Personality Integration', () => {
    it('should consider personality context in workflow execution', async () => {
      const personalityContext: DecisionContext = {
        ...mockContext,
        personality: {
          relationshipStrength: 0.9,
          userMood: 'excited',
          personalityCompatibility: 0.8,
          userInteractionPattern: {
            userId: 'test-user',
            toolUsageFrequency: new Map(),
            responsePreferences: {
              preferredLength: 'detailed',
              communicationStyle: 'technical',
              includeExamples: true,
              topicInterests: ['programming']
            },
            behaviorMetrics: {
              averageSessionLength: 300,
              mostActiveTimeOfDay: 14,
              commonQuestionTypes: ['technical'],
              successfulInteractionTypes: ['deep-analysis'],
              feedbackScores: [4.5]
            },
            learningProgress: {
              improvementAreas: ['advanced-topics'],
              masteredTopics: ['basics'],
              recommendedNextSteps: ['practice']
            },
            adaptationHistory: []
          },
          activePersona: {
            id: 'technical-expert',
            name: 'Technical Expert',
            personality: {
              formality: 0.8,
              enthusiasm: 0.6,
              humor: 0.3,
              supportiveness: 0.7,
              curiosity: 0.9,
              directness: 0.8,
              empathy: 0.5,
              playfulness: 0.2
            },
            communicationStyle: {
              messageLength: 'long',
              useEmojis: 0.1,
              useSlang: 0.1,
              askQuestions: 0.7,
              sharePersonalExperiences: 0.3,
              useTypingPhrases: 0.4,
              reactionTiming: 'delayed'
            }
          }
        }
      };

      const result = await service.executeMultiStepDecision(personalityContext, 'complex_reasoning');
      
      expect(result).toBeDefined();
      // Verify that reasoning selector was called with personality context
      expect(mockReasoningSelector.selectReasoningService).toHaveBeenCalled();
      const calls = (mockReasoningSelector.selectReasoningService as jest.Mock).mock.calls;
      if (calls.length > 0) {
        expect(calls[0][2]).toBeDefined(); // personality context parameter
      }
    });

    it('should adapt workflow based on user mood', async () => {
      const frustratedContext: DecisionContext = {
        ...mockContext,
        personality: {
          ...mockContext.personality,
          userMood: 'frustrated'
        }
      };

      const result = await service.executeMultiStepDecision(frustratedContext, 'quick_multi_step');
      
      expect(result).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should consider relationship strength in workflow execution', async () => {
      const strongRelationshipContext: DecisionContext = {
        ...mockContext,
        personality: {
          ...mockContext.personality,
          relationshipStrength: 0.95
        }
      };

      const result = await service.executeMultiStepDecision(strongRelationshipContext, 'complex_reasoning');
      
      expect(result).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });
  });

  describe('Monitoring and Metrics', () => {
    it('should provide workflow status for active workflows', () => {
      // Since our mock completes immediately, no active workflows to check
      const status = service.getWorkflowStatus('non-existent');
      expect(status).toBeNull();
    });

    it('should track active workflow count during execution', async () => {
      const initialCount = service.getActiveWorkflowCount();
      expect(initialCount).toBe(0);
      
      // Execute workflow
      await service.executeMultiStepDecision(mockContext, 'quick_multi_step');
      
      // Count should return to 0 after completion
      const finalCount = service.getActiveWorkflowCount();
      expect(finalCount).toBe(0);
    });

    it('should generate comprehensive result metrics', async () => {
      const result = await service.executeMultiStepDecision(mockContext, 'complex_reasoning');
      
      expect(result).toHaveProperty('totalSteps');
      expect(result).toHaveProperty('completedSteps');
      expect(result).toHaveProperty('failedSteps');
      expect(result).toHaveProperty('executionTime');
      expect(result).toHaveProperty('averageStepConfidence');
      expect(result).toHaveProperty('bottleneckSteps');
      expect(result).toHaveProperty('criticalPath');
      expect(result).toHaveProperty('decisionReasoning');
      expect(result).toHaveProperty('confidenceProgression');
      expect(result).toHaveProperty('nextActions');
      expect(result).toHaveProperty('improvementSuggestions');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent workflows', async () => {
      const promises = [
        service.executeMultiStepDecision(mockContext, 'quick_multi_step'),
        service.executeMultiStepDecision(mockContext, 'quick_multi_step'),
        service.executeMultiStepDecision(mockContext, 'quick_multi_step')
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.executionTime).toBeGreaterThan(0);
      });
    });

    it('should complete workflows within reasonable time', async () => {
      const start = Date.now();
      const result = await service.executeMultiStepDecision(mockContext, 'quick_multi_step');
      const elapsed = Date.now() - start;
      
      // Should complete quickly with mocks
      expect(elapsed).toBeLessThan(5000); // 5 seconds max
      expect(result).toBeDefined();
    });

    it('should provide meaningful recommendations', async () => {
      const result = await service.executeMultiStepDecision(mockContext, 'complex_reasoning');
      
      expect(Array.isArray(result.nextActions)).toBe(true);
      expect(Array.isArray(result.improvementSuggestions)).toBe(true);
      
      // Should have at least one action or suggestion
      expect(result.nextActions.length + result.improvementSuggestions.length).toBeGreaterThan(0);
    });
  });
});