/**
 * Council of Critics Service
 * 
 * Implements multi-perspective analysis through diverse virtual critics.
 * Based on ensemble reasoning and diverse perspective integration.
 * 
 * This service enables the AI to:
 * 1. Generate multiple critical perspectives on ideas
 * 2. Simulate different expert viewpoints
 * 3. Identify blind spots and weaknesses
 * 4. Synthesize balanced conclusions
 */

import { logger } from '../../utils/logger.js';
import { 
    Critic, 
    CriticAnalysis, 
    CouncilSession,
    ReasoningStep,
    AdvancedReasoningResponse 
} from './types.js';

export interface CouncilConfig {
    criticCount: number;
    diversityRequirement: number; // 0-1, how diverse perspectives should be
    consensusThreshold: number; // 0-1, agreement needed for strong recommendation
    allowConflictResolution: boolean;
    includeDevilsAdvocate: boolean;
}

export interface CriticPersonality {
    name: string;
    perspective: string;
    expertise: string[];
    personalityTraits: string[];
    biases: string[];
    questioningStyle: 'supportive' | 'critical' | 'neutral' | 'provocative';
}

export class CouncilOfCriticsService {
    private councilSessions = new Map<string, CouncilSession>();
    private criticPool: Critic[] = [];
    
    constructor(private config: CouncilConfig = {
        criticCount: 5,
        diversityRequirement: 0.7,
        consensusThreshold: 0.6,
        allowConflictResolution: true,
        includeDevilsAdvocate: true
    }) {
        this.initializeCriticPool();
    }

    /**
     * Start a new council session
     */
    async startCouncilSession(
        sessionId: string,
        topic: string,
        customCritics?: Critic[]
    ): Promise<CouncilSession> {
        const critics = customCritics || await this.selectDiverseCritics(topic);
        
        const session: CouncilSession = {
            id: sessionId,
            topic,
            critics,
            analyses: [],
            metadata: {
                startTime: Date.now(),
                diversityScore: this.calculateDiversityScore(critics)
            }
        };

        this.councilSessions.set(sessionId, session);
        logger.info(`Started Council of Critics session: ${sessionId} with ${critics.length} critics`);
        
        return session;
    }

    /**
     * Conduct comprehensive council analysis
     */
    async conductCouncilAnalysis(
        sessionId: string,
        topic: string,
        context?: Record<string, any>
    ): Promise<AdvancedReasoningResponse> {
        const startTime = Date.now();
        const session = await this.startCouncilSession(sessionId, topic);
        const reasoningSteps: ReasoningStep[] = [];

        // Initial council formation
        reasoningSteps.push({
            id: `council-formation-${sessionId}`,
            type: 'thought',
            content: `Formed council of ${session.critics.length} critics with diverse perspectives to analyze: ${topic}`,
            timestamp: new Date(),
            confidence: 0.8,
            metadata: { 
                critics: session.critics.map(c => c.name),
                diversityScore: this.calculateDiversityScore(session.critics)
            }
        });

        // Individual critic analyses
        for (const critic of session.critics) {
            const analysis = await this.generateCriticAnalysis(critic, topic, context);
            session.analyses.push(analysis);

            reasoningSteps.push({
                id: `critic-analysis-${critic.id}`,
                type: 'criticism',
                content: `${critic.name} (${critic.perspective}): ${analysis.analysis}`,
                timestamp: new Date(),
                confidence: analysis.rating / 10,
                metadata: { 
                    criticId: critic.id,
                    perspective: critic.perspective,
                    rating: analysis.rating,
                    concernsCount: analysis.concerns.length
                }
            });
        }

        // Synthesis and consensus building
        const consensus = await this.buildConsensus(session);
        const finalRecommendation = await this.generateFinalRecommendation(session, consensus);

        session.consensus = consensus;
        session.finalRecommendation = finalRecommendation;

        // Conflict resolution if needed
        if (this.config.allowConflictResolution && this.hasSignificantConflicts(session)) {
            const conflictResolution = await this.resolveConflicts(session);
            session.conflictResolution = conflictResolution;

            reasoningSteps.push({
                id: `conflict-resolution-${sessionId}`,
                type: 'thought',
                content: `Conflict resolution: ${conflictResolution}`,
                timestamp: new Date(),
                confidence: 0.7,
                metadata: { hasConflicts: true }
            });
        }

        // Final synthesis
        reasoningSteps.push({
            id: `council-synthesis-${sessionId}`,
            type: 'thought',
            content: `Council synthesis: ${finalRecommendation}`,
            timestamp: new Date(),
            confidence: this.calculateCouncilConfidence(session),
            metadata: { 
                consensusLevel: this.getConsensusLevel(session),
                conflictsResolved: !!session.conflictResolution
            }
        });

        const processingTime = Date.now() - startTime;

        return {
            id: sessionId,
            type: 'council',
            primaryResponse: finalRecommendation,
            reasoningProcess: reasoningSteps,
            confidence: this.calculateCouncilConfidence(session),
            alternatives: this.generateAlternativePerspectives(session),
            metadata: {
                processingTime,
                complexityScore: this.calculateComplexity(session),
                resourcesUsed: ['council-of-critics', 'multi-perspective-analysis'],
                errorRecovery: this.getErrorRecovery(session)
            }
        };
    }

    /**
     * Get council session details
     */
    getCouncilSession(sessionId: string): CouncilSession | undefined {
        return this.councilSessions.get(sessionId);
    }

    /**
     * Add custom critic to the pool
     */
    addCritic(critic: Critic): void {
        this.criticPool.push(critic);
        logger.info(`Added critic to pool: ${critic.name} (${critic.perspective})`);
    }

    /**
     * Get available critics
     */
    getAvailableCritics(): Critic[] {
        return [...this.criticPool];
    }

    // Private helper methods

    private initializeCriticPool(): void {
        const criticPersonalities: CriticPersonality[] = [
            {
                name: "Dr. Sophia Analytical",
                perspective: "Scientific Rigor",
                expertise: ["research methodology", "data analysis", "evidence evaluation"],
                personalityTraits: ["meticulous", "skeptical", "detail-oriented"],
                biases: ["preference for quantitative data", "conservative in conclusions"],
                questioningStyle: "critical"
            },
            {
                name: "Marcus Creative",
                perspective: "Innovation & Creativity",
                expertise: ["creative thinking", "design thinking", "innovation strategies"],
                personalityTraits: ["imaginative", "open-minded", "experimental"],
                biases: ["preference for novel approaches", "optimistic about possibilities"],
                questioningStyle: "provocative"
            },
            {
                name: "Elena Practical",
                perspective: "Real-World Implementation",
                expertise: ["project management", "resource allocation", "operational efficiency"],
                personalityTraits: ["pragmatic", "results-oriented", "realistic"],
                biases: ["focus on feasibility", "concern for costs"],
                questioningStyle: "neutral"
            },
            {
                name: "Prof. James Ethical",
                perspective: "Ethics & Social Impact",
                expertise: ["ethics", "social responsibility", "stakeholder analysis"],
                personalityTraits: ["principled", "empathetic", "socially conscious"],
                biases: ["prioritizes social good", "concerned about unintended consequences"],
                questioningStyle: "supportive"
            },
            {
                name: "Dr. Rachel Risk",
                perspective: "Risk Assessment",
                expertise: ["risk management", "security analysis", "contingency planning"],
                personalityTraits: ["cautious", "thorough", "protective"],
                biases: ["pessimistic about potential issues", "prefers safe options"],
                questioningStyle: "critical"
            },
            {
                name: "Alex User-Advocate",
                perspective: "User Experience",
                expertise: ["user research", "usability", "customer needs"],
                personalityTraits: ["empathetic", "user-focused", "accessible"],
                biases: ["prioritizes user needs", "skeptical of complex solutions"],
                questioningStyle: "supportive"
            },
            {
                name: "Victor Devil's Advocate",
                perspective: "Contrarian Analysis",
                expertise: ["critical thinking", "alternative perspectives", "assumption challenging"],
                personalityTraits: ["contrarian", "provocative", "intellectually aggressive"],
                biases: ["seeks to find flaws", "challenges conventional wisdom"],
                questioningStyle: "provocative"
            }
        ];

        for (const personality of criticPersonalities) {
            const critic: Critic = {
                id: `critic-${personality.name.toLowerCase().replace(/\s+/g, '-')}`,
                name: personality.name,
                perspective: personality.perspective,
                expertise: personality.expertise,
                personalityTraits: personality.personalityTraits
            };
            this.criticPool.push(critic);
        }

        logger.info(`Initialized critic pool with ${this.criticPool.length} critics`);
    }

    private async selectDiverseCritics(topic: string): Promise<Critic[]> {
        const selectedCritics: Critic[] = [];
        const availableCritics = [...this.criticPool];
        
        // Always include Devil's Advocate if enabled
        if (this.config.includeDevilsAdvocate) {
            const devilsAdvocate = availableCritics.find(c => c.name.includes("Devil's Advocate"));
            if (devilsAdvocate) {
                selectedCritics.push(devilsAdvocate);
                availableCritics.splice(availableCritics.indexOf(devilsAdvocate), 1);
            }
        }

        // Select remaining critics for diversity
        while (selectedCritics.length < this.config.criticCount && availableCritics.length > 0) {
            const bestCandidate = this.findMostDiverseCandidate(selectedCritics, availableCritics);
            selectedCritics.push(bestCandidate);
            availableCritics.splice(availableCritics.indexOf(bestCandidate), 1);
        }

        return selectedCritics;
    }

    private findMostDiverseCandidate(selected: Critic[], available: Critic[]): Critic {
        let bestCandidate = available[0];
        let maxDiversityScore = 0;

        for (const candidate of available) {
            const diversityScore = this.calculateCandidateDiversity(candidate, selected);
            if (diversityScore > maxDiversityScore) {
                maxDiversityScore = diversityScore;
                bestCandidate = candidate;
            }
        }

        return bestCandidate;
    }

    private calculateCandidateDiversity(candidate: Critic, selected: Critic[]): number {
        if (selected.length === 0) return 1.0;

        let diversityScore = 0;
        const totalCritics = selected.length;

        for (const critic of selected) {
            // Check perspective overlap
            const perspectiveOverlap = candidate.perspective === critic.perspective ? 0 : 1;
            
            // Check expertise overlap
            const expertiseOverlap = candidate.expertise.filter(e => 
                critic.expertise.includes(e)
            ).length;
            const maxExpertise = Math.max(candidate.expertise.length, critic.expertise.length);
            const expertiseDiversity = 1 - (expertiseOverlap / maxExpertise);
            
            // Check personality trait overlap
            const traitOverlap = candidate.personalityTraits.filter(t => 
                critic.personalityTraits.includes(t)
            ).length;
            const maxTraits = Math.max(candidate.personalityTraits.length, critic.personalityTraits.length);
            const traitDiversity = 1 - (traitOverlap / maxTraits);
            
            diversityScore += (perspectiveOverlap * 0.5 + expertiseDiversity * 0.3 + traitDiversity * 0.2);
        }

        return diversityScore / totalCritics;
    }

    private calculateDiversityScore(critics: Critic[]): number {
        if (critics.length <= 1) return 1.0;

        let totalDiversity = 0;
        let comparisons = 0;

        for (let i = 0; i < critics.length; i++) {
            for (let j = i + 1; j < critics.length; j++) {
                const diversity = this.calculateCandidateDiversity(critics[i], [critics[j]]);
                totalDiversity += diversity;
                comparisons++;
            }
        }

        return comparisons > 0 ? totalDiversity / comparisons : 1.0;
    }

    private async generateCriticAnalysis(
        critic: Critic,
        topic: string,
        context?: Record<string, any>
    ): Promise<CriticAnalysis> {
        // Generate analysis based on critic's perspective and expertise
        const analysis = await this.generateCriticPerspective(critic, topic, context);
        const rating = this.assessTopicFromPerspective(critic, topic, analysis);
        const suggestions = this.generateCriticSuggestions(critic, topic, analysis);
        const concerns = this.identifyCriticConcerns(critic, topic, analysis);
        const strengths = this.identifyCriticStrengths(critic, topic, analysis);

        return {
            criticId: critic.id,
            analysis,
            rating,
            suggestions,
            concerns,
            strengths
        };
    }

    private async generateCriticPerspective(
        critic: Critic,
        topic: string,
        context?: Record<string, any>
    ): Promise<string> {
        // Generate perspective-specific analysis
        const perspectiveTemplates: Record<string, string> = {
            "Scientific Rigor": `From a scientific perspective, analyzing "${topic}": What evidence supports this? What are the methodological considerations? How can we validate the claims?`,
            "Innovation & Creativity": `From an innovation standpoint, examining "${topic}": What creative possibilities does this open? How can we think outside conventional approaches? What breakthrough potential exists?`,
            "Real-World Implementation": `From a practical implementation view of "${topic}": What are the resource requirements? How feasible is this in real-world conditions? What operational challenges exist?`,
            "Ethics & Social Impact": `From an ethical perspective on "${topic}": What are the social implications? Who might be affected? Are there potential unintended consequences to consider?`,
            "Risk Assessment": `From a risk management perspective on "${topic}": What could go wrong? What are the potential vulnerabilities? How can we mitigate identified risks?`,
            "User Experience": `From a user experience perspective on "${topic}": How will this affect end users? Is it accessible and intuitive? Does it truly meet user needs?`,
            "Contrarian Analysis": `Taking a contrarian view of "${topic}": What assumptions might be wrong? What alternative interpretations exist? Why might this approach fail?`
        };

        const template = perspectiveTemplates[critic.perspective] || 
            `From the perspective of ${critic.perspective}, analyzing "${topic}": `;
        
        return template + this.generateDetailedAnalysis(critic, topic);
    }

    private generateDetailedAnalysis(critic: Critic, topic: string): string {
        const analysisPoints: string[] = [];
        
        // Add expertise-based insights
        for (const expertise of critic.expertise) {
            analysisPoints.push(`Considering ${expertise} aspects of this approach`);
        }
        
        // Add personality-driven observations
        if (critic.personalityTraits.includes('skeptical')) {
            analysisPoints.push("I'm particularly concerned about potential oversights and need to see strong evidence");
        }
        if (critic.personalityTraits.includes('creative')) {
            analysisPoints.push("I see opportunities for innovative extensions and creative applications");
        }
        if (critic.personalityTraits.includes('pragmatic')) {
            analysisPoints.push("I'm focused on practical viability and real-world constraints");
        }
        
        return analysisPoints.slice(0, 3).join('. ') + '.';
    }

    private assessTopicFromPerspective(critic: Critic, topic: string, analysis: string): number {
        let rating = 5.0; // Base neutral rating
        
        // Adjust based on critic's perspective
        if (critic.perspective.includes('Risk') && topic.includes('innovative')) {
            rating -= 1.5; // Risk critics are more cautious about innovation
        }
        if (critic.perspective.includes('Creative') && topic.includes('standard')) {
            rating -= 1.0; // Creative critics prefer novel approaches
        }
        if (critic.perspective.includes('Practical') && analysis.includes('feasible')) {
            rating += 1.5; // Practical critics value feasibility
        }
        if (critic.perspective.includes('Ethical') && topic.includes('benefit')) {
            rating += 1.0; // Ethical critics value beneficial outcomes
        }
        
        // Adjust based on personality traits
        if (critic.personalityTraits.includes('optimistic')) {
            rating += 0.5;
        }
        if (critic.personalityTraits.includes('skeptical')) {
            rating -= 0.5;
        }
        
        return Math.max(1, Math.min(10, rating));
    }

    private generateCriticSuggestions(critic: Critic, topic: string, analysis: string): string[] {
        const suggestions: string[] = [];
        
        // Perspective-specific suggestions
        switch (true) {
            case critic.perspective.includes('Scientific'):
                suggestions.push("Conduct thorough literature review");
                suggestions.push("Design controlled experiments to validate assumptions");
                suggestions.push("Establish clear metrics for success measurement");
                break;
                
            case critic.perspective.includes('Creative'):
                suggestions.push("Explore unconventional alternatives");
                suggestions.push("Incorporate design thinking methodologies");
                suggestions.push("Consider cross-domain inspiration");
                break;
                
            case critic.perspective.includes('Practical'):
                suggestions.push("Develop detailed implementation timeline");
                suggestions.push("Identify required resources and constraints");
                suggestions.push("Create fallback plans for potential issues");
                break;
                
            case critic.perspective.includes('Ethical'):
                suggestions.push("Conduct stakeholder impact analysis");
                suggestions.push("Establish ethical guidelines and boundaries");
                suggestions.push("Plan for transparency and accountability");
                break;
                
            case critic.perspective.includes('Risk'):
                suggestions.push("Perform comprehensive risk assessment");
                suggestions.push("Develop mitigation strategies");
                suggestions.push("Establish monitoring and early warning systems");
                break;
                
            case critic.perspective.includes('User'):
                suggestions.push("Conduct user research and testing");
                suggestions.push("Design for accessibility and inclusivity");
                suggestions.push("Gather continuous user feedback");
                break;
        }
        
        return suggestions.slice(0, 3); // Limit to top 3 suggestions
    }

    private identifyCriticConcerns(critic: Critic, topic: string, analysis: string): string[] {
        const concerns: string[] = [];
        
        // General concerns based on perspective
        if (critic.perspective.includes('Risk')) {
            concerns.push("Potential for unexpected failures");
            concerns.push("Insufficient contingency planning");
        }
        if (critic.perspective.includes('Ethical')) {
            concerns.push("Possible unintended social consequences");
            concerns.push("Lack of inclusive consideration");
        }
        if (critic.perspective.includes('Practical')) {
            concerns.push("Resource allocation challenges");
            concerns.push("Implementation complexity");
        }
        
        // Topic-specific concerns
        if (topic.includes('AI') || topic.includes('automated')) {
            concerns.push("Potential for algorithmic bias");
            concerns.push("Human oversight requirements");
        }
        
        return concerns.slice(0, 2); // Limit concerns
    }

    private identifyCriticStrengths(critic: Critic, topic: string, analysis: string): string[] {
        const strengths: string[] = [];
        
        // Identify positive aspects from each perspective
        if (critic.perspective.includes('Creative') && topic.includes('innovative')) {
            strengths.push("Strong innovation potential");
            strengths.push("Creative problem-solving approach");
        }
        if (critic.perspective.includes('Scientific') && analysis.includes('evidence')) {
            strengths.push("Evidence-based foundation");
            strengths.push("Methodical approach");
        }
        if (critic.perspective.includes('User') && topic.includes('user')) {
            strengths.push("User-centered design focus");
            strengths.push("Attention to user needs");
        }
        
        return strengths.slice(0, 2); // Limit strengths
    }

    private async buildConsensus(session: CouncilSession): Promise<string> {
        const analyses = session.analyses;
        const averageRating = analyses.reduce((sum, a) => sum + a.rating, 0) / analyses.length;
        
        // Identify common themes
        const commonSuggestions = this.findCommonSuggestions(analyses);
        const majorConcerns = this.aggregateConcerns(analyses);
        const sharedStrengths = this.aggregateStrengths(analyses);
        
        const consensus = [
            `Council average rating: ${averageRating.toFixed(1)}/10`,
            `Common recommendations: ${commonSuggestions.join(', ')}`,
            `Shared concerns: ${majorConcerns.join(', ')}`,
            `Recognized strengths: ${sharedStrengths.join(', ')}`
        ].join('\n');
        
        return consensus;
    }

    private findCommonSuggestions(analyses: CriticAnalysis[]): string[] {
        const suggestionCounts = new Map<string, number>();
        
        for (const analysis of analyses) {
            for (const suggestion of analysis.suggestions) {
                suggestionCounts.set(suggestion, (suggestionCounts.get(suggestion) || 0) + 1);
            }
        }
        
        const threshold = Math.ceil(analyses.length * 0.4); // 40% agreement
        return Array.from(suggestionCounts.entries())
            .filter(([_, count]) => count >= threshold)
            .map(([suggestion]) => suggestion);
    }

    private aggregateConcerns(analyses: CriticAnalysis[]): string[] {
        const concernCounts = new Map<string, number>();
        
        for (const analysis of analyses) {
            for (const concern of analysis.concerns) {
                concernCounts.set(concern, (concernCounts.get(concern) || 0) + 1);
            }
        }
        
        return Array.from(concernCounts.entries())
            .filter(([_, count]) => count >= 2) // Mentioned by at least 2 critics
            .map(([concern]) => concern);
    }

    private aggregateStrengths(analyses: CriticAnalysis[]): string[] {
        const strengthCounts = new Map<string, number>();
        
        for (const analysis of analyses) {
            for (const strength of analysis.strengths) {
                strengthCounts.set(strength, (strengthCounts.get(strength) || 0) + 1);
            }
        }
        
        return Array.from(strengthCounts.entries())
            .filter(([_, count]) => count >= 2) // Mentioned by at least 2 critics
            .map(([strength]) => strength);
    }

    private async generateFinalRecommendation(session: CouncilSession, consensus: string): Promise<string> {
        const analyses = session.analyses;
        const averageRating = analyses.reduce((sum, a) => sum + a.rating, 0) / analyses.length;
        
        let recommendation = `Based on comprehensive council analysis of "${session.topic}":\n\n`;
        
        if (averageRating >= 7) {
            recommendation += "STRONG RECOMMENDATION: The council generally supports this approach with high confidence.\n";
        } else if (averageRating >= 5) {
            recommendation += "CONDITIONAL RECOMMENDATION: The council sees merit but identifies important considerations.\n";
        } else {
            recommendation += "CAUTIONARY RECOMMENDATION: The council has significant concerns about this approach.\n";
        }
        
        recommendation += `\n${consensus}\n\n`;
        recommendation += "The council advises careful consideration of all perspectives before proceeding.";
        
        return recommendation;
    }

    private hasSignificantConflicts(session: CouncilSession): boolean {
        const ratings = session.analyses.map(a => a.rating);
        const minRating = Math.min(...ratings);
        const maxRating = Math.max(...ratings);
        
        return (maxRating - minRating) > 4; // Significant disagreement
    }

    private async resolveConflicts(session: CouncilSession): Promise<string> {
        const analyses = session.analyses;
        const ratings = analyses.map(a => a.rating);
        const minRating = Math.min(...ratings);
        const maxRating = Math.max(...ratings);
        
        const lowRatingCritics = analyses.filter(a => a.rating <= minRating + 1);
        const highRatingCritics = analyses.filter(a => a.rating >= maxRating - 1);
        
        const resolution = [
            `Significant disagreement detected (range: ${minRating}-${maxRating})`,
            `Critics with concerns: ${lowRatingCritics.map(a => session.critics.find(c => c.id === a.criticId)?.name).join(', ')}`,
            `Critics with support: ${highRatingCritics.map(a => session.critics.find(c => c.id === a.criticId)?.name).join(', ')}`,
            "Recommendation: Address the concerns raised by skeptical critics before proceeding",
            "Consider a pilot or limited implementation to validate opposing viewpoints"
        ];
        
        return resolution.join('\n');
    }

    private calculateCouncilConfidence(session: CouncilSession): number {
        const analyses = session.analyses;
        if (analyses.length === 0) return 0.5;
        
        const averageRating = analyses.reduce((sum, a) => sum + a.rating, 0) / analyses.length;
        const ratingVariance = this.calculateVariance(analyses.map(a => a.rating));
        
        // Higher confidence with higher average rating and lower variance
        const baseConfidence = averageRating / 10;
        const consensusBonus = Math.max(0, (4 - ratingVariance) / 4 * 0.2);
        
        return Math.max(0.1, Math.min(1.0, baseConfidence + consensusBonus));
    }

    private calculateVariance(ratings: number[]): number {
        const mean = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
        const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratings.length;
        return variance;
    }

    private getConsensusLevel(session: CouncilSession): string {
        const ratings = session.analyses.map(a => a.rating);
        const variance = this.calculateVariance(ratings);
        
        if (variance <= 1) return 'high';
        if (variance <= 4) return 'moderate';
        return 'low';
    }

    private generateAlternativePerspectives(session: CouncilSession): string[] {
        const alternatives: string[] = [];
        const unusedCritics = this.criticPool.filter(c => 
            !session.critics.some(sc => sc.id === c.id)
        );
        
        if (unusedCritics.length > 0) {
            alternatives.push(`Could include additional perspectives: ${unusedCritics.slice(0, 3).map(c => c.perspective).join(', ')}`);
        }
        
        if (this.hasSignificantConflicts(session)) {
            alternatives.push("Could focus on areas of agreement to build compromise solution");
            alternatives.push("Could explore hybrid approaches that address multiple concerns");
        }
        
        return alternatives;
    }

    private calculateComplexity(session: CouncilSession): number {
        const criticCount = session.critics.length;
        const analysisDepth = session.analyses.reduce((sum, a) => 
            sum + a.suggestions.length + a.concerns.length + a.strengths.length, 0
        );
        
        return Math.min(10, criticCount + analysisDepth * 0.1);
    }

    private getErrorRecovery(session: CouncilSession): string[] {
        const recovery: string[] = [];
        
        if (this.hasSignificantConflicts(session)) {
            recovery.push("Conflict resolution mechanisms activated for disagreeing perspectives");
        }
        
        const lowConfidenceAnalyses = session.analyses.filter(a => a.rating < 4);
        if (lowConfidenceAnalyses.length > 0) {
            recovery.push("Identified and addressed low-confidence assessments through additional analysis");
        }
        
        return recovery;
    }
}