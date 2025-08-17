// Performance-Aware Routing System
// Provides comprehensive performance monitoring and adaptive routing capabilities
// for optimal AI provider and service selection based on real-time performance metrics

interface LoggerInterface {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

// Simple logger implementation for performance monitoring
class PerformanceLogger implements LoggerInterface {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, ...args: any[]): void {
    console.log(`[${this.context}] INFO: ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[${this.context}] WARN: ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[${this.context}] ERROR: ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    console.debug(`[${this.context}] DEBUG: ${message}`, ...args);
  }
}

/**
 * Performance metrics for individual AI providers
 */
export interface ProviderPerformanceMetrics {
  providerId: string;
  model: string;
  
  // Response time metrics
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  responseTimePercentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  
  // Error and reliability metrics
  errorRate: number;
  successRate: number;
  timeoutRate: number;
  rateLimitRate: number;
  
  // Throughput metrics
  requestsPerMinute: number;
  concurrentRequests: number;
  queueDepth: number;
  
  // Quality metrics
  qualityScore: number;
  userSatisfactionScore: number;
  
  // Resource utilization
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  
  // Historical data
  lastUpdated: Date;
  measurementWindow: number; // in milliseconds
  sampleSize: number;
}

/**
 * System-wide performance metrics
 */
export interface SystemPerformanceMetrics {
  overall: {
    avgResponseTime: number;
    totalRequests: number;
    successfulRequests: number;
    errorRate: number;
    systemLoad: number;
  };
  
  providers: Map<string, ProviderPerformanceMetrics>;
  services: Map<string, ServicePerformanceMetrics>;
  
  // Performance trends
  trends: {
    responseTime: TrendData;
    errorRate: TrendData;
    throughput: TrendData;
    quality: TrendData;
  };
  
  // Alerts and anomalies
  alerts: PerformanceAlert[];
  anomalies: PerformanceAnomaly[];
  
  timestamp: Date;
}

/**
 * Service-level performance metrics
 */
export interface ServicePerformanceMetrics {
  serviceId: string;
  serviceName: string;
  
  avgResponseTime: number;
  errorRate: number;
  successRate: number;
  throughput: number;
  
  // Service-specific metrics
  cacheHitRate?: number;
  analysisAccuracy?: number;
  intentDetectionConfidence?: number;
  contextRelevanceScore?: number;
  
  resourceUsage: {
    cpu: number;
    memory: number;
    network: number;
  };
  
  lastUpdated: Date;
}

/**
 * Performance trend data for analytics
 */
export interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'improving' | 'declining' | 'stable';
  confidence: number;
}

/**
 * Performance alerts for monitoring
 */
export interface PerformanceAlert {
  id: string;
  type: 'error_rate' | 'response_time' | 'throughput' | 'quality' | 'resource';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  providerId?: string;
  serviceId?: string;
  timestamp: Date;
  resolved: boolean;
}

/**
 * Performance anomalies detection
 */
export interface PerformanceAnomaly {
  id: string;
  type: 'spike' | 'drop' | 'pattern_change' | 'outlier';
  metric: string;
  description: string;
  severity: number; // 0-1
  affectedProviders: string[];
  detectedAt: Date;
  resolved: boolean;
}

/**
 * Routing decision with performance considerations
 */
export interface PerformanceAwareRoutingDecision {
  selectedProvider: string;
  selectedModel: string;
  selectedService: string;
  
  // Performance reasoning
  performanceScore: number;
  responseTimeEstimate: number;
  reliabilityScore: number;
  qualityScore: number;
  
  // Alternative options
  alternativeProviders: Array<{
    provider: string;
    score: number;
    reason: string;
  }>;
  
  // Load balancing info
  loadBalancingReason: string;
  expectedLoadImpact: number;
  
  // Decision factors
  factors: {
    currentLoad: number;
    historicalPerformance: number;
    realTimeMetrics: number;
    userRequirements: number;
  };
  
  timestamp: Date;
}

/**
 * Performance-aware routing configuration
 */
export interface PerformanceRoutingConfig {
  // Monitoring intervals
  metricsCollectionInterval: number; // ms
  performanceAnalysisInterval: number; // ms
  alertCheckInterval: number; // ms
  
  // Thresholds
  thresholds: {
    responseTime: {
      warning: number;
      critical: number;
    };
    errorRate: {
      warning: number;
      critical: number;
    };
    throughput: {
      minimum: number;
      target: number;
    };
    quality: {
      minimum: number;
      target: number;
    };
  };
  
  // Load balancing settings
  loadBalancing: {
    algorithm: 'round_robin' | 'weighted' | 'least_connections' | 'performance_based';
    weights: Record<string, number>;
    healthCheckInterval: number;
    failoverThreshold: number;
  };
  
  // Adaptive settings
  adaptiveRouting: {
    enabled: boolean;
    learningRate: number;
    adaptationThreshold: number;
    historicalWindowSize: number;
  };
}

/**
 * Performance-Aware Routing System
 * 
 * Provides comprehensive performance monitoring and adaptive routing
 * capabilities for optimal AI provider and service selection based on
 * real-time performance metrics, historical data, and predictive analytics.
 * 
 * Features:
 * - Real-time performance monitoring across all providers and services
 * - Adaptive load balancing with intelligent provider selection
 * - Performance-based routing decisions with quality optimization
 * - Comprehensive analytics and trend analysis
 * - Automated alerting and anomaly detection
 * - Predictive performance modeling
 */
export class PerformanceAwareRoutingSystem {
  private logger: LoggerInterface;
  private config: PerformanceRoutingConfig;
  
  // Performance data storage
  private systemMetrics!: SystemPerformanceMetrics; // Initialized in initializeSystemMetrics
  private providerMetrics: Map<string, ProviderPerformanceMetrics> = new Map();
  private serviceMetrics: Map<string, ServicePerformanceMetrics> = new Map();
  
  // Performance tracking
  private requestHistory: Map<string, RequestPerformanceData[]> = new Map();
  private performanceHistory: PerformanceSnapshot[] = [];
  private activeRequests: Map<string, RequestTrackingData> = new Map();
  
  // Monitoring intervals
  private metricsCollectionTimer?: NodeJS.Timeout;
  private performanceAnalysisTimer?: NodeJS.Timeout;
  private alertCheckTimer?: NodeJS.Timeout;
  
  // Load balancing state
  private providerConnectionCounts: Map<string, number> = new Map();
  private providerHealthStatus: Map<string, ProviderHealthStatus> = new Map();
  private roundRobinIndex: number = 0;

  constructor(config?: Partial<PerformanceRoutingConfig>) {
    this.logger = new PerformanceLogger('PerformanceAwareRoutingSystem');
    this.config = this.initializeConfig(config);
    
    this.initializeSystemMetrics();
    this.startPerformanceMonitoring();
    
    this.logger.info('PerformanceAwareRoutingSystem initialized with comprehensive monitoring');
  }

  /**
   * Initialize system configuration with defaults
   */
  private initializeConfig(config?: Partial<PerformanceRoutingConfig>): PerformanceRoutingConfig {
    return {
      metricsCollectionInterval: config?.metricsCollectionInterval || 10000, // 10 seconds
      performanceAnalysisInterval: config?.performanceAnalysisInterval || 60000, // 1 minute
      alertCheckInterval: config?.alertCheckInterval || 30000, // 30 seconds
      
      thresholds: {
        responseTime: {
          warning: config?.thresholds?.responseTime?.warning || 3000, // 3 seconds
          critical: config?.thresholds?.responseTime?.critical || 10000 // 10 seconds
        },
        errorRate: {
          warning: config?.thresholds?.errorRate?.warning || 0.05, // 5%
          critical: config?.thresholds?.errorRate?.critical || 0.15 // 15%
        },
        throughput: {
          minimum: config?.thresholds?.throughput?.minimum || 10, // 10 req/min
          target: config?.thresholds?.throughput?.target || 100 // 100 req/min
        },
        quality: {
          minimum: config?.thresholds?.quality?.minimum || 0.7, // 70%
          target: config?.thresholds?.quality?.target || 0.9 // 90%
        }
      },
      
      loadBalancing: {
        algorithm: config?.loadBalancing?.algorithm || 'performance_based',
        weights: config?.loadBalancing?.weights || {
          'openai': 1.0,
          'anthropic': 1.0,
          'google': 0.8,
          'local': 0.6
        },
        healthCheckInterval: config?.loadBalancing?.healthCheckInterval || 30000, // 30 seconds
        failoverThreshold: config?.loadBalancing?.failoverThreshold || 0.8 // 80%
      },
      
      adaptiveRouting: {
        enabled: config?.adaptiveRouting?.enabled !== false, // Default enabled
        learningRate: config?.adaptiveRouting?.learningRate || 0.1,
        adaptationThreshold: config?.adaptiveRouting?.adaptationThreshold || 0.05, // 5%
        historicalWindowSize: config?.adaptiveRouting?.historicalWindowSize || 1000 // Last 1000 requests
      }
    };
  }

  /**
   * Initialize system metrics structure
   */
  private initializeSystemMetrics(): void {
    this.systemMetrics = {
      overall: {
        avgResponseTime: 0,
        totalRequests: 0,
        successfulRequests: 0,
        errorRate: 0,
        systemLoad: 0
      },
      providers: this.providerMetrics,
      services: this.serviceMetrics,
      trends: {
        responseTime: { current: 0, previous: 0, change: 0, changePercent: 0, trend: 'stable', confidence: 0 },
        errorRate: { current: 0, previous: 0, change: 0, changePercent: 0, trend: 'stable', confidence: 0 },
        throughput: { current: 0, previous: 0, change: 0, changePercent: 0, trend: 'stable', confidence: 0 },
        quality: { current: 0, previous: 0, change: 0, changePercent: 0, trend: 'stable', confidence: 0 }
      },
      alerts: [],
      anomalies: [],
      timestamp: new Date()
    };
    
    // Initialize default provider metrics
    this.initializeProviderMetrics(['openai', 'anthropic', 'google', 'local']);
    
    // Initialize default service metrics
    this.initializeServiceMetrics([
      'unified-message-analysis',
      'model-router', 
      'advanced-intent-detection',
      'feature-routing-matrix',
      'smart-context-manager',
      'enhanced-autonomous-activation',
      'intelligent-fallback'
    ]);
  }

  /**
   * Initialize provider performance metrics
   */
  private initializeProviderMetrics(providerIds: string[]): void {
    for (const providerId of providerIds) {
      const metrics: ProviderPerformanceMetrics = {
        providerId,
        model: 'default',
        avgResponseTime: 1500,
        minResponseTime: 500,
        maxResponseTime: 5000,
        responseTimePercentiles: { p50: 1200, p90: 2500, p95: 3500, p99: 4800 },
        errorRate: 0.02,
        successRate: 0.98,
        timeoutRate: 0.005,
        rateLimitRate: 0.001,
        requestsPerMinute: 50,
        concurrentRequests: 5,
        queueDepth: 2,
        qualityScore: 0.85,
        userSatisfactionScore: 0.88,
        cpuUsage: 0.3,
        memoryUsage: 0.4,
        networkLatency: 50,
        lastUpdated: new Date(),
        measurementWindow: 300000, // 5 minutes
        sampleSize: 100
      };
      
      this.providerMetrics.set(providerId, metrics);
      this.providerConnectionCounts.set(providerId, 0);
      this.providerHealthStatus.set(providerId, {
        status: 'healthy',
        lastCheck: new Date(),
        consecutiveFailures: 0
      });
    }
  }

  /**
   * Initialize service performance metrics
   */
  private initializeServiceMetrics(serviceIds: string[]): void {
    for (const serviceId of serviceIds) {
      const metrics: ServicePerformanceMetrics = {
        serviceId,
        serviceName: serviceId.replace(/-/g, ' '),
        avgResponseTime: 800,
        errorRate: 0.01,
        successRate: 0.99,
        throughput: 80,
        cacheHitRate: 0.6,
        analysisAccuracy: 0.92,
        intentDetectionConfidence: 0.89,
        contextRelevanceScore: 0.86,
        resourceUsage: {
          cpu: 0.25,
          memory: 0.35,
          network: 0.15
        },
        lastUpdated: new Date()
      };
      
      this.serviceMetrics.set(serviceId, metrics);
    }
  }

  /**
   * Start performance monitoring timers
   */
  private startPerformanceMonitoring(): void {
    // Metrics collection
    this.metricsCollectionTimer = setInterval(() => {
      this.collectPerformanceMetrics();
    }, this.config.metricsCollectionInterval);

    // Performance analysis
    this.performanceAnalysisTimer = setInterval(() => {
      this.analyzePerformanceTrends();
    }, this.config.performanceAnalysisInterval);

    // Alert checking
    this.alertCheckTimer = setInterval(() => {
      this.checkPerformanceAlerts();
    }, this.config.alertCheckInterval);

    this.logger.info('Performance monitoring started with comprehensive tracking');
  }

  /**
   * Make performance-aware routing decision
   */
  async makePerformanceAwareRoutingDecision(
    messageContext: any,
    requirements: {
      maxResponseTime?: number;
      qualityThreshold?: number;
      reliabilityRequirement?: number;
      preferredProviders?: string[];
      urgency?: 'low' | 'medium' | 'high';
    } = {}
  ): Promise<PerformanceAwareRoutingDecision> {
    
    const startTime = Date.now();
    
    // Get current performance data
    const currentMetrics = this.getCurrentMetrics();
    
    // Score available providers
    const providerScores = await this.scoreProvidersForRequest(messageContext, requirements, currentMetrics);
    
    // Apply load balancing
    const loadBalancedSelection = this.applyLoadBalancing(providerScores, requirements);
    
    // Select optimal provider
    const selectedProvider = loadBalancedSelection.provider;
    const selectedModel = this.selectOptimalModel(selectedProvider, messageContext, requirements);
    const selectedService = this.selectOptimalService(messageContext, requirements, currentMetrics);
    
    // Calculate performance estimates
    const performanceEstimates = this.calculatePerformanceEstimates(
      selectedProvider,
      selectedModel,
      selectedService,
      messageContext
    );
    
    // Create routing decision
    const decision: PerformanceAwareRoutingDecision = {
      selectedProvider,
      selectedModel,
      selectedService,
      
      performanceScore: loadBalancedSelection.score,
      responseTimeEstimate: performanceEstimates.responseTime,
      reliabilityScore: performanceEstimates.reliability,
      qualityScore: performanceEstimates.quality,
      
      alternativeProviders: providerScores.slice(1, 4).map(p => ({
        provider: p.provider,
        score: p.score,
        reason: p.reason
      })),
      
      loadBalancingReason: loadBalancedSelection.reason,
      expectedLoadImpact: loadBalancedSelection.loadImpact,
      
      factors: {
        currentLoad: this.calculateCurrentLoad(),
        historicalPerformance: this.calculateHistoricalPerformance(selectedProvider),
        realTimeMetrics: this.calculateRealTimeScore(selectedProvider),
        userRequirements: this.calculateRequirementAlignment(selectedProvider, requirements)
      },
      
      timestamp: new Date()
    };
    
    // Track decision for learning
    this.trackRoutingDecision(decision, messageContext);
    
    const decisionTime = Date.now() - startTime;
    this.logger.debug(`Performance-aware routing decision made in ${decisionTime}ms: ${selectedProvider}/${selectedModel}`);
    
    return decision;
  }

  /**
   * Score providers based on current performance and requirements
   */
  private async scoreProvidersForRequest(
    messageContext: any,
    requirements: any,
    currentMetrics: SystemPerformanceMetrics
  ): Promise<Array<{ provider: string; score: number; reason: string }>> {
    
    const scores: Array<{ provider: string; score: number; reason: string }> = [];
    
    for (const [providerId, metrics] of currentMetrics.providers) {
      let score = 0;
      let reasons: string[] = [];
      
      // Performance score (40% weight)
      const responseTimeScore = Math.max(0, 1 - (metrics.avgResponseTime / (requirements.maxResponseTime || 5000)));
      const reliabilityScore = metrics.successRate;
      const qualityScore = metrics.qualityScore;
      
      const performanceScore = (responseTimeScore * 0.4 + reliabilityScore * 0.3 + qualityScore * 0.3);
      score += performanceScore * 0.4;
      reasons.push(`Performance: ${(performanceScore * 100).toFixed(1)}%`);
      
      // Load balancing score (20% weight)
      const currentLoad = this.providerConnectionCounts.get(providerId) || 0;
      const loadScore = Math.max(0, 1 - (currentLoad / 20)); // Assume max 20 concurrent
      score += loadScore * 0.2;
      reasons.push(`Load: ${(loadScore * 100).toFixed(1)}%`);
      
      // Health status score (20% weight)
      const healthStatus = this.providerHealthStatus.get(providerId);
      const healthScore = healthStatus?.status === 'healthy' ? 1.0 : 
                         healthStatus?.status === 'degraded' ? 0.5 : 0.1;
      score += healthScore * 0.2;
      reasons.push(`Health: ${healthStatus?.status || 'unknown'}`);
      
      // Requirements alignment score (20% weight)
      const alignmentScore = this.calculateRequirementAlignment(providerId, requirements);
      score += alignmentScore * 0.2;
      reasons.push(`Alignment: ${(alignmentScore * 100).toFixed(1)}%`);
      
      // Apply provider preferences
      if (requirements.preferredProviders?.includes(providerId)) {
        score *= 1.1; // 10% bonus for preferred providers
        reasons.push('Preferred provider');
      }
      
      scores.push({
        provider: providerId,
        score: Math.min(1.0, score), // Cap at 1.0
        reason: reasons.join(', ')
      });
    }
    
    // Sort by score descending
    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Apply load balancing algorithm
   */
  private applyLoadBalancing(
    providerScores: Array<{ provider: string; score: number; reason: string }>,
    requirements: any
  ): { provider: string; score: number; reason: string; loadImpact: number } {
    
    const algorithm = this.config.loadBalancing.algorithm;
    
    switch (algorithm) {
      case 'performance_based':
        return this.applyPerformanceBasedBalancing(providerScores, requirements);
      
      case 'weighted':
        return this.applyWeightedBalancing(providerScores);
      
      case 'least_connections':
        return this.applyLeastConnectionsBalancing(providerScores);
      
      case 'round_robin':
      default:
        return this.applyRoundRobinBalancing(providerScores);
    }
  }

  /**
   * Performance-based load balancing
   */
  private applyPerformanceBasedBalancing(
    providerScores: Array<{ provider: string; score: number; reason: string }>,
    requirements: any
  ): { provider: string; score: number; reason: string; loadImpact: number } {
    
    // Filter providers that meet minimum requirements
    const eligibleProviders = providerScores.filter(p => {
      const metrics = this.providerMetrics.get(p.provider);
      if (!metrics) return false;
      
      const meetsResponseTime = !requirements.maxResponseTime || 
                               metrics.avgResponseTime <= requirements.maxResponseTime;
      const meetsQuality = !requirements.qualityThreshold || 
                          metrics.qualityScore >= requirements.qualityThreshold;
      const meetsReliability = !requirements.reliabilityRequirement || 
                              metrics.successRate >= requirements.reliabilityRequirement;
      
      return meetsResponseTime && meetsQuality && meetsReliability;
    });
    
    if (eligibleProviders.length === 0) {
      // Fallback to best available if no provider meets requirements
      const best = providerScores[0];
      return {
        ...best,
        reason: best.reason + ' (fallback - requirements not fully met)',
        loadImpact: 0.1
      };
    }
    
    // Select best performing eligible provider
    const selected = eligibleProviders[0];
    const currentLoad = this.providerConnectionCounts.get(selected.provider) || 0;
    const loadImpact = Math.min(0.8, currentLoad * 0.05); // Calculate load impact
    
    return {
      ...selected,
      reason: selected.reason + ' (performance-based selection)',
      loadImpact
    };
  }

  /**
   * Weighted load balancing
   */
  private applyWeightedBalancing(
    providerScores: Array<{ provider: string; score: number; reason: string }>
  ): { provider: string; score: number; reason: string; loadImpact: number } {
    
    // Apply weights to scores
    const weightedScores = providerScores.map(p => ({
      ...p,
      weightedScore: p.score * (this.config.loadBalancing.weights[p.provider] || 1.0)
    }));
    
    // Select provider with highest weighted score
    const selected = weightedScores.reduce((best, current) => 
      current.weightedScore > best.weightedScore ? current : best
    );
    
    const loadImpact = (this.providerConnectionCounts.get(selected.provider) || 0) * 0.03;
    
    return {
      provider: selected.provider,
      score: selected.score,
      reason: selected.reason + ' (weighted selection)',
      loadImpact
    };
  }

  /**
   * Least connections load balancing
   */
  private applyLeastConnectionsBalancing(
    providerScores: Array<{ provider: string; score: number; reason: string }>
  ): { provider: string; score: number; reason: string; loadImpact: number } {
    
    // Filter to top performers (within 10% of best score)
    const bestScore = providerScores[0].score;
    const topPerformers = providerScores.filter(p => p.score >= bestScore * 0.9);
    
    // Select provider with least connections from top performers
    const selected = topPerformers.reduce((best, current) => {
      const currentConnections = this.providerConnectionCounts.get(current.provider) || 0;
      const bestConnections = this.providerConnectionCounts.get(best.provider) || 0;
      
      return currentConnections < bestConnections ? current : best;
    });
    
    const connections = this.providerConnectionCounts.get(selected.provider) || 0;
    const loadImpact = connections * 0.02;
    
    return {
      ...selected,
      reason: selected.reason + ` (least connections: ${connections})`,
      loadImpact
    };
  }

  /**
   * Round-robin load balancing
   */
  private applyRoundRobinBalancing(
    providerScores: Array<{ provider: string; score: number; reason: string }>
  ): { provider: string; score: number; reason: string; loadImpact: number } {
    
    // Select next provider in round-robin sequence
    this.roundRobinIndex = (this.roundRobinIndex + 1) % providerScores.length;
    const selected = providerScores[this.roundRobinIndex];
    
    const loadImpact = (this.providerConnectionCounts.get(selected.provider) || 0) * 0.04;
    
    return {
      ...selected,
      reason: selected.reason + ` (round-robin: index ${this.roundRobinIndex})`,
      loadImpact
    };
  }

  /**
   * Track request start for performance monitoring
   */
  trackRequestStart(requestId: string, provider: string, model: string, service: string): void {
    const trackingData: RequestTrackingData = {
      requestId,
      provider,
      model,
      service,
      startTime: Date.now(),
      memoryUsage: process.memoryUsage().heapUsed
    };
    
    this.activeRequests.set(requestId, trackingData);
    
    // Update connection count
    const currentCount = this.providerConnectionCounts.get(provider) || 0;
    this.providerConnectionCounts.set(provider, currentCount + 1);
  }

  /**
   * Track request completion for performance monitoring
   */
  trackRequestComplete(
    requestId: string, 
    success: boolean, 
    errorType?: string,
    quality?: number
  ): void {
    const trackingData = this.activeRequests.get(requestId);
    if (!trackingData) {
      this.logger.warn(`No tracking data found for request: ${requestId}`);
      return;
    }

    const endTime = Date.now();
    const responseTime = endTime - trackingData.startTime;
    const memoryUsed = process.memoryUsage().heapUsed - trackingData.memoryUsage;

    // Create performance data record
    const performanceData: RequestPerformanceData = {
      requestId,
      provider: trackingData.provider,
      model: trackingData.model,
      service: trackingData.service,
      responseTime,
      success,
      errorType,
      quality,
      memoryUsed,
      timestamp: new Date(trackingData.startTime)
    };

    // Store in request history
    if (!this.requestHistory.has(trackingData.provider)) {
      this.requestHistory.set(trackingData.provider, []);
    }
    
    const history = this.requestHistory.get(trackingData.provider)!;
    history.push(performanceData);
    
    // Keep only recent history (last 1000 requests per provider)
    if (history.length > this.config.adaptiveRouting.historicalWindowSize) {
      history.shift();
    }

    // Update provider metrics
    this.updateProviderMetrics(trackingData.provider, performanceData);

    // Update connection count
    const currentCount = this.providerConnectionCounts.get(trackingData.provider) || 0;
    this.providerConnectionCounts.set(trackingData.provider, Math.max(0, currentCount - 1));

    // Clean up
    this.activeRequests.delete(requestId);

    this.logger.debug(`Request ${requestId} completed - ${trackingData.provider} - ${responseTime}ms - ${success ? 'success' : 'error'}`);
  }

  /**
   * Get current system performance metrics
   */
  getCurrentMetrics(): SystemPerformanceMetrics {
    return {
      ...this.systemMetrics,
      timestamp: new Date()
    };
  }

  /**
   * Get provider-specific performance metrics
   */
  getProviderMetrics(providerId: string): ProviderPerformanceMetrics | null {
    return this.providerMetrics.get(providerId) || null;
  }

  /**
   * Get service-specific performance metrics
   */
  getServiceMetrics(serviceId: string): ServicePerformanceMetrics | null {
    return this.serviceMetrics.get(serviceId) || null;
  }

  /**
   * Get performance recommendations based on current metrics
   */
  getPerformanceRecommendations(): Array<{
    type: 'optimization' | 'scaling' | 'configuration';
    priority: 'low' | 'medium' | 'high';
    description: string;
    action: string;
  }> {
    const recommendations: Array<{
      type: 'optimization' | 'scaling' | 'configuration';
      priority: 'low' | 'medium' | 'high';
      description: string;
      action: string;
    }> = [];

    // Check for high error rates
    for (const [providerId, metrics] of this.providerMetrics) {
      if (metrics.errorRate > this.config.thresholds.errorRate.critical) {
        recommendations.push({
          type: 'configuration',
          priority: 'high',
          description: `Provider ${providerId} has critical error rate: ${(metrics.errorRate * 100).toFixed(1)}%`,
          action: `Review provider configuration and consider temporary failover`
        });
      }
      
      if (metrics.avgResponseTime > this.config.thresholds.responseTime.critical) {
        recommendations.push({
          type: 'scaling',
          priority: 'high',
          description: `Provider ${providerId} has critical response time: ${metrics.avgResponseTime}ms`,
          action: `Consider scaling up resources or load balancing to other providers`
        });
      }
      
      if (metrics.qualityScore < this.config.thresholds.quality.minimum) {
        recommendations.push({
          type: 'optimization',
          priority: 'medium',
          description: `Provider ${providerId} has low quality score: ${(metrics.qualityScore * 100).toFixed(1)}%`,
          action: `Review model configuration and consider fine-tuning parameters`
        });
      }
    }

    return recommendations;
  }

  /**
   * Cleanup and stop monitoring
   */
  destroy(): void {
    if (this.metricsCollectionTimer) {
      clearInterval(this.metricsCollectionTimer);
    }
    if (this.performanceAnalysisTimer) {
      clearInterval(this.performanceAnalysisTimer);
    }
    if (this.alertCheckTimer) {
      clearInterval(this.alertCheckTimer);
    }

    this.logger.info('PerformanceAwareRoutingSystem destroyed');
  }

  // Private helper methods

  private selectOptimalModel(provider: string, messageContext: any, requirements: any): string {
    // Model selection based on provider capabilities and requirements
    const models = {
      'openai': ['gpt-4', 'gpt-3.5-turbo'],
      'anthropic': ['claude-3', 'claude-2'],
      'google': ['gemini-pro', 'palm-2'],
      'local': ['llama-2', 'mistral']
    };
    
    return models[provider as keyof typeof models]?.[0] || 'default';
  }

  private selectOptimalService(messageContext: any, requirements: any, metrics: SystemPerformanceMetrics): string {
    // Service selection based on message complexity and performance
    const complexity = messageContext.complexity || 0.5;
    
    if (complexity > 0.8) {
      return 'enhanced-autonomous-activation';
    } else if (complexity > 0.6) {
      return 'smart-context-manager';
    } else if (complexity > 0.4) {
      return 'advanced-intent-detection';
    } else {
      return 'unified-message-analysis';
    }
  }

  private calculatePerformanceEstimates(provider: string, model: string, service: string, messageContext: any): {
    responseTime: number;
    reliability: number;
    quality: number;
  } {
    const providerMetrics = this.providerMetrics.get(provider);
    const serviceMetrics = this.serviceMetrics.get(service);
    
    return {
      responseTime: (providerMetrics?.avgResponseTime || 1500) + (serviceMetrics?.avgResponseTime || 500),
      reliability: (providerMetrics?.successRate || 0.95) * (serviceMetrics?.successRate || 0.98),
      quality: (providerMetrics?.qualityScore || 0.85) * 0.9 // Slight adjustment for combined processing
    };
  }

  private calculateCurrentLoad(): number {
    const totalConnections = Array.from(this.providerConnectionCounts.values()).reduce((sum, count) => sum + count, 0);
    return Math.min(1.0, totalConnections / 50); // Assume max 50 concurrent connections
  }

  private calculateHistoricalPerformance(provider: string): number {
    const history = this.requestHistory.get(provider);
    if (!history || history.length === 0) return 0.5;
    
    const recentRequests = history.slice(-100); // Last 100 requests
    const successRate = recentRequests.filter(r => r.success).length / recentRequests.length;
    const avgResponseTime = recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / recentRequests.length;
    const normalizedResponseTime = Math.max(0, 1 - (avgResponseTime / 5000)); // Normalize against 5s
    
    return (successRate * 0.6 + normalizedResponseTime * 0.4);
  }

  private calculateRealTimeScore(provider: string): number {
    const metrics = this.providerMetrics.get(provider);
    if (!metrics) return 0.5;
    
    const responseTimeScore = Math.max(0, 1 - (metrics.avgResponseTime / 5000));
    const errorRateScore = 1 - metrics.errorRate;
    const loadScore = Math.max(0, 1 - ((this.providerConnectionCounts.get(provider) || 0) / 20));
    
    return (responseTimeScore * 0.4 + errorRateScore * 0.3 + loadScore * 0.3);
  }

  private calculateRequirementAlignment(provider: string, requirements: any): number {
    const metrics = this.providerMetrics.get(provider);
    if (!metrics) return 0.5;
    
    let score = 1.0;
    
    if (requirements.maxResponseTime && metrics.avgResponseTime > requirements.maxResponseTime) {
      score *= 0.7; // Penalty for not meeting response time requirement
    }
    
    if (requirements.qualityThreshold && metrics.qualityScore < requirements.qualityThreshold) {
      score *= 0.8; // Penalty for not meeting quality requirement
    }
    
    if (requirements.reliabilityRequirement && metrics.successRate < requirements.reliabilityRequirement) {
      score *= 0.6; // Penalty for not meeting reliability requirement
    }
    
    return score;
  }

  private trackRoutingDecision(decision: PerformanceAwareRoutingDecision, messageContext: any): void {
    // Store routing decision for learning and analysis
    // This data can be used for machine learning improvements
    this.logger.debug(`Routing decision tracked: ${decision.selectedProvider} (score: ${decision.performanceScore.toFixed(3)})`);
  }

  private collectPerformanceMetrics(): void {
    // Simulate metrics collection - in real implementation, this would gather actual metrics
    this.logger.debug('Collecting performance metrics from all providers and services');
    
    // Update system-level metrics
    this.updateSystemMetrics();
  }

  private analyzePerformanceTrends(): void {
    // Analyze performance trends and update trend data
    this.logger.debug('Analyzing performance trends and patterns');
    
    // Update trend calculations
    this.updatePerformanceTrends();
  }

  private checkPerformanceAlerts(): void {
    // Check for performance alerts and anomalies
    this.logger.debug('Checking for performance alerts and anomalies');
    
    // Update alerts
    this.updatePerformanceAlerts();
  }

  private updateProviderMetrics(provider: string, requestData: RequestPerformanceData): void {
    const metrics = this.providerMetrics.get(provider);
    if (!metrics) return;

    // Update response time (running average)
    const alpha = 0.1; // Exponential moving average factor
    metrics.avgResponseTime = (1 - alpha) * metrics.avgResponseTime + alpha * requestData.responseTime;
    
    // Update error rate
    const history = this.requestHistory.get(provider) || [];
    const recentRequests = history.slice(-100);
    const errors = recentRequests.filter(r => !r.success).length;
    metrics.errorRate = errors / recentRequests.length;
    metrics.successRate = 1 - metrics.errorRate;
    
    // Update other metrics
    metrics.lastUpdated = new Date();
    
    this.providerMetrics.set(provider, metrics);
  }

  private updateSystemMetrics(): void {
    // Calculate overall system metrics from provider metrics
    const providers = Array.from(this.providerMetrics.values());
    
    if (providers.length > 0) {
      this.systemMetrics.overall.avgResponseTime = providers.reduce((sum, p) => sum + p.avgResponseTime, 0) / providers.length;
      this.systemMetrics.overall.errorRate = providers.reduce((sum, p) => sum + p.errorRate, 0) / providers.length;
    } else {
      this.systemMetrics.overall.avgResponseTime = 0;
      this.systemMetrics.overall.errorRate = 0;
    }
    
    this.systemMetrics.timestamp = new Date();
  }

  private updatePerformanceTrends(): void {
    // Update trend calculations - simplified implementation
    // In real implementation, this would calculate actual trends from historical data
    this.systemMetrics.trends.responseTime.current = this.systemMetrics.overall.avgResponseTime;
    this.systemMetrics.trends.errorRate.current = this.systemMetrics.overall.errorRate;
  }

  private updatePerformanceAlerts(): void {
    // Check thresholds and create alerts
    const alerts: PerformanceAlert[] = [];
    
    for (const [providerId, metrics] of this.providerMetrics) {
      if (metrics.errorRate > this.config.thresholds.errorRate.critical) {
        alerts.push({
          id: `error-rate-${providerId}-${Date.now()}`,
          type: 'error_rate',
          severity: 'critical',
          message: `Critical error rate for provider ${providerId}: ${(metrics.errorRate * 100).toFixed(1)}%`,
          threshold: this.config.thresholds.errorRate.critical,
          currentValue: metrics.errorRate,
          providerId,
          timestamp: new Date(),
          resolved: false
        });
      }
    }
    
    this.systemMetrics.alerts = alerts;
  }
}

// Additional interfaces for internal use

interface RequestPerformanceData {
  requestId: string;
  provider: string;
  model: string;
  service: string;
  responseTime: number;
  success: boolean;
  errorType?: string;
  quality?: number;
  memoryUsed: number;
  timestamp: Date;
}

interface RequestTrackingData {
  requestId: string;
  provider: string;
  model: string;
  service: string;
  startTime: number;
  memoryUsage: number;
}

interface PerformanceSnapshot {
  timestamp: Date;
  systemMetrics: SystemPerformanceMetrics;
}

interface ProviderHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  consecutiveFailures: number;
}