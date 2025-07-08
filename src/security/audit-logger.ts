/**
 * Cycle 10: Security Audit Logger
 * 
 * Comprehensive audit logging system for security events, compliance,
 * and forensic analysis with tamper-proof event recording.
 */

import { createHash } from 'crypto';
import { logger } from '../utils/logger.js';

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  userId?: string;
  guildId?: string;
  channelId?: string;
  action: string;
  resource?: string;
  outcome: 'success' | 'failure' | 'blocked';
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  riskScore: number; // 0-100
  hash: string; // For tamper detection
}

export enum SecurityEventType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  ACCESS_CONTROL = 'access_control',
  DATA_ACCESS = 'data_access',
  ADMIN_ACTION = 'admin_action',
  SECURITY_VIOLATION = 'security_violation',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SYSTEM_CHANGE = 'system_change',
  COMPLIANCE = 'compliance',
  THREAT_DETECTION = 'threat_detection'
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AuditReport {
  id: string;
  generatedAt: Date;
  timeRange: { start: Date; end: Date };
  eventCount: number;
  securitySummary: {
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    blockedEvents: number;
    averageRiskScore: number;
    highRiskEvents: number;
  };
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<SecuritySeverity, number>;
  topUsers: Array<{ userId: string; eventCount: number; riskScore: number }>;
  complianceStatus: ComplianceStatus;
  recommendations: string[];
}

export interface ComplianceStatus {
  gdprCompliant: boolean;
  auditTrailComplete: boolean;
  dataRetentionCompliant: boolean;
  accessControlCompliant: boolean;
  issues: string[];
  lastAssessment: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: (event: SecurityEvent, recentEvents: SecurityEvent[]) => boolean;
  severity: SecuritySeverity;
  enabled: boolean;
  cooldownMinutes: number;
  actions: AlertAction[];
}

export interface AlertAction {
  type: 'log' | 'email' | 'webhook' | 'block_user' | 'escalate';
  configuration: Record<string, unknown>;
}

export class SecurityAuditLogger {
  private events: SecurityEvent[] = [];
  private alertRules: AlertRule[] = [];
  private alertCooldowns: Map<string, Date> = new Map();
  private readonly MAX_EVENTS = 100000; // Configurable event retention
  private readonly DATA_RETENTION_DAYS = 365; // 1 year retention
  private hashChain: string = ''; // For blockchain-like integrity

  constructor() {
    this.initializeDefaultAlertRules();
    this.startMaintenanceTasks();
  }

  /**
   * Log a security event
   */
  public async logSecurityEvent(
    eventType: SecurityEventType,
    action: string,
    outcome: 'success' | 'failure' | 'blocked',
    details: Record<string, unknown>,
    options: {
      userId?: string;
      guildId?: string;
      channelId?: string;
      resource?: string;
      severity?: SecuritySeverity;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    } = {}
  ): Promise<SecurityEvent> {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      eventType,
      severity: options.severity || this.calculateSeverity(eventType, outcome),
      userId: options.userId,
      guildId: options.guildId,
      channelId: options.channelId,
      action,
      resource: options.resource,
      outcome,
      details,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      sessionId: options.sessionId,
      riskScore: this.calculateRiskScore(eventType, outcome, details),
      hash: ''
    };

    // Calculate tamper-proof hash
    event.hash = this.calculateEventHash(event);
    this.hashChain = this.calculateChainHash(this.hashChain, event.hash);

    // Store event
    this.events.push(event);
    this.maintainEventLimit();

    // Check alert rules
    await this.evaluateAlertRules(event);

    // Log to standard logger as well
    logger.info(`Security Event: ${eventType} - ${action} - ${outcome}`, {
      eventId: event.id,
      userId: event.userId,
      riskScore: event.riskScore
    });

    return event;
  }

  /**
   * Generate comprehensive audit report
   */
  public generateAuditReport(
    startDate: Date,
    endDate: Date
  ): AuditReport {
    const relevantEvents = this.events.filter(
      event => event.timestamp >= startDate && event.timestamp <= endDate
    );

    const securitySummary = this.calculateSecuritySummary(relevantEvents);
    const eventsByType = this.groupEventsByType(relevantEvents);
    const eventsBySeverity = this.groupEventsBySeverity(relevantEvents);
    const topUsers = this.calculateTopUsers(relevantEvents);
    const complianceStatus = this.assessComplianceStatus(relevantEvents);
    const recommendations = this.generateRecommendations(relevantEvents, complianceStatus);

    return {
      id: this.generateReportId(),
      generatedAt: new Date(),
      timeRange: { start: startDate, end: endDate },
      eventCount: relevantEvents.length,
      securitySummary,
      eventsByType,
      eventsBySeverity,
      topUsers,
      complianceStatus,
      recommendations
    };
  }

  /**
   * Search security events
   */
  public searchEvents(criteria: {
    eventTypes?: SecurityEventType[];
    severities?: SecuritySeverity[];
    userIds?: string[];
    guildIds?: string[];
    startDate?: Date;
    endDate?: Date;
    minRiskScore?: number;
    outcome?: 'success' | 'failure' | 'blocked';
    textSearch?: string;
  }): SecurityEvent[] {
    return this.events.filter(event => {
      if (criteria.eventTypes && !criteria.eventTypes.includes(event.eventType)) {
        return false;
      }
      if (criteria.severities && !criteria.severities.includes(event.severity)) {
        return false;
      }
      if (criteria.userIds && (!event.userId || !criteria.userIds.includes(event.userId))) {
        return false;
      }
      if (criteria.guildIds && (!event.guildId || !criteria.guildIds.includes(event.guildId))) {
        return false;
      }
      if (criteria.startDate && event.timestamp < criteria.startDate) {
        return false;
      }
      if (criteria.endDate && event.timestamp > criteria.endDate) {
        return false;
      }
      if (criteria.minRiskScore && event.riskScore < criteria.minRiskScore) {
        return false;
      }
      if (criteria.outcome && event.outcome !== criteria.outcome) {
        return false;
      }
      if (criteria.textSearch) {
        const searchText = criteria.textSearch.toLowerCase();
        const searchableText = `${event.action} ${event.resource} ${JSON.stringify(event.details)}`.toLowerCase();
        if (!searchableText.includes(searchText)) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Verify audit trail integrity
   */
  public verifyIntegrity(): {
    isValid: boolean;
    corruptedEvents: string[];
    lastValidEvent?: string;
  } {
    const corruptedEvents: string[] = [];
    let lastValidEvent: string | undefined;
    let currentChainHash = '';

    for (const event of this.events) {
      const expectedHash = this.calculateEventHash(event);
      if (event.hash !== expectedHash) {
        corruptedEvents.push(event.id);
      } else {
        lastValidEvent = event.id;
      }

      currentChainHash = this.calculateChainHash(currentChainHash, event.hash);
    }

    return {
      isValid: corruptedEvents.length === 0,
      corruptedEvents,
      lastValidEvent
    };
  }

  /**
   * Export audit data for compliance
   */
  public exportComplianceData(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportToCSV();
    }
    return JSON.stringify({
      exportDate: new Date(),
      eventCount: this.events.length,
      integrityCheck: this.verifyIntegrity(),
      events: this.events
    }, null, 2);
  }

  /**
   * Private helper methods
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportId(): string {
    return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateSeverity(eventType: SecurityEventType, outcome: string): SecuritySeverity {
    if (outcome === 'blocked' || outcome === 'failure') {
      switch (eventType) {
        case SecurityEventType.SECURITY_VIOLATION:
        case SecurityEventType.THREAT_DETECTION:
          return SecuritySeverity.CRITICAL;
        case SecurityEventType.ADMIN_ACTION:
        case SecurityEventType.SYSTEM_CHANGE:
          return SecuritySeverity.HIGH;
        case SecurityEventType.ACCESS_CONTROL:
        case SecurityEventType.AUTHORIZATION:
          return SecuritySeverity.MEDIUM;
        default:
          return SecuritySeverity.LOW;
      }
    }
    return SecuritySeverity.LOW;
  }

  private calculateRiskScore(
    eventType: SecurityEventType,
    outcome: string,
    details: Record<string, unknown>
  ): number {
    let baseScore = 0;

    // Base score by event type
    switch (eventType) {
      case SecurityEventType.THREAT_DETECTION:
        baseScore = 80;
        break;
      case SecurityEventType.SECURITY_VIOLATION:
        baseScore = 70;
        break;
      case SecurityEventType.ADMIN_ACTION:
        baseScore = 60;
        break;
      case SecurityEventType.SYSTEM_CHANGE:
        baseScore = 50;
        break;
      case SecurityEventType.ACCESS_CONTROL:
        baseScore = 40;
        break;
      case SecurityEventType.AUTHORIZATION:
        baseScore = 30;
        break;
      default:
        baseScore = 20;
    }

    // Adjust for outcome
    if (outcome === 'failure') baseScore += 20;
    if (outcome === 'blocked') baseScore += 10;

    // Adjust for additional context
    if (details.repeated_attempts) baseScore += 15;
    if (details.unusual_timing) baseScore += 10;
    if (details.privilege_escalation) baseScore += 25;

    return Math.min(100, Math.max(0, baseScore));
  }

  private calculateEventHash(event: SecurityEvent): string {
    const eventData = {
      id: event.id,
      timestamp: event.timestamp.toISOString(),
      eventType: event.eventType,
      action: event.action,
      outcome: event.outcome,
      details: event.details
    };
    return createHash('sha256').update(JSON.stringify(eventData)).digest('hex');
  }

  private calculateChainHash(previousHash: string, currentHash: string): string {
    return createHash('sha256').update(previousHash + currentHash).digest('hex');
  }

  private calculateSecuritySummary(events: SecurityEvent[]) {
    const successful = events.filter(e => e.outcome === 'success').length;
    const failed = events.filter(e => e.outcome === 'failure').length;
    const blocked = events.filter(e => e.outcome === 'blocked').length;
    const highRisk = events.filter(e => e.riskScore >= 70).length;
    const avgRisk = events.length > 0 ? 
      events.reduce((sum, e) => sum + e.riskScore, 0) / events.length : 0;

    return {
      totalEvents: events.length,
      successfulEvents: successful,
      failedEvents: failed,
      blockedEvents: blocked,
      averageRiskScore: Math.round(avgRisk),
      highRiskEvents: highRisk
    };
  }

  private groupEventsByType(events: SecurityEvent[]): Record<SecurityEventType, number> {
    const groups: Record<SecurityEventType, number> = {} as Record<SecurityEventType, number>;
    
    Object.values(SecurityEventType).forEach(type => {
      groups[type] = events.filter(e => e.eventType === type).length;
    });

    return groups;
  }

  private groupEventsBySeverity(events: SecurityEvent[]): Record<SecuritySeverity, number> {
    const groups: Record<SecuritySeverity, number> = {} as Record<SecuritySeverity, number>;
    
    Object.values(SecuritySeverity).forEach(severity => {
      groups[severity] = events.filter(e => e.severity === severity).length;
    });

    return groups;
  }

  private calculateTopUsers(events: SecurityEvent[]) {
    const userStats = new Map<string, { eventCount: number; totalRisk: number }>();

    events.forEach(event => {
      if (event.userId) {
        const current = userStats.get(event.userId) || { eventCount: 0, totalRisk: 0 };
        current.eventCount++;
        current.totalRisk += event.riskScore;
        userStats.set(event.userId, current);
      }
    });

    return Array.from(userStats.entries())
      .map(([userId, stats]) => ({
        userId,
        eventCount: stats.eventCount,
        riskScore: Math.round(stats.totalRisk / stats.eventCount)
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);
  }

  private assessComplianceStatus(events: SecurityEvent[]): ComplianceStatus {
    const issues: string[] = [];

    // Check audit trail completeness
    const auditTrailComplete = this.verifyIntegrity().isValid;
    if (!auditTrailComplete) {
      issues.push('Audit trail integrity compromised');
    }

    // Check data retention compliance
    const oldestEvent = events.length > 0 ? events[0].timestamp : new Date();
    const retentionDays = (Date.now() - oldestEvent.getTime()) / (1000 * 60 * 60 * 24);
    const dataRetentionCompliant = retentionDays <= this.DATA_RETENTION_DAYS;
    if (!dataRetentionCompliant) {
      issues.push('Data retention period exceeded');
    }

    // Check access control events
    const accessControlEvents = events.filter(e => 
      e.eventType === SecurityEventType.ACCESS_CONTROL ||
      e.eventType === SecurityEventType.AUTHORIZATION
    );
    const accessControlCompliant = accessControlEvents.length > 0;
    if (!accessControlCompliant) {
      issues.push('Insufficient access control logging');
    }

    return {
      gdprCompliant: auditTrailComplete && dataRetentionCompliant,
      auditTrailComplete,
      dataRetentionCompliant,
      accessControlCompliant,
      issues,
      lastAssessment: new Date()
    };
  }

  private generateRecommendations(events: SecurityEvent[], compliance: ComplianceStatus): string[] {
    const recommendations: string[] = [];

    if (!compliance.auditTrailComplete) {
      recommendations.push('Investigate and restore audit trail integrity');
    }

    const highRiskEvents = events.filter(e => e.riskScore >= 70);
    if (highRiskEvents.length > events.length * 0.1) {
      recommendations.push('Review and strengthen security controls - high risk event rate detected');
    }

    const failedEvents = events.filter(e => e.outcome === 'failure');
    if (failedEvents.length > events.length * 0.2) {
      recommendations.push('Investigate authentication/authorization failures');
    }

    if (events.length < 100) {
      recommendations.push('Consider increasing audit logging coverage');
    }

    return recommendations;
  }

  private initializeDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'multiple_failures',
        name: 'Multiple Failed Attempts',
        description: 'Alert on multiple failed authentication/authorization attempts',
        condition: (event, recentEvents) => {
          if (event.outcome !== 'failure') return false;
          const recentFailures = recentEvents.filter(e => 
            e.userId === event.userId && 
            e.outcome === 'failure' &&
            e.timestamp.getTime() > Date.now() - 300000 // 5 minutes
          );
          return recentFailures.length >= 3;
        },
        severity: SecuritySeverity.HIGH,
        enabled: true,
        cooldownMinutes: 15,
        actions: [
          { type: 'log', configuration: { level: 'warn' } },
          { type: 'block_user', configuration: { duration: 300 } }
        ]
      },
      {
        id: 'privilege_escalation',
        name: 'Privilege Escalation Attempt',
        description: 'Alert on potential privilege escalation',
        condition: (event) => {
          return event.riskScore >= 80 && 
                 event.eventType === SecurityEventType.ADMIN_ACTION;
        },
        severity: SecuritySeverity.CRITICAL,
        enabled: true,
        cooldownMinutes: 5,
        actions: [
          { type: 'log', configuration: { level: 'error' } },
          { type: 'escalate', configuration: { level: 'admin' } }
        ]
      }
    ];
  }

  private async evaluateAlertRules(event: SecurityEvent): Promise<void> {
    const recentEvents = this.events.filter(e => 
      e.timestamp.getTime() > Date.now() - 3600000 // Last hour
    );

    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      // Check cooldown
      const lastAlert = this.alertCooldowns.get(rule.id);
      if (lastAlert && Date.now() - lastAlert.getTime() < rule.cooldownMinutes * 60000) {
        continue;
      }

      if (rule.condition(event, recentEvents)) {
        await this.triggerAlert(rule, event);
        this.alertCooldowns.set(rule.id, new Date());
      }
    }
  }

  private async triggerAlert(rule: AlertRule, event: SecurityEvent): Promise<void> {
    logger.warn(`Security Alert: ${rule.name}`, {
      ruleId: rule.id,
      eventId: event.id,
      severity: rule.severity
    });

    for (const action of rule.actions) {
      switch (action.type) {
        case 'log':
          logger[action.configuration.level as 'info' | 'warn' | 'error' || 'info'](
            `Alert Action: ${rule.name}`, {
            operation: 'alert-action',
            metadata: { ...event }
          });
          break;
        case 'block_user':
          // Would integrate with rate limiter or user management
          logger.info(`Would block user ${event.userId} for ${action.configuration.duration}s`, {
            operation: 'user-block',
            metadata: { userId: event.userId, duration: action.configuration.duration }
          });
          break;
        case 'escalate':
          logger.error(`Escalating security event to ${action.configuration.level}`, {
            operation: 'escalate-security',
            metadata: { ...event }
          });
          break;
      }
    }
  }

  private maintainEventLimit(): void {
    if (this.events.length > this.MAX_EVENTS) {
      const removeCount = this.events.length - this.MAX_EVENTS;
      this.events.splice(0, removeCount);
      logger.info(`Removed ${removeCount} old security events to maintain limit`);
    }
  }

  private startMaintenanceTasks(): void {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanupOldEvents();
      this.cleanupAlertCooldowns();
    }, 3600000);
  }

  private cleanupOldEvents(): void {
    const cutoffDate = new Date(Date.now() - this.DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const originalLength = this.events.length;
    this.events = this.events.filter(event => event.timestamp > cutoffDate);
    
    if (this.events.length < originalLength) {
      logger.info(`Cleaned up ${originalLength - this.events.length} expired security events`);
    }
  }

  private cleanupAlertCooldowns(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    for (const [ruleId, timestamp] of this.alertCooldowns.entries()) {
      if (timestamp < cutoffTime) {
        this.alertCooldowns.delete(ruleId);
      }
    }
  }

  private exportToCSV(): string {
    const headers = [
      'ID', 'Timestamp', 'Event Type', 'Severity', 'User ID', 'Guild ID',
      'Action', 'Outcome', 'Risk Score', 'IP Address'
    ];

    const rows = this.events.map(event => [
      event.id,
      event.timestamp.toISOString(),
      event.eventType,
      event.severity,
      event.userId || '',
      event.guildId || '',
      event.action,
      event.outcome,
      event.riskScore.toString(),
      event.ipAddress || ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Get audit statistics
   */
  public getAuditStats(): {
    totalEvents: number;
    eventsByType: Record<SecurityEventType, number>;
    averageRiskScore: number;
    alertRulesActive: number;
    integrityStatus: boolean;
  } {
    return {
      totalEvents: this.events.length,
      eventsByType: this.groupEventsByType(this.events),
      averageRiskScore: this.events.length > 0 ? 
        Math.round(this.events.reduce((sum, e) => sum + e.riskScore, 0) / this.events.length) : 0,
      alertRulesActive: this.alertRules.filter(r => r.enabled).length,
      integrityStatus: this.verifyIntegrity().isValid
    };
  }
}

// Export singleton instance
export const securityAuditLogger = new SecurityAuditLogger();
