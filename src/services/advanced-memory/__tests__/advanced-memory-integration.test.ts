/**
 * Comprehensive test suite for Advanced Memory & Social Intelligence System
 * Tests episodic memory, social intelligence, and their integration
 */

import { AdvancedMemoryManager } from '../advanced-memory-manager.service.js';
import { EpisodicMemoryService } from '../episodic-memory.service.js';
import { SocialIntelligenceService } from '../social-intelligence.service.js';
import {
    AdvancedMemoryConfig,
    MemoryContext,
    EmotionalContext,
    MemoryQuery,
    SocialProfile
} from '../types.js';

// Mock logger to avoid console output in tests
jest.mock('../../../utils/logger.js', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

describe('Advanced Memory & Social Intelligence System', () => {
    let memoryManager: AdvancedMemoryManager;
    let episodicMemory: EpisodicMemoryService;
    let socialIntelligence: SocialIntelligenceService;
    let config: AdvancedMemoryConfig;

    beforeEach(() => {
        config = {
            enableEpisodicMemory: true,
            enableSocialIntelligence: true,
            enableEmotionalIntelligence: true,
            enableSemanticClustering: true,
            enableMemoryConsolidation: false, // Disable for tests
            maxMemoriesPerUser: 100,
            memoryDecayRate: 0.01,
            importanceThreshold: 0.3,
            consolidationInterval: 60000,
            socialAnalysisDepth: 'comprehensive',
            emotionalSensitivity: 0.7,
            adaptationAggressiveness: 0.6
        };

        memoryManager = new AdvancedMemoryManager(config);
        episodicMemory = new EpisodicMemoryService(config);
        socialIntelligence = new SocialIntelligenceService(config);
    });

    describe('AdvancedMemoryManager', () => {
        test('should initialize successfully', async () => {
            await memoryManager.initialize();
            expect(memoryManager).toBeDefined();
        });

        test('should store conversation memory', async () => {
            const context = {
                userId: 'user123',
                channelId: 'channel456',
                guildId: 'guild789',
                conversationId: 'conv001',
                participants: ['user123', 'bot'],
                content: 'I love programming in TypeScript!',
                timestamp: new Date()
            };

            await memoryManager.storeConversationMemory(context);
            
            const stats = memoryManager.getMemoryStatistics('user123');
            expect(stats.totalMemories).toBeGreaterThan(0);
        });

        test('should enhance response with memory and social intelligence', async () => {
            const context = {
                userId: 'user123',
                channelId: 'channel456',
                conversationId: 'conv001',
                participants: ['user123', 'bot'],
                content: 'How can I improve my coding skills?',
                timestamp: new Date()
            };

            // First store some memory
            await memoryManager.storeConversationMemory({
                ...context,
                content: 'I love programming in TypeScript!'
            });

            const originalResponse = 'Here are some tips for improving your coding skills.';
            const enhancement = await memoryManager.enhanceResponse(originalResponse, context);

            expect(enhancement.enhancedResponse).toBeDefined();
            expect(enhancement.confidenceBoost).toBeGreaterThan(0);
            expect(enhancement.socialAnalysis).toBeDefined();
        });

        test('should retrieve relevant memories', async () => {
            const userId = 'user123';
            const context = {
                userId,
                channelId: 'channel456',
                conversationId: 'conv001',
                participants: [userId, 'bot'],
                content: 'I love machine learning and AI',
                timestamp: new Date()
            };

            // Store memory
            await memoryManager.storeConversationMemory(context);

            // Search for memories
            const query = {
                userId,
                content: 'machine learning',
                limit: 5
            };

            const results = await memoryManager.searchMemories(query);
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].memory.content).toContain('machine learning');
        });

        test('should get and update social profile', async () => {
            const userId = 'user123';
            
            const profile = await memoryManager.getSocialProfile(userId);
            expect(profile.userId).toBe(userId);
            expect(profile.personality).toBeDefined();
            expect(profile.preferences).toBeDefined();

            // Update personality
            await memoryManager.updatePersonality(userId, {
                openness: 0.8,
                extraversion: 0.6
            });

            const updatedProfile = await memoryManager.getSocialProfile(userId);
            expect(updatedProfile.personality.openness).toBeCloseTo(0.8, 1);
        });
    });

    describe('EpisodicMemoryService', () => {
        test('should store and retrieve episodic memories', async () => {
            const userId = 'user123';
            const content = 'I had a great day learning about React hooks';
            const context: MemoryContext = {
                conversationId: 'conv001',
                channel: 'general',
                participants: [userId, 'bot'],
                timeOfDay: 'afternoon',
                dayOfWeek: 'Monday',
                season: 'spring'
            };

            const memory = await episodicMemory.storeMemory(userId, content, context);
            
            expect(memory.id).toBeDefined();
            expect(memory.userId).toBe(userId);
            expect(memory.content).toBe(content);
            expect(memory.importance).toBeGreaterThan(0);
            expect(memory.semanticTags.length).toBeGreaterThan(0);
        });

        test('should calculate memory importance correctly', async () => {
            const userId = 'user123';
            const context: MemoryContext = {
                conversationId: 'conv001',
                channel: 'general',
                participants: [userId, 'bot'],
                timeOfDay: 'morning',
                dayOfWeek: 'Tuesday',
                season: 'summer'
            };

            // High importance content
            const importantContent = 'This is extremely important! Please remember this crucial information.';
            const importantMemory = await episodicMemory.storeMemory(userId, importantContent, context);

            // Low importance content
            const casualContent = 'Just saying hello.';
            const casualMemory = await episodicMemory.storeMemory(userId, casualContent, context);

            expect(importantMemory.importance).toBeGreaterThan(casualMemory.importance);
        });

        test('should find memory associations', async () => {
            const userId = 'user123';
            const context: MemoryContext = {
                conversationId: 'conv001',
                channel: 'general',
                participants: [userId, 'bot'],
                timeOfDay: 'evening',
                dayOfWeek: 'Wednesday',
                season: 'autumn'
            };

            // Store related memories
            const memory1 = await episodicMemory.storeMemory(
                userId, 
                'I love JavaScript programming',
                context
            );

            const memory2 = await episodicMemory.storeMemory(
                userId,
                'JavaScript frameworks like React are amazing',
                { ...context, conversationId: 'conv002' }
            );

            // Get associations
            const associations = await episodicMemory.getMemoryAssociations(memory1.id);
            expect(associations.length).toBeGreaterThan(0);
        });

        test('should retrieve memories with complex queries', async () => {
            const userId = 'user123';
            const context: MemoryContext = {
                conversationId: 'conv001',
                channel: 'general',
                participants: [userId, 'bot'],
                timeOfDay: 'morning',
                dayOfWeek: 'Thursday',
                season: 'winter'
            };

            // Store memories with emotions
            const emotions: EmotionalContext = {
                conversationTone: 'positive',
                intensity: 0.8
            };

            await episodicMemory.storeMemory(
                userId,
                'I achieved my programming goal today!',
                context,
                emotions
            );

            // Query with multiple filters
            const query: MemoryQuery = {
                userId,
                emotions: ['positive'],
                importance: { min: 0.5 },
                semanticTags: ['programming'],
                limit: 10
            };

            const results = await episodicMemory.retrieveMemories(query);
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].memory.emotions.conversationTone).toBe('positive');
        });

        test('should provide accurate memory statistics', async () => {
            const userId = 'user123';
            const context: MemoryContext = {
                conversationId: 'conv001',
                channel: 'general',
                participants: [userId, 'bot'],
                timeOfDay: 'afternoon',
                dayOfWeek: 'Friday',
                season: 'spring'
            };

            // Store multiple memories
            for (let i = 0; i < 5; i++) {
                await episodicMemory.storeMemory(
                    userId,
                    `Memory ${i}: Learning about topic ${i}`,
                    { ...context, conversationId: `conv00${i}` }
                );
            }

            const stats = episodicMemory.getMemoryStatistics(userId);
            expect(stats.totalMemories).toBe(5);
            expect(stats.averageImportance).toBeGreaterThan(0);
            expect(stats.conversationCount).toBe(5);
            expect(stats.uniqueSemanticTags).toBeGreaterThan(0);
        });
    });

    describe('SocialIntelligenceService', () => {
        test('should create default social profile', async () => {
            const userId = 'user123';
            const profile = await socialIntelligence.getSocialProfile(userId);

            expect(profile.userId).toBe(userId);
            expect(profile.personality).toBeDefined();
            expect(profile.preferences).toBeDefined();
            expect(profile.communicationStyle).toBeDefined();
            expect(profile.relationships).toBeInstanceOf(Map);
            expect(profile.socialPatterns).toBeInstanceOf(Array);
        });

        test('should analyze social context', async () => {
            const userId = 'user123';
            const content = 'I am really excited about this new project!';
            const participants = [userId, 'user456', 'bot'];

            const analysis = await socialIntelligence.analyzeSocialContext(
                userId,
                content,
                participants
            );

            expect(analysis.userId).toBe(userId);
            expect(analysis.emotionalState).toBeDefined();
            expect(analysis.socialDynamics).toBeDefined();
            expect(analysis.adaptationSuggestions).toBeDefined();
            expect(analysis.contextualFactors).toBeDefined();
            expect(analysis.emotionalState.detected.length).toBeGreaterThan(0);
        });

        test('should update personality traits', async () => {
            const userId = 'user123';
            
            // Get initial profile
            const initialProfile = await socialIntelligence.getSocialProfile(userId);
            const initialOpenness = initialProfile.personality.openness;

            // Update personality
            await socialIntelligence.updatePersonalityTraits(userId, {
                openness: 0.9,
                extraversion: 0.7
            });

            // Get updated profile
            const updatedProfile = await socialIntelligence.getSocialProfile(userId);
            
            // Openness should have changed (blended with observation)
            expect(updatedProfile.personality.openness).not.toBe(initialOpenness);
            expect(updatedProfile.personality.openness).toBeGreaterThan(initialOpenness);
        });

        test('should provide adaptation suggestions based on context', async () => {
            const userId = 'user123';
            
            // Simulate formal conversation
            const formalContent = 'Could you please provide assistance with this technical matter?';
            const formalAnalysis = await socialIntelligence.analyzeSocialContext(
                userId,
                formalContent,
                [userId, 'bot']
            );

            // Simulate casual conversation
            const casualContent = 'Hey! Whats up? Got any cool ideas?';
            const casualAnalysis = await socialIntelligence.analyzeSocialContext(
                userId,
                casualContent,
                [userId, 'friend', 'bot']
            );

            expect(formalAnalysis.adaptationSuggestions.length).toBeGreaterThan(0);
            expect(casualAnalysis.adaptationSuggestions.length).toBeGreaterThan(0);
            
            // The suggestions should be different for different communication styles
            const formalSuggestions = formalAnalysis.adaptationSuggestions.map(s => s.suggestion);
            const casualSuggestions = casualAnalysis.adaptationSuggestions.map(s => s.suggestion);
            
            expect(formalSuggestions).not.toEqual(casualSuggestions);
        });
    });

    describe('Memory Integration', () => {
        test('should integrate episodic memory with social intelligence', async () => {
            const userId = 'user123';
            const context = {
                userId,
                channelId: 'channel456',
                conversationId: 'conv001',
                participants: [userId, 'bot'],
                content: 'I am feeling frustrated with this coding problem',
                timestamp: new Date()
            };

            // Store conversation memory
            await memoryManager.storeConversationMemory(context);

            // Enhance response using both memory and social intelligence
            const originalResponse = 'Let me help you with that.';
            const enhancement = await memoryManager.enhanceResponse(originalResponse, context);

            expect(enhancement.enhancedResponse).toBeDefined();
            expect(enhancement.emotionalConsiderations.length).toBeGreaterThan(0);
            expect(enhancement.socialAnalysis.emotionalState.detected).toContain('negative');
        });

        test('should handle disabled features gracefully', async () => {
            const disabledConfig: AdvancedMemoryConfig = {
                ...config,
                enableEpisodicMemory: false,
                enableSocialIntelligence: false,
                enableEmotionalIntelligence: false
            };

            const disabledMemoryManager = new AdvancedMemoryManager(disabledConfig);
            const context = {
                userId: 'user123',
                channelId: 'channel456',
                conversationId: 'conv001',
                participants: ['user123', 'bot'],
                content: 'Test message',
                timestamp: new Date()
            };

            await disabledMemoryManager.storeConversationMemory(context);
            const stats = disabledMemoryManager.getMemoryStatistics('user123');
            expect(stats.totalMemories).toBe(0);
            expect(stats.status).toBe('disabled');

            const enhancement = await disabledMemoryManager.enhanceResponse('Hello', context);
            expect(enhancement.enhancedResponse).toBe('Hello');
            expect(enhancement.memoriesUsed.length).toBe(0);
            expect(enhancement.confidenceBoost).toBe(0);
        });

        test('should maintain memory consistency across multiple interactions', async () => {
            const userId = 'user123';
            const baseContext = {
                userId,
                channelId: 'channel456',
                conversationId: 'conv001',
                participants: [userId, 'bot'],
                timestamp: new Date()
            };

            // Simulate conversation flow
            const interactions = [
                'Hi, I am learning React',
                'Can you explain hooks to me?',
                'I love how useState works!',
                'What about useEffect?'
            ];

            // Store all interactions
            for (const content of interactions) {
                await memoryManager.storeConversationMemory({
                    ...baseContext,
                    content
                });
            }

            // Query for React-related memories
            const reactMemories = await memoryManager.searchMemories({
                userId,
                content: 'React',
                limit: 10
            });

            expect(reactMemories.length).toBeGreaterThan(0);
            expect(reactMemories.some(m => m.memory.content.includes('React'))).toBe(true);

            // Test enhanced response with conversation history
            const enhancement = await memoryManager.enhanceResponse(
                'React hooks are powerful tools.',
                {
                    ...baseContext,
                    content: 'Tell me more about React hooks'
                }
            );

            expect(enhancement.memoriesUsed.length).toBeGreaterThan(0);
            expect(enhancement.personalizations.length).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid memory queries gracefully', async () => {
            const invalidQuery: MemoryQuery = {
                userId: 'nonexistent',
                limit: -1,
                timeRange: {
                    start: new Date('2099-01-01'),
                    end: new Date('1999-01-01') // End before start
                }
            };

            const results = await memoryManager.searchMemories(invalidQuery);
            expect(results).toBeInstanceOf(Array);
            expect(results.length).toBe(0);
        });

        test('should handle memory storage errors gracefully', async () => {
            const context = {
                userId: '', // Invalid user ID
                channelId: 'channel456',
                conversationId: 'conv001',
                participants: [],
                content: '',
                timestamp: new Date()
            };

            // Should not throw an error
            await expect(memoryManager.storeConversationMemory(context)).resolves.not.toThrow();
        });

        test('should handle social analysis with minimal content', async () => {
            const userId = 'user123';
            const minimalContent = 'ok';

            const analysis = await socialIntelligence.analyzeSocialContext(
                userId,
                minimalContent,
                [userId]
            );

            expect(analysis).toBeDefined();
            expect(analysis.emotionalState).toBeDefined();
            expect(analysis.socialDynamics).toBeDefined();
        });
    });

    describe('Performance Considerations', () => {
        test('should handle large numbers of memories efficiently', async () => {
            const userId = 'user123';
            const context = {
                userId,
                channelId: 'channel456',
                conversationId: 'conv001',
                participants: [userId, 'bot'],
                timestamp: new Date()
            };

            const startTime = Date.now();

            // Store many memories
            for (let i = 0; i < 50; i++) {
                await memoryManager.storeConversationMemory({
                    ...context,
                    content: `Memory ${i}: This is test content number ${i}`,
                    conversationId: `conv${i}`
                });
            }

            const storageTime = Date.now() - startTime;
            expect(storageTime).toBeLessThan(5000); // Should complete within 5 seconds

            // Query should also be fast
            const queryStartTime = Date.now();
            const results = await memoryManager.searchMemories({
                userId,
                content: 'test content',
                limit: 10
            });

            const queryTime = Date.now() - queryStartTime;
            expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
            expect(results.length).toBeGreaterThan(0);
        });

        test('should manage memory limits properly', async () => {
            const limitedConfig: AdvancedMemoryConfig = {
                ...config,
                maxMemoriesPerUser: 5,
                importanceThreshold: 0.1
            };

            const limitedMemoryManager = new AdvancedMemoryManager(limitedConfig);
            const userId = 'user123';
            const context = {
                userId,
                channelId: 'channel456',
                conversationId: 'conv001',
                participants: [userId, 'bot'],
                timestamp: new Date()
            };

            // Store more memories than the limit
            for (let i = 0; i < 10; i++) {
                await limitedMemoryManager.storeConversationMemory({
                    ...context,
                    content: `Memory ${i}: importance varies`,
                    conversationId: `conv${i}`
                });
            }

            const stats = limitedMemoryManager.getMemoryStatistics(userId);
            expect(stats.totalMemories).toBeLessThanOrEqual(5);
        });
    });
});