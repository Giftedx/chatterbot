/**
 * Analytics Event Collection Service
 * Handles collection, validation, and initial processing of analytics events
 */

import { AnalyticsEvent } from './types.js';
import { logger } from '../logger.js';

export class AnalyticsEventCollectionService {
  private events: AnalyticsEvent[] = [];
  private readonly maxBufferSize = 1000;
  private readonly flushInterval = 5000; // 5 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.startPeriodicFlush();
  }

  /**
   * Track a new analytics event
   */
  track(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): void {
    try {
      const fullEvent: AnalyticsEvent = {
        ...event,
        id: this.generateEventId(),
        timestamp: Date.now()
      };

      // Validate event
      if (!this.validateEvent(fullEvent)) {
        logger.warn('Invalid analytics event discarded', { event: fullEvent });
        return;
      }

      // Add to buffer
      this.events.push(fullEvent);

      // Flush if buffer is full
      if (this.events.length >= this.maxBufferSize) {
        this.flush();
      }

    } catch (error) {
      logger.error('Failed to track analytics event', { error: String(error), event });
    }
  }

  /**
   * Track a user interaction event
   */
  trackUserInteraction(
    userId: string,
    guildId: string | undefined,
    action: string,
    data: Record<string, unknown> = {}
  ): void {
    this.track({
      type: 'user',
      category: 'interaction',
      userId,
      guildId,
      data: { action, ...data },
      metadata: {
        source: 'discord_bot',
        version: '1.0.0'
      }
    });
  }

  /**
   * Track a performance metric
   */
  trackPerformance(
    operation: string,
    duration: number,
    success: boolean,
    data: Record<string, unknown> = {}
  ): void {
    this.track({
      type: 'performance',
      category: 'operation',
      data: {
        operation,
        duration,
        success,
        ...data
      },
      metadata: {
        source: 'performance_monitor',
        version: '1.0.0'
      }
    });
  }

  /**
   * Track an error event
   */
  trackError(
    error: Error,
    context: Record<string, unknown> = {},
    userId?: string,
    guildId?: string
  ): void {
    this.track({
      type: 'error',
      category: 'application',
      userId,
      guildId,
      data: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        ...context
      },
      metadata: {
        source: 'error_handler',
        version: '1.0.0'
      }
    });
  }

  /**
   * Track a system event
   */
  trackSystem(
    event: string,
    data: Record<string, unknown> = {}
  ): void {
    this.track({
      type: 'system',
      category: 'status',
      data: { event, ...data },
      metadata: {
        source: 'system_monitor',
        version: '1.0.0'
      }
    });
  }

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.events.length;
  }

  /**
   * Manually flush events
   */
  flush(): void {
    if (this.events.length === 0) return;

    try {
      const eventsToFlush = [...this.events];
      this.events = [];

      // In a real implementation, this would send events to a data store or analytics service
      logger.info('Flushing analytics events', {
        operation: 'analytics-flush',
        metadata: {
          eventCount: eventsToFlush.length,
          timespan: this.getTimespan(eventsToFlush)
        }
      });

      // Process events here (save to database, send to analytics service, etc.)
      this.processEvents(eventsToFlush);

    } catch (error) {
      logger.error('Failed to flush analytics events', { error: String(error) });
    }
  }

  /**
   * Clean shutdown
   */
  shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }

  // Private methods

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateEvent(event: AnalyticsEvent): boolean {
    // Basic validation
    if (!event.id || !event.timestamp || !event.type || !event.category) {
      return false;
    }

    if (!event.metadata?.source || !event.metadata?.version) {
      return false;
    }

    return true;
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  private getTimespan(events: AnalyticsEvent[]): { start: number; end: number; duration: number } {
    const timestamps = events.map(e => e.timestamp);
    const start = Math.min(...timestamps);
    const end = Math.max(...timestamps);
    return { start, end, duration: end - start };
  }

  private processEvents(events: AnalyticsEvent[]): void {
    // Group events by type for different processing strategies
    const eventsByType = events.reduce((acc, event) => {
      if (!acc[event.type]) acc[event.type] = [];
      acc[event.type].push(event);
      return acc;
    }, {} as Record<string, AnalyticsEvent[]>);

    // Process each type appropriately
    Object.entries(eventsByType).forEach(([type, typeEvents]) => {
      logger.debug(`Processing ${typeEvents.length} ${type} events`);
      
      switch (type) {
        case 'performance':
          this.processPerformanceEvents(typeEvents);
          break;
        case 'user':
          this.processUserEvents(typeEvents);
          break;
        case 'error':
          this.processErrorEvents(typeEvents);
          break;
        case 'system':
          this.processSystemEvents(typeEvents);
          break;
        default:
          this.processGenericEvents(typeEvents);
      }
    });
  }

  private processPerformanceEvents(events: AnalyticsEvent[]): void {
    // Aggregate performance metrics
    const durations = events
      .map(e => e.data.duration as number)
      .filter(d => typeof d === 'number');
    
    if (durations.length > 0) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const max = Math.max(...durations);
      const min = Math.min(...durations);
      
      logger.debug('Performance metrics aggregated', {
        count: durations.length,
        avg: Math.round(avg),
        max,
        min
      });
    }
  }

  private processUserEvents(events: AnalyticsEvent[]): void {
    // Track user engagement patterns
    const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean));
    const uniqueGuilds = new Set(events.map(e => e.guildId).filter(Boolean));
    
    logger.debug('User activity processed', {
      events: events.length,
      uniqueUsers: uniqueUsers.size,
      uniqueGuilds: uniqueGuilds.size
    });
  }

  private processErrorEvents(events: AnalyticsEvent[]): void {
    // Analyze error patterns
    const errorTypes = events.reduce((acc, event) => {
      const errorName = event.data.name as string || 'Unknown';
      acc[errorName] = (acc[errorName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    logger.debug('Error patterns analyzed', { errorTypes });
  }

  private processSystemEvents(events: AnalyticsEvent[]): void {
    // Monitor system events
    const systemEvents = events.reduce((acc, event) => {
      const eventName = event.data.event as string || 'unknown';
      acc[eventName] = (acc[eventName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    logger.debug('System events processed', { systemEvents });
  }

  private processGenericEvents(events: AnalyticsEvent[]): void {
    // Handle any other event types
    logger.debug('Generic events processed', { count: events.length });
  }
}
