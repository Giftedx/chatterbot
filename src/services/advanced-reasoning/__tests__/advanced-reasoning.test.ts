/**
 * Advanced Reasoning Integration Tests
 * 
 * Comprehensive tests for the advanced reasoning capabilities
 */

import { AdvancedReasoningOrchestrator } from '../advanced-reasoning-orchestrator.service.js';
import { ReActFrameworkService } from '../react-framework.service.js';
import { ChainOfDraftService } from '../chain-of-draft.service.js';
import { TreeOfThoughtsService } from '../tree-of-thoughts.service.js';
import { MetaCognitiveService } from '../meta-cognitive.service.js';
import { CouncilOfCriticsService } from '../council-of-critics.service.js';
import { AdvancedReasoningConfig } from '../types.js';

// Mock logger to avoid console output in tests
jest.mock('../../../utils/logger.js', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

describe('Advanced Reasoning Engine', () => {
    let orchestrator: AdvancedReasoningOrchestrator;
    let config: AdvancedReasoningConfig;

    beforeEach(() => {
        config = {
            enableReAct: true,
            enableChainOfDraft: true,
            enableTreeOfThoughts: true,
            enableCouncilOfCritics: true,
            enableMetaCognitive: true,
            maxProcessingTime: 30000,
            maxReasoningSteps: 20,
            confidenceThreshold: 0.7,
            enableSelfReflection: true,
            enableErrorRecovery: true,
            adaptiveComplexity: true
        };
        
        orchestrator = new AdvancedReasoningOrchestrator(config);
    });

    describe('AdvancedReasoningOrchestrator', () => {
        it('should initialize with all services enabled', () => {
            const capabilities = orchestrator.getCapabilitiesStatus();
            
            expect(capabilities.react).toBe(true);
            expect(capabilities.chainOfDraft).toBe(true);
            expect(capabilities.treeOfThoughts).toBe(true);
            expect(capabilities.councilOfCritics).toBe(true);
            expect(capabilities.metaCognitive).toBe(true);
        });

        it('should process simple reasoning requests', async () => {
            const prompt = "What is 2 + 2?";
            const response = await orchestrator.processAdvancedReasoning(prompt);
            
            expect(response).toBeDefined();
            expect(response.primaryResponse).toBeTruthy();
            expect(response.confidence).toBeGreaterThan(0);
            expect(response.reasoningProcess).toBeInstanceOf(Array);
            expect(response.metadata.processingTime).toBeGreaterThan(0);
        });

        it('should handle complex reasoning with multiple perspectives', async () => {
            const prompt = "Should we implement AI in healthcare? Consider ethics, efficiency, and user experience.";
            const context = { domain: 'healthcare', stakeholders: ['patients', 'doctors', 'administrators'] };
            
            const response = await orchestrator.processAdvancedReasoning(prompt, context);
            
            expect(response).toBeDefined();
            expect(response.primaryResponse).toBeTruthy();
            expect(response.reasoningProcess.length).toBeGreaterThan(1);
            expect(response.confidence).toBeGreaterThan(0.3);
        });

        it('should handle tool-use requirements with ReAct', async () => {
            const prompt = "Search for information about machine learning and calculate the ROI.";
            
            const response = await orchestrator.processAdvancedReasoning(prompt);
            
            expect(response).toBeDefined();
            expect(response.metadata.resourcesUsed).toBeInstanceOf(Array);
            expect(response.metadata.resourcesUsed.length).toBeGreaterThan(0);
        });

        it('should provide performance analytics', () => {
            const analytics = orchestrator.getPerformanceAnalytics();
            
            expect(analytics).toBeDefined();
            expect(analytics.capabilities).toBeDefined();
            expect(analytics.metaCognitive).toBeDefined();
        });
    });

    describe('ReActFrameworkService', () => {
        let reactService: ReActFrameworkService;

        beforeEach(() => {
            reactService = new ReActFrameworkService();
        });

        it('should start and manage reasoning sessions', async () => {
            const session = await reactService.startSession('test-session', 'Solve a complex problem');
            
            expect(session).toBeDefined();
            expect(session.id).toBe('test-session');
            expect(session.goal).toBe('Solve a complex problem');
            expect(session.steps).toEqual([]);
            expect(session.isComplete).toBe(false);
        });

        it('should process reasoning steps with actions', async () => {
            await reactService.startSession('test-session', 'Calculate 15 * 23');
            
            const step = await reactService.processStep(
                'test-session',
                'I need to calculate 15 * 23',
                { name: 'calculate', parameters: { expression: '15 * 23' } }
            );
            
            expect(step).toBeDefined();
            expect(step.thought).toBe('I need to calculate 15 * 23');
            expect(step.action).toBeDefined();
            expect(step.observation).toBeTruthy();
            expect(step.confidence).toBeGreaterThan(0);
        });

        it('should generate comprehensive reasoning responses', async () => {
            const response = await reactService.generateResponse(
                'test-response',
                'Find information about renewable energy and calculate cost savings'
            );
            
            expect(response).toBeDefined();
            expect(response.type).toBe('react');
            expect(response.reasoningProcess).toBeInstanceOf(Array);
            expect(response.reasoningProcess.length).toBeGreaterThan(0);
        });

        it('should register and use custom tools', () => {
            const customTool = {
                name: 'custom-tool',
                description: 'A custom tool for testing',
                parameters: { input: 'string' },
                execute: async (params: any) => ({ result: `Processed: ${params.input}`, success: true })
            };
            
            reactService.registerTool(customTool);
            const tools = reactService.getAvailableTools();
            
            expect(tools.some(tool => tool.name === 'custom-tool')).toBe(true);
        });
    });

    describe('ChainOfDraftService', () => {
        let codService: ChainOfDraftService;

        beforeEach(() => {
            codService = new ChainOfDraftService();
        });

        it('should start draft sessions and generate initial drafts', async () => {
            const session = await codService.startSession('draft-session', 'Write a technical proposal');
            const draft = await codService.generateInitialDraft(
                'draft-session',
                'This is my initial technical proposal draft.'
            );
            
            expect(session).toBeDefined();
            expect(draft).toBeDefined();
            expect(draft.content).toBe('This is my initial technical proposal draft.');
            expect(draft.version).toBe(1);
            expect(draft.confidence).toBeGreaterThan(0);
        });

        it('should generate critiques for drafts', async () => {
            await codService.startSession('critique-session', 'Technical analysis');
            const draft = await codService.generateInitialDraft(
                'critique-session',
                'Brief technical analysis without details.'
            );
            
            const critiques = await codService.generateCritiques('critique-session', draft.id);
            
            expect(critiques).toBeInstanceOf(Array);
            expect(critiques.length).toBeGreaterThan(0);
            expect(critiques[0]).toHaveProperty('focus');
            expect(critiques[0]).toHaveProperty('content');
            expect(critiques[0]).toHaveProperty('suggestions');
        });

        it('should generate comprehensive chain-of-draft responses', async () => {
            const response = await codService.generateResponse(
                'comprehensive-draft',
                'Design a sustainable urban transportation system'
            );
            
            expect(response).toBeDefined();
            expect(response.type).toBe('chain-of-draft');
            expect(response.reasoningProcess.length).toBeGreaterThan(1);
            expect(response.confidence).toBeGreaterThan(0);
        });
    });

    describe('TreeOfThoughtsService', () => {
        let totService: TreeOfThoughtsService;

        beforeEach(() => {
            totService = new TreeOfThoughtsService();
        });

        it('should start tree sessions and expand nodes', async () => {
            const session = await totService.startSession('tree-session', 'Solve optimization problem');
            const rootNode = session.nodes.get('root');
            
            expect(session).toBeDefined();
            expect(rootNode).toBeDefined();
            expect(rootNode!.content).toBe('Solve optimization problem');
            expect(rootNode!.depth).toBe(0);
        });

        it('should expand nodes with child thoughts', async () => {
            await totService.startSession('expand-session', 'Complex problem solving');
            const childNodes = await totService.expandNode('expand-session', 'root');
            
            expect(childNodes).toBeInstanceOf(Array);
            expect(childNodes.length).toBeGreaterThan(0);
            expect(childNodes[0].depth).toBe(1);
            expect(childNodes[0].parentId).toBe('root');
        });

        it('should select best paths through the tree', async () => {
            await totService.startSession('path-session', 'Find optimal solution');
            await totService.expandNode('path-session', 'root');
            
            const bestPath = totService.selectBestPath('path-session');
            
            expect(bestPath).toBeInstanceOf(Array);
            expect(bestPath.length).toBeGreaterThan(0);
            expect(bestPath[0]).toBe('root');
        });

        it('should generate tree-of-thoughts responses', async () => {
            const response = await totService.generateResponse(
                'tree-response',
                'Design an efficient algorithm for large-scale data processing'
            );
            
            expect(response).toBeDefined();
            expect(response.type).toBe('tree-of-thoughts');
            expect(response.reasoningProcess.length).toBeGreaterThan(0);
        });
    });

    describe('MetaCognitiveService', () => {
        let metaService: MetaCognitiveService;

        beforeEach(() => {
            metaService = new MetaCognitiveService();
        });

        it('should select appropriate reasoning strategies', () => {
            const context = { type: 'mathematical', complexity: 'moderate' };
            const availableStrategies = ['analytical', 'creative', 'systematic'];
            
            const strategy = metaService.selectStrategy(context, availableStrategies);
            
            expect(availableStrategies).toContain(strategy);
        });

        it('should monitor reasoning processes', async () => {
            const monitored = await metaService.monitorReasoning(
                'analytical',
                0.4, // Low confidence
                1000,
                { type: 'complex' }
            );
            
            expect(typeof monitored).toBe('boolean');
        });

        it('should perform self-reflection on low confidence', async () => {
            const reflection = await metaService.performSelfReflection(
                'analytical',
                0.3, // Low confidence triggers reflection
                { type: 'complex' }
            );
            
            expect(reflection).toBeDefined();
            expect(reflection.trigger).toBe('low_confidence');
            expect(reflection.analysis).toBeTruthy();
            expect(reflection.improvements).toBeInstanceOf(Array);
        });

        it('should generate meta-cognitive responses', async () => {
            const response = await metaService.generateMetaCognitiveResponse(
                'How should I approach learning a new programming language?',
                { type: 'educational', complexity: 'moderate' }
            );
            
            expect(response).toBeDefined();
            expect(response.type).toBe('meta-cognitive');
            expect(response.reasoningProcess.length).toBeGreaterThan(0);
        });
    });

    describe('CouncilOfCriticsService', () => {
        let councilService: CouncilOfCriticsService;

        beforeEach(() => {
            councilService = new CouncilOfCriticsService();
        });

        it('should have diverse critics available', () => {
            const critics = councilService.getAvailableCritics();
            
            expect(critics).toBeInstanceOf(Array);
            expect(critics.length).toBeGreaterThan(3);
            
            const perspectives = critics.map(c => c.perspective);
            const uniquePerspectives = new Set(perspectives);
            expect(uniquePerspectives.size).toBeGreaterThan(3);
        });

        it('should start council sessions with diverse critics', async () => {
            const session = await councilService.startCouncilSession(
                'council-session',
                'Should we implement remote work policies?'
            );
            
            expect(session).toBeDefined();
            expect(session.topic).toBe('Should we implement remote work policies?');
            expect(session.critics.length).toBeGreaterThan(2);
        });

        it('should conduct comprehensive council analysis', async () => {
            const response = await councilService.conductCouncilAnalysis(
                'analysis-session',
                'Evaluate the pros and cons of artificial intelligence in education',
                { domain: 'education', stakeholders: ['students', 'teachers', 'administrators'] }
            );
            
            expect(response).toBeDefined();
            expect(response.type).toBe('council');
            expect(response.reasoningProcess.length).toBeGreaterThan(3); // Multiple critics
            expect(response.primaryResponse).toContain('Council');
        });
    });

    describe('Integration Tests', () => {
        it('should handle complex multi-strategy problems', async () => {
            const prompt = `
                Design a comprehensive strategy for implementing AI in a large healthcare organization.
                Consider technical feasibility, ethical implications, user adoption, regulatory compliance,
                and long-term sustainability. Provide multiple perspectives and iterative refinement.
            `;
            
            const context = {
                domain: 'healthcare',
                complexity: 'highly_complex',
                stakeholders: ['patients', 'doctors', 'nurses', 'administrators', 'regulators'],
                timeframe: 'long-term'
            };
            
            const response = await orchestrator.processAdvancedReasoning(prompt, context);
            
            expect(response).toBeDefined();
            expect(response.primaryResponse).toBeTruthy();
            expect(response.primaryResponse.length).toBeGreaterThan(200);
            expect(response.confidence).toBeGreaterThan(0.4);
            expect(response.reasoningProcess.length).toBeGreaterThan(5);
            expect(response.alternatives).toBeInstanceOf(Array);
            expect(response.metadata.resourcesUsed.length).toBeGreaterThan(1);
        });

        it('should demonstrate adaptive strategy selection', async () => {
            const simplePrompt = "What is 2 + 2?";
            const complexPrompt = "Analyze the societal implications of widespread AI adoption across multiple industries, considering economic, ethical, and technological perspectives.";
            
            const simpleResponse = await orchestrator.processAdvancedReasoning(simplePrompt);
            const complexResponse = await orchestrator.processAdvancedReasoning(complexPrompt);
            
            // Complex response should have more reasoning steps
            expect(complexResponse.reasoningProcess.length).toBeGreaterThanOrEqual(simpleResponse.reasoningProcess.length);
            // Complex response should have higher or equal complexity score
            expect(complexResponse.metadata.complexityScore).toBeGreaterThanOrEqual(simpleResponse.metadata.complexityScore);
        });

        it('should handle error recovery gracefully', async () => {
            // Create orchestrator with limited capabilities
            const limitedConfig: AdvancedReasoningConfig = {
                enableReAct: false,
                enableChainOfDraft: false,
                enableTreeOfThoughts: false,
                enableCouncilOfCritics: false,
                enableMetaCognitive: false,
                maxProcessingTime: 1000,
                maxReasoningSteps: 5,
                confidenceThreshold: 0.7,
                enableSelfReflection: false,
                enableErrorRecovery: true,
                adaptiveComplexity: false
            };
            
            const limitedOrchestrator = new AdvancedReasoningOrchestrator(limitedConfig);
            const response = await limitedOrchestrator.processAdvancedReasoning("Complex reasoning task");
            
            expect(response).toBeDefined();
            expect(response.primaryResponse).toBeTruthy();
            expect(response.metadata).toBeDefined();
            expect(response.metadata.resourcesUsed).toBeInstanceOf(Array);
        });
    });

    describe('Performance and Quality Metrics', () => {
        it('should complete reasoning within acceptable time limits', async () => {
            const startTime = Date.now();
            const response = await orchestrator.processAdvancedReasoning(
                "Design a sustainable urban transportation system with AI optimization"
            );
            const endTime = Date.now();
            
            expect(response).toBeDefined();
            expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
            expect(response.metadata.processingTime).toBeGreaterThanOrEqual(0);
        });

        it('should maintain confidence levels above minimum thresholds', async () => {
            const testPrompts = [
                "What are the benefits of renewable energy?",
                "How can we improve team collaboration?",
                "Design a mobile app for productivity",
                "Analyze market trends in technology"
            ];
            
            for (const prompt of testPrompts) {
                const response = await orchestrator.processAdvancedReasoning(prompt);
                expect(response.confidence).toBeGreaterThan(0.2); // Minimum acceptable confidence
            }
        });

        it('should provide comprehensive reasoning processes', async () => {
            const response = await orchestrator.processAdvancedReasoning(
                "Should a startup focus on rapid growth or sustainable development? Consider multiple stakeholder perspectives."
            );
            
            expect(response.reasoningProcess.length).toBeGreaterThan(3);
            
            // Check for diverse reasoning step types
            const stepTypes = response.reasoningProcess.map(step => step.type);
            const uniqueTypes = new Set(stepTypes);
            expect(uniqueTypes.size).toBeGreaterThan(1);
        });
    });
});