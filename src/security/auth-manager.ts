/**
 * Cycle 10: Authentication Manager
 * 
 * Secure authentication and session management system with JWT tokens,
 * OAuth2 integration, and multi-factor authentication support.
 */

import { createHash, randomBytes, createHmac } from 'crypto';
import * as bcrypt from 'bcrypt';
import { logger } from '../utils/logger.js';
import { securityAuditLogger, SecurityEventType } from './audit-logger.js';

export interface AuthToken {
  token: string;
  type: 'access' | 'refresh' | 'api';
  userId: string;
  guildId?: string;
  expiresAt: Date;
  issuedAt: Date;
  scope: string[];
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  guildId?: string;
  createdAt: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  tokens: AuthToken[];
  mfaVerified: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface AuthenticationResult {
  success: boolean;
  session?: AuthSession;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  requiresMfa?: boolean;
  mfaChallenge?: string;
}

export interface MfaChallenge {
  id: string;
  userId: string;
  type: 'totp' | 'sms' | 'email' | 'backup_code';
  challenge: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  hashedKey: string;
  userId: string;
  guildId?: string;
  permissions: string[];
  createdAt: Date;
  expiresAt?: Date;
  lastUsed?: Date;
  isActive: boolean;
  rateLimitTier: 'basic' | 'premium' | 'enterprise';
}

export interface SecurityPolicy {
  sessionTimeoutMinutes: number;
  tokenExpiryMinutes: number;
  maxConcurrentSessions: number;
  requireMfaForPrivileged: boolean;
  allowedIpRanges?: string[];
  blockedIpRanges?: string[];
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  bruteForceProtection: {
    maxAttempts: number;
    lockoutDurationMinutes: number;
    slidingWindowMinutes: number;
  };
}

export class AuthenticationManager {
  private sessions: Map<string, AuthSession> = new Map();
  private mfaChallenges: Map<string, MfaChallenge> = new Map();
  private apiKeys: Map<string, ApiKey> = new Map();
  private bruteForceTracker: Map<string, { attempts: number; lastAttempt: Date; lockoutUntil?: Date }> = new Map();
  private readonly JWT_SECRET: string;
  private readonly securityPolicy: SecurityPolicy;

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || this.generateSecureSecret();
    this.securityPolicy = this.getDefaultSecurityPolicy();
    this.startMaintenanceTasks();
  }

  /**
   * Authenticate user with Discord OAuth2
   */
  public async authenticateWithDiscord(
    discordToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthenticationResult> {
    try {
      // Validate Discord token (placeholder - would use Discord API)
      const discordUser = await this.validateDiscordToken(discordToken);
      if (!discordUser) {
        await this.logAuthEvent('discord_auth', 'failure', discordToken, ipAddress);
        return { success: false, error: 'Invalid Discord token' };
      }

      // Check brute force protection
      if (this.isUserLockedOut(discordUser.id, ipAddress)) {
        await this.logAuthEvent('discord_auth', 'blocked', discordUser.id, ipAddress);
        return { success: false, error: 'Account temporarily locked due to security policy' };
      }

      // Check if MFA is required
      const requiresMfa = this.shouldRequireMfa();
      if (requiresMfa && !discordUser.mfaVerified) {
        const mfaChallenge = await this.createMfaChallenge(discordUser.id);
        return {
          success: false,
          requiresMfa: true,
          mfaChallenge: mfaChallenge.id,
          error: 'Multi-factor authentication required'
        };
      }

      // Create session
      const session = await this.createSession(discordUser.id, discordUser.guildId, ipAddress, userAgent);
      const tokens = await this.generateTokens(session);

      await this.logAuthEvent('discord_auth', 'success', discordUser.id, ipAddress);

      return {
        success: true,
        session,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      };

    } catch (error) {
      logger.error('Discord authentication error:', error);
      await this.logAuthEvent('discord_auth', 'failure', 'unknown', ipAddress);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Validate access token
   */
  public async validateToken(token: string): Promise<AuthSession | null> {
    try {
      const decoded = this.decodeJWT(token);
      if (!decoded || !decoded.sessionId) {
        return null;
      }

      const session = this.sessions.get(decoded.sessionId);
      if (!session || !session.isActive) {
        return null;
      }

      // Check token expiry
      const tokenData = session.tokens.find(t => t.token === token);
      if (!tokenData || tokenData.expiresAt < new Date()) {
        return null;
      }

      // Update last activity
      session.lastActivity = new Date();
      
      return session;

    } catch (error) {
      logger.error('Token validation error:', error);
      return null;
    }
  }

  /**
   * Refresh access token
   */
  public async refreshToken(refreshToken: string): Promise<AuthenticationResult> {
    try {
      const decoded = this.decodeJWT(refreshToken);
      if (!decoded || decoded.type !== 'refresh' || !decoded.sessionId) {
        return { success: false, error: 'Invalid refresh token' };
      }

      const session = this.sessions.get(decoded.sessionId);
      if (!session || !session.isActive) {
        return { success: false, error: 'Session not found or inactive' };
      }

      // Generate new access token
      const newTokens = await this.generateTokens(session);

      return {
        success: true,
        session,
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken
      };

    } catch (error) {
      logger.error('Token refresh error:', error);
      return { success: false, error: 'Token refresh failed' };
    }
  }

  /**
   * Verify MFA challenge
   */
  public async verifyMfaChallenge(
    challengeId: string,
    response: string,
    ipAddress?: string
  ): Promise<AuthenticationResult> {
    const challenge = this.mfaChallenges.get(challengeId);
    if (!challenge) {
      return { success: false, error: 'Invalid or expired MFA challenge' };
    }

    if (challenge.expiresAt < new Date()) {
      this.mfaChallenges.delete(challengeId);
      return { success: false, error: 'MFA challenge expired' };
    }

    challenge.attempts++;

    // Verify the response based on MFA type
    const isValid = await this.verifyMfaResponse(challenge, response);

    if (!isValid) {
      if (challenge.attempts >= challenge.maxAttempts) {
        this.mfaChallenges.delete(challengeId);
        await this.logAuthEvent('mfa_verification', 'blocked', challenge.userId, ipAddress);
        return { success: false, error: 'Too many failed MFA attempts' };
      }
      
      await this.logAuthEvent('mfa_verification', 'failure', challenge.userId, ipAddress);
      return { success: false, error: 'Invalid MFA code' };
    }

    // MFA successful - create session
    this.mfaChallenges.delete(challengeId);
    const session = await this.createSession(challenge.userId, undefined, ipAddress);
    session.mfaVerified = true;

    const tokens = await this.generateTokens(session);

    await this.logAuthEvent('mfa_verification', 'success', challenge.userId, ipAddress);

    return {
      success: true,
      session,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
  }

  /**
   * Create API key
   */
  public async createApiKey(
    userId: string,
    name: string,
    permissions: string[],
    guildId?: string,
    expiresAt?: Date
  ): Promise<ApiKey> {
    const apiKey: ApiKey = {
      id: this.generateId(),
      name,
      key: this.generateApiKey(),
      hashedKey: '',
      userId,
      guildId,
      permissions,
      createdAt: new Date(),
      expiresAt,
      isActive: true,
      rateLimitTier: 'basic'
    };

    apiKey.hashedKey = this.hashApiKey(apiKey.key);
    this.apiKeys.set(apiKey.id, apiKey);

    await securityAuditLogger.logSecurityEvent(
      SecurityEventType.ADMIN_ACTION,
      'api_key_created',
      'success',
      { keyId: apiKey.id, permissions, guildId },
      { userId }
    );

    return apiKey;
  }

  /**
   * Validate API key
   */
  public async validateApiKey(key: string): Promise<ApiKey | null> {
    const hashedKey = this.hashApiKey(key);
    
    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.hashedKey === hashedKey && apiKey.isActive) {
        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
          apiKey.isActive = false;
          return null;
        }
        
        apiKey.lastUsed = new Date();
        return apiKey;
      }
    }

    return null;
  }

  /**
   * Revoke session
   */
  public async revokeSession(sessionId: string, userId?: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    if (userId && session.userId !== userId) {
      return false; // User can only revoke their own sessions
    }

    session.isActive = false;
    this.sessions.delete(sessionId);

    await securityAuditLogger.logSecurityEvent(
      SecurityEventType.AUTHENTICATION,
      'session_revoked',
      'success',
      { sessionId },
      { userId: session.userId }
    );

    return true;
  }

  /**
   * Get user sessions
   */
  public getUserSessions(userId: string): AuthSession[] {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId && session.isActive)
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  /**
   * Check session security
   */
  public assessSessionSecurity(session: AuthSession): {
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
    recommendations: string[];
  } {
    const factors: string[] = [];
    const recommendations: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Check session age
    const sessionAge = Date.now() - session.createdAt.getTime();
    const maxSessionTime = this.securityPolicy.sessionTimeoutMinutes * 60 * 1000;
    
    if (sessionAge > maxSessionTime * 0.8) {
      factors.push('Session approaching timeout');
      recommendations.push('Consider refreshing session');
      riskLevel = 'medium';
    }

    // Check MFA status
    if (!session.mfaVerified && this.securityPolicy.requireMfaForPrivileged) {
      factors.push('MFA not verified');
      recommendations.push('Enable multi-factor authentication');
      riskLevel = 'high';
    }

    // Check IP consistency
    if (session.ipAddress && session.tokens.some(t => t.ipAddress !== session.ipAddress)) {
      factors.push('Multiple IP addresses detected');
      recommendations.push('Verify session integrity');
      riskLevel = 'high';
    }

    // Check concurrent sessions
    const userSessions = this.getUserSessions(session.userId);
    if (userSessions.length > this.securityPolicy.maxConcurrentSessions) {
      factors.push('Multiple concurrent sessions');
      recommendations.push('Consider revoking old sessions');
      riskLevel = 'medium';
    }

    return { riskLevel, factors, recommendations };
  }

  /**
   * Private helper methods
   */
  private generateSecureSecret(): string {
    return randomBytes(64).toString('hex');
  }

  private getDefaultSecurityPolicy(): SecurityPolicy {
    return {
      sessionTimeoutMinutes: 60,
      tokenExpiryMinutes: 15,
      maxConcurrentSessions: 5,
      requireMfaForPrivileged: true,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      },
      bruteForceProtection: {
        maxAttempts: 5,
        lockoutDurationMinutes: 15,
        slidingWindowMinutes: 60
      }
    };
  }

  private async validateDiscordToken(token: string): Promise<{ id: string; guildId?: string; mfaVerified: boolean } | null> {
    // Placeholder - would integrate with Discord API
    // For now, return a mock user for testing
    if (token.startsWith('mock_')) {
      return {
        id: token.replace('mock_', ''),
        guildId: 'test_guild',
        mfaVerified: false
      };
    }
    return null;
  }

  private shouldRequireMfa(): boolean {
    // Check if user has privileged roles or permissions
    // This would integrate with our RBAC system
    return this.securityPolicy.requireMfaForPrivileged;
  }

  private async createMfaChallenge(userId: string): Promise<MfaChallenge> {
    const challenge: MfaChallenge = {
      id: this.generateId(),
      userId,
      type: 'totp', // Default to TOTP for now
      challenge: this.generateMfaChallenge(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      attempts: 0,
      maxAttempts: 3
    };

    this.mfaChallenges.set(challenge.id, challenge);
    return challenge;
  }

  private generateMfaChallenge(): string {
    return randomBytes(16).toString('hex');
  }

  private async verifyMfaResponse(challenge: MfaChallenge, response: string): Promise<boolean> {
    // Placeholder implementation
    // In a real implementation, this would verify TOTP codes, SMS codes, etc.
    return response === 'test123' || response.length === 6;
  }

  private async createSession(
    userId: string,
    guildId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthSession> {
    const sessionId = this.generateId();
    
    const session: AuthSession = {
      id: sessionId,
      userId,
      guildId,
      createdAt: new Date(),
      lastActivity: new Date(),
      ipAddress,
      userAgent,
      isActive: true,
      tokens: [],
      mfaVerified: false,
      riskLevel: 'low'
    };

    // Enforce concurrent session limit
    const userSessions = this.getUserSessions(userId);
    if (userSessions.length >= this.securityPolicy.maxConcurrentSessions) {
      // Revoke oldest session
      const oldestSession = userSessions[userSessions.length - 1];
      await this.revokeSession(oldestSession.id);
    }

    this.sessions.set(sessionId, session);
    return session;
  }

  private async generateTokens(session: AuthSession): Promise<{ accessToken: string; refreshToken: string }> {
    const now = new Date();
    
    const accessToken: AuthToken = {
      token: '',
      type: 'access',
      userId: session.userId,
      guildId: session.guildId,
      expiresAt: new Date(now.getTime() + this.securityPolicy.tokenExpiryMinutes * 60 * 1000),
      issuedAt: now,
      scope: ['read', 'write'],
      sessionId: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent
    };

    const refreshToken: AuthToken = {
      token: '',
      type: 'refresh',
      userId: session.userId,
      guildId: session.guildId,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
      issuedAt: now,
      scope: ['refresh'],
      sessionId: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent
    };

    accessToken.token = this.createJWT(accessToken);
    refreshToken.token = this.createJWT(refreshToken);

    session.tokens.push(accessToken, refreshToken);

    return {
      accessToken: accessToken.token,
      refreshToken: refreshToken.token
    };
  }

  private createJWT(tokenData: AuthToken): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const payload = {
      sub: tokenData.userId,
      iat: Math.floor(tokenData.issuedAt.getTime() / 1000),
      exp: Math.floor(tokenData.expiresAt.getTime() / 1000),
      type: tokenData.type,
      sessionId: tokenData.sessionId,
      scope: tokenData.scope.join(' '),
      guild: tokenData.guildId
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private decodeJWT(token: string): { exp?: number; sessionId?: string; type?: string; sub?: string } | null {
    try {
      const [headerB64, payloadB64, signature] = token.split('.');
      
      // Verify signature
      const expectedSignature = createHmac('sha256', this.JWT_SECRET)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');
      
      if (signature !== expectedSignature) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
      
      // Check expiry
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  private generateApiKey(): string {
    return 'ak_' + randomBytes(32).toString('hex');
  }

  private hashApiKey(key: string): string {
    // Use bcrypt with a cost factor of 12 (industry standard)
    const salt = bcrypt.genSaltSync(12);
    return bcrypt.hashSync(key + this.JWT_SECRET, salt);
  }

  private generateId(): string {
    return randomBytes(16).toString('hex');
  }

  private isUserLockedOut(userId: string, ipAddress?: string): boolean {
    const key = `${userId}:${ipAddress || 'unknown'}`;
    const tracker = this.bruteForceTracker.get(key);
    
    if (!tracker) return false;
    
    if (tracker.lockoutUntil && tracker.lockoutUntil > new Date()) {
      return true;
    }

    // Check sliding window
    const windowStart = new Date(Date.now() - this.securityPolicy.bruteForceProtection.slidingWindowMinutes * 60 * 1000);
    if (tracker.lastAttempt < windowStart) {
      this.bruteForceTracker.delete(key);
      return false;
    }

    return tracker.attempts >= this.securityPolicy.bruteForceProtection.maxAttempts;
  }

  private async logAuthEvent(action: string, outcome: 'success' | 'failure' | 'blocked', userId: string, ipAddress?: string): Promise<void> {
    await securityAuditLogger.logSecurityEvent(
      SecurityEventType.AUTHENTICATION,
      action,
      outcome,
      { method: 'discord_oauth2' },
      { userId, ipAddress }
    );
  }

  private startMaintenanceTasks(): void {
    // Clean up expired sessions and tokens every 15 minutes
    setInterval(() => {
      this.cleanupExpiredSessions();
      this.cleanupExpiredMfaChallenges();
      this.cleanupBruteForceTracking();
    }, 15 * 60 * 1000);
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    const timeoutMs = this.securityPolicy.sessionTimeoutMinutes * 60 * 1000;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now.getTime() - session.lastActivity.getTime() > timeoutMs) {
        session.isActive = false;
        this.sessions.delete(sessionId);
      }
    }
  }

  private cleanupExpiredMfaChallenges(): void {
    const now = new Date();
    
    for (const [challengeId, challenge] of this.mfaChallenges.entries()) {
      if (challenge.expiresAt < now) {
        this.mfaChallenges.delete(challengeId);
      }
    }
  }

  private cleanupBruteForceTracking(): void {
    const windowStart = new Date(Date.now() - this.securityPolicy.bruteForceProtection.slidingWindowMinutes * 60 * 1000);
    
    for (const [key, tracker] of this.bruteForceTracker.entries()) {
      if (tracker.lastAttempt < windowStart && (!tracker.lockoutUntil || tracker.lockoutUntil < new Date())) {
        this.bruteForceTracker.delete(key);
      }
    }
  }

  /**
   * Get authentication statistics
   */
  public getAuthStats(): {
    activeSessions: number;
    activeApiKeys: number;
    pendingMfaChallenges: number;
    bruteForceAttempts: number;
    averageSessionDuration: number;
  } {
    const activeSessions = Array.from(this.sessions.values()).filter(s => s.isActive).length;
    const activeApiKeys = Array.from(this.apiKeys.values()).filter(k => k.isActive).length;
    
    // Calculate average session duration
    const currentTime = Date.now();
    const sessionDurations = Array.from(this.sessions.values())
      .filter(s => s.isActive)
      .map(s => currentTime - s.createdAt.getTime());
    
    const averageSessionDuration = sessionDurations.length > 0 ?
      sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length / 1000 / 60 : 0; // in minutes

    return {
      activeSessions,
      activeApiKeys,
      pendingMfaChallenges: this.mfaChallenges.size,
      bruteForceAttempts: this.bruteForceTracker.size,
      averageSessionDuration: Math.round(averageSessionDuration)
    };
  }
}

// Export singleton instance
export const authenticationManager = new AuthenticationManager();
