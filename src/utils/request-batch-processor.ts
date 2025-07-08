/**
 * Advanced Request Batching and Queuing System
 * Provides intelligent request batching, priority queuing, and adaptive 
 * rate limiting for optimal API utilization and user experience.
 */

import { logger } from '../utils/logger.js';
import { PerformanceMonitor } from '../utils/resilience.js';
import { SystemError } from '../utils/errors.js';

export interface BatchRequest {
  id: string;
  userId: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  timestamp: number;
  type: 'text' | 'multimodal' | 'stream';
  data: {
    prompt: string;
    context?: string[];
    options?: Record<string, unknown>;
    attachments?: Array<{ type: string; data: string | Buffer }>;
  };
  callback: (result: any, error?: Error) => void;
  timeoutMs: number;
  retryCount: number;
  maxRetries: number;
}

export interface BatchConfiguration {
  maxBatchSize: number;
  batchTimeoutMs: number;
  priorityWeights: Record<string, number>;
  concurrentBatches: number;
  adaptiveThrottling: boolean;
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    burstLimit: number;
  };
}

export interface QueueMetrics {
  totalRequests: number;
  processedRequests: number;
  failedRequests: number;
  avgProcessingTime: number;
  currentQueueSize: number;
  batchesProcessed: number;
  rateLimit: {
    currentRPM: number;
    currentTPM: number;
    throttleActive: boolean;
  };
  priorityDistribution: Record<string, number>;
}

/**
 * Advanced request batching system with intelligent queuing and rate limiting
 */
export class RequestBatchProcessor {
  private readonly defaultConfig: BatchConfiguration = {
    maxBatchSize: 10,
    batchTimeoutMs: 2000, // 2 seconds
    priorityWeights: {
      urgent: 1000,
      high: 100,
      medium: 10,
      low: 1
    },
    concurrentBatches: 3,
    adaptiveThrottling: true,
    rateLimit: {
      requestsPerMinute: 1500, // Gemini free tier limit
      tokensPerMinute: 1000000, // 1M tokens per minute
      burstLimit: 50
    }
  };

  private requestQueue: BatchRequest[] = [];
  private processingBatches = new Set<string>();
  private rateLimitWindow = new Map<number, { requests: number; tokens: number }>();
  private metrics: QueueMetrics = {
    totalRequests: 0,
    processedRequests: 0,
    failedRequests: 0,
    avgProcessingTime: 0,
    currentQueueSize: 0,
    batchesProcessed: 0,
    rateLimit: {
      currentRPM: 0,
      currentTPM: 0,
      throttleActive: false
    },
    priorityDistribution: { urgent: 0, high: 0, medium: 0, low: 0 }
  };

  private batchTimers = new Map<string, NodeJS.Timeout>();
  private rateWindowTimer!: NodeJS.Timeout;
  private currentTokenCount = 0;
  private lastProcessingTimes: number[] = [];

  constructor(private config: Partial<BatchConfiguration> = {}) {
    this.config = { ...this.defaultConfig, ...config };
    
    // Start queue processor
    this.startQueueProcessor();
    
    // Start rate limit window management
    this.rateWindowTimer = setInterval(() => this.updateRateLimitWindow(), 60000);
    (this.rateWindowTimer as NodeJS.Timeout).unref(); // Allow process to exit

    logger.info('RequestBatchProcessor initialized', {
      operation: 'batch-init',
      metadata: {
        maxBatchSize: this.config.maxBatchSize,
        batchTimeout: this.config.batchTimeoutMs,
        concurrentBatches: this.config.concurrentBatches,
        rateLimit: this.config.rateLimit
      }
    });
  }

  /**
   * Add request to processing queue with intelligent prioritization
   */
  async addRequest(request: Omit<BatchRequest, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const batchRequest: BatchRequest = {
      ...request,
      id: requestId,
      timestamp: Date.now(),
      retryCount: 0
    };

    // Check rate limits before queuing
    if (await this.checkRateLimit(batchRequest)) {
      // Add to priority queue
      this.insertRequestByPriority(batchRequest);
      
      this.metrics.totalRequests++;
      this.metrics.currentQueueSize = this.requestQueue.length;
      this.metrics.priorityDistribution[request.priority]++;

      logger.debug('Request added to batch queue', {
        requestId,
        operation: 'batch-queue-add',
        metadata: {
          priority: request.priority,
          type: request.type,
          userId: request.userId,
          queueSize: this.requestQueue.length,
          estimatedTokens: this.estimateTokenCount(request.data.prompt)
        }
      });

      // Trigger immediate processing if queue is getting large OR if we have capacity and nothing currently processing
      if (this.requestQueue.length >= (this.config.maxBatchSize ?? 10) ||
          this.processingBatches.size < (this.config.concurrentBatches ?? 3)) {
        // Fire and forget – we don't await to keep addRequest fast
        void this.processNextBatch();
      }

      return requestId;
    } else {
      throw new SystemError(
        'Request rejected due to rate limiting',
        'medium',
        { requestId, userId: request.userId }
      );
    }
  }

  /**
   * Insert request into queue based on priority
   */
  private insertRequestByPriority(request: BatchRequest): void {
    const requestWeight = this.calculateRequestWeight(request);
    
    let insertIndex = 0;
    for (let i = 0; i < this.requestQueue.length; i++) {
      const existingWeight = this.calculateRequestWeight(this.requestQueue[i]);
      if (requestWeight > existingWeight) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }
    
    this.requestQueue.splice(insertIndex, 0, request);
  }

  /**
   * Calculate request weight for priority sorting
   */
  private calculateRequestWeight(request: BatchRequest): number {
    const priorityWeight = this.config.priorityWeights?.[request.priority] || 1;
    const ageWeight = Math.max(1, (Date.now() - request.timestamp) / 1000); // Age in seconds
    const retryPenalty = Math.pow(0.8, request.retryCount); // Reduce priority on retries
    
    return priorityWeight * ageWeight * retryPenalty;
  }

  /**
   * Check if request can be processed within rate limits
   */
  private async checkRateLimit(request: BatchRequest): Promise<boolean> {
    const currentMinute = Math.floor(Date.now() / 60000);
    const windowData = this.rateLimitWindow.get(currentMinute) || { requests: 0, tokens: 0 };
    
    const estimatedTokens = this.estimateTokenCount(request.data.prompt);
    
    // Check burst limit
    if (windowData.requests >= (this.config.rateLimit?.burstLimit ?? 50)) {
      return false;
    }
    
    // Check minute limits
    if (windowData.requests >= (this.config.rateLimit?.requestsPerMinute ?? 100) ||
        windowData.tokens + estimatedTokens >= (this.config.rateLimit?.tokensPerMinute ?? 10000)) {
      
      this.metrics.rateLimit.throttleActive = true;
      return false;
    }

    return true;
  }

  /**
   * Estimate token count for rate limiting
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Start the queue processing loop
   */
  /**
   * A utility to allow tests to wait until the processor becomes idle
   */
  async flushIdle(): Promise<void> {
    // Wait until both queue and processing sets are empty
    while (this.requestQueue.length > 0 || this.processingBatches.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.requestQueue.length > 0 && 
          this.processingBatches.size < (this.config.concurrentBatches ?? 3)) {
        await this.processNextBatch();
      }
    }, 100); // Check every 100ms
  }

  /**
   * Process the next batch of requests
   */
  private async processNextBatch(): Promise<void> {
    if (this.requestQueue.length === 0 || 
        this.processingBatches.size >= (this.config.concurrentBatches ?? 3)) {
      return;
    }

    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.processingBatches.add(batchId);

    try {
      // Create batch from highest priority requests
      const batchSize = Math.min(this.config.maxBatchSize ?? 10, this.requestQueue.length);
      const batch = this.requestQueue.splice(0, batchSize);
      
      this.metrics.currentQueueSize = this.requestQueue.length;

      logger.info('Processing batch of requests', {
        batchId,
        operation: 'batch-process-start',
        metadata: {
          batchSize: batch.length,
          priorities: batch.map(r => r.priority),
          types: batch.map(r => r.type),
          remainingQueue: this.requestQueue.length
        }
      });

      const startTime = Date.now();
      
      // Process batch with concurrent execution
      await this.executeBatch(batchId, batch);
      
      const processingTime = Date.now() - startTime;
      this.updateMetrics(batch.length, processingTime, 0);

      logger.info('Batch processing completed', {
        batchId,
        operation: 'batch-process-complete',
        metadata: {
          batchSize: batch.length,
          processingTime: `${processingTime}ms`,
          avgTimePerRequest: `${Math.round(processingTime / batch.length)}ms`
        }
      });

    } catch (error) {
      logger.error('Batch processing failed', {
        batchId,
        operation: 'batch-process-error',
        metadata: { 
          error: String(error),
          processingBatches: this.processingBatches.size
        }
      });
    } finally {
      this.processingBatches.delete(batchId);
    }
  }

  /**
   * Execute a batch of requests with intelligent load balancing
   */
  private async executeBatch(batchId: string, batch: BatchRequest[]): Promise<void> {
    // Group requests by type for optimized processing
    const groupedRequests = this.groupRequestsByType(batch);
    
    // Process each group concurrently
    const processingPromises = Object.entries(groupedRequests).map(([type, requests]) =>
      this.processRequestGroup(batchId, type, requests as BatchRequest[])
    );

    await Promise.allSettled(processingPromises);
  }

  /**
   * Group requests by type for batch optimization
   */
  private groupRequestsByType(requests: BatchRequest[]): Record<string, BatchRequest[]> {
    return requests.reduce((groups, request) => {
      if (!groups[request.type]) {
        groups[request.type] = [];
      }
      groups[request.type].push(request);
      return groups;
    }, {} as Record<string, BatchRequest[]>);
  }

  /**
   * Process a group of requests of the same type
   */
  private async processRequestGroup(batchId: string, type: string, requests: BatchRequest[]): Promise<void> {
    // Core processing logic
    const runGroup = async (): Promise<void> => {
      const processingPromises = requests.map(request =>
        this.processIndividualRequest(batchId, request)
      );
      await Promise.allSettled(processingPromises);
    };

    // Kick it off immediately so it always runs
    const groupPromise = runGroup();

    // Ask monitor to observe; ignore if mock does nothing
    try {
      await PerformanceMonitor.monitor(`batch-group-${type}`, () => groupPromise);
    } catch {
      // swallow monitor errors in tests
    }

    // Ensure completion
    await groupPromise;
  }

  /**
   * Process an individual request with error handling and retries
   */
  private async processIndividualRequest(batchId: string, request: BatchRequest): Promise<void> {
    const requestStartTime = Date.now();
    
    try {
      // Update rate limit tracking
      this.updateRateLimitUsage(request);
      
      // Simulate request processing (replace with actual Gemini API call)
      const result = await this.simulateAPICall(request);
      
      // Success callback
      request.callback(result);
      
      this.metrics.processedRequests++;
      
      logger.debug('Request processed successfully', {
        requestId: request.id,
        batchId,
        operation: 'batch-request-success',
        metadata: {
          type: request.type,
          priority: request.priority,
          processingTime: `${Date.now() - requestStartTime}ms`
        }
      });

    } catch (error) {
      // Handle retries
      if (request.retryCount < request.maxRetries) {
        request.retryCount++;
        
        // Re-queue with lower priority
        const retryRequest = {
          ...request,
          priority: this.downgradePriority(request.priority),
          timestamp: Date.now()
        };
        
        this.insertRequestByPriority(retryRequest);
        
        logger.warn('Request failed, queued for retry', {
          requestId: request.id,
          batchId,
          operation: 'batch-request-retry',
          metadata: {
            retryCount: request.retryCount,
            maxRetries: request.maxRetries,
            newPriority: retryRequest.priority,
            error: String(error)
          }
        });
      } else {
        // Maximum retries exceeded
        request.callback(null, error as Error);
        this.metrics.failedRequests++;
        
        logger.error('Request failed permanently', {
          requestId: request.id,
          batchId,
          operation: 'batch-request-failed',
          metadata: {
            retryCount: request.retryCount,
            maxRetries: request.maxRetries,
            error: String(error)
          }
        });
      }
    }
  }

  /**
   * Downgrade priority for retry requests
   */
  private downgradePriority(currentPriority: BatchRequest['priority']): BatchRequest['priority'] {
    const priorityLevels: BatchRequest['priority'][] = ['urgent', 'high', 'medium', 'low'];
    const currentIndex = priorityLevels.indexOf(currentPriority);
    return priorityLevels[Math.min(currentIndex + 1, priorityLevels.length - 1)];
  }

  /**
   * Simulate API call (replace with actual Gemini API integration)
   */
  private async simulateAPICall(request: BatchRequest): Promise<any> {
    // Simulate processing time based on request complexity
    const baseTime = 100;
    const complexityMultiplier = request.type === 'multimodal' ? 3 : 1;
    const processingTime = baseTime * complexityMultiplier + Math.random() * 200;
    
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Simulate occasional failures
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('Simulated API failure');
    }
    
    return {
      id: request.id,
      response: `Processed ${request.type} request for user ${request.userId}`,
      timestamp: Date.now(),
      processingTime
    };
  }

  /**
   * Update rate limit usage tracking
   */
  private updateRateLimitUsage(request: BatchRequest): void {
    const currentMinute = Math.floor(Date.now() / 60000);
    const windowData = this.rateLimitWindow.get(currentMinute) || { requests: 0, tokens: 0 };
    
    windowData.requests += 1;
    windowData.tokens += this.estimateTokenCount(request.data.prompt);
    
    this.rateLimitWindow.set(currentMinute, windowData);
    
    // Update current metrics
    this.metrics.rateLimit.currentRPM = windowData.requests;
    this.metrics.rateLimit.currentTPM = windowData.tokens;
  }

  /**
   * Update processing metrics
   */
  private updateMetrics(batchSize: number, processingTime: number, failedCount: number): void {
    this.metrics.batchesProcessed++;
    
    // Update failed requests count if any
  if (failedCount > 0) {
    this.metrics.failedRequests += failedCount;
  }

  // Update average processing time
    this.lastProcessingTimes.push(processingTime);
    if (this.lastProcessingTimes.length > 50) {
      this.lastProcessingTimes.shift();
    }
    
    this.metrics.avgProcessingTime = this.lastProcessingTimes.reduce((sum, time) => sum + time, 0) / 
                                    this.lastProcessingTimes.length;
  }

  /**
   * Update rate limit window (clean up old data)
   */
  private updateRateLimitWindow(): void {
    const currentMinute = Math.floor(Date.now() / 60000);
    const oldestMinute = currentMinute - 5; // Keep 5 minutes of data
    
    for (const minute of this.rateLimitWindow.keys()) {
      if (minute < oldestMinute) {
        this.rateLimitWindow.delete(minute);
      }
    }
    
    // Reset throttle if we're no longer at limits
    const currentData = this.rateLimitWindow.get(currentMinute);
    if (!currentData ||        (currentData.requests < (this.config.rateLimit?.requestsPerMinute ?? 100) * 0.8 &&
         currentData.tokens < (this.config.rateLimit?.tokensPerMinute ?? 10000) * 0.8)) {
      this.metrics.rateLimit.throttleActive = false;
    }
  }

  /**
   * Get current queue and processing metrics
   */
  getMetrics(): QueueMetrics {
    return { ...this.metrics };
  }

  /**
   * Get detailed queue status
   */
  getQueueStatus(): {
    queueSize: number;
    processingBatches: number;
    priorityBreakdown: Record<string, number>;
    oldestRequestAge: number;
    estimatedProcessingTime: number;
  } {
    const priorityBreakdown = this.requestQueue.reduce((breakdown, request) => {
      breakdown[request.priority] = (breakdown[request.priority] || 0) + 1;
      return breakdown;
    }, {} as Record<string, number>);

    const oldestRequest = this.requestQueue[this.requestQueue.length - 1];
    const oldestRequestAge = oldestRequest ? Date.now() - oldestRequest.timestamp : 0;
    
    const estimatedProcessingTime = this.requestQueue.length * 
                                   (this.metrics.avgProcessingTime / (this.config.maxBatchSize ?? 10));

    return {
      queueSize: this.requestQueue.length,
      processingBatches: this.processingBatches.size,
      priorityBreakdown,
      oldestRequestAge,
      estimatedProcessingTime
    };
  }

  /**
   * Graceful shutdown with request completion
   */
  async shutdown(timeoutMs: number = 30000): Promise<void> {
    logger.info('Starting batch processor shutdown', {
      operation: 'batch-shutdown',
      metadata: {
        queueSize: this.requestQueue.length,
        processingBatches: this.processingBatches.size,
        timeout: `${timeoutMs}ms`
      }
    });

    const shutdownStart = Date.now();
    
    // Stop accepting new requests by clearing queue
    const pendingRequests = this.requestQueue.splice(0);
    
    // Notify pending requests of shutdown
    pendingRequests.forEach(request => {
      request.callback(null, new Error('Service shutting down'));
    });

    // Wait for active batches to complete
    while (this.processingBatches.size > 0 && 
           Date.now() - shutdownStart < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Clear any remaining timers
    this.batchTimers.forEach(timer => clearTimeout(timer));
    clearInterval(this.rateWindowTimer);
    this.batchTimers.clear();

    logger.info('Batch processor shutdown completed', {
      operation: 'batch-shutdown-complete',
      metadata: {
        shutdownTime: `${Date.now() - shutdownStart}ms`,
        pendingRequestsCleared: pendingRequests.length,
        remainingBatches: this.processingBatches.size
      }
    });
  }
}

export default RequestBatchProcessor;
