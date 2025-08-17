/**
 * Tree of Thoughts Service
 * 
 * Implements Tree of Thoughts reasoning for complex problem-solving.
 * Based on "Tree of Thoughts: Deliberate Problem Solving with Large Language Models"
 * 
 * This service enables the AI to:
 * 1. Explore multiple reasoning paths simultaneously
 * 2. Evaluate and prune less promising branches
 * 3. Expand the most promising thoughts
 * 4. Find optimal solutions through tree search
 */

import { logger } from '../../utils/logger.js';
import { 
    ThoughtNode, 
    TreeOfThoughtsSession,
    ReasoningStep,
    AdvancedReasoningResponse,
    TreeSearchConfig,
    ThoughtEvaluation
} from './types.js';

export class TreeOfThoughtsService {
    private sessions = new Map<string, TreeOfThoughtsSession>();
    
    constructor(private defaultConfig: TreeSearchConfig = {
        maxDepth: 4,
        branchingFactor: 3,
        evaluationMethod: 'confidence',
        searchStrategy: 'best-first',
        pruningThreshold: 0.3
    }) {}

    /**
     * Create a new Tree of Thoughts session
     */
    createSession(
        sessionId: string,
        problem: string,
        config?: Partial<TreeSearchConfig>
    ): TreeOfThoughtsSession {
        const fullConfig = { ...this.defaultConfig, ...config };
        
        const rootNode: ThoughtNode = {
            id: `root-${sessionId}`,
            content: `Initial analysis: ${problem}`,
            parentId: null,
            children: [],
            depth: 0,
            value: 0.5, // Neutral starting value
            isExpanded: false,
            isSelected: false,
            metadata: {
                timestamp: new Date(),
                generationIndex: 0
            }
        };

        const session: TreeOfThoughtsSession = {
            id: sessionId,
            problem,
            rootNodeId: rootNode.id,
            nodes: new Map([[rootNode.id, rootNode]]),
            maxDepth: fullConfig.maxDepth,
            branchingFactor: fullConfig.branchingFactor,
            isComplete: false,
            createdAt: new Date()
        };

        this.sessions.set(sessionId, session);
        logger.debug(`Created Tree of Thoughts session ${sessionId}`, { problem });
        
        return session;
    }

    /**
     * Expand a node by generating child thoughts
     */
    async expandNode(
        sessionId: string,
        nodeId: string,
        customThoughts?: string[]
    ): Promise<ThoughtNode[]> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const node = session.nodes.get(nodeId);
        if (!node) {
            throw new Error(`Node ${nodeId} not found`);
        }

        if (node.depth >= session.maxDepth) {
            logger.debug(`Node ${nodeId} is at max depth, not expanding`);
            return [];
        }

        // Generate child thoughts
        const childThoughts = customThoughts || await this.generateChildThoughts(node, session);
        const childNodes: ThoughtNode[] = [];

        for (let i = 0; i < Math.min(childThoughts.length, session.branchingFactor); i++) {
            const childId = `${nodeId}-child-${i}`;
            const childNode: ThoughtNode = {
                id: childId,
                content: childThoughts[i],
                parentId: nodeId,
                children: [],
                depth: node.depth + 1,
                value: 0.5, // Will be evaluated
                isExpanded: false,
                isSelected: false,
                metadata: {
                    timestamp: new Date(),
                    generationIndex: i
                }
            };

            session.nodes.set(childId, childNode);
            node.children.push(childId);
            childNodes.push(childNode);
        }

        node.isExpanded = true;
        
        // Evaluate the new child nodes
        await this.evaluateNodes(sessionId, childNodes.map(n => n.id));
        
        logger.debug(`Expanded node ${nodeId} with ${childNodes.length} children`);
        return childNodes;
    }

    /**
     * Evaluate nodes and assign values
     */
    async evaluateNodes(sessionId: string, nodeIds: string[]): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        for (const nodeId of nodeIds) {
            const node = session.nodes.get(nodeId);
            if (node) {
                const evaluation = await this.evaluateNode(node, session);
                node.value = evaluation.value;
                node.metadata.evaluationReason = evaluation.reasoning;
            }
        }
    }

    /**
     * Select the best path through the tree
     */
    selectBestPath(sessionId: string): string[] {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const path = this.findBestPathToLeaf(session, session.rootNodeId);
        session.selectedPath = path;
        
        // Mark selected nodes
        for (const nodeId of path) {
            const node = session.nodes.get(nodeId);
            if (node) {
                node.isSelected = true;
            }
        }

        logger.debug(`Selected best path with ${path.length} nodes for session ${sessionId}`);
        return path;
    }

    /**
     * Generate comprehensive response using Tree of Thoughts
     */
    async generateResponse(
        sessionId: string,
        problem: string,
        config?: Partial<TreeSearchConfig>
    ): Promise<AdvancedReasoningResponse> {
        const startTime = Date.now();
        
        // Create or retrieve session
        const session = this.sessions.get(sessionId) || 
                       this.createSession(sessionId, problem, config);

        const reasoningSteps: ReasoningStep[] = [];

        // Explore the tree systematically
        await this.exploreTree(session, session.branchingFactor > 2 ? 'best-first' : 'breadth-first', reasoningSteps);

        // Select the best path
        const bestPath = this.selectBestPath(sessionId);
        const pathContent = this.constructSolution(session, bestPath);

        session.isComplete = true;
        const processingTime = Date.now() - startTime;

        return {
            id: sessionId,
            type: 'tree-of-thoughts',
            primaryResponse: pathContent,
            reasoningProcess: reasoningSteps,
            confidence: this.calculatePathConfidence(session, bestPath),
            alternatives: this.generateAlternatives(session),
            metadata: {
                processingTime,
                complexityScore: this.calculateComplexity(session),
                resourcesUsed: ['tree-of-thoughts', 'evaluation-heuristics']
            }
        };
    }

    // Private helper methods

    private async generateChildThoughts(
        node: ThoughtNode,
        session: TreeOfThoughtsSession
    ): Promise<string[]> {
        // Generate diverse child thoughts based on the current node and problem context
        const thoughts: string[] = [];
        
        switch (node.depth) {
            case 0: // Root level - break down the problem
                thoughts.push(...this.generateProblemDecomposition(session.problem));
                break;
            case 1: // First level - explore approaches
                thoughts.push(...this.generateApproachVariations(node.content));
                break;
            default: // Deeper levels - refine and elaborate
                thoughts.push(...this.generateRefinements(node.content, node.depth));
        }

        return thoughts;
    }

    private generateProblemDecomposition(problem: string): string[] {
        return [
            `Break down the core components of: ${problem}`,
            `Consider different perspectives on: ${problem}`,
            `Identify key constraints and requirements for: ${problem}`
        ];
    }

    private generateApproachVariations(parentContent: string): string[] {
        return [
            `Direct approach: ${parentContent} - implement straightforward solution`,
            `Alternative approach: ${parentContent} - explore creative alternatives`,
            `Systematic approach: ${parentContent} - use structured methodology`
        ];
    }

    private generateRefinements(content: string, depth: number): string[] {
        return [
            `Refine and elaborate on: ${content}`,
            `Consider edge cases for: ${content}`,
            `Optimize the solution: ${content}`
        ];
    }

    private async evaluateNode(
        node: ThoughtNode,
        session: TreeOfThoughtsSession
    ): Promise<ThoughtEvaluation> {
        // Evaluate based on multiple criteria
        const relevanceScore = this.assessRelevance(node.content, session.problem);
        const clarityScore = this.assessClarity(node.content);
        const feasibilityScore = this.assessFeasibility(node.content, node.depth);
        const creativityScore = this.assessCreativity(node.content, session);

        const overallValue = (relevanceScore + clarityScore + feasibilityScore + creativityScore) / 4;
        
        return {
            nodeId: node.id,
            value: overallValue,
            reasoning: `Evaluated based on relevance (${relevanceScore.toFixed(2)}), clarity (${clarityScore.toFixed(2)}), feasibility (${feasibilityScore.toFixed(2)}), creativity (${creativityScore.toFixed(2)})`,
            isPromising: overallValue >= this.defaultConfig.pruningThreshold,
            shouldExpand: overallValue >= 0.6 && node.depth < session.maxDepth
        };
    }

    private assessRelevance(content: string, problem: string): number {
        // Simple relevance assessment based on keyword overlap
        const problemWords = problem.toLowerCase().split(/\s+/);
        const contentWords = content.toLowerCase().split(/\s+/);
        const overlap = problemWords.filter(word => contentWords.includes(word)).length;
        return Math.min(1.0, overlap / Math.max(problemWords.length * 0.3, 1));
    }

    private assessClarity(content: string): number {
        // Assess clarity based on content length and structure
        const words = content.split(/\s+/).length;
        const sentences = content.split(/[.!?]+/).length;
        const avgWordsPerSentence = words / Math.max(sentences, 1);
        
        // Prefer moderate length with clear structure
        if (avgWordsPerSentence >= 5 && avgWordsPerSentence <= 20 && words >= 10) {
            return 0.8;
        } else if (words < 5) {
            return 0.4; // Too brief
        } else {
            return 0.6; // Either too long or poorly structured
        }
    }

    private assessFeasibility(content: string, depth: number): number {
        // Deeper nodes should be more specific and actionable
        const specificity = content.includes('implement') || content.includes('use') || 
                          content.includes('apply') || content.includes('create') ? 0.8 : 0.5;
        const depthBonus = Math.min(0.3, depth * 0.1);
        return Math.min(1.0, specificity + depthBonus);
    }

    private assessCreativity(content: string, session: TreeOfThoughtsSession): number {
        // Check for creative or novel approaches
        const creativeWords = ['innovative', 'creative', 'novel', 'unique', 'alternative', 'unconventional'];
        const hasCreativeWords = creativeWords.some(word => content.toLowerCase().includes(word));
        
        // Check for uniqueness within the session
        const allContent = Array.from(session.nodes.values()).map(n => n.content);
        const similarity = allContent.filter(other => other !== content && 
                                           this.calculateSimilarity(content, other) > 0.7).length;
        
        const uniqueness = Math.max(0, 1 - similarity * 0.2);
        return (hasCreativeWords ? 0.7 : 0.5) * uniqueness;
    }

    private calculateSimilarity(text1: string, text2: string): number {
        const words1 = text1.toLowerCase().split(/\s+/);
        const words2 = text2.toLowerCase().split(/\s+/);
        const intersection = words1.filter(word => words2.includes(word));
        return intersection.length / Math.max(words1.length, words2.length);
    }

    private async exploreTree(
        session: TreeOfThoughtsSession,
        strategy: TreeSearchConfig['searchStrategy'],
        reasoningSteps: ReasoningStep[]
    ): Promise<void> {
        const nodesToExplore = [session.rootNodeId];
        const exploredNodes = new Set<string>();

        while (nodesToExplore.length > 0) {
            let currentNodeId: string;
            
            // Select next node based on strategy
            switch (strategy) {
                case 'breadth-first':
                    currentNodeId = nodesToExplore.shift()!;
                    break;
                case 'depth-first':
                    currentNodeId = nodesToExplore.pop()!;
                    break;
                case 'best-first':
                default:
                    // Select highest value node
                    const nodeValues = nodesToExplore.map(id => ({
                        id,
                        value: session.nodes.get(id)?.value || 0
                    }));
                    nodeValues.sort((a, b) => b.value - a.value);
                    currentNodeId = nodeValues[0].id;
                    nodesToExplore.splice(nodesToExplore.indexOf(currentNodeId), 1);
                    break;
            }

            if (exploredNodes.has(currentNodeId)) continue;
            exploredNodes.add(currentNodeId);

            const currentNode = session.nodes.get(currentNodeId);
            if (!currentNode) continue;

            // Expand node if it's promising and not at max depth
            if (currentNode.depth < session.maxDepth && 
                (currentNode.value >= this.defaultConfig.pruningThreshold || currentNode.depth === 0)) {
                
                const children = await this.expandNode(session.id, currentNodeId);
                
                // Add expansion step
                reasoningSteps.push({
                    id: `tot-expand-${currentNodeId}`,
                    type: 'thought',
                    content: `Expanded node: "${currentNode.content}" into ${children.length} child thoughts`,
                    timestamp: new Date(),
                    confidence: currentNode.value,
                    metadata: { 
                        nodeId: currentNodeId, 
                        depth: currentNode.depth,
                        childrenCount: children.length
                    }
                });

                // Add children to exploration queue
                for (const child of children) {
                    if (child.value >= this.defaultConfig.pruningThreshold) {
                        nodesToExplore.push(child.id);
                    }
                }
            }

            // Limit exploration to prevent infinite loops
            if (exploredNodes.size > 50) {
                logger.warn(`Tree exploration limit reached for session ${session.id}`);
                break;
            }
        }
    }

    private findBestPathToLeaf(session: TreeOfThoughtsSession, startNodeId: string): string[] {
        const startNode = session.nodes.get(startNodeId);
        if (!startNode) return [startNodeId];

        // If it's a leaf node, return just this node
        if (startNode.children.length === 0) {
            return [startNodeId];
        }

        // Find the best child and get its path
        let bestChild: ThoughtNode | undefined;
        let bestValue = -1;

        for (const childId of startNode.children) {
            const child = session.nodes.get(childId);
            if (child && child.value > bestValue) {
                bestValue = child.value;
                bestChild = child;
            }
        }

        if (bestChild) {
            const childPath = this.findBestPathToLeaf(session, bestChild.id);
            return [startNodeId, ...childPath];
        }

        return [startNodeId];
    }

    private constructSolution(session: TreeOfThoughtsSession, path: string[]): string {
        const pathNodes = path.map(id => session.nodes.get(id)).filter(Boolean) as ThoughtNode[];
        
        if (pathNodes.length === 0) {
            return "Unable to construct solution path.";
        }

        const solution = [
            `**Analysis of: ${session.problem}**`,
            '',
            ...pathNodes.slice(1).map((node, index) => 
                `${index + 1}. ${node.content} *(confidence: ${Math.round(node.value * 100)}%)*`
            ),
            '',
            `**Final recommendation:** ${pathNodes[pathNodes.length - 1].content}`
        ];

        return solution.join('\n');
    }

    private calculatePathConfidence(session: TreeOfThoughtsSession, path: string[]): number {
        const pathNodes = path.map(id => session.nodes.get(id)).filter(Boolean) as ThoughtNode[];
        if (pathNodes.length === 0) return 0;
        
        const avgConfidence = pathNodes.reduce((sum, node) => sum + node.value, 0) / pathNodes.length;
        return Math.round(avgConfidence * 100) / 100;
    }

    private generateAlternatives(session: TreeOfThoughtsSession): string[] {
        // Find alternative high-value paths
        const allNodes = Array.from(session.nodes.values());
        const leafNodes = allNodes.filter(node => node.children.length === 0 && node.value > 0.5);
        
        return leafNodes
            .sort((a, b) => b.value - a.value)
            .slice(1, 4) // Top 3 alternatives
            .map(node => `Alternative approach: ${node.content} (${Math.round(node.value * 100)}% confidence)`);
    }

    private calculateComplexity(session: TreeOfThoughtsSession): number {
        return session.nodes.size / 10; // Simple complexity based on tree size
    }
}