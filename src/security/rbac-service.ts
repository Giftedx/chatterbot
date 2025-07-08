/**
 * Cycle 10: Role-Based Access Control (RBAC) Service
 * 
 * Provides comprehensive permission management and role-based access control
 * for enterprise-grade Discord bot security.
 */

import { GuildMember } from 'discord.js';
import { logger } from '../utils/logger.js';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  level: number; // 0-100, higher = more privileged
}

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  inherits?: string[]; // Role inheritance
  priority: number;
  isSystem: boolean;
}

export interface PermissionContext {
  guildId?: string;
  channelId?: string;
  userId: string;
  command?: string;
  resource?: string;
  metadata?: Record<string, unknown>;
}

export interface AccessControlRule {
  id: string;
  name: string;
  condition: (context: PermissionContext) => boolean;
  action: 'allow' | 'deny' | 'require_mfa';
  priority: number;
  description: string;
}

export class RoleBasedAccessControl {
  private permissions: Map<string, Permission> = new Map();
  private roles: Map<string, RoleDefinition> = new Map();
  private userRoles: Map<string, Set<string>> = new Map(); // userId -> roleIds
  private accessRules: AccessControlRule[] = [];
  private permissionCache: Map<string, boolean> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps: Map<string, number> = new Map();

  constructor() {
    this.initializeDefaultPermissions();
    this.initializeDefaultRoles();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default permission definitions
   */
  private initializeDefaultPermissions(): void {
    const defaultPermissions: Permission[] = [
      // Basic permissions
      { id: 'basic.chat', name: 'Chat', description: 'Send messages in chat', category: 'basic', level: 10 },
      { id: 'basic.view', name: 'View', description: 'View channel content', category: 'basic', level: 5 },
      
      // Command permissions
      { id: 'commands.basic', name: 'Basic Commands', description: 'Use basic bot commands', category: 'commands', level: 20 },
      { id: 'commands.advanced', name: 'Advanced Commands', description: 'Use advanced bot features', category: 'commands', level: 40 },
      { id: 'commands.admin', name: 'Admin Commands', description: 'Use administrative commands', category: 'commands', level: 80 },
      
      // AI permissions
      { id: 'ai.query', name: 'AI Query', description: 'Make AI requests', category: 'ai', level: 30 },
      { id: 'ai.multimodal', name: 'Multimodal AI', description: 'Use image/audio AI features', category: 'ai', level: 40 },
      { id: 'ai.advanced', name: 'Advanced AI', description: 'Use advanced AI features', category: 'ai', level: 60 },
      
      // Moderation permissions
      { id: 'mod.warn', name: 'Warn Users', description: 'Issue warnings to users', category: 'moderation', level: 50 },
      { id: 'mod.mute', name: 'Mute Users', description: 'Mute/timeout users', category: 'moderation', level: 60 },
      { id: 'mod.kick', name: 'Kick Users', description: 'Kick users from server', category: 'moderation', level: 70 },
      { id: 'mod.ban', name: 'Ban Users', description: 'Ban users from server', category: 'moderation', level: 80 },
      
      // Analytics permissions
      { id: 'analytics.view', name: 'View Analytics', description: 'View bot analytics', category: 'analytics', level: 50 },
      { id: 'analytics.export', name: 'Export Data', description: 'Export analytics data', category: 'analytics', level: 60 },
      { id: 'analytics.admin', name: 'Analytics Admin', description: 'Manage analytics settings', category: 'analytics', level: 70 },
      
      // System permissions
      { id: 'system.config', name: 'System Config', description: 'Modify system configuration', category: 'system', level: 90 },
      { id: 'system.security', name: 'Security Admin', description: 'Manage security settings', category: 'system', level: 95 },
      { id: 'system.root', name: 'Root Access', description: 'Full system access', category: 'system', level: 100 }
    ];

    defaultPermissions.forEach(permission => {
      this.permissions.set(permission.id, permission);
    });

    logger.info(`Initialized ${defaultPermissions.length} default permissions`);
  }

  /**
   * Initialize default role definitions
   */
  private initializeDefaultRoles(): void {
    const defaultRoles: RoleDefinition[] = [
      {
        id: 'guest',
        name: 'Guest',
        description: 'Basic access for new users',
        permissions: ['basic.view'],
        priority: 10,
        isSystem: true
      },
      {
        id: 'member',
        name: 'Member',
        description: 'Standard server member',
        permissions: ['basic.chat', 'basic.view', 'commands.basic', 'ai.query'],
        inherits: ['guest'],
        priority: 20,
        isSystem: true
      },
      {
        id: 'trusted',
        name: 'Trusted Member',
        description: 'Trusted community member',
        permissions: ['commands.advanced', 'ai.multimodal'],
        inherits: ['member'],
        priority: 30,
        isSystem: true
      },
      {
        id: 'moderator',
        name: 'Moderator',
        description: 'Community moderator',
        permissions: [
          'mod.warn', 'mod.mute', 'mod.kick',
          'analytics.view', 'ai.advanced'
        ],
        inherits: ['trusted'],
        priority: 50,
        isSystem: true
      },
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Server administrator',
        permissions: [
          'mod.ban', 'commands.admin', 'analytics.export',
          'analytics.admin', 'system.config'
        ],
        inherits: ['moderator'],
        priority: 80,
        isSystem: true
      },
      {
        id: 'owner',
        name: 'Owner',
        description: 'Server owner with full access',
        permissions: ['system.security', 'system.root'],
        inherits: ['admin'],
        priority: 100,
        isSystem: true
      }
    ];

    defaultRoles.forEach(role => {
      this.roles.set(role.id, role);
    });

    logger.info(`Initialized ${defaultRoles.length} default roles`);
  }

  /**
   * Initialize default access control rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: AccessControlRule[] = [
      {
        id: 'rate_limit_protection',
        name: 'Rate Limit Protection',
        condition: () => {
          // This would integrate with our rate limiter from Cycle 8
          return false; // Placeholder - would check actual rate limits
        },
        action: 'deny',
        priority: 100,
        description: 'Deny access when rate limits are exceeded'
      },
      {
        id: 'maintenance_mode',
        name: 'Maintenance Mode',
        condition: () => {
          // Check if system is in maintenance mode
          return false; // Placeholder
        },
        action: 'deny',
        priority: 90,
        description: 'Deny access during maintenance (except owners)'
      },
      {
        id: 'sensitive_commands_mfa',
        name: 'Sensitive Commands MFA',
        condition: (context) => {
          const sensitiveCommands = ['ban', 'system-config', 'security-admin'];
          return sensitiveCommands.some(cmd => context.command?.includes(cmd));
        },
        action: 'require_mfa',
        priority: 80,
        description: 'Require MFA for sensitive commands'
      }
    ];

    this.accessRules = defaultRules.sort((a, b) => b.priority - a.priority);
    logger.info(`Initialized ${defaultRules.length} access control rules`);
  }

  /**
   * Check if user has specific permission
   */
  public async hasPermission(
    userId: string, 
    permissionId: string, 
    context: Partial<PermissionContext> = {}
  ): Promise<boolean> {
    const fullContext: PermissionContext = {
      userId,
      ...context
    };

    // Check cache first
    const cacheKey = `${userId}:${permissionId}:${JSON.stringify(context)}`;
    const cachedResult = this.getCachedPermission(cacheKey);
    if (cachedResult !== null) {
      return cachedResult;
    }

    try {
      // Apply access control rules first
      const ruleResult = this.evaluateAccessRules(fullContext);
      if (ruleResult === 'deny') {
        this.setCachedPermission(cacheKey, false);
        return false;
      }

      // Get user's effective permissions
      const userPermissions = await this.getUserEffectivePermissions(userId);
      const hasPermission = userPermissions.has(permissionId);

      // Cache the result
      this.setCachedPermission(cacheKey, hasPermission);

      logger.debug(`Permission check: ${userId} -> ${permissionId} = ${hasPermission}`);
      return hasPermission;

    } catch (error) {
      logger.error('Error checking permission:', error);
      return false; // Fail secure
    }
  }

  /**
   * Get user's effective permissions (including inherited)
   */
  public async getUserEffectivePermissions(userId: string): Promise<Set<string>> {
    const effectivePermissions = new Set<string>();
    const userRoleIds = this.userRoles.get(userId) || new Set();

    // Process each role and its inheritance chain
    for (const roleId of userRoleIds) {
      const rolePermissions = this.getRolePermissionsRecursive(roleId);
      rolePermissions.forEach(permission => effectivePermissions.add(permission));
    }

    return effectivePermissions;
  }

  /**
   * Get role permissions including inherited permissions
   */
  private getRolePermissionsRecursive(roleId: string, visited = new Set<string>()): Set<string> {
    // Prevent circular inheritance
    if (visited.has(roleId)) {
      return new Set();
    }
    visited.add(roleId);

    const role = this.roles.get(roleId);
    if (!role) {
      return new Set();
    }

    const permissions = new Set(role.permissions);

    // Add inherited permissions
    if (role.inherits) {
      for (const inheritedRoleId of role.inherits) {
        const inheritedPermissions = this.getRolePermissionsRecursive(inheritedRoleId, visited);
        inheritedPermissions.forEach(permission => permissions.add(permission));
      }
    }

    return permissions;
  }

  /**
   * Assign role to user
   */
  public assignRole(userId: string, roleId: string): boolean {
    if (!this.roles.has(roleId)) {
      logger.warn(`Attempted to assign non-existent role: ${roleId}`);
      return false;
    }

    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, new Set());
    }

    const userRoleSet = this.userRoles.get(userId)!;
    userRoleSet.add(roleId);

    // Clear permission cache for this user
    this.clearUserPermissionCache(userId);

    logger.info(`Assigned role ${roleId} to user ${userId}`);
    return true;
  }

  /**
   * Remove role from user
   */
  public removeRole(userId: string, roleId: string): boolean {
    const userRoleSet = this.userRoles.get(userId);
    if (!userRoleSet || !userRoleSet.has(roleId)) {
      return false;
    }

    userRoleSet.delete(roleId);
    if (userRoleSet.size === 0) {
      this.userRoles.delete(userId);
    }

    // Clear permission cache for this user
    this.clearUserPermissionCache(userId);

    logger.info(`Removed role ${roleId} from user ${userId}`);
    return true;
  }

  /**
   * Sync user roles with Discord roles
   */
  public async syncDiscordRoles(member: GuildMember): Promise<void> {
    const userId = member.id;
    
    // Map Discord roles to our roles
    const discordRoles = member.roles.cache;
    const mappedRoles = new Set<string>();

    // Basic role mapping logic (this could be more sophisticated)
    if (member.permissions.has('Administrator')) {
      mappedRoles.add('admin');
    } else if (member.permissions.has('ManageMessages')) {
      mappedRoles.add('moderator');
    } else if (discordRoles.size > 1) { // Has roles beyond @everyone
      mappedRoles.add('trusted');
    } else {
      mappedRoles.add('member');
    }

    // Update user roles
    this.userRoles.set(userId, mappedRoles);
    this.clearUserPermissionCache(userId);

    logger.debug(`Synced Discord roles for ${userId}: ${Array.from(mappedRoles).join(', ')}`);
  }

  /**
   * Ensure user has at least member role (called when user first interacts)
   */
  public ensureUserHasDefaultRole(userId: string): void {
    if (!this.userRoles.has(userId)) {
      // Assign member role by default
      this.assignRole(userId, 'member');
      logger.debug(`Assigned default member role to user ${userId}`);
    }
  }

  /**
   * Evaluate access control rules
   */
  private evaluateAccessRules(context: PermissionContext): 'allow' | 'deny' | 'require_mfa' | null {
    for (const rule of this.accessRules) {
      if (rule.condition(context)) {
        logger.debug(`Access rule triggered: ${rule.name} -> ${rule.action}`);
        return rule.action;
      }
    }
    return null; // No rules matched
  }

  /**
   * Cache management
   */
  private getCachedPermission(key: string): boolean | null {
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp || Date.now() - timestamp > this.CACHE_TTL) {
      return null;
    }
    return this.permissionCache.get(key) || null;
  }

  private setCachedPermission(key: string, value: boolean): void {
    this.permissionCache.set(key, value);
    this.cacheTimestamps.set(key, Date.now());
  }

  private clearUserPermissionCache(userId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.permissionCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => {
      this.permissionCache.delete(key);
      this.cacheTimestamps.delete(key);
    });
  }

  /**
   * Get permission statistics
   */
  public getPermissionStats(): {
    totalPermissions: number;
    totalRoles: number;
    activeUsers: number;
    cacheHitRate: number;
  } {
    return {
      totalPermissions: this.permissions.size,
      totalRoles: this.roles.size,
      activeUsers: this.userRoles.size,
      cacheHitRate: this.permissionCache.size > 0 ? 
        (this.permissionCache.size / (this.permissionCache.size + 100)) : 0 // Rough estimate
    };
  }

  /**
   * Export security configuration
   */
  public exportSecurityConfig(): {
    permissions: Permission[];
    roles: RoleDefinition[];
    rules: AccessControlRule[];
  } {
    return {
      permissions: Array.from(this.permissions.values()),
      roles: Array.from(this.roles.values()),
      rules: this.accessRules
    };
  }
}

// Export singleton instance
export const rbacService = new RoleBasedAccessControl();
