// ADVANCED SEMANTIC ROUTING AND INTENT CLASSIFICATION SERVICE
// Implements sophisticated semantic understanding for intelligent query routing and intent detection

import { EventEmitter } from 'events';
import { getEnvAsBoolean, getEnvAsString, getEnvAsNumber } from '../../utils/env.js';
import { z } from 'zod';
import OpenAI from 'openai';

// Semantic Route Schemas
const SemanticRouteSchema = z.object({
  id: z.string(),
  name: z.string(),
  patterns: z.array(z.string()),
  embeddings: z.array(z.number()).optional(),
  intent_keywords: z.array(z.string()),
  semantic_keywords: z.array(z.string()),
  priority: z.number().default(1),
  confidence_threshold: z.number().default(0.7),
  destination: z.object({
    service: z.string(),
    method: z.string(),
    parameters: z.record(z.unknown()).default({})
  }),
  preprocessing: z.array(z.string()).default([]),
  postprocessing: z.array(z.string()).default([]),
  examples: z.array(z.object({
    input: z.string(),
    expected_route: z.boolean(),
    context: z.record(z.unknown()).optional()
  })).default([]),
  metadata: z.record(z.unknown()).default({})
});

const IntentClassificationSchema = z.object({
  intent: z.string(),
  confidence: z.number(),
  entities: z.array(z.object({
    type: z.string(),
    value: z.string(),
    start: z.number(),
    end: z.number(),
    confidence: z.number()
  })),
  semantic_similarity: z.number(),
  contextual_relevance: z.number(),
  emotional_tone: z.object({
    sentiment: z.enum(['positive', 'negative', 'neutral']),
    intensity: z.number(),
    emotions: z.array(z.string())
  }).optional(),
  complexity_score: z.number(),
  urgency_level: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
});

const RoutingDecisionSchema = z.object({
  route_id: z.string(),
  confidence: z.number(),
  reasoning: z.string(),
  alternative_routes: z.array(z.object({
    route_id: z.string(),
    confidence: z.number(),
    reason: z.string()
  })),
  preprocessing_applied: z.array(z.string()),
  execution_metadata: z.record(z.unknown()),
  timestamp: z.date().default(() => new Date())
});

type SemanticRoute = z.infer<typeof SemanticRouteSchema>;
type IntentClassification = z.infer<typeof IntentClassificationSchema>;
type RoutingDecision = z.infer<typeof RoutingDecisionSchema>;

interface SemanticEmbedding {
  text: string;
  embedding: number[];
  model: string;
  created_at: Date;
}

interface RoutingMetrics {
  total_routings: number;
  successful_routings: number;
  average_confidence: number;
  route_utilization: Record<string, number>;
  intent_distribution: Record<string, number>;
  processing_time_ms: number;
  embedding_cache_hits: number;
  semantic_accuracy: number;
}

interface ContextualFactors {
  user_history: Array<{
    query: string;
    route: string;
    timestamp: Date;
    satisfaction: number;
  }>;
  conversation_context: string[];
  user_preferences: Record<string, unknown>;
  temporal_context: {
    time_of_day: string;
    day_of_week: string;
    season: string;
  };
  environmental_context: {
    platform: string;
    location: string;
    device_type: string;
  };
}

class SemanticRoutingService extends EventEmitter {
  private isInitialized = false;
  private routes: Map<string, SemanticRoute> = new Map();
  private embeddingCache: Map<string, SemanticEmbedding> = new Map();
  private routingHistory: Array<{
    query: string;
    decision: RoutingDecision;
    actual_route: string;
    success: boolean;
  }> = [];
  private openaiClient: OpenAI | null = null;
  
  private metrics: RoutingMetrics = {
    total_routings: 0,
    successful_routings: 0,
    average_confidence: 0,
    route_utilization: {},
    intent_distribution: {},
    processing_time_ms: 0,
    embedding_cache_hits: 0,
    semantic_accuracy: 0.85
  };

  // Advanced NLP patterns for intent detection
  private intentPatterns = {
    question: [
      /^(what|how|when|where|why|who|which|can|could|would|should|do|does|did|is|are|was|were)/i,
      /\?$/,
      /please (tell|explain|show|help)/i
    ],
    request: [
      /^(please|could you|can you|would you|help me|i need|i want)/i,
      /create|generate|make|build|develop/i,
      /find|search|look|locate/i
    ],
    command: [
      /^(do|execute|run|start|stop|delete|remove|update|modify)/i,
      /!(.*)/,
      /^[A-Z]+.*[!.]$/
    ],
    conversation: [
      /^(hi|hello|hey|good morning|good afternoon|good evening)/i,
      /^(thank you|thanks|bye|goodbye|see you)/i,
      /how are you|how's it going/i
    ],
    analysis: [
      /analyze|analysis|examine|evaluate|assess|review/i,
      /compare|contrast|difference|similarity/i,
      /trend|pattern|insight|conclusion/i
    ],
    creative: [
      /create|generate|design|invent|imagine|brainstorm/i,
      /story|poem|song|art|creative|original/i,
      /idea|concept|inspiration/i
    ],
    technical: [
      /code|programming|software|algorithm|function|debug/i,
      /database|query|sql|api|json|xml/i,
      /error|exception|bug|fix|troubleshoot/i
    ]
  };

  constructor() {
    super();
    this.setupDefaultRoutes();
  }

  async init(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      console.log('🧭 Initializing Semantic Routing Service...');

      // Initialize OpenAI client for embeddings
      const openaiApiKey = getEnvAsString('OPENAI_API_KEY');
      if (openaiApiKey) {
        this.openaiClient = new OpenAI({ apiKey: openaiApiKey });
      }

      // Generate embeddings for existing routes
      await this.generateRouteEmbeddings();

      // Setup optimization strategies
      this.setupOptimizationStrategies();

      this.isInitialized = true;
      console.log('✅ Semantic Routing Service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Semantic Routing Service:', error);
      return false;
    }
  }

  private setupDefaultRoutes(): void {
    // Question Answering Route
    this.routes.set('qa_route', {
      id: 'qa_route',
      name: 'Question Answering',
      patterns: [
        'What is *',
        'How does * work',
        'Can you explain *',
        'Tell me about *',
        'Why *',
        'When *',
        'Where *'
      ],
      intent_keywords: ['question', 'ask', 'explain', 'tell', 'what', 'how', 'why', 'when', 'where'],
      semantic_keywords: ['information', 'knowledge', 'understanding', 'clarification', 'definition'],
      priority: 2,
      confidence_threshold: 0.75,
      destination: {
        service: 'comprehensive_ai_framework',
        method: 'processAdvancedQuery',
        parameters: { capability: 'qa_reasoning' }
      },
      preprocessing: ['normalize_text', 'extract_entities'],
      examples: [
        { input: 'What is machine learning?', expected_route: true },
        { input: 'How does blockchain work?', expected_route: true },
        { input: 'Can you explain quantum computing?', expected_route: true }
      ]
    });

    // Code Generation Route
    this.routes.set('code_gen_route', {
      id: 'code_gen_route',
      name: 'Code Generation',
      patterns: [
        'Write code for *',
        'Generate * function',
        'Create a * program',
        'Implement *',
        'Build a * application'
      ],
      intent_keywords: ['code', 'program', 'function', 'implement', 'build', 'create', 'generate'],
      semantic_keywords: ['programming', 'development', 'software', 'algorithm', 'implementation'],
      priority: 3,
      confidence_threshold: 0.8,
      destination: {
        service: 'dspy_framework',
        method: 'executePipeline',
        parameters: { pipeline_id: 'code_generation_pipeline' }
      },
      preprocessing: ['extract_language', 'parse_requirements'],
      examples: [
        { input: 'Write a Python function to sort a list', expected_route: true },
        { input: 'Generate JavaScript code for API calls', expected_route: true },
        { input: 'Create a React component for user login', expected_route: true }
      ]
    });

    // Creative Content Route
    this.routes.set('creative_route', {
      id: 'creative_route',
      name: 'Creative Content Generation',
      patterns: [
        'Write a story about *',
        'Create a poem *',
        'Generate creative * content',
        'Come up with ideas for *',
        'Brainstorm *'
      ],
      intent_keywords: ['creative', 'story', 'poem', 'ideas', 'brainstorm', 'imagine', 'invent'],
      semantic_keywords: ['creativity', 'imagination', 'artistic', 'original', 'innovative'],
      priority: 2,
      confidence_threshold: 0.7,
      destination: {
        service: 'crewai_orchestration',
        method: 'executeCreativeCrew',
        parameters: { domain: 'content_creation' }
      },
      preprocessing: ['identify_creative_type', 'extract_themes'],
      examples: [
        { input: 'Write a short story about time travel', expected_route: true },
        { input: 'Create a haiku about nature', expected_route: true },
        { input: 'Brainstorm ideas for a mobile app', expected_route: true }
      ]
    });

    // Analysis and Research Route
    this.routes.set('analysis_route', {
      id: 'analysis_route',
      name: 'Analysis and Research',
      patterns: [
        'Analyze *',
        'Research *',
        'Compare * and *',
        'What are the pros and cons of *',
        'Evaluate *',
        'Review *'
      ],
      intent_keywords: ['analyze', 'research', 'compare', 'evaluate', 'review', 'study', 'examine'],
      semantic_keywords: ['analysis', 'investigation', 'assessment', 'evaluation', 'comparison'],
      priority: 3,
      confidence_threshold: 0.75,
      destination: {
        service: 'langgraph_workflow',
        method: 'execute',
        parameters: { workflow_type: 'research_analysis' }
      },
      preprocessing: ['identify_research_type', 'extract_comparison_entities'],
      examples: [
        { input: 'Analyze the impact of AI on healthcare', expected_route: true },
        { input: 'Compare React and Vue.js frameworks', expected_route: true },
        { input: 'Research sustainable energy solutions', expected_route: true }
      ]
    });

    // Multi-Agent Collaboration Route
    this.routes.set('collaboration_route', {
      id: 'collaboration_route',
      name: 'Multi-Agent Collaboration',
      patterns: [
        'I need help with complex *',
        'This requires multiple perspectives *',
        'Can a team work on *',
        'Collaborative solution for *',
        'Team effort *'
      ],
      intent_keywords: ['complex', 'team', 'collaborate', 'multiple', 'comprehensive', 'thorough'],
      semantic_keywords: ['collaboration', 'teamwork', 'comprehensive', 'multi-faceted', 'complex'],
      priority: 4,
      confidence_threshold: 0.8,
      destination: {
        service: 'autogen_multi_agent',
        method: 'executeCollaborativeTask',
        parameters: { required_capabilities: ['general'] }
      },
      preprocessing: ['identify_complexity', 'extract_required_expertise'],
      examples: [
        { input: 'I need a comprehensive business plan for a tech startup', expected_route: true },
        { input: 'Help me solve this complex optimization problem', expected_route: true },
        { input: 'Design a complete software architecture', expected_route: true }
      ]
    });

    // Real-time Interaction Route
    this.routes.set('realtime_route', {
      id: 'realtime_route',
      name: 'Real-time Interaction',
      patterns: [
        'Stream *',
        'Live *',
        'Real-time *',
        'Interactive *',
        'Continuous *'
      ],
      intent_keywords: ['stream', 'live', 'real-time', 'interactive', 'continuous', 'ongoing'],
      semantic_keywords: ['streaming', 'live', 'interactive', 'real-time', 'continuous'],
      priority: 3,
      confidence_threshold: 0.7,
      destination: {
        service: 'real_time_streaming',
        method: 'handleStreamingRequest',
        parameters: { stream_type: 'interactive' }
      },
      preprocessing: ['identify_stream_type', 'setup_realtime_context'],
      examples: [
        { input: 'Stream AI responses as you generate them', expected_route: true },
        { input: 'I want live updates on my request', expected_route: true },
        { input: 'Provide real-time coding assistance', expected_route: true }
      ]
    });
  }

  async route(
    query: string,
    context: Partial<ContextualFactors> = {}
  ): Promise<RoutingDecision> {
    const startTime = Date.now();

    try {
      console.log(`🧭 Routing query: ${query.substring(0, 100)}...`);

      // Step 1: Preprocess the query
      const preprocessedQuery = await this.preprocessQuery(query);

      // Step 2: Classify intent and extract entities
      const intentClassification = await this.classifyIntent(preprocessedQuery, context);

      // Step 3: Generate semantic embedding
      const queryEmbedding = await this.generateEmbedding(preprocessedQuery);

      // Step 4: Calculate semantic similarities with routes
      const routeSimilarities = await this.calculateRouteSimilarities(
        queryEmbedding,
        intentClassification,
        context
      );

      // Step 5: Apply contextual factors
      const contextualScores = await this.applyContextualFactors(
        routeSimilarities,
        context,
        intentClassification
      );

      // Step 6: Select best route
      const bestRoute = this.selectBestRoute(contextualScores, intentClassification);

      // Step 7: Generate routing decision
      const decision: RoutingDecision = {
        route_id: bestRoute.route_id,
        confidence: bestRoute.confidence,
        reasoning: bestRoute.reasoning,
        alternative_routes: contextualScores
          .filter(score => score.route_id !== bestRoute.route_id)
          .slice(0, 3)
          .map(score => ({
            route_id: score.route_id,
            confidence: score.confidence,
            reason: score.reasoning || 'Alternative option'
          })),
        preprocessing_applied: ['text_normalization', 'intent_classification', 'semantic_analysis'],
        execution_metadata: {
          intent_classification: intentClassification,
          processing_time_ms: Date.now() - startTime,
          semantic_embedding_model: 'text-embedding-ada-002'
        },
        timestamp: new Date()
      };

      // Update metrics
      this.updateRoutingMetrics(decision, Date.now() - startTime);

      this.emit('query_routed', {
        query: preprocessedQuery,
        decision,
        intent: intentClassification.intent
      });

      return decision;

    } catch (error) {
      console.error('❌ Routing error:', error);
      
      // Fallback to default route
      const fallbackDecision: RoutingDecision = {
        route_id: 'qa_route',
        confidence: 0.5,
        reasoning: 'Fallback due to routing error',
        alternative_routes: [],
        preprocessing_applied: [],
        execution_metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      };

      return fallbackDecision;
    }
  }

  private async preprocessQuery(query: string): Promise<string> {
    // Basic text normalization
    let processed = query.trim().toLowerCase();
    
    // Remove extra whitespace
    processed = processed.replace(/\s+/g, ' ');
    
    // Handle common contractions
    const contractions: Record<string, string> = {
      "can't": "cannot",
      "won't": "will not",
      "isn't": "is not",
      "aren't": "are not",
      "don't": "do not",
      "doesn't": "does not",
      "didn't": "did not",
      "haven't": "have not",
      "hasn't": "has not",
      "hadn't": "had not",
      "wouldn't": "would not",
      "shouldn't": "should not",
      "couldn't": "could not"
    };

    for (const [contraction, expansion] of Object.entries(contractions)) {
      processed = processed.replace(new RegExp(contraction, 'gi'), expansion);
    }

    return processed;
  }

  private async classifyIntent(
    query: string,
    context: Partial<ContextualFactors>
  ): Promise<IntentClassification> {
    const classification: IntentClassification = {
      intent: 'general',
      confidence: 0.6,
      entities: [],
      semantic_similarity: 0,
      contextual_relevance: 0,
      complexity_score: this.calculateComplexityScore(query),
      urgency_level: this.detectUrgencyLevel(query)
    };

    // Pattern-based intent classification
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(query)) {
          classification.intent = intent;
          classification.confidence = Math.min(classification.confidence + 0.2, 0.95);
          break;
        }
      }
    }

    // Enhanced intent classification with context
    if (this.openaiClient) {
      try {
        const enhanced = await this.enhanceIntentClassification(query, context);
        classification.intent = enhanced.intent || classification.intent;
        classification.confidence = Math.max(classification.confidence, enhanced.confidence);
        classification.entities = enhanced.entities || [];
        classification.emotional_tone = enhanced.emotional_tone;
      } catch (error) {
        console.warn('Enhanced intent classification failed, using basic classification');
      }
    }

    return classification;
  }

  private async enhanceIntentClassification(
    query: string,
    context: Partial<ContextualFactors>
  ): Promise<Partial<IntentClassification>> {
    if (!this.openaiClient) return {};

    const prompt = `
Analyze this user query and provide detailed classification:

Query: "${query}"

Classify the intent, extract entities, and analyze emotional tone.
Provide response in JSON format:
{
  "intent": "question|request|command|conversation|analysis|creative|technical",
  "confidence": 0.0-1.0,
  "entities": [{"type": "entity_type", "value": "entity_value", "start": 0, "end": 5, "confidence": 0.9}],
  "emotional_tone": {
    "sentiment": "positive|negative|neutral",
    "intensity": 0.0-1.0,
    "emotions": ["excited", "curious", "frustrated"]
  }
}`;

    try {
      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert NLP analyst. Provide precise, structured analysis.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('Failed to enhance intent classification:', error);
    }

    return {};
  }

  private calculateComplexityScore(query: string): number {
    let score = 0;
    
    // Length factor
    score += Math.min(query.length / 100, 0.3);
    
    // Technical terms
    const technicalTerms = ['algorithm', 'database', 'api', 'framework', 'architecture', 'optimization'];
    technicalTerms.forEach(term => {
      if (query.toLowerCase().includes(term)) score += 0.1;
    });
    
    // Question complexity
    const complexQuestions = ['why', 'how', 'compare', 'analyze', 'evaluate'];
    complexQuestions.forEach(word => {
      if (query.toLowerCase().includes(word)) score += 0.05;
    });
    
    // Multiple concepts
    const concepts = query.split(/\s+and\s+|\s+or\s+|\s+vs\s+|\s+versus\s+/i);
    if (concepts.length > 1) score += 0.2;
    
    return Math.min(score, 1.0);
  }

  private detectUrgencyLevel(query: string): 'low' | 'medium' | 'high' | 'critical' {
    const urgentWords = ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'now', 'quickly'];
    const lowUrgencyWords = ['when you have time', 'eventually', 'later', 'someday'];
    
    const queryLower = query.toLowerCase();
    
    if (urgentWords.some(word => queryLower.includes(word))) {
      return 'critical';
    }
    
    if (lowUrgencyWords.some(word => queryLower.includes(word))) {
      return 'low';
    }
    
    // Check for time-sensitive patterns
    if (/\b(today|tomorrow|this week|deadline|due)\b/i.test(query)) {
      return 'high';
    }
    
    return 'medium';
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cacheKey = `embedding_${text}`;
    const cached = this.embeddingCache.get(cacheKey);
    if (cached) {
      this.metrics.embedding_cache_hits++;
      return cached.embedding;
    }

    if (!this.openaiClient) {
      // Return mock embedding for testing
      return Array.from({ length: DEFAULT_EMBEDDING_DIMENSION }, () => Math.random() - 0.5);
    }

    try {
      const response = await this.openaiClient.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text
      });

      const embedding = response.data[0].embedding;
      
      // Cache the embedding
      this.embeddingCache.set(cacheKey, {
        text: text,
        embedding,
        model: 'text-embedding-ada-002',
        created_at: new Date()
      });

      return embedding;
    } catch (error) {
      console.warn('Failed to generate embedding, using fallback:', error);
      return Array.from({ length: 1536 }, () => Math.random() - 0.5);
    }
  }

  private async calculateRouteSimilarities(
    queryEmbedding: number[],
    intentClassification: IntentClassification,
    context: Partial<ContextualFactors>
  ): Promise<Array<{
    route_id: string;
    confidence: number;
    semantic_similarity: number;
    intent_match: number;
    pattern_match: number;
    reasoning?: string;
  }>> {
    const similarities = [];

    for (const [routeId, route] of this.routes) {
      let totalScore = 0;

      // Semantic similarity (using embeddings)
      const semanticSimilarity = await this.calculateSemanticSimilarity(queryEmbedding, route);
      totalScore += semanticSimilarity * 0.4;

      // Intent keyword matching
      const intentMatch = this.calculateIntentMatch(intentClassification, route);
      totalScore += intentMatch * 0.3;

      // Pattern matching
      const patternMatch = this.calculatePatternMatch(intentClassification.intent, route);
      totalScore += patternMatch * 0.2;

      // Priority weighting
      const priorityWeight = route.priority / 5; // Normalize priority
      totalScore += priorityWeight * 0.1;

      similarities.push({
        route_id: routeId,
        confidence: Math.min(totalScore, 1.0),
        semantic_similarity: semanticSimilarity,
        intent_match: intentMatch,
        pattern_match: patternMatch,
        reasoning: `Semantic: ${(semanticSimilarity * 100).toFixed(1)}%, Intent: ${(intentMatch * 100).toFixed(1)}%, Pattern: ${(patternMatch * 100).toFixed(1)}%`
      });
    }

    return similarities.sort((a, b) => b.confidence - a.confidence);
  }

  private async calculateSemanticSimilarity(queryEmbedding: number[], route: SemanticRoute): Promise<number> {
    if (!route.embeddings || route.embeddings.length === 0) {
      // Generate embeddings for route if not available
      const routeText = [...route.patterns, ...route.intent_keywords, ...route.semantic_keywords].join(' ');
      route.embeddings = await this.generateEmbedding(routeText);
    }

    // Calculate cosine similarity
    const dotProduct = queryEmbedding.reduce((sum, val, i) => sum + val * (route.embeddings![i] || 0), 0);
    const queryMagnitude = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));
    const routeMagnitude = Math.sqrt(route.embeddings.reduce((sum, val) => sum + val * val, 0));

    if (queryMagnitude === 0 || routeMagnitude === 0) return 0;

    return dotProduct / (queryMagnitude * routeMagnitude);
  }

  private calculateIntentMatch(classification: IntentClassification, route: SemanticRoute): number {
    const queryIntent = classification.intent.toLowerCase();
    
    // Direct intent keyword matching
    const intentScore = route.intent_keywords.reduce((score, keyword) => {
      if (queryIntent.includes(keyword.toLowerCase())) {
        return score + 0.2;
      }
      return score;
    }, 0);

    // Semantic keyword matching
    const semanticScore = route.semantic_keywords.reduce((score, keyword) => {
      if (queryIntent.includes(keyword.toLowerCase())) {
        return score + 0.1;
      }
      return score;
    }, 0);

    return Math.min(intentScore + semanticScore, 1.0);
  }

  private calculatePatternMatch(intent: string, route: SemanticRoute): number {
    // This is a simplified pattern matching
    // In a real implementation, you would use more sophisticated pattern matching
    const intentLower = intent.toLowerCase();
    
    for (const pattern of route.patterns) {
      const patternLower = pattern.toLowerCase();
      if (patternLower.includes(intentLower) || intentLower.includes(patternLower.replace(/\*/g, ''))) {
        return 0.8;
      }
    }

    return 0.2; // Base score for any route
  }

  private async applyContextualFactors(
    similarities: Array<{
      route_id: string;
      confidence: number;
      semantic_similarity: number;
      intent_match: number;
      pattern_match: number;
      reasoning?: string;
    }>,
    context: Partial<ContextualFactors>,
    intentClassification: IntentClassification
  ): Promise<typeof similarities> {
    return similarities.map(similarity => {
      let adjustedConfidence = similarity.confidence;

      // User history factor
      if (context.user_history) {
        const recentRoutes = context.user_history.slice(-5);
        const routeUsage = recentRoutes.filter(h => h.route === similarity.route_id).length;
        const avgSatisfaction = recentRoutes
          .filter(h => h.route === similarity.route_id)
          .reduce((sum, h) => sum + h.satisfaction, 0) / routeUsage || 0.5;

        // Boost confidence for frequently used and satisfactory routes
        if (routeUsage > 0 && avgSatisfaction > 0.7) {
          adjustedConfidence *= 1.1;
        }
      }

      // Urgency level adjustment
      if (intentClassification.urgency_level === 'critical') {
        // Prefer routes that can handle urgent requests
        if (similarity.route_id === 'realtime_route' || similarity.route_id === 'collaboration_route') {
          adjustedConfidence *= 1.15;
        }
      }

      // Complexity adjustment
      if (intentClassification.complexity_score > 0.7) {
        // Prefer collaborative routes for complex queries
        if (similarity.route_id === 'collaboration_route') {
          adjustedConfidence *= 1.2;
        }
      }

      return {
        ...similarity,
        confidence: Math.min(adjustedConfidence, 1.0)
      };
    });
  }

  private selectBestRoute(
    contextualScores: Array<{
      route_id: string;
      confidence: number;
      semantic_similarity: number;
      intent_match: number;
      pattern_match: number;
      reasoning?: string;
    }>,
    intentClassification: IntentClassification
  ): {
    route_id: string;
    confidence: number;
    reasoning: string;
  } {
    if (contextualScores.length === 0) {
      return {
        route_id: 'qa_route',
        confidence: 0.5,
        reasoning: 'Default fallback route'
      };
    }

    const bestMatch = contextualScores[0];
    const route = this.routes.get(bestMatch.route_id);

    // Check confidence threshold
    if (bestMatch.confidence < (route?.confidence_threshold || 0.7)) {
      // If confidence is too low, use fallback
      return {
        route_id: 'qa_route',
        confidence: 0.6,
        reasoning: `Confidence ${(bestMatch.confidence * 100).toFixed(1)}% below threshold, using fallback`
      };
    }

    return {
      route_id: bestMatch.route_id,
      confidence: bestMatch.confidence,
      reasoning: `Best match with ${(bestMatch.confidence * 100).toFixed(1)}% confidence. ${bestMatch.reasoning}`
    };
  }

  private async generateRouteEmbeddings(): Promise<void> {
    console.log('📊 Generating embeddings for semantic routes...');
    
    for (const [routeId, route] of this.routes) {
      if (!route.embeddings || route.embeddings.length === 0) {
        const routeText = [
          ...route.patterns,
          ...route.intent_keywords,
          ...route.semantic_keywords,
          route.name
        ].join(' ');
        
        route.embeddings = await this.generateEmbedding(routeText);
        console.log(`✅ Generated embeddings for route: ${route.name}`);
      }
    }
  }

  private setupOptimizationStrategies(): void {
    // Setup periodic optimization
    this.on('query_routed', (data) => {
      // Track routing patterns for optimization
      this.routingHistory.push({
        query: data.query,
        decision: data.decision,
        actual_route: data.decision.route_id,
        success: data.decision.confidence > 0.8
      });

      // Limit history size
      if (this.routingHistory.length > 1000) {
        this.routingHistory = this.routingHistory.slice(-500);
      }
    });
  }

  private updateRoutingMetrics(decision: RoutingDecision, processingTime: number): void {
    this.metrics.total_routings++;
    
    if (decision.confidence > 0.7) {
      this.metrics.successful_routings++;
    }

    this.metrics.average_confidence = 
      (this.metrics.average_confidence + decision.confidence) / 2;

    this.metrics.route_utilization[decision.route_id] = 
      (this.metrics.route_utilization[decision.route_id] || 0) + 1;

    this.metrics.processing_time_ms = 
      (this.metrics.processing_time_ms + processingTime) / 2;
  }

  // Public API methods
  async addRoute(routeConfig: Partial<SemanticRoute>): Promise<string> {
    const routeId = routeConfig.id || `route_${Date.now()}`;
    
    const route = SemanticRouteSchema.parse({
      id: routeId,
      name: routeConfig.name || 'Custom Route',
      patterns: routeConfig.patterns || [],
      intent_keywords: routeConfig.intent_keywords || [],
      semantic_keywords: routeConfig.semantic_keywords || [],
      priority: routeConfig.priority || 1,
      confidence_threshold: routeConfig.confidence_threshold || 0.7,
      destination: routeConfig.destination || {
        service: 'default',
        method: 'process',
        parameters: {}
      },
      preprocessing: routeConfig.preprocessing || [],
      postprocessing: routeConfig.postprocessing || [],
      examples: routeConfig.examples || [],
      metadata: routeConfig.metadata || {}
    });

    // Generate embeddings for the new route
    const routeText = [
      ...route.patterns,
      ...route.intent_keywords,
      ...route.semantic_keywords,
      route.name
    ].join(' ');
    route.embeddings = await this.generateEmbedding(routeText);

    this.routes.set(routeId, route);
    console.log(`🧭 Added semantic route: ${route.name} (${routeId})`);
    
    return routeId;
  }

  getRoutes(): SemanticRoute[] {
    return Array.from(this.routes.values());
  }

  getRoutingHistory(): typeof this.routingHistory {
    return [...this.routingHistory];
  }

  getMetrics(): RoutingMetrics {
    return { ...this.metrics };
  }

  async optimizeRouting(): Promise<{
    optimizations_applied: string[];
    performance_improvement: number;
  }> {
    console.log('🔧 Optimizing semantic routing...');
    
    const optimizations = [];
    let improvementFactor = 1.0;

    // Analyze routing patterns
    const routePerformance = this.analyzeRoutePerformance();
    
    // Optimize underperforming routes
    for (const [routeId, performance] of Object.entries(routePerformance)) {
      if (performance.success_rate < 0.7 && performance.usage_count > 10) {
        // Adjust confidence thresholds
        const route = this.routes.get(routeId);
        if (route) {
          route.confidence_threshold = Math.max(route.confidence_threshold - 0.05, 0.5);
          optimizations.push(`Lowered confidence threshold for ${route.name}`);
          improvementFactor += 0.02;
        }
      }
    }

    // Update semantic accuracy
    this.metrics.semantic_accuracy = Math.min(this.metrics.semantic_accuracy * improvementFactor, 0.95);

    return {
      optimizations_applied: optimizations,
      performance_improvement: (improvementFactor - 1) * 100
    };
  }

  private analyzeRoutePerformance(): Record<string, {
    usage_count: number;
    success_rate: number;
    avg_confidence: number;
  }> {
    const performance: Record<string, {
      usage_count: number;
      success_rate: number;
      avg_confidence: number;
    }> = {};

    for (const entry of this.routingHistory) {
      const routeId = entry.actual_route;
      if (!performance[routeId]) {
        performance[routeId] = {
          usage_count: 0,
          success_rate: 0,
          avg_confidence: 0
        };
      }

      performance[routeId].usage_count++;
      performance[routeId].success_rate += entry.success ? 1 : 0;
      performance[routeId].avg_confidence += entry.decision.confidence;
    }

    // Calculate averages
    for (const routeId in performance) {
      const perf = performance[routeId];
      perf.success_rate /= perf.usage_count;
      perf.avg_confidence /= perf.usage_count;
    }

    return performance;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const semanticRoutingService = new SemanticRoutingService();