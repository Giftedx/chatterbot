import { describe, beforeEach, test, expect } from '@jest/globals';
import { 
  AdvancedIntentDetectionService,
  type IntentClassification 
} from '../src/services/advanced-intent-detection.service.js';

describe('AdvancedIntentDetectionService', () => {
  let service: AdvancedIntentDetectionService;

  beforeEach(() => {
    service = new AdvancedIntentDetectionService();
  });

  describe('Conversational Intents', () => {
    test('should detect greeting intent', async () => {
      const result = await service.classifyIntent('Hello there!');
      
      expect(result.primary).toBe('greeting');
      expect(result.category).toBe('conversational');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.complexity).toBe('simple');
    });

    test('should detect farewell intent', async () => {
      const result = await service.classifyIntent('Thanks for your help, goodbye!');
      
      expect(result.primary).toBe('farewell');
      expect(result.category).toBe('conversational');
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Technical Intents', () => {
    test('should detect coding help intent', async () => {
      const result = await service.classifyIntent(
        'Help me debug this function - it has an error'
      );
      
      expect(result.primary).toBe('coding_help');
      expect(result.category).toBe('technical');
      expect(result.subCategory).toBe('programming');
      expect(result.complexity).toBe('complex');
    });

    test('should detect code review intent with code block', async () => {
      const result = await service.classifyIntent(
        'Can you review this code implementation?'
      );
      
      expect(result.primary).toBe('code_review');
      expect(result.category).toBe('technical');
      expect(['complex', 'expert']).toContain(result.complexity);
    });
  });

  describe('Informational Intents', () => {
    test('should detect question intent', async () => {
      const result = await service.classifyIntent('What is machine learning?');
      
      expect(result.primary).toBe('question');
      expect(result.category).toBe('informational');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test('should detect definition intent', async () => {
      const result = await service.classifyIntent('Define artificial intelligence');
      
      expect(result.primary).toBe('definition');
      expect(result.category).toBe('informational');
      expect(result.subCategory).toBe('explanation');
    });
  });

  describe('Multimodal Intents', () => {
    test('should detect image analysis intent', async () => {
      const result = await service.classifyIntent(
        'Can you analyze this image for me?',
        { 
          hasAttachments: true,
          attachmentTypes: ['image/png']
        }
      );
      
      expect(result.primary).toBe('image_analysis');
      expect(result.category).toBe('multimodal');
      expect(result.subCategory).toBe('visual');
      expect(result.complexity).toBe('complex');
    });

    test('should detect image generation intent', async () => {
      const result = await service.classifyIntent('Create an image of a sunset');
      
      expect(result.primary).toBe('image_generation');
      expect(result.category).toBe('multimodal');
      expect(result.subCategory).toBe('creation');
    });
  });

  describe('Analytical Intents', () => {
    test('should detect analysis intent', async () => {
      const result = await service.classifyIntent('Analyze the pros and cons of this approach');
      
      expect(result.primary).toBe('analysis');
      expect(result.category).toBe('analytical');
      expect(result.complexity).toBe('complex');
    });
  });

  describe('Memory Intents', () => {
    test('should detect memory recall intent', async () => {
      const result = await service.classifyIntent('What did I mention earlier about the project?');
      
      expect(result.primary).toBe('memory_recall');
      expect(result.category).toBe('memory');
      expect(result.complexity).toBe('moderate');
    });
  });

  describe('Meta Intents', () => {
    test('should detect capability inquiry', async () => {
      const result = await service.classifyIntent('What can you help me with?');
      
      expect(result.primary).toBe('capability_inquiry');
      expect(result.category).toBe('meta');
      expect(result.complexity).toBe('simple');
    });
  });

  describe('Urgency Detection', () => {
    test('should detect urgent messages', async () => {
      const result = await service.classifyIntent('URGENT: Fix this code immediately!');
      
      expect(result.urgency).toBe('urgent');
    });

    test('should detect high priority messages', async () => {
      const result = await service.classifyIntent('Help me with this problem!');
      
      expect(result.urgency).toBe('high');
    });

    test('should detect normal priority questions', async () => {
      const result = await service.classifyIntent('Can you help me understand this?');
      
      expect(result.urgency).toBe('normal');
    });
  });

  describe('Complexity Assessment', () => {
    test('should assess simple complexity', async () => {
      const result = await service.classifyIntent('Hi');
      
      expect(result.complexity).toBe('simple');
    });

    test('should assess complex messages with code', async () => {
      const result = await service.classifyIntent(
        'Please analyze this complex algorithm and provide detailed feedback'
      );
      
      expect(['complex', 'expert']).toContain(result.complexity);
    });
  });

  describe('Secondary Intents', () => {
    test('should identify secondary intents', async () => {
      const result = await service.classifyIntent(
        'Hello! Can you help me write and analyze some code?'
      );
      
      expect(result.secondary).toBeInstanceOf(Array);
      expect(result.secondary.length).toBeGreaterThan(0);
    });
  });

  describe('Reasoning', () => {
    test('should provide reasoning for classification', async () => {
      const result = await service.classifyIntent('What is TypeScript?');
      
      expect(result.reasoning).toBeInstanceOf(Array);
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.reasoning[0]).toContain('Primary intent:');
    });
  });

  describe('Service Stats', () => {
    test('should return valid statistics', () => {
      const stats = service.getStats();
      
      expect(stats.totalPatterns).toBeGreaterThan(0);
      expect(stats.categoryCounts).toHaveProperty('conversational');
      expect(stats.categoryCounts).toHaveProperty('technical');
      expect(stats.categoryCounts).toHaveProperty('informational');
      expect(stats.complexityDistribution).toHaveProperty('simple');
      expect(stats.complexityDistribution).toHaveProperty('complex');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty messages', async () => {
      const result = await service.classifyIntent('');
      
      expect(result.primary).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    test('should handle very long messages', async () => {
      const longMessage = 'explain this ' + 'very '.repeat(200) + 'complex topic';
      const result = await service.classifyIntent(longMessage);
      
      expect(result.primary).toBeDefined();
      expect(['complex', 'expert']).toContain(result.complexity);
    });

    test('should handle messages with special characters', async () => {
      const result = await service.classifyIntent('What is 2+2? (Please explain @everyone)');
      
      expect(result.primary).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });
});