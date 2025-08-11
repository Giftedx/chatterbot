/**
 * Self-Reflection Service
 * 
 * Implements autonomous self-reflection and critique mechanisms
 * for continuous learning and improvement.
 */

import { logger } from '../../utils/logger.js';
import {
    SelfReflectionResult,
    AutonomousReasoningConfig,
    AutonomousReasoningContext,
    UserFeedbackData,
    CritiqueAnalysis,
    CritiquePerspective
} from './types.js';

export class SelfReflectionService {
    private reflectionHistory = new Map<string, SelfReflectionResult[]>();
    private lastReflectionTimes = new Map<string, Date>();

    constructor(private config: AutonomousReasoningConfig) {}

    /**
     * Perform self-reflection on recent interactions and outcomes
     */
    async performSelfReflection(
        userId: string,
        context: AutonomousReasoningContext
    ): Promise<SelfReflectionResult> {
        const reflectionId = `reflection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        logger.debug('Starting self-reflection process', {
            operation: 'self_reflection',
            userId,
            reflectionId
        });

        // Analyze recent conversation patterns
        const conversationAnalysis = this.analyzeConversationPatterns(context.conversationHistory);
        
        // Evaluate goal progress and effectiveness
        const goalEvaluation = this.evaluateGoalProgress(context.currentGoals);
        
        // Assess user feedback and satisfaction
        const feedbackAnalysis = this.analyzeFeedback(context.userFeedback);
        
        // Identify areas for improvement
        const improvementAreas = this.identifyImprovementAreas(
            conversationAnalysis,
            goalEvaluation,
            feedbackAnalysis
        );
        
        // Generate insights and learning points
        const insights = this.generateInsights(context, improvementAreas);
        
        // Create action items for improvement
        const actionItems = this.createActionItems(insights, improvementAreas);
        
        // Assess confidence in the reflection
        const confidence = this.calculateReflectionConfidence(
            conversationAnalysis,
            feedbackAnalysis,
            insights
        );

        const reflection: SelfReflectionResult = {
            id: reflectionId,
            userId,
            context: this.summarizeContext(context),
            reflection: this.generateReflectionNarrative(insights, improvementAreas),
            insights,
            actionItems,
            confidence,
            timestamp: new Date(),
            improvedUnderstanding: this.hasImprovedUnderstanding(context),
            previousMisconceptions: this.identifyMisconceptions(context),
            learningAreas: improvementAreas.map(area => area.domain)
        };

        // Store reflection in history
        this.storeReflection(userId, reflection);
        this.lastReflectionTimes.set(userId, new Date());

        logger.info('Self-reflection completed', {
            operation: 'self_reflection',
            userId,
            reflectionId,
            insightsCount: insights.length,
            actionItemsCount: actionItems.length,
            confidence: confidence
        });

        return reflection;
    }

    /**
     * Check if self-reflection is due for a user
     */
    isReflectionDue(userId: string): boolean {
        const lastReflection = this.lastReflectionTimes.get(userId);
        if (!lastReflection) return true;

        const timeSinceLastReflection = Date.now() - lastReflection.getTime();
        const reflectionInterval = this.config.reflectionFrequency * 60 * 1000; // Convert minutes to ms

        return timeSinceLastReflection >= reflectionInterval;
    }

    /**
     * Get reflection history for a user
     */
    getReflectionHistory(userId: string): SelfReflectionResult[] {
        return this.reflectionHistory.get(userId) || [];
    }

    /**
     * Perform council of critics analysis
     */
    async performCouncilOfCritics(
        subject: string,
        context: string,
        domain?: string
    ): Promise<CritiqueAnalysis> {
        const critics = this.createCriticsPanel(domain);
        const perspectives: CritiquePerspective[] = [];

        // Gather perspectives from each critic
        for (const critic of critics) {
            const perspective = await this.generateCriticPerspective(
                critic,
                subject,
                context
            );
            perspectives.push(perspective);
        }

        // Analyze consensus and disagreements
        const consensus = this.findConsensus(perspectives);
        const disagreements = this.identifyDisagreements(perspectives);
        const recommendations = this.synthesizeRecommendations(perspectives);

        const analysis: CritiqueAnalysis = {
            id: `critique-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            context,
            subject,
            perspectives,
            consensus,
            disagreements,
            recommendations,
            confidence: this.calculateCritiqueConfidence(perspectives),
            timestamp: new Date()
        };

        logger.debug('Council of critics analysis completed', {
            operation: 'council_critique',
            subject: subject.substring(0, 100),
            criticsCount: critics.length,
            consensusStrength: consensus.length,
            disagreementsCount: disagreements.length
        });

        return analysis;
    }

    // Private helper methods

    private analyzeConversationPatterns(history: string[]): {
        patterns: string[];
        effectiveness: number;
        issues: string[];
    } {
        if (history.length === 0) {
            return { patterns: [], effectiveness: 0.5, issues: ['No conversation history available'] };
        }

        const patterns: string[] = [];
        const issues: string[] = [];
        let effectiveness = 0.5;

        // Analyze conversation flow
        const avgResponseLength = history.reduce((sum, msg) => sum + msg.length, 0) / history.length;
        if (avgResponseLength > 500) {
            patterns.push('Tends to provide detailed responses');
            effectiveness += 0.1;
        } else if (avgResponseLength < 100) {
            patterns.push('Tends to provide brief responses');
            issues.push('Responses may be too brief for complex topics');
            effectiveness -= 0.1;
        }

        // Check for repeated phrases or concepts
        const words = history.join(' ').toLowerCase().split(/\s+/);
        const wordFreq = new Map<string, number>();
        words.forEach(word => {
            if (word.length > 4) {
                wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
            }
        });

        const repeatedWords = Array.from(wordFreq.entries())
            .filter(([_, count]) => count > history.length * 0.3)
            .map(([word, _]) => word);

        if (repeatedWords.length > 0) {
            patterns.push(`Frequently uses: ${repeatedWords.join(', ')}`);
            if (repeatedWords.length > 5) {
                issues.push('May be overusing certain phrases or concepts');
                effectiveness -= 0.05;
            }
        }

        // Analyze question vs statement ratio
        const questions = history.filter(msg => msg.includes('?')).length;
        const questionRatio = questions / history.length;
        
        if (questionRatio > 0.3) {
            patterns.push('Frequently asks clarifying questions');
            effectiveness += 0.05;
        } else if (questionRatio < 0.1) {
            patterns.push('Rarely asks questions');
            issues.push('Could benefit from asking more clarifying questions');
            effectiveness -= 0.05;
        }

        return {
            patterns,
            effectiveness: Math.max(0, Math.min(1, effectiveness)),
            issues
        };
    }

    private evaluateGoalProgress(goals: any[]): {
        overallProgress: number;
        completedGoals: number;
        stalledGoals: number;
        insights: string[];
    } {
        if (goals.length === 0) {
            return {
                overallProgress: 0,
                completedGoals: 0,
                stalledGoals: 0,
                insights: ['No active goals to evaluate']
            };
        }

        const completedGoals = goals.filter(g => g.status === 'completed').length;
        const stalledGoals = goals.filter(g => g.status === 'paused' || 
            (g.status === 'active' && g.progress < 0.1)).length;
        
        const totalProgress = goals.reduce((sum, g) => sum + (g.progress || 0), 0);
        const overallProgress = totalProgress / goals.length;

        const insights: string[] = [];
        
        if (completedGoals > 0) {
            insights.push(`Successfully completed ${completedGoals} goals`);
        }
        
        if (stalledGoals > goals.length * 0.3) {
            insights.push('Many goals appear stalled - may need strategy adjustment');
        }
        
        if (overallProgress < 0.3) {
            insights.push('Overall goal progress is low - consider simplifying or prioritizing');
        }

        return {
            overallProgress,
            completedGoals,
            stalledGoals,
            insights
        };
    }

    private analyzeFeedback(feedback: UserFeedbackData): {
        overallSatisfaction: number;
        trends: string[];
        concerns: string[];
    } {
        const satisfaction = feedback.satisfactionRatings.length > 0 
            ? feedback.satisfactionRatings.reduce((a, b) => a + b, 0) / feedback.satisfactionRatings.length
            : 0.5;

        const trends: string[] = [];
        const concerns: string[] = [];

        // Analyze satisfaction trend
        if (feedback.satisfactionRatings.length >= 3) {
            const recent = feedback.satisfactionRatings.slice(-3);
            const older = feedback.satisfactionRatings.slice(0, -3);
            
            if (older.length > 0) {
                const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
                const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
                
                if (recentAvg > olderAvg + 0.1) {
                    trends.push('User satisfaction is improving');
                } else if (recentAvg < olderAvg - 0.1) {
                    trends.push('User satisfaction is declining');
                    concerns.push('Need to investigate causes of satisfaction decline');
                }
            }
        }

        // Analyze explicit feedback
        const negativeFeedback = feedback.explicitFeedback.filter(f => 
            f.toLowerCase().includes('bad') || 
            f.toLowerCase().includes('wrong') ||
            f.toLowerCase().includes('unhelpful')
        );

        if (negativeFeedback.length > 0) {
            concerns.push(`Received ${negativeFeedback.length} pieces of negative feedback`);
        }

        // Analyze implicit signals
        const strongNegativeSignals = feedback.implicitSignals.filter(s => 
            s.strength > 0.7 && s.interpretation.includes('negative')
        );

        if (strongNegativeSignals.length > 0) {
            concerns.push('Detecting negative implicit signals from user behavior');
        }

        return {
            overallSatisfaction: satisfaction,
            trends,
            concerns
        };
    }

    private identifyImprovementAreas(
        conversationAnalysis: any,
        goalEvaluation: any,
        feedbackAnalysis: any
    ): Array<{ domain: string; priority: number; description: string }> {
        const areas: Array<{ domain: string; priority: number; description: string }> = [];

        // Conversation improvement areas
        if (conversationAnalysis.effectiveness < 0.7) {
            areas.push({
                domain: 'conversation',
                priority: 0.8,
                description: 'Conversation effectiveness below optimal level'
            });
        }

        conversationAnalysis.issues.forEach((issue: string) => {
            areas.push({
                domain: 'conversation',
                priority: 0.6,
                description: issue
            });
        });

        // Goal management improvement areas
        if (goalEvaluation.overallProgress < 0.5) {
            areas.push({
                domain: 'goal_management',
                priority: 0.7,
                description: 'Goal completion rate needs improvement'
            });
        }

        if (goalEvaluation.stalledGoals > 0) {
            areas.push({
                domain: 'goal_management',
                priority: 0.6,
                description: 'Some goals appear stalled and need attention'
            });
        }

        // User satisfaction improvement areas
        if (feedbackAnalysis.overallSatisfaction < 0.7) {
            areas.push({
                domain: 'user_satisfaction',
                priority: 0.9,
                description: 'User satisfaction below target level'
            });
        }

        feedbackAnalysis.concerns.forEach((concern: string) => {
            areas.push({
                domain: 'user_satisfaction',
                priority: 0.8,
                description: concern
            });
        });

        // Sort by priority
        return areas.sort((a, b) => b.priority - a.priority);
    }

    private generateInsights(
        context: AutonomousReasoningContext,
        improvementAreas: Array<{ domain: string; priority: number; description: string }>
    ): string[] {
        const insights: string[] = [];

        // Meta-insights about the reflection process
        if (improvementAreas.length === 0) {
            insights.push('Current performance appears to be meeting standards across all domains');
        } else {
            insights.push(`Identified ${improvementAreas.length} areas for potential improvement`);
        }

        // Domain-specific insights
        const domains = new Set(improvementAreas.map(area => area.domain));
        
        if (domains.has('conversation')) {
            insights.push('Conversation patterns show room for optimization in engagement and clarity');
        }
        
        if (domains.has('goal_management')) {
            insights.push('Goal-setting and execution strategies could benefit from refinement');
        }
        
        if (domains.has('user_satisfaction')) {
            insights.push('User experience and satisfaction metrics indicate need for adaptation');
        }

        // Pattern recognition insights
        if (context.recentReflections.length > 0) {
            const recentIssues = context.recentReflections
                .flatMap(r => r.learningAreas)
                .reduce((acc, area) => {
                    acc[area] = (acc[area] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

            const recurringIssues = Object.entries(recentIssues)
                .filter(([_, count]) => count > 1)
                .map(([area, _]) => area);

            if (recurringIssues.length > 0) {
                insights.push(`Recurring challenges identified in: ${recurringIssues.join(', ')}`);
            }
        }

        // Adaptation insights
        const adaptationRate = this.calculateAdaptationRate(context);
        if (adaptationRate < 0.3) {
            insights.push('May be adapting too slowly to user preferences and feedback');
        } else if (adaptationRate > 0.8) {
            insights.push('May be adapting too quickly - could benefit from more stability');
        }

        return insights;
    }

    private createActionItems(
        insights: string[],
        improvementAreas: Array<{ domain: string; priority: number; description: string }>
    ): string[] {
        const actionItems: string[] = [];

        // High-priority improvement areas
        const highPriorityAreas = improvementAreas.filter(area => area.priority > 0.7);
        
        highPriorityAreas.forEach(area => {
            switch (area.domain) {
                case 'conversation':
                    actionItems.push('Review and adjust conversation patterns for better engagement');
                    break;
                case 'goal_management':
                    actionItems.push('Reassess current goals and optimize execution strategies');
                    break;
                case 'user_satisfaction':
                    actionItems.push('Investigate specific causes of user dissatisfaction and adjust approach');
                    break;
            }
        });

        // Insight-based action items
        insights.forEach(insight => {
            if (insight.includes('recurring challenges')) {
                actionItems.push('Develop targeted strategies for persistent challenge areas');
            }
            if (insight.includes('adapting too slowly')) {
                actionItems.push('Increase responsiveness to user feedback and preferences');
            }
            if (insight.includes('adapting too quickly')) {
                actionItems.push('Implement more gradual adaptation to maintain consistency');
            }
        });

        // General improvement actions
        if (actionItems.length === 0) {
            actionItems.push('Continue monitoring performance metrics and user satisfaction');
            actionItems.push('Maintain current effective strategies while exploring optimization opportunities');
        }

        return actionItems;
    }

    private calculateReflectionConfidence(
        conversationAnalysis: any,
        feedbackAnalysis: any,
        insights: string[]
    ): number {
        let confidence = 0.5; // Base confidence

        // Data quality factors
        if (feedbackAnalysis.overallSatisfaction !== 0.5) {
            confidence += 0.2; // Have actual satisfaction data
        }

        if (conversationAnalysis.patterns.length > 0) {
            confidence += 0.1; // Have conversation patterns to analyze
        }

        if (insights.length > 2) {
            confidence += 0.1; // Generated meaningful insights
        }

        // Reduce confidence for insufficient data
        if (conversationAnalysis.patterns.length === 0) {
            confidence -= 0.2;
        }

        if (feedbackAnalysis.trends.length === 0) {
            confidence -= 0.1;
        }

        return Math.max(0.1, Math.min(1.0, confidence));
    }

    private hasImprovedUnderstanding(context: AutonomousReasoningContext): boolean {
        if (context.recentReflections.length < 2) return false;

        const currentInsights = context.recentReflections[0]?.insights.length || 0;
        const previousInsights = context.recentReflections[1]?.insights.length || 0;

        return currentInsights > previousInsights;
    }

    private identifyMisconceptions(context: AutonomousReasoningContext): string[] {
        const misconceptions: string[] = [];

        // Look for patterns in feedback that suggest misunderstandings
        const negativeFeedback = context.userFeedback.explicitFeedback.filter(f =>
            f.toLowerCase().includes('wrong') ||
            f.toLowerCase().includes('misunderstood') ||
            f.toLowerCase().includes('not what i meant')
        );

        if (negativeFeedback.length > 0) {
            misconceptions.push('May have misunderstood user intent in recent interactions');
        }

        // Check for stalled goals that might indicate misconceptions about user needs
        const stalledGoals = context.currentGoals.filter(g => 
            g.status === 'paused' && g.progress < 0.2
        );

        if (stalledGoals.length > 0) {
            misconceptions.push('Some goals may be based on incorrect assumptions about user priorities');
        }

        return misconceptions;
    }

    private summarizeContext(context: AutonomousReasoningContext): string {
        const parts: string[] = [];
        
        parts.push(`User: ${context.userId}`);
        parts.push(`Recent conversations: ${context.conversationHistory.length}`);
        parts.push(`Active goals: ${context.currentGoals.length}`);
        parts.push(`Previous reflections: ${context.recentReflections.length}`);
        
        return parts.join(', ');
    }

    private generateReflectionNarrative(
        insights: string[],
        improvementAreas: Array<{ domain: string; priority: number; description: string }>
    ): string {
        let narrative = 'Self-reflection analysis: ';

        if (insights.length > 0) {
            narrative += insights.join('. ') + '. ';
        }

        if (improvementAreas.length > 0) {
            const highPriorityAreas = improvementAreas.filter(area => area.priority > 0.7);
            if (highPriorityAreas.length > 0) {
                narrative += `Key areas requiring attention: ${highPriorityAreas.map(a => a.domain).join(', ')}. `;
            }
        }

        narrative += 'Continuing to learn and adapt for optimal user experience.';

        return narrative;
    }

    private storeReflection(userId: string, reflection: SelfReflectionResult): void {
        if (!this.reflectionHistory.has(userId)) {
            this.reflectionHistory.set(userId, []);
        }

        const userReflections = this.reflectionHistory.get(userId)!;
        userReflections.push(reflection);

        // Maintain history limit
        if (userReflections.length > this.config.maxReflectionHistory) {
            userReflections.splice(0, userReflections.length - this.config.maxReflectionHistory);
        }
    }

    private calculateAdaptationRate(context: AutonomousReasoningContext): number {
        // Calculate how frequently the persona has been adapting
        const adaptationEvents = context.personaState.adaptationHistory.length;
        const timeSpan = Date.now() - (context.personaState.adaptationHistory[0]?.timestamp.getTime() || Date.now());
        const daysSpan = timeSpan / (1000 * 60 * 60 * 24);
        
        return daysSpan > 0 ? adaptationEvents / daysSpan : 0;
    }

    private createCriticsPanel(domain?: string): Array<{ id: string; expertise: string[]; perspective: string }> {
        const baseCritics = [
            {
                id: 'analytical-critic',
                expertise: ['logic', 'reasoning', 'analysis'],
                perspective: 'analytical and logical evaluation'
            },
            {
                id: 'user-experience-critic',
                expertise: ['usability', 'user-experience', 'accessibility'],
                perspective: 'user-centered design and experience'
            },
            {
                id: 'ethical-critic',
                expertise: ['ethics', 'bias', 'fairness'],
                perspective: 'ethical implications and bias detection'
            },
            {
                id: 'practical-critic',
                expertise: ['implementation', 'feasibility', 'resources'],
                perspective: 'practical implementation and constraints'
            }
        ];

        // Add domain-specific critic if specified
        if (domain) {
            baseCritics.push({
                id: `${domain}-expert-critic`,
                expertise: [domain, 'domain-expertise'],
                perspective: `specialized ${domain} domain knowledge`
            });
        }

        return baseCritics.slice(0, this.config.criticCount);
    }

    private async generateCriticPerspective(
        critic: { id: string; expertise: string[]; perspective: string },
        subject: string,
        context: string
    ): Promise<CritiquePerspective> {
        // Simulate critic analysis based on their expertise
        const strengths: string[] = [];
        const weaknesses: string[] = [];
        const suggestions: string[] = [];

        // Generic analysis based on critic type
        switch (critic.id) {
            case 'analytical-critic':
                strengths.push('Logical structure appears sound');
                if (subject.includes('assumption')) {
                    weaknesses.push('Some assumptions may need validation');
                }
                suggestions.push('Consider alternative logical pathways');
                break;

            case 'user-experience-critic':
                strengths.push('User-focused approach is evident');
                if (subject.length > 200) {
                    weaknesses.push('May be too complex for average user');
                }
                suggestions.push('Simplify language and concepts for better accessibility');
                break;

            case 'ethical-critic':
                strengths.push('Appears to consider user welfare');
                if (!subject.includes('privacy') && !subject.includes('consent')) {
                    weaknesses.push('Privacy and consent considerations not explicitly addressed');
                }
                suggestions.push('Ensure transparency and user agency');
                break;

            case 'practical-critic':
                strengths.push('Approach seems implementable');
                if (subject.includes('complex') || subject.includes('advanced')) {
                    weaknesses.push('Implementation complexity may be high');
                }
                suggestions.push('Consider resource requirements and feasibility');
                break;
        }

        return {
            critic: critic.id,
            expertise: critic.expertise,
            analysis: `From a ${critic.perspective} standpoint, analyzing: ${subject.substring(0, 100)}...`,
            strengths,
            weaknesses,
            suggestions,
            confidence: 0.7 + Math.random() * 0.2, // 0.7-0.9
            reasoning: `Based on ${critic.expertise.join(', ')} expertise and current context`
        };
    }

    private findConsensus(perspectives: CritiquePerspective[]): string {
        // Find common themes in strengths and suggestions
        const allStrengths = perspectives.flatMap(p => p.strengths);
        const allSuggestions = perspectives.flatMap(p => p.suggestions);

        const strengthCounts = this.countCommonThemes(allStrengths);
        const suggestionCounts = this.countCommonThemes(allSuggestions);

        const consensusStrengths = Object.entries(strengthCounts)
            .filter(([_, count]) => count >= perspectives.length * this.config.consensusThreshold)
            .map(([theme, _]) => theme);

        const consensusSuggestions = Object.entries(suggestionCounts)
            .filter(([_, count]) => count >= perspectives.length * this.config.consensusThreshold)
            .map(([theme, _]) => theme);

        let consensus = '';
        if (consensusStrengths.length > 0) {
            consensus += `Agreed strengths: ${consensusStrengths.join(', ')}. `;
        }
        if (consensusSuggestions.length > 0) {
            consensus += `Common suggestions: ${consensusSuggestions.join(', ')}.`;
        }

        return consensus || 'No clear consensus reached among critics.';
    }

    private identifyDisagreements(perspectives: CritiquePerspective[]): string[] {
        const disagreements: string[] = [];

        // Look for conflicting assessments
        const hasPositiveAssessment = perspectives.some(p => p.strengths.length > p.weaknesses.length);
        const hasNegativeAssessment = perspectives.some(p => p.weaknesses.length > p.strengths.length);

        if (hasPositiveAssessment && hasNegativeAssessment) {
            disagreements.push('Critics disagree on overall assessment quality');
        }

        // Compare specific suggestions
        const suggestionsByDomain = new Map<string, Set<string>>();
        perspectives.forEach(p => {
            const domain = p.expertise[0];
            if (!suggestionsByDomain.has(domain)) {
                suggestionsByDomain.set(domain, new Set());
            }
            p.suggestions.forEach(s => suggestionsByDomain.get(domain)!.add(s));
        });

        // Look for contradictory suggestions
        const allSuggestions = Array.from(suggestionsByDomain.values()).flatMap(s => Array.from(s));
        if (allSuggestions.some(s => s.includes('simplify')) && 
            allSuggestions.some(s => s.includes('complex'))) {
            disagreements.push('Critics disagree on complexity level appropriateness');
        }

        return disagreements;
    }

    private synthesizeRecommendations(perspectives: CritiquePerspective[]): string[] {
        const allSuggestions = perspectives.flatMap(p => p.suggestions);
        const suggestionCounts = this.countCommonThemes(allSuggestions);

        // Prioritize suggestions mentioned by multiple critics
        const prioritizedSuggestions = Object.entries(suggestionCounts)
            .sort(([_, a], [__, b]) => b - a)
            .slice(0, 5)
            .map(([suggestion, _]) => suggestion);

        // Add unique high-confidence suggestions
        perspectives.forEach(p => {
            if (p.confidence > 0.8) {
                p.suggestions.forEach(s => {
                    if (!prioritizedSuggestions.includes(s) && prioritizedSuggestions.length < 7) {
                        prioritizedSuggestions.push(s);
                    }
                });
            }
        });

        return prioritizedSuggestions;
    }

    private calculateCritiqueConfidence(perspectives: CritiquePerspective[]): number {
        const avgConfidence = perspectives.reduce((sum, p) => sum + p.confidence, 0) / perspectives.length;
        
        // Adjust based on agreement level
        const agreementBonus = this.calculateAgreementLevel(perspectives) * 0.2;
        
        return Math.min(1.0, avgConfidence + agreementBonus);
    }

    private countCommonThemes(items: string[]): Record<string, number> {
        const themes: Record<string, number> = {};
        
        items.forEach(item => {
            const words = item.toLowerCase().split(/\s+/);
            words.forEach(word => {
                if (word.length > 3) {
                    const stemmed = word.replace(/ing$|ed$|s$/, ''); // Simple stemming
                    themes[stemmed] = (themes[stemmed] || 0) + 1;
                }
            });
        });

        return themes;
    }

    private calculateAgreementLevel(perspectives: CritiquePerspective[]): number {
        if (perspectives.length < 2) return 1.0;

        const allStrengths = perspectives.flatMap(p => p.strengths);
        const allWeaknesses = perspectives.flatMap(p => p.weaknesses);
        
        const strengthOverlap = this.calculateOverlapRatio(allStrengths);
        const weaknessOverlap = this.calculateOverlapRatio(allWeaknesses);
        
        return (strengthOverlap + weaknessOverlap) / 2;
    }

    private calculateOverlapRatio(items: string[]): number {
        if (items.length === 0) return 1.0;
        
        const uniqueItems = new Set(items);
        return 1 - (uniqueItems.size / items.length);
    }
}