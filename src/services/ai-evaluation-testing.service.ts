/**
 * AI Evaluation and Testing Service
 * Comprehensive evaluation framework for AI performance, A/B testing, and benchmarking
 * Supports multiple evaluation metrics, automated testing, and performance monitoring
 */

import { features } from '../config/feature-flags.js';
import logger from '../utils/logger.js';

export interface EvaluationMetric {
  name: string;
  type: 'accuracy' | 'latency' | 'cost' | 'satisfaction' | 'custom';
  weight: number;
  threshold?: {
    min?: number;
    max?: number;
    target?: number;
  };
  calculator: (actual: any, expected?: any, context?: any) => number;
}

export interface TestCase {
  id: string;
  name: string;
  description?: string;
  input: any;
  expectedOutput?: any;
  context?: any;
  tags?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'functionality' | 'performance' | 'safety' | 'reliability';
}

export interface TestSuite {
  id: string;
  name: string;
  description?: string;
  testCases: TestCase[];
  metrics: EvaluationMetric[];
  configuration?: any;
  environment?: 'development' | 'staging' | 'production';
}

export interface TestResult {
  testCaseId: string;
  executionId: string;
  timestamp: Date;
  actualOutput: any;
  success: boolean;
  metrics: { [metricName: string]: number };
  duration: number;
  cost?: number;
  error?: string;
  context?: any;
}

export interface TestSuiteResult {
  suiteId: string;
  executionId: string;
  timestamp: Date;
  results: TestResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageScore: number;
    totalDuration: number;
    totalCost: number;
  };
  metrics: { [metricName: string]: { average: number; min: number; max: number; std: number } };
}

export interface BenchmarkSuite {
  name: string;
  version: string;
  description: string;
  testCases: TestCase[];
  baseline?: { [metricName: string]: number };
  industry?: { [metricName: string]: number };
}

export interface ABTestConfiguration {
  name: string;
  description?: string;
  variants: Array<{
    id: string;
    name: string;
    configuration: any;
    trafficPercentage: number;
  }>;
  metrics: EvaluationMetric[];
  duration: number; // in milliseconds
  significanceThreshold: number;
  minSampleSize: number;
}

export interface ABTestResult {
  configurationId: string;
  startTime: Date;
  endTime: Date;
  variants: Array<{
    id: string;
    name: string;
    sampleSize: number;
    metrics: { [metricName: string]: { mean: number; std: number; confidence: number } };
    results: TestResult[];
  }>;
  winner?: string;
  significance: number;
  recommendation: string;
  statisticalSignificance: boolean;
}

export interface PerformanceBenchmark {
  category: 'latency' | 'throughput' | 'accuracy' | 'cost' | 'reliability';
  measurements: Array<{
    timestamp: Date;
    value: number;
    context?: any;
  }>;
  statistics: {
    mean: number;
    median: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
    std: number;
  };
  trend: 'improving' | 'declining' | 'stable';
  alerts: Array<{
    type: 'threshold' | 'anomaly' | 'trend';
    severity: 'low' | 'medium' | 'high';
    message: string;
    timestamp: Date;
  }>;
}

export class AIEvaluationTestingService {
  private isEnabled: boolean;
  private testSuites: Map<string, TestSuite> = new Map();
  private testResults: Map<string, TestSuiteResult[]> = new Map();
  private benchmarkSuites: Map<string, BenchmarkSuite> = new Map();
  private abTests: Map<string, ABTestResult> = new Map();
  private performanceMetrics: Map<string, PerformanceBenchmark> = new Map();
  private evaluationMetrics: Map<string, EvaluationMetric> = new Map();

  constructor() {
    this.isEnabled = features.performanceOptimization;
    
    if (this.isEnabled) {
      this.initializeStandardMetrics();
      this.loadStandardBenchmarks();
    }
  }

  private initializeStandardMetrics(): void {
    const standardMetrics: EvaluationMetric[] = [
      {
        name: 'accuracy',
        type: 'accuracy',
        weight: 1.0,
        threshold: { min: 0.8, target: 0.95 },
        calculator: (actual: string, expected: string) => {
          if (!expected) return 0.7; // Default when no expected answer
          const actualWords = new Set(actual.toLowerCase().split(/\s+/));
          const expectedWords = new Set(expected.toLowerCase().split(/\s+/));
          const intersection = new Set([...expectedWords].filter(word => actualWords.has(word)));
          return intersection.size / expectedWords.size;
        }
      },
      {
        name: 'latency',
        type: 'latency',
        weight: 0.3,
        threshold: { max: 2000, target: 500 }, // milliseconds
        calculator: (actual: number) => {
          // Convert to score (lower latency = higher score)
          return Math.max(0, 1 - actual / 5000);
        }
      },
      {
        name: 'cost',
        type: 'cost',
        weight: 0.2,
        threshold: { max: 0.01, target: 0.001 }, // dollars
        calculator: (actual: number) => {
          // Convert to score (lower cost = higher score)
          return Math.max(0, 1 - actual / 0.05);
        }
      },
      {
        name: 'relevance',
        type: 'accuracy',
        weight: 0.8,
        threshold: { min: 0.7, target: 0.9 },
        calculator: (actual: any, expected: any, context: any) => {
          // Simple relevance calculation based on context match
          if (!context || !actual) return 0.5;
          const queryWords = new Set(context.query?.toLowerCase().split(/\s+/) || []);
          const actualWords = new Set(actual.toLowerCase().split(/\s+/));
          const overlap = [...queryWords].filter(word => actualWords.has(word)).length;
          return Math.min(overlap / queryWords.size, 1);
        }
      },
      {
        name: 'completeness',
        type: 'accuracy',
        weight: 0.6,
        threshold: { min: 0.6, target: 0.85 },
        calculator: (actual: string, expected: string, context: any) => {
          // Measure completeness based on query coverage
          if (!context?.query || typeof context.query !== 'string') return 0.7;
          const queryWords = new Set(context.query.toLowerCase().split(/\s+/));
          const actualWords = new Set(actual.toLowerCase().split(/\s+/));
          const coverage = [...queryWords].filter(word => actualWords.has(word as string)).length / queryWords.size;
          return Math.min(coverage * 1.2, 1); // Boost coverage score
        }
      },
      {
        name: 'safety',
        type: 'custom',
        weight: 1.5, // High weight for safety
        threshold: { min: 0.95, target: 1.0 },
        calculator: (actual: string) => {
          // Simple safety check - would be enhanced with actual safety models
          const unsafePatterns = ['harmful', 'dangerous', 'illegal', 'inappropriate'];
          const hasUnsafeContent = unsafePatterns.some(pattern => 
            actual.toLowerCase().includes(pattern)
          );
          return hasUnsafeContent ? 0 : 1;
        }
      }
    ];

    standardMetrics.forEach(metric => {
      this.evaluationMetrics.set(metric.name, metric);
    });

    logger.info(`Initialized ${standardMetrics.length} standard evaluation metrics`);
  }

  private loadStandardBenchmarks(): void {
    // Standard benchmark for question answering
    const qaBenchmark: BenchmarkSuite = {
      name: 'General QA Benchmark',
      version: '1.0',
      description: 'Standard question answering evaluation',
      testCases: [
        {
          id: 'qa_001',
          name: 'Factual Question',
          input: { query: 'What is the capital of France?' },
          expectedOutput: 'Paris',
          priority: 'medium',
          category: 'functionality',
          tags: ['factual', 'geography']
        },
        {
          id: 'qa_002', 
          name: 'Complex Question',
          input: { query: 'Explain the process of photosynthesis and its importance.' },
          expectedOutput: 'Photosynthesis is the process by which plants convert sunlight, carbon dioxide, and water into glucose and oxygen...',
          priority: 'high',
          category: 'functionality',
          tags: ['complex', 'science', 'explanation']
        },
        {
          id: 'qa_003',
          name: 'Ambiguous Question',
          input: { query: 'What is the best way to cook?' },
          expectedOutput: null, // No single correct answer
          priority: 'medium',
          category: 'reliability',
          tags: ['ambiguous', 'subjective']
        }
      ],
      baseline: {
        accuracy: 0.75,
        latency: 1200,
        cost: 0.005
      },
      industry: {
        accuracy: 0.85,
        latency: 800,
        cost: 0.003
      }
    };

    this.benchmarkSuites.set(qaBenchmark.name, qaBenchmark);
    logger.info('Loaded standard benchmarks');
  }

  /**
   * Execute a test suite
   */
  async executeTestSuite(
    suiteId: string,
    testFunction: (testCase: TestCase) => Promise<{ output: any; duration: number; cost?: number }>,
    options?: {
      parallel?: boolean;
      maxConcurrency?: number;
      continueOnError?: boolean;
    }
  ): Promise<TestSuiteResult> {
    if (!this.isEnabled) {
      throw new Error('AI Evaluation and Testing service not enabled');
    }

    const testSuite = this.testSuites.get(suiteId);
    if (!testSuite) {
      throw new Error(`Test suite ${suiteId} not found`);
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    logger.info(`Executing test suite: ${testSuite.name} (${testSuite.testCases.length} tests)`);

    try {
      const results: TestResult[] = [];

      if (options?.parallel) {
        // Execute tests in parallel with concurrency control
        const maxConcurrency = options.maxConcurrency || 5;
        const batches = this.chunkArray(testSuite.testCases, maxConcurrency);
        
        for (const batch of batches) {
          const batchPromises = batch.map(testCase => this.executeTestCase(testCase, testFunction, executionId));
          const batchResults = await Promise.allSettled(batchPromises);
          
          batchResults.forEach(result => {
            if (result.status === 'fulfilled') {
              results.push(result.value);
            } else if (!options.continueOnError) {
              throw result.reason;
            }
          });
        }
      } else {
        // Execute tests sequentially
        for (const testCase of testSuite.testCases) {
          try {
            const result = await this.executeTestCase(testCase, testFunction, executionId);
            results.push(result);
          } catch (error) {
            if (!options?.continueOnError) {
              throw error;
            }
            logger.error(`Test case ${testCase.id} failed:`, error);
          }
        }
      }

      // Calculate summary metrics
      const summary = {
        totalTests: results.length,
        passedTests: results.filter(r => r.success).length,
        failedTests: results.filter(r => !r.success).length,
        averageScore: this.calculateAverageScore(results, testSuite.metrics),
        totalDuration: Date.now() - startTime,
        totalCost: results.reduce((sum, r) => sum + (r.cost || 0), 0)
      };

      // Calculate aggregated metrics
      const metrics = this.calculateAggregatedMetrics(results, testSuite.metrics);

      const suiteResult: TestSuiteResult = {
        suiteId,
        executionId,
        timestamp: new Date(),
        results,
        summary,
        metrics
      };

      // Store results
      const existingResults = this.testResults.get(suiteId) || [];
      existingResults.push(suiteResult);
      this.testResults.set(suiteId, existingResults);

      logger.info(`Test suite completed: ${summary.passedTests}/${summary.totalTests} passed, average score: ${summary.averageScore.toFixed(3)}`);

      return suiteResult;

    } catch (error) {
      logger.error(`Test suite execution failed:`, error);
      throw error;
    }
  }

  private async executeTestCase(
    testCase: TestCase,
    testFunction: (testCase: TestCase) => Promise<{ output: any; duration: number; cost?: number }>,
    executionId: string
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const result = await testFunction(testCase);
      
      // Calculate metrics
      const metrics: { [metricName: string]: number } = {};
      for (const metric of this.evaluationMetrics.values()) {
        try {
          metrics[metric.name] = metric.calculator(
            result.output, 
            testCase.expectedOutput, 
            { ...testCase.context, query: testCase.input.query }
          );
        } catch (error) {
          logger.error(`Failed to calculate metric ${metric.name}:`, error);
          metrics[metric.name] = 0;
        }
      }

      // Determine success based on thresholds
      let success = true;
      for (const metric of this.evaluationMetrics.values()) {
        if (metric.threshold?.min && metrics[metric.name] < metric.threshold.min) {
          success = false;
          break;
        }
        if (metric.threshold?.max && metrics[metric.name] > metric.threshold.max) {
          success = false;
          break;
        }
      }

      return {
        testCaseId: testCase.id,
        executionId,
        timestamp: new Date(),
        actualOutput: result.output,
        success,
        metrics,
        duration: Date.now() - startTime,
        cost: result.cost,
        context: testCase.context
      };

    } catch (error) {
      return {
        testCaseId: testCase.id,
        executionId,
        timestamp: new Date(),
        actualOutput: null,
        success: false,
        metrics: {},
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Run A/B test between different configurations
   */
  async runABTest(
    config: ABTestConfiguration,
    testFunction: (testCase: TestCase, variant: any) => Promise<{ output: any; duration: number; cost?: number }>
  ): Promise<ABTestResult> {
    if (!this.isEnabled) {
      throw new Error('AI Evaluation and Testing service not enabled');
    }

    logger.info(`Starting A/B test: ${config.name} with ${config.variants.length} variants`);

    const startTime = new Date();
    const testCases = await this.generateTestCasesForABTest(config);
    const results: ABTestResult['variants'] = [];

    try {
      // Execute test for each variant
      for (const variant of config.variants) {
        logger.info(`Testing variant: ${variant.name}`);
        
        const sampleSize = Math.floor(testCases.length * variant.trafficPercentage / 100);
        const variantTestCases = testCases.slice(0, sampleSize);
        const variantResults: TestResult[] = [];

        for (const testCase of variantTestCases) {
          try {
            const result = await testFunction(testCase, variant.configuration);
            
            const metrics: { [metricName: string]: number } = {};
            for (const metric of config.metrics) {
              metrics[metric.name] = metric.calculator(
                result.output,
                testCase.expectedOutput,
                { ...testCase.context, query: testCase.input.query }
              );
            }

            variantResults.push({
              testCaseId: testCase.id,
              executionId: `ab_${config.name}_${variant.id}`,
              timestamp: new Date(),
              actualOutput: result.output,
              success: true,
              metrics,
              duration: result.duration,
              cost: result.cost
            });

          } catch (error) {
            logger.error(`Variant ${variant.id} test case failed:`, error);
          }
        }

        // Calculate statistics for this variant
        const variantMetrics: { [metricName: string]: { mean: number; std: number; confidence: number } } = {};
        
        for (const metric of config.metrics) {
          const values = variantResults.map(r => r.metrics[metric.name] || 0);
          if (values.length > 0) {
            variantMetrics[metric.name] = {
              mean: this.calculateMean(values),
              std: this.calculateStandardDeviation(values),
              confidence: this.calculateConfidenceInterval(values, 0.95)
            };
          }
        }

        results.push({
          id: variant.id,
          name: variant.name,
          sampleSize: variantResults.length,
          metrics: variantMetrics,
          results: variantResults
        });
      }

      // Determine winner and statistical significance
      const winner = this.determineABTestWinner(results, config);
      const significance = this.calculateStatisticalSignificance(results, config);
      const recommendation = this.generateABTestRecommendation(results, winner, significance);

      const abTestResult: ABTestResult = {
        configurationId: config.name,
        startTime,
        endTime: new Date(),
        variants: results,
        winner: winner?.id,
        significance,
        recommendation,
        statisticalSignificance: significance > config.significanceThreshold
      };

      this.abTests.set(config.name, abTestResult);
      
      logger.info(`A/B test completed. Winner: ${winner?.name || 'No clear winner'}, Significance: ${(significance * 100).toFixed(2)}%`);

      return abTestResult;

    } catch (error) {
      logger.error('A/B test failed:', error);
      throw error;
    }
  }

  /**
   * Run benchmark against standard industry benchmarks
   */
  async runBenchmark(
    benchmarkName: string,
    testFunction: (testCase: TestCase) => Promise<{ output: any; duration: number; cost?: number }>
  ): Promise<{
    benchmarkName: string;
    results: TestSuiteResult;
    comparison: {
      vsBaseline: { [metricName: string]: { actual: number; baseline: number; improvement: number } };
      vsIndustry: { [metricName: string]: { actual: number; industry: number; comparison: number } };
    };
    ranking: 'above_industry' | 'at_industry' | 'below_industry' | 'above_baseline' | 'at_baseline' | 'below_baseline';
  }> {
    if (!this.isEnabled) {
      throw new Error('AI Evaluation and Testing service not enabled');
    }

    const benchmark = this.benchmarkSuites.get(benchmarkName);
    if (!benchmark) {
      throw new Error(`Benchmark ${benchmarkName} not found`);
    }

    logger.info(`Running benchmark: ${benchmarkName}`);

    // Create temporary test suite from benchmark
    const testSuite: TestSuite = {
      id: `benchmark_${benchmarkName}`,
      name: benchmark.name,
      description: benchmark.description,
      testCases: benchmark.testCases,
      metrics: Array.from(this.evaluationMetrics.values()),
      environment: 'development'
    };

    this.testSuites.set(testSuite.id, testSuite);

    try {
      // Execute benchmark
      const results = await this.executeTestSuite(testSuite.id, testFunction, { parallel: true });

      // Compare with baseline and industry standards
      const vsBaseline: { [metricName: string]: { actual: number; baseline: number; improvement: number } } = {};
      const vsIndustry: { [metricName: string]: { actual: number; industry: number; comparison: number } } = {};

      for (const [metricName, metricStats] of Object.entries(results.metrics)) {
        if (benchmark.baseline && benchmark.baseline[metricName] !== undefined) {
          vsBaseline[metricName] = {
            actual: metricStats.average,
            baseline: benchmark.baseline[metricName],
            improvement: (metricStats.average - benchmark.baseline[metricName]) / benchmark.baseline[metricName]
          };
        }

        if (benchmark.industry && benchmark.industry[metricName] !== undefined) {
          vsIndustry[metricName] = {
            actual: metricStats.average,
            industry: benchmark.industry[metricName],
            comparison: (metricStats.average - benchmark.industry[metricName]) / benchmark.industry[metricName]
          };
        }
      }

      // Determine overall ranking
      const ranking = this.determineBenchmarkRanking(vsBaseline, vsIndustry);

      logger.info(`Benchmark completed. Ranking: ${ranking}`);

      return {
        benchmarkName,
        results,
        comparison: { vsBaseline, vsIndustry },
        ranking
      };

    } finally {
      // Clean up temporary test suite
      this.testSuites.delete(testSuite.id);
    }
  }

  /**
   * Track performance metrics over time
   */
  trackPerformanceMetric(
    category: PerformanceBenchmark['category'],
    value: number,
    context?: any
  ): void {
    if (!this.isEnabled) return;

    let benchmark = this.performanceMetrics.get(category);
    
    if (!benchmark) {
      benchmark = {
        category,
        measurements: [],
        statistics: { mean: 0, median: 0, p95: 0, p99: 0, min: 0, max: 0, std: 0 },
        trend: 'stable',
        alerts: []
      };
      this.performanceMetrics.set(category, benchmark);
    }

    // Add measurement
    benchmark.measurements.push({
      timestamp: new Date(),
      value,
      context
    });

    // Keep only recent measurements (last 1000)
    if (benchmark.measurements.length > 1000) {
      benchmark.measurements = benchmark.measurements.slice(-1000);
    }

    // Recalculate statistics
    this.updatePerformanceStatistics(benchmark);

    // Check for alerts
    this.checkPerformanceAlerts(benchmark, value);
  }

  /**
   * Create a custom test suite
   */
  createTestSuite(suite: Omit<TestSuite, 'id'>): string {
    const id = `suite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const testSuite: TestSuite = { ...suite, id };
    
    this.testSuites.set(id, testSuite);
    logger.info(`Created test suite: ${testSuite.name} with ${testSuite.testCases.length} test cases`);
    
    return id;
  }

  /**
   * Add custom evaluation metric
   */
  addEvaluationMetric(metric: EvaluationMetric): void {
    this.evaluationMetrics.set(metric.name, metric);
    logger.info(`Added custom evaluation metric: ${metric.name}`);
  }

  // Helper methods
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private calculateAverageScore(results: TestResult[], metrics: EvaluationMetric[]): number {
    if (results.length === 0) return 0;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const result of results) {
      for (const metric of metrics) {
        if (result.metrics[metric.name] !== undefined) {
          totalWeightedScore += result.metrics[metric.name] * metric.weight;
          totalWeight += metric.weight;
        }
      }
    }

    return totalWeight > 0 ? totalWeightedScore / totalWeight / results.length : 0;
  }

  private calculateAggregatedMetrics(
    results: TestResult[], 
    metrics: EvaluationMetric[]
  ): { [metricName: string]: { average: number; min: number; max: number; std: number } } {
    const aggregated: { [metricName: string]: { average: number; min: number; max: number; std: number } } = {};

    for (const metric of metrics) {
      const values = results
        .map(r => r.metrics[metric.name])
        .filter(v => v !== undefined && !isNaN(v)) as number[];

      if (values.length > 0) {
        aggregated[metric.name] = {
          average: this.calculateMean(values),
          min: Math.min(...values),
          max: Math.max(...values),
          std: this.calculateStandardDeviation(values)
        };
      }
    }

    return aggregated;
  }

  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = this.calculateMean(values);
    const squareDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquareDiff = this.calculateMean(squareDiffs);
    
    return Math.sqrt(avgSquareDiff);
  }

  private calculateConfidenceInterval(values: number[], confidence: number): number {
    // Simplified confidence interval calculation
    const mean = this.calculateMean(values);
    const std = this.calculateStandardDeviation(values);
    const marginOfError = 1.96 * (std / Math.sqrt(values.length)); // 95% confidence
    
    return marginOfError;
  }

  private async generateTestCasesForABTest(config: ABTestConfiguration): Promise<TestCase[]> {
    // For now, return a basic set of test cases
    // In a real implementation, this might generate test cases based on the configuration
    return [
      {
        id: 'ab_test_1',
        name: 'Sample A/B Test Case',
        input: { query: 'What is artificial intelligence?' },
        expectedOutput: 'Artificial intelligence (AI) is...',
        priority: 'medium',
        category: 'functionality',
        tags: ['ai', 'definition']
      }
    ];
  }

  private determineABTestWinner(
    results: ABTestResult['variants'], 
    config: ABTestConfiguration
  ): ABTestResult['variants'][0] | null {
    if (results.length === 0) return null;

    // Find variant with highest weighted score
    let bestVariant = results[0];
    let bestScore = this.calculateVariantScore(bestVariant, config.metrics);

    for (const variant of results.slice(1)) {
      const score = this.calculateVariantScore(variant, config.metrics);
      if (score > bestScore) {
        bestScore = score;
        bestVariant = variant;
      }
    }

    return bestVariant;
  }

  private calculateVariantScore(
    variant: ABTestResult['variants'][0], 
    metrics: EvaluationMetric[]
  ): number {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const metric of metrics) {
      if (variant.metrics[metric.name]) {
        totalWeightedScore += variant.metrics[metric.name].mean * metric.weight;
        totalWeight += metric.weight;
      }
    }

    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  }

  private calculateStatisticalSignificance(
    results: ABTestResult['variants'], 
    config: ABTestConfiguration
  ): number {
    // Simplified statistical significance calculation
    if (results.length < 2) return 0;

    const scores = results.map(variant => this.calculateVariantScore(variant, config.metrics));
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    
    return max > 0 ? (max - min) / max : 0;
  }

  private generateABTestRecommendation(
    results: ABTestResult['variants'],
    winner: ABTestResult['variants'][0] | null,
    significance: number
  ): string {
    if (!winner) {
      return 'No clear winner detected. Consider collecting more data or revising test configuration.';
    }

    if (significance > 0.1) {
      return `Strong recommendation: Deploy variant "${winner.name}". Shows significant improvement with ${(significance * 100).toFixed(1)}% difference.`;
    } else if (significance > 0.05) {
      return `Moderate recommendation: Consider deploying variant "${winner.name}". Shows modest improvement but may need more data for confirmation.`;
    } else {
      return `Weak recommendation: Variants show similar performance. Consider other factors like implementation complexity or cost.`;
    }
  }

  private determineBenchmarkRanking(
    vsBaseline: any, 
    vsIndustry: any
  ): 'above_industry' | 'at_industry' | 'below_industry' | 'above_baseline' | 'at_baseline' | 'below_baseline' {
    // Simple ranking logic - could be enhanced with more sophisticated analysis
    const industryComparisons = Object.values(vsIndustry).map((comp: any) => comp.comparison);
    const baselineComparisons = Object.values(vsBaseline).map((comp: any) => comp.improvement);

    const avgIndustryComparison = industryComparisons.length > 0 ? 
      industryComparisons.reduce((sum: number, val: number) => sum + val, 0) / industryComparisons.length : 0;
    const avgBaselineComparison = baselineComparisons.length > 0 ?
      baselineComparisons.reduce((sum: number, val: number) => sum + val, 0) / baselineComparisons.length : 0;

    if (Math.abs(avgIndustryComparison) > 0.05) {
      return avgIndustryComparison > 0 ? 'above_industry' : 'below_industry';
    } else if (industryComparisons.length > 0) {
      return 'at_industry';
    } else if (Math.abs(avgBaselineComparison) > 0.05) {
      return avgBaselineComparison > 0 ? 'above_baseline' : 'below_baseline';
    } else {
      return 'at_baseline';
    }
  }

  private updatePerformanceStatistics(benchmark: PerformanceBenchmark): void {
    const values = benchmark.measurements.map(m => m.value).sort((a, b) => a - b);
    
    if (values.length === 0) return;

    benchmark.statistics = {
      mean: this.calculateMean(values),
      median: values[Math.floor(values.length / 2)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)],
      min: values[0],
      max: values[values.length - 1],
      std: this.calculateStandardDeviation(values)
    };

    // Determine trend from recent measurements
    const recent = benchmark.measurements.slice(-10).map(m => m.value);
    if (recent.length >= 3) {
      const recentTrend = this.calculateTrend(recent);
      benchmark.trend = recentTrend;
    }
  }

  private calculateTrend(values: number[]): 'improving' | 'declining' | 'stable' {
    if (values.length < 3) return 'stable';
    
    const first = values.slice(0, values.length / 2);
    const last = values.slice(values.length / 2);
    
    const firstAvg = this.calculateMean(first);
    const lastAvg = this.calculateMean(last);
    
    const change = (lastAvg - firstAvg) / firstAvg;
    
    if (change > 0.05) return 'improving';
    if (change < -0.05) return 'declining';
    return 'stable';
  }

  private checkPerformanceAlerts(benchmark: PerformanceBenchmark, value: number): void {
    const stats = benchmark.statistics;
    
    // Check for threshold alerts
    if (benchmark.category === 'latency' && value > stats.mean + 2 * stats.std) {
      benchmark.alerts.push({
        type: 'threshold',
        severity: 'high',
        message: `Latency spike detected: ${value}ms (mean: ${stats.mean.toFixed(1)}ms)`,
        timestamp: new Date()
      });
    }
    
    // Check for trend alerts
    if (benchmark.trend === 'declining') {
      benchmark.alerts.push({
        type: 'trend',
        severity: 'medium',
        message: `Performance declining trend detected in ${benchmark.category}`,
        timestamp: new Date()
      });
    }

    // Keep only recent alerts (last 100)
    if (benchmark.alerts.length > 100) {
      benchmark.alerts = benchmark.alerts.slice(-100);
    }
  }

  /**
   * Get test suite results
   */
  getTestSuiteResults(suiteId: string): TestSuiteResult[] {
    return this.testResults.get(suiteId) || [];
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(category?: string): Map<string, PerformanceBenchmark> | PerformanceBenchmark | undefined {
    if (category) {
      return this.performanceMetrics.get(category);
    }
    return this.performanceMetrics;
  }

  /**
   * Get A/B test results
   */
  getABTestResults(): Map<string, ABTestResult> {
    return this.abTests;
  }

  /**
   * Get available benchmarks
   */
  getAvailableBenchmarks(): Map<string, BenchmarkSuite> {
    return this.benchmarkSuites;
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    enabled: boolean;
    testSuites: number;
    evaluationMetrics: number;
    benchmarkSuites: number;
    abTests: number;
    performanceMetrics: number;
  } {
    return {
      enabled: this.isEnabled,
      testSuites: this.testSuites.size,
      evaluationMetrics: this.evaluationMetrics.size,
      benchmarkSuites: this.benchmarkSuites.size,
      abTests: this.abTests.size,
      performanceMetrics: this.performanceMetrics.size
    };
  }
}

// Singleton instance
export const aiEvaluationTestingService = new AIEvaluationTestingService();