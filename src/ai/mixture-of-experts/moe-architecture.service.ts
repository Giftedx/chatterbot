// MIXTURE OF EXPERTS (MoE) ARCHITECTURE SERVICE
// Implements dynamic expert selection and routing for specialized AI tasks
// Based on 2025 research in scalable AI architectures

import { EventEmitter } from 'events';
import { getEnvAsString, getEnvAsBoolean } from '../../utils/env.js';

interface Expert {
  id: string;
  name: string;
  specialization: string;
  model_provider: string;
  confidence_threshold: number;
  performance_metrics: {
    accuracy: number;
    latency_ms: number;
    cost_per_token: number;
    utilization_rate: number;
  };
  capabilities: string[];
  last_used: Date;
}

interface ExpertRoutingDecision {
  selected_experts: Expert[];
  routing_confidence: number;
  reasoning: string;
  expected_performance: {
    accuracy: number;
    latency_ms: number;
    cost_usd: number;
  };
}

interface MoEProcessingResult {
  response: string;
  confidence: number;
  experts_used: string[];
  ensemble_weights: Record<string, number>;
  processing_time_ms: number;
  cost_usd: number;
  quality_score: number;
}

export class MixtureOfExpertsService extends EventEmitter {
  private isInitialized = false;
  private experts: Map<string, Expert> = new Map();
  private routingHistory: Array<{
    query: string;
    decision: ExpertRoutingDecision;
    result: MoEProcessingResult;
    timestamp: Date;
  }> = [];

  constructor() {
    super();
    this.initializeExperts();
  }

  private initializeExperts(): void {
    // Code Generation Expert
    this.experts.set('code_expert', {
      id: 'code_expert',
      name: 'Code Generation Specialist',
      specialization: 'programming, debugging, architecture',
      model_provider: 'claude-3.5-sonnet',
      confidence_threshold: 0.85,
      performance_metrics: {
        accuracy: 0.92,
        latency_ms: 1200,
        cost_per_token: 0.000015,
        utilization_rate: 0.78
      },
      capabilities: ['code_generation', 'debugging', 'code_review', 'architecture_design'],
      last_used: new Date()
    });

    // Creative Writing Expert
    this.experts.set('creative_expert', {
      id: 'creative_expert',
      name: 'Creative Content Specialist',
      specialization: 'creative writing, storytelling, content creation',
      model_provider: 'gpt-4o',
      confidence_threshold: 0.80,
      performance_metrics: {
        accuracy: 0.88,
        latency_ms: 800,
        cost_per_token: 0.00001,
        utilization_rate: 0.65
      },
      capabilities: ['creative_writing', 'storytelling', 'content_creation', 'brainstorming'],
      last_used: new Date()
    });

    // Research & Analysis Expert
    this.experts.set('research_expert', {
      id: 'research_expert',
      name: 'Research & Analysis Specialist',
      specialization: 'research, data analysis, fact-checking',
      model_provider: 'gemini-1.5-pro',
      confidence_threshold: 0.90,
      performance_metrics: {
        accuracy: 0.95,
        latency_ms: 1500,
        cost_per_token: 0.0000125,
        utilization_rate: 0.82
      },
      capabilities: ['research', 'data_analysis', 'fact_checking', 'academic_writing'],
      last_used: new Date()
    });

    // Mathematical Reasoning Expert
    this.experts.set('math_expert', {
      id: 'math_expert',
      name: 'Mathematical Reasoning Specialist',
      specialization: 'mathematics, statistics, quantitative analysis',
      model_provider: 'claude-3.5-sonnet',
      confidence_threshold: 0.93,
      performance_metrics: {
        accuracy: 0.96,
        latency_ms: 1000,
        cost_per_token: 0.000015,
        utilization_rate: 0.71
      },
      capabilities: ['mathematics', 'statistics', 'quantitative_analysis', 'problem_solving'],
      last_used: new Date()
    });

    // Business Strategy Expert
    this.experts.set('business_expert', {
      id: 'business_expert',
      name: 'Business Strategy Specialist',
      specialization: 'business analysis, strategy, marketing',
      model_provider: 'gpt-4o',
      confidence_threshold: 0.85,
      performance_metrics: {
        accuracy: 0.89,
        latency_ms: 900,
        cost_per_token: 0.00001,
        utilization_rate: 0.68
      },
      capabilities: ['business_analysis', 'strategy', 'marketing', 'financial_analysis'],
      last_used: new Date()
    });

    // Conversational Expert
    this.experts.set('conversation_expert', {
      id: 'conversation_expert',
      name: 'Conversational AI Specialist',
      specialization: 'natural conversation, empathy, social interaction',
      model_provider: 'gemini-1.5-flash',
      confidence_threshold: 0.75,
      performance_metrics: {
        accuracy: 0.85,
        latency_ms: 600,
        cost_per_token: 0.0000075,
        utilization_rate: 0.90
      },
      capabilities: ['conversation', 'empathy', 'social_interaction', 'emotional_support'],
      last_used: new Date()
    });
  }

  async init(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      console.log('🧠 Initializing Mixture of Experts Architecture...');
      
      // Validate expert configurations
      for (const [id, expert] of this.experts) {
        if (!this.validateExpert(expert)) {
          console.warn(`⚠️ Invalid expert configuration: ${id}`);
          this.experts.delete(id);
        }
      }

      this.isInitialized = true;
      console.log(`✅ MoE Architecture initialized with ${this.experts.size} experts`);
      
      this.emit('initialized', { expert_count: this.experts.size });
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize MoE Architecture:', error);
      return false;
    }
  }

  private validateExpert(expert: Expert): boolean {
    return (
      expert.id &&
      expert.name &&
      expert.specialization &&
      expert.model_provider &&
      expert.confidence_threshold >= 0 &&
      expert.confidence_threshold <= 1 &&
      expert.capabilities.length > 0
    );
  }

  async routeToExperts(
    query: string,
    context: Record<string, unknown> = {},
    options: {
      max_experts?: number;
      min_confidence?: number;
      prefer_speed?: boolean;
      prefer_accuracy?: boolean;
    } = {}
  ): Promise<ExpertRoutingDecision> {
    const {
      max_experts = 3,
      min_confidence = 0.7,
      prefer_speed = false,
      prefer_accuracy = false
    } = options;

    // Analyze query to determine required capabilities
    const requiredCapabilities = await this.analyzeQueryCapabilities(query, context);
    
    // Score experts based on capability match and performance
    const expertScores = new Map<string, number>();
    
    for (const [id, expert] of this.experts) {
      let score = 0;
      
      // Capability matching score (40% weight)
      const capabilityMatch = this.calculateCapabilityMatch(requiredCapabilities, expert.capabilities);
      score += capabilityMatch * 0.4;
      
      // Performance score (30% weight)
      const performanceScore = this.calculatePerformanceScore(expert, prefer_speed, prefer_accuracy);
      score += performanceScore * 0.3;
      
      // Availability score (20% weight)
      const availabilityScore = this.calculateAvailabilityScore(expert);
      score += availabilityScore * 0.2;
      
      // Confidence threshold (10% weight)
      const confidenceScore = expert.confidence_threshold;
      score += confidenceScore * 0.1;
      
      expertScores.set(id, score);
    }

    // Select top experts
    const sortedExperts = Array.from(expertScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, max_experts)
      .filter(([_, score]) => score >= min_confidence)
      .map(([id, _]) => this.experts.get(id)!);

    const routingConfidence = expertScores.size > 0 ? 
      Math.max(...Array.from(expertScores.values())) : 0;

    return {
      selected_experts: sortedExperts,
      routing_confidence: routingConfidence,
      reasoning: this.generateRoutingReasoning(sortedExperts, requiredCapabilities),
      expected_performance: this.calculateExpectedPerformance(sortedExperts)
    };
  }

  private async analyzeQueryCapabilities(
    query: string, 
    context: Record<string, unknown>
  ): Promise<string[]> {
    const capabilities: string[] = [];
    const queryLower = query.toLowerCase();
    
    // Pattern matching for capability detection
    const patterns = {
      'code_generation': /\b(code|program|function|class|algorithm|debug|implement)\b/,
      'mathematics': /\b(calculate|solve|equation|formula|statistics|math)\b/,
      'creative_writing': /\b(story|write|creative|poem|narrative|character)\b/,
      'research': /\b(research|analyze|investigate|study|data|facts)\b/,
      'business_analysis': /\b(business|strategy|market|revenue|profit|analysis)\b/,
      'conversation': /\b(chat|talk|discuss|explain|help|advice)\b/
    };

    for (const [capability, pattern] of Object.entries(patterns)) {
      if (pattern.test(queryLower)) {
        capabilities.push(capability);
      }
    }

    // Default to conversation if no specific capabilities detected
    if (capabilities.length === 0) {
      capabilities.push('conversation');
    }

    return capabilities;
  }

  private calculateCapabilityMatch(required: string[], available: string[]): number {
    if (required.length === 0) return 0.5; // Default moderate match
    
    const matches = required.filter(req => 
      available.some(avail => avail.includes(req) || req.includes(avail))
    );
    
    return matches.length / required.length;
  }

  private calculatePerformanceScore(
    expert: Expert, 
    preferSpeed: boolean, 
    preferAccuracy: boolean
  ): number {
    const metrics = expert.performance_metrics;
    
    if (preferSpeed) {
      // Prioritize low latency
      return (1 - (metrics.latency_ms / 3000)) * 0.6 + metrics.accuracy * 0.4;
    } else if (preferAccuracy) {
      // Prioritize high accuracy
      return metrics.accuracy * 0.8 + (1 - (metrics.latency_ms / 3000)) * 0.2;
    } else {
      // Balanced score
      return (metrics.accuracy * 0.5) + 
             ((1 - (metrics.latency_ms / 3000)) * 0.3) + 
             (metrics.utilization_rate * 0.2);
    }
  }

  private calculateAvailabilityScore(expert: Expert): number {
    const timeSinceLastUse = Date.now() - expert.last_used.getTime();
    const hoursSinceLastUse = timeSinceLastUse / (1000 * 60 * 60);
    
    // Higher score for experts that haven't been used recently (load balancing)
    return Math.min(1, hoursSinceLastUse / 24);
  }

  private generateRoutingReasoning(experts: Expert[], capabilities: string[]): string {
    if (experts.length === 0) {
      return 'No suitable experts found for the given query.';
    }

    const expertNames = experts.map(e => e.name).join(', ');
    const capabilitiesStr = capabilities.join(', ');
    
    return `Selected ${experts.length} expert(s): ${expertNames}. ` +
           `Based on required capabilities: ${capabilitiesStr}. ` +
           `Routing confidence based on capability matching and performance metrics.`;
  }

  private calculateExpectedPerformance(experts: Expert[]): {
    accuracy: number;
    latency_ms: number;
    cost_usd: number;
  } {
    if (experts.length === 0) {
      return { accuracy: 0, latency_ms: 5000, cost_usd: 0 };
    }

    // Ensemble averaging for performance prediction
    const avgAccuracy = experts.reduce((sum, e) => sum + e.performance_metrics.accuracy, 0) / experts.length;
    const maxLatency = Math.max(...experts.map(e => e.performance_metrics.latency_ms));
    const totalCost = experts.reduce((sum, e) => sum + e.performance_metrics.cost_per_token * 100, 0);

    return {
      accuracy: Math.min(0.98, avgAccuracy * 1.05), // Ensemble bonus
      latency_ms: maxLatency + 200, // Add coordination overhead
      cost_usd: totalCost
    };
  }

  async processWithMoE(
    query: string,
    context: Record<string, unknown> = {},
    options: {
      ensemble_method?: 'voting' | 'weighted' | 'best_expert';
      max_experts?: number;
      timeout_ms?: number;
    } = {}
  ): Promise<MoEProcessingResult> {
    const startTime = Date.now();
    const {
      ensemble_method = 'weighted',
      max_experts = 3,
      timeout_ms = 30000
    } = options;

    try {
      // Route to appropriate experts
      const routingDecision = await this.routeToExperts(query, context, { max_experts });
      
      if (routingDecision.selected_experts.length === 0) {
        throw new Error('No suitable experts available for query');
      }

      // Process with selected experts (simulated)
      const expertResponses = await Promise.all(
        routingDecision.selected_experts.map(async (expert) => {
          // Simulate expert processing
          const processingTime = expert.performance_metrics.latency_ms + Math.random() * 200;
          await new Promise(resolve => setTimeout(resolve, Math.min(processingTime, 100)));
          
          return {
            expert_id: expert.id,
            response: `[${expert.name}] Response to: ${query}`,
            confidence: expert.confidence_threshold + Math.random() * 0.1,
            processing_time_ms: processingTime,
            cost_usd: expert.performance_metrics.cost_per_token * query.length * 0.001
          };
        })
      );

      // Ensemble the responses
      const ensembledResult = this.ensembleResponses(expertResponses, ensemble_method);
      
      // Update expert usage
      routingDecision.selected_experts.forEach(expert => {
        expert.last_used = new Date();
        expert.performance_metrics.utilization_rate = Math.min(1, 
          expert.performance_metrics.utilization_rate + 0.01
        );
      });

      const processingTime = Date.now() - startTime;
      
      const result: MoEProcessingResult = {
        response: ensembledResult.response,
        confidence: ensembledResult.confidence,
        experts_used: routingDecision.selected_experts.map(e => e.id),
        ensemble_weights: ensembledResult.weights,
        processing_time_ms: processingTime,
        cost_usd: expertResponses.reduce((sum, r) => sum + r.cost_usd, 0),
        quality_score: this.calculateQualityScore(ensembledResult, routingDecision)
      };

      // Store routing history
      this.routingHistory.push({
        query,
        decision: routingDecision,
        result,
        timestamp: new Date()
      });

      this.emit('processing_complete', { result, experts_used: result.experts_used });
      return result;

    } catch (error) {
      console.error('❌ MoE processing failed:', error);
      throw error;
    }
  }

  private ensembleResponses(
    responses: Array<{
      expert_id: string;
      response: string;
      confidence: number;
      processing_time_ms: number;
      cost_usd: number;
    }>,
    method: 'voting' | 'weighted' | 'best_expert'
  ): {
    response: string;
    confidence: number;
    weights: Record<string, number>;
  } {
    const weights: Record<string, number> = {};
    
    switch (method) {
      case 'best_expert':
        const bestResponse = responses.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        );
        weights[bestResponse.expert_id] = 1.0;
        return {
          response: bestResponse.response,
          confidence: bestResponse.confidence,
          weights
        };

      case 'weighted':
        const totalConfidence = responses.reduce((sum, r) => sum + r.confidence, 0);
        responses.forEach(r => {
          weights[r.expert_id] = r.confidence / totalConfidence;
        });
        
        // Weighted combination (simplified)
        const weightedResponse = responses
          .map(r => `${r.response} (confidence: ${r.confidence.toFixed(2)})`)
          .join('\n\n');
        
        const avgConfidence = totalConfidence / responses.length;
        
        return {
          response: weightedResponse,
          confidence: avgConfidence,
          weights
        };

      case 'voting':
      default:
        // Equal weights for voting
        responses.forEach(r => {
          weights[r.expert_id] = 1 / responses.length;
        });
        
        const votingResponse = responses.map(r => r.response).join('\n\n');
        const votingConfidence = responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;
        
        return {
          response: votingResponse,
          confidence: votingConfidence,
          weights
        };
    }
  }

  private calculateQualityScore(
    ensembledResult: { confidence: number },
    routingDecision: ExpertRoutingDecision
  ): number {
    // Combine ensemble confidence with routing confidence
    return (ensembledResult.confidence * 0.7) + (routingDecision.routing_confidence * 0.3);
  }

  async addExpert(expert: Expert): Promise<boolean> {
    try {
      if (!this.validateExpert(expert)) {
        throw new Error('Invalid expert configuration');
      }

      this.experts.set(expert.id, expert);
      console.log(`✅ Added expert: ${expert.name}`);
      
      this.emit('expert_added', { expert_id: expert.id, expert_name: expert.name });
      return true;

    } catch (error) {
      console.error('❌ Failed to add expert:', error);
      return false;
    }
  }

  async removeExpert(expertId: string): Promise<boolean> {
    try {
      const expert = this.experts.get(expertId);
      if (!expert) {
        throw new Error(`Expert not found: ${expertId}`);
      }

      this.experts.delete(expertId);
      console.log(`🗑️ Removed expert: ${expert.name}`);
      
      this.emit('expert_removed', { expert_id: expertId });
      return true;

    } catch (error) {
      console.error('❌ Failed to remove expert:', error);
      return false;
    }
  }

  getMetrics(): {
    total_experts: number;
    active_experts: number;
    routing_history_size: number;
    average_quality_score: number;
    expert_utilization: Record<string, number>;
  } {
    const activeExperts = Array.from(this.experts.values())
      .filter(e => e.performance_metrics.utilization_rate > 0.1).length;
    
    const avgQuality = this.routingHistory.length > 0 ?
      this.routingHistory.reduce((sum, h) => sum + h.result.quality_score, 0) / this.routingHistory.length :
      0;

    const utilization: Record<string, number> = {};
    this.experts.forEach((expert, id) => {
      utilization[id] = expert.performance_metrics.utilization_rate;
    });

    return {
      total_experts: this.experts.size,
      active_experts: activeExperts,
      routing_history_size: this.routingHistory.length,
      average_quality_score: avgQuality,
      expert_utilization: utilization
    };
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    expert_count: number;
    routing_performance: number;
  }> {
    const metrics = this.getMetrics();
    const routingPerformance = metrics.average_quality_score;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (metrics.total_experts >= 4 && routingPerformance >= 0.8) {
      status = 'healthy';
    } else if (metrics.total_experts >= 2 && routingPerformance >= 0.6) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      expert_count: metrics.total_experts,
      routing_performance: routingPerformance
    };
  }

  async shutdown(): Promise<void> {
    try {
      console.log('🔌 Shutting down Mixture of Experts service...');
      this.experts.clear();
      this.routingHistory = [];
      this.isInitialized = false;
      this.emit('shutdown');
      console.log('✅ MoE service shutdown complete');
    } catch (error) {
      console.error('❌ Error during MoE shutdown:', error);
    }
  }
}

export const mixtureOfExpertsService = new MixtureOfExpertsService();