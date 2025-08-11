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
    AdvancedReasoningResponse 
} from './types.js';

export interface TreeSearchConfig {
    maxDepth: number;
    branchingFactor: number;
    evaluationMethod: 'value' | 'vote' | 'confidence';
    searchStrategy: 'breadth-first' | 'depth-first' | 'best-first';
    pruningThreshold: number;
}

export interface ThoughtEvaluation {
    nodeId: string;
    value: number;
    reasoning: string;
    isPromising: boolean;
    shouldExpand: boolean;
}

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
     * Start a new Tree of Thoughts session
     */
    async startSession(
        sessionId: string,
        problem: string,
        config?: Partial<TreeSearchConfig>
    ): Promise<TreeOfThoughtsSession> {
        const searchConfig = { ...this.defaultConfig, ...config };
        
        // Create root node
        const rootNode: ThoughtNode = {
            id: 'root',
            content: problem,
            children: [],
            depth: 0,
            value: 0.5, // Neutral starting value
            isExpanded: false,
            isSelected: false,
            metadata: {
                timestamp: new Date(),
                isRoot: true,
                config: searchConfig
            }
        };

        const session: TreeOfThoughtsSession = {
            id: sessionId,
            problem,
            nodes: new Map([['root', rootNode]]),
            rootNodeId: 'root',
            selectedPath: [],
            maxDepth: searchConfig.maxDepth,
            branchingFactor: searchConfig.branchingFactor,
            isComplete: false
        };

        this.sessions.set(sessionId, session);
        logger.info(`Started Tree of Thoughts session: ${sessionId} with problem: ${problem}`);
        
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
     * Evaluate nodes for their promise and value
     */
    async evaluateNodes(
        sessionId: string,
        nodeIds: string[]
    ): Promise<ThoughtEvaluation[]> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const evaluations: ThoughtEvaluation[] = [];

        for (const nodeId of nodeIds) {
            const node = session.nodes.get(nodeId);
            if (!node) continue;

            const evaluation = await this.evaluateNode(node, session);
            evaluations.push(evaluation);
            
            // Update node value
            node.value = evaluation.value;
            node.metadata.evaluation = evaluation;
        }

        logger.debug(`Evaluated ${evaluations.length} nodes for session ${sessionId}`);
        return evaluations;
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
        const session = await this.startSession(sessionId, problem, config);
        const reasoningSteps: ReasoningStep[] = [];

        // Initial step
        reasoningSteps.push({
            id: `tot-start-${sessionId}`,
            type: 'thought',
            content: `Starting Tree of Thoughts exploration for: ${problem}`,
            timestamp: new Date(),
            confidence: 0.5,
            metadata: { nodeId: session.rootNodeId, depth: 0 }
        });

        // Tree exploration process
        const searchStrategy = config?.searchStrategy || this.defaultConfig.searchStrategy;
        await this.exploreTree(session, searchStrategy, reasoningSteps);

        // Select best path
        const bestPath = this.selectBestPath(sessionId);
        const solution = this.constructSolution(session, bestPath);

        // Final reasoning step
        reasoningSteps.push({
            id: `tot-solution-${sessionId}`,
            type: 'thought',
            content: `Final solution: ${solution}`,
            timestamp: new Date(),
            confidence: this.calculatePathConfidence(session, bestPath),
            metadata: { 
                pathLength: bestPath.length,
                totalNodesExplored: session.nodes.size
            }
        });

        session.isComplete = true;
        session.solution = solution;

        const finalConfidence = this.calculateOverallConfidence(session);
        const processingTime = Date.now() - startTime;

        return {
            id: sessionId,
            type: 'tree-of-thoughts',
            primaryResponse: solution,
            reasoningProcess: reasoningSteps,
            confidence: finalConfidence,
            alternatives: this.generateAlternatives(session),
            metadata: {
                processingTime,
                complexityScore: this.calculateComplexity(session),
                resourcesUsed: ['tree-of-thoughts', 'multi-path-exploration'],
                errorRecovery: this.getErrorRecovery(session)
            }
        };
    }

    /**
     * Get session tree visualization
     */
    getTreeVisualization(sessionId: string): Record<string, any> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        return this.buildTreeVisualization(session);
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
        const decompositions: string[] = [];
        
        // Analytical decomposition
        decompositions.push(`Break down "${problem}" into smaller sub-problems`);
        
        // Different perspective approaches
        decompositions.push(`Approach "${problem}" from a practical implementation perspective`);
        decompositions.push(`Consider the theoretical foundations needed for "${problem}"`);
        
        // Creative approaches
        if (decompositions.length < 3) {
            decompositions.push(`Explore unconventional solutions to "${problem}"`);
        }

        return decompositions;
    }

    private generateApproachVariations(parentContent: string): string[] {
        const variations: string[] = [];
        
        if (parentContent.includes('break down')) {
            variations.push("Identify the core components and their relationships");
            variations.push("Prioritize components by complexity and dependency");
            variations.push("Map out sequential steps for implementation");
        } else if (parentContent.includes('practical')) {
            variations.push("Focus on immediate, actionable steps");
            variations.push("Consider resource constraints and limitations");
            variations.push("Develop a minimum viable solution first");
        } else if (parentContent.includes('theoretical')) {
            variations.push("Research existing frameworks and methodologies");
            variations.push("Understand underlying principles and concepts");
            variations.push("Analyze similar problems and their solutions");
        } else {
            variations.push("Explore this direction with systematic analysis");
            variations.push("Consider alternative interpretations of this approach");
            variations.push("Develop this idea with concrete examples");
        }

        return variations;
    }

    private generateRefinements(content: string, depth: number): string[] {
        const refinements: string[] = [];
        
        // Add depth-specific refinements
        if (depth === 2) {
            refinements.push(`Elaborate on: ${content} with specific examples`);
            refinements.push(`Consider potential challenges with: ${content}`);
            refinements.push(`Optimize the approach in: ${content}`);
        } else if (depth >= 3) {
            refinements.push(`Final implementation details for: ${content}`);
            refinements.push(`Validation and testing approach for: ${content}`);
        }

        return refinements;
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
        // Simple relevance assessment based on word overlap and context
        const problemWords = problem.toLowerCase().split(' ');
        const contentWords = content.toLowerCase().split(' ');
        
        const overlap = problemWords.filter(word => 
            word.length > 3 && contentWords.some(cWord => cWord.includes(word))
        ).length;
        
        const maxRelevance = Math.min(problemWords.length, 5);
        return Math.min(1.0, overlap / maxRelevance + 0.3); // Base relevance of 0.3
    }

    private assessClarity(content: string): number {
        let score = 0.5; // Base score
        
        // Clarity indicators
        if (content.includes('specifically') || content.includes('by')) score += 0.2;
        if (content.length > 20 && content.length < 200) score += 0.2;
        if (content.includes('step') || content.includes('approach')) score += 0.1;
        
        // Clarity detractors
        if (content.includes('somehow') || content.includes('maybe')) score -= 0.2;
        if (content.length < 10) score -= 0.3;
        
        return Math.max(0.1, Math.min(1.0, score));
    }

    private assessFeasibility(content: string, depth: number): number {
        let score = 0.6; // Base feasibility
        
        // More specific thoughts at deeper levels should be more feasible
        score += depth * 0.1;
        
        // Feasibility indicators
        if (content.includes('implement') || content.includes('use')) score += 0.2;
        if (content.includes('simple') || content.includes('direct')) score += 0.1;
        
        // Feasibility concerns
        if (content.includes('complex') || content.includes('difficult')) score -= 0.1;
        if (content.includes('impossible') || content.includes('can\'t')) score -= 0.3;
        
        return Math.max(0.1, Math.min(1.0, score));
    }

    private assessCreativity(content: string, session: TreeOfThoughtsSession): number {
        let score = 0.4; // Base creativity
        
        // Check for unique words compared to other nodes
        const allContent = Array.from(session.nodes.values())
            .map(n => n.content.toLowerCase())
            .join(' ');
        
        const contentWords = content.toLowerCase().split(' ');
        const uniqueWords = contentWords.filter(word => 
            word.length > 4 && !allContent.includes(word)
        );
        
        score += uniqueWords.length * 0.1;
        
        // Creativity indicators
        if (content.includes('alternative') || content.includes('innovative')) score += 0.2;
        if (content.includes('unconventional') || content.includes('creative')) score += 0.2;
        
        return Math.max(0.1, Math.min(1.0, score));
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
        
        if (pathNodes.length <= 1) {
            return "Unable to construct solution from the explored tree.";
        }

        // Construct solution from the path
        const solutionParts = pathNodes.slice(1).map((node, index) => 
            `${index + 1}. ${node.content}`
        );

        return `Solution approach:\n${solutionParts.join('\n')}`;
    }

    private calculatePathConfidence(session: TreeOfThoughtsSession, path: string[]): number {
        const pathNodes = path.map(id => session.nodes.get(id)).filter(Boolean) as ThoughtNode[];
        
        if (pathNodes.length === 0) return 0.1;
        
        const avgValue = pathNodes.reduce((sum, node) => sum + node.value, 0) / pathNodes.length;
        return Math.max(0.1, Math.min(1.0, avgValue));
    }

    private calculateOverallConfidence(session: TreeOfThoughtsSession): number {
        const pathConfidence = this.calculatePathConfidence(session, session.selectedPath);
        const explorationBonus = Math.min(0.2, session.nodes.size * 0.01); // Bonus for thorough exploration
        
        return Math.max(0.1, Math.min(1.0, pathConfidence + explorationBonus));
    }

    private generateAlternatives(session: TreeOfThoughtsSession): string[] {
        const alternatives: string[] = [];
        
        // Find alternative high-value paths
        const allLeafNodes = Array.from(session.nodes.values())
            .filter(node => node.children.length === 0 && node.value > 0.5);
        
        if (allLeafNodes.length > 1) {
            alternatives.push("Multiple promising solution paths were identified");
        }
        
        // Check for unexplored high-value nodes
        const unexploredNodes = Array.from(session.nodes.values())
            .filter(node => !node.isExpanded && node.value > 0.6);
        
        if (unexploredNodes.length > 0) {
            alternatives.push("Additional promising paths could be explored");
        }
        
        return alternatives;
    }

    private calculateComplexity(session: TreeOfThoughtsSession): number {
        const nodeCount = session.nodes.size;
        const maxDepth = Math.max(...Array.from(session.nodes.values()).map(n => n.depth));
        return Math.min(10, nodeCount * 0.1 + maxDepth);
    }

    private getErrorRecovery(session: TreeOfThoughtsSession): string[] {
        const recovery: string[] = [];
        
        const lowValueNodes = Array.from(session.nodes.values())
            .filter(node => node.value < this.defaultConfig.pruningThreshold);
        
        if (lowValueNodes.length > 0) {
            recovery.push("Pruned low-value reasoning paths to focus on promising directions");
        }
        
        return recovery;
    }

    private buildTreeVisualization(session: TreeOfThoughtsSession): Record<string, any> {
        const visualization: Record<string, any> = {
            sessionId: session.id,
            problem: session.problem,
            totalNodes: session.nodes.size,
            selectedPath: session.selectedPath,
            isComplete: session.isComplete,
            tree: {}
        };

        // Build tree structure
        const buildNodeTree = (nodeId: string): any => {
            const node = session.nodes.get(nodeId);
            if (!node) return null;

            return {
                id: node.id,
                content: node.content,
                value: node.value,
                depth: node.depth,
                isSelected: node.isSelected,
                isExpanded: node.isExpanded,
                children: node.children.map(childId => buildNodeTree(childId)).filter(Boolean)
            };
        };

        visualization.tree = buildNodeTree(session.rootNodeId);
        return visualization;
    }
}