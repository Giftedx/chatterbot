/**
 * ReAct Framework Service
 * 
 * Implements Reasoning + Acting framework for tool-augmented reasoning.
 * Based on research from "ReAct: Synergizing Reasoning and Acting in Language Models"
 * 
 * This service enables the AI to:
 * 1. Think through problems step by step
 * 2. Take actions using available tools
 * 3. Observe results and adjust reasoning
 * 4. Iterate until goal is achieved
 */

import { logger } from '../../utils/logger.js';
import { 
    ReActStep, 
    ReActSession, 
    ReasoningStep,
    AdvancedReasoningResponse 
} from './types.js';

export interface ReActToolCall {
    name: string;
    parameters: Record<string, any>;
    description?: string;
}

export interface ReActObservation {
    result: any;
    success: boolean;
    errorMessage?: string;
    metadata?: Record<string, any>;
}

export interface AvailableTool {
    name: string;
    description: string;
    parameters: Record<string, any>;
    execute: (params: Record<string, any>) => Promise<ReActObservation>;
}

export class ReActFrameworkService {
    private sessions = new Map<string, ReActSession>();
    private availableTools = new Map<string, AvailableTool>();
    
    constructor(private maxSteps: number = 10) {
        this.initializeBasicTools();
    }

    /**
     * Start a new ReAct reasoning session
     */
    async startSession(
        sessionId: string,
        goal: string,
        context?: Record<string, any>
    ): Promise<ReActSession> {
        const session: ReActSession = {
            id: sessionId,
            goal,
            steps: [],
            currentStep: 0,
            isComplete: false,
            metadata: {
                startTime: Date.now(),
                context: context || {}
            }
        };

        this.sessions.set(sessionId, session);
        logger.info(`Started ReAct session: ${sessionId} with goal: ${goal}`);
        
        return session;
    }

    /**
     * Process a reasoning step with thought, action, and observation
     */
    async processStep(
        sessionId: string,
        thought: string,
        potentialAction?: ReActToolCall
    ): Promise<ReActStep> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        if (session.isComplete) {
            throw new Error(`Session ${sessionId} is already complete`);
        }

        const step: ReActStep = {
            thought,
            reasoning: this.generateReasoning(thought, session),
            confidence: this.calculateConfidence(thought, session)
        };

        // Execute action if provided
        if (potentialAction) {
            try {
                const observation = await this.executeAction(potentialAction);
                step.action = potentialAction;
                step.observation = this.formatObservation(observation);
                
                // Update confidence based on action success
                if (observation.success) {
                    step.confidence = Math.min(step.confidence + 0.1, 1.0);
                } else {
                    step.confidence = Math.max(step.confidence - 0.2, 0.1);
                }
            } catch (error) {
                step.observation = `Action failed: ${error instanceof Error ? error.message : String(error)}`;
                step.confidence = Math.max(step.confidence - 0.3, 0.1);
            }
        }

        session.steps.push(step);
        session.currentStep++;

        // Check if goal is achieved or max steps reached
        if (this.isGoalAchieved(session) || session.currentStep >= this.maxSteps) {
            session.isComplete = true;
            session.finalAnswer = this.generateFinalAnswer(session);
        }

        logger.debug(`ReAct step ${session.currentStep} processed for session ${sessionId}`);
        return step;
    }

    /**
     * Generate a comprehensive reasoning response using ReAct
     */
    async generateResponse(
        sessionId: string,
        prompt: string,
        availableActions?: string[]
    ): Promise<AdvancedReasoningResponse> {
        const startTime = Date.now();
        const session = await this.startSession(sessionId, prompt);
        
        const reasoningSteps: ReasoningStep[] = [];
        let currentThought = `I need to solve: ${prompt}. Let me think step by step.`;
        
        while (!session.isComplete && session.currentStep < this.maxSteps) {
            // Analyze what action might be needed
            const suggestedAction = this.suggestAction(currentThought, availableActions);
            
            // Process the step
            const step = await this.processStep(sessionId, currentThought, suggestedAction);
            
            // Convert to reasoning step format
            reasoningSteps.push({
                id: `react-${session.currentStep}`,
                type: 'thought',
                content: step.thought,
                timestamp: new Date(),
                confidence: step.confidence,
                metadata: { actionTaken: !!step.action }
            });

            if (step.action) {
                reasoningSteps.push({
                    id: `react-action-${session.currentStep}`,
                    type: 'action',
                    content: `Action: ${step.action.name} with parameters: ${JSON.stringify(step.action.parameters)}`,
                    timestamp: new Date(),
                    confidence: step.confidence
                });
            }

            if (step.observation) {
                reasoningSteps.push({
                    id: `react-obs-${session.currentStep}`,
                    type: 'observation',
                    content: `Observation: ${step.observation}`,
                    timestamp: new Date(),
                    confidence: step.confidence
                });
            }

            // Generate next thought
            currentThought = this.generateNextThought(session);
        }

        const finalConfidence = this.calculateOverallConfidence(session);
        const processingTime = Date.now() - startTime;

        return {
            id: sessionId,
            type: 'react',
            primaryResponse: session.finalAnswer || "Unable to complete reasoning process",
            reasoningProcess: reasoningSteps,
            confidence: finalConfidence,
            alternatives: this.generateAlternatives(session),
            metadata: {
                processingTime,
                complexityScore: this.calculateComplexity(session),
                resourcesUsed: this.getResourcesUsed(session)
            }
        };
    }

    /**
     * Register a new tool for ReAct actions
     */
    registerTool(tool: AvailableTool): void {
        this.availableTools.set(tool.name, tool);
        logger.info(`Registered ReAct tool: ${tool.name}`);
    }

    /**
     * Get available tools
     */
    getAvailableTools(): AvailableTool[] {
        return Array.from(this.availableTools.values());
    }

    // Private helper methods

    private initializeBasicTools(): void {
        // Search tool
        this.registerTool({
            name: 'search',
            description: 'Search for information on a topic',
            parameters: { query: 'string' },
            execute: async (params) => ({
                result: `Search results for: ${params.query}`,
                success: true,
                metadata: { source: 'internal' }
            })
        });

        // Calculate tool
        this.registerTool({
            name: 'calculate',
            description: 'Perform mathematical calculations',
            parameters: { expression: 'string' },
            execute: async (params) => {
                try {
                    // Simple calculation (in real implementation, use a safe math evaluator)
                    const result = eval(params.expression);
                    return { result, success: true };
                } catch (error) {
                    return { 
                        result: null, 
                        success: false, 
                        errorMessage: `Calculation error: ${error}` 
                    };
                }
            }
        });

        // Memory tool
        this.registerTool({
            name: 'remember',
            description: 'Store information for later retrieval',
            parameters: { key: 'string', value: 'any' },
            execute: async (params) => ({
                result: `Stored ${params.key}: ${params.value}`,
                success: true
            })
        });
    }

    private generateReasoning(thought: string, session: ReActSession): string {
        const stepNumber = session.currentStep + 1;
        const context = session.steps.length > 0 ? 
            `Based on previous steps, ` : 
            `Starting with the goal "${session.goal}", `;
        
        return `${context}in step ${stepNumber}, I'm thinking: ${thought}`;
    }

    private calculateConfidence(thought: string, session: ReActSession): number {
        // Basic confidence calculation based on thought clarity and session progress
        let confidence = 0.5;
        
        // Higher confidence for specific, actionable thoughts
        if (thought.includes('I will') || thought.includes('Let me')) {
            confidence += 0.2;
        }
        
        // Lower confidence for uncertain expressions
        if (thought.includes('maybe') || thought.includes('might')) {
            confidence -= 0.1;
        }
        
        // Confidence increases with successful steps
        const successfulSteps = session.steps.filter(s => s.confidence > 0.6).length;
        confidence += successfulSteps * 0.05;
        
        return Math.max(0.1, Math.min(1.0, confidence));
    }

    private async executeAction(action: ReActToolCall): Promise<ReActObservation> {
        const tool = this.availableTools.get(action.name);
        if (!tool) {
            return {
                result: null,
                success: false,
                errorMessage: `Tool "${action.name}" not found`
            };
        }

        try {
            return await tool.execute(action.parameters);
        } catch (error) {
            return {
                result: null,
                success: false,
                errorMessage: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private formatObservation(observation: ReActObservation): string {
        if (observation.success) {
            return `Success: ${JSON.stringify(observation.result)}`;
        } else {
            return `Error: ${observation.errorMessage}`;
        }
    }

    private isGoalAchieved(session: ReActSession): boolean {
        // Simple heuristic: if the last step has high confidence and includes completion words
        const lastStep = session.steps[session.steps.length - 1];
        if (!lastStep) return false;
        
        const completionIndicators = ['solved', 'complete', 'finished', 'answer is', 'result is'];
        const hasCompletion = completionIndicators.some(indicator => 
            lastStep.thought.toLowerCase().includes(indicator)
        );
        
        return hasCompletion && lastStep.confidence > 0.7;
    }

    private generateFinalAnswer(session: ReActSession): string {
        if (session.steps.length === 0) {
            return "No reasoning steps were completed.";
        }

        const lastStep = session.steps[session.steps.length - 1];
        const observationResults = session.steps
            .filter(step => step.observation)
            .map(step => step.observation)
            .join(' ');

        return `Based on my reasoning process: ${lastStep.thought}. ${observationResults}`;
    }

    private suggestAction(thought: string, availableActions?: string[]): ReActToolCall | undefined {
        const lowerThought = thought.toLowerCase();
        
        // Suggest search if looking for information
        if (lowerThought.includes('search') || lowerThought.includes('find') || lowerThought.includes('look up')) {
            return {
                name: 'search',
                parameters: { query: this.extractSearchQuery(thought) }
            };
        }
        
        // Suggest calculate for math problems
        if (lowerThought.includes('calculate') || lowerThought.includes('compute') || /\d+[\+\-\*\/]\d+/.test(thought)) {
            return {
                name: 'calculate',
                parameters: { expression: this.extractMathExpression(thought) }
            };
        }
        
        return undefined;
    }

    private extractSearchQuery(thought: string): string {
        // Simple extraction logic - in practice, this would be more sophisticated
        const words = thought.split(' ');
        const relevantWords = words.filter(word => 
            word.length > 3 && 
            !['search', 'find', 'look', 'about', 'information'].includes(word.toLowerCase())
        );
        return relevantWords.slice(0, 5).join(' ');
    }

    private extractMathExpression(thought: string): string {
        // Extract mathematical expressions
        const mathMatch = thought.match(/[\d\+\-\*\/\(\)\.\s]+/);
        return mathMatch ? mathMatch[0].trim() : thought;
    }

    private generateNextThought(session: ReActSession): string {
        const lastStep = session.steps[session.steps.length - 1];
        if (!lastStep) {
            return "Let me start by understanding the problem better.";
        }

        if (lastStep.observation) {
            return `Given the observation: ${lastStep.observation}, I need to analyze this result and decide on the next step.`;
        }

        return "Let me continue my reasoning process and consider what action to take next.";
    }

    private calculateOverallConfidence(session: ReActSession): number {
        if (session.steps.length === 0) return 0.1;
        
        const avgConfidence = session.steps.reduce((sum, step) => sum + step.confidence, 0) / session.steps.length;
        return Math.max(0.1, Math.min(1.0, avgConfidence));
    }

    private generateAlternatives(session: ReActSession): string[] {
        // Generate alternative approaches based on session analysis
        const alternatives: string[] = [];
        
        if (session.steps.some(step => !step.action)) {
            alternatives.push("Could explore with more tool usage for deeper analysis");
        }
        
        if (session.steps.some(step => step.confidence < 0.5)) {
            alternatives.push("Could approach with different reasoning strategy");
        }
        
        alternatives.push("Could break down into smaller sub-problems");
        
        return alternatives;
    }

    private calculateComplexity(session: ReActSession): number {
        return Math.min(10, session.steps.length + (session.steps.filter(s => s.action).length * 2));
    }

    private getResourcesUsed(session: ReActSession): string[] {
        const resources = ['react-framework'];
        const toolsUsed = session.steps
            .filter(step => step.action)
            .map(step => step.action!.name);
        
        return [...resources, ...Array.from(new Set(toolsUsed))];
    }
}