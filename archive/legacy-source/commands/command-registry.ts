/**
 * Cycle 11: Dynamic Command Registry
 * 
 * Advanced slash command management system with dynamic registration,
 * RBAC integration, and comprehensive command lifecycle management.
 */

import { REST, Routes, SlashCommandBuilder, CommandInteraction, SlashCommandOptionsOnlyBuilder } from 'discord.js';
import { logger } from '../utils/logger.js';
import { rbacService } from '../security/rbac-service.js';
import { securityAuditLogger, SecurityEventType } from '../security/audit-logger.js';
import { CacheService } from '../services/cache.service.js';

export interface CommandDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  category: CommandCategory;
  permissions: string[];
  parameters: CommandParameter[];
  examples: CommandExample[];
  metadata: CommandMetadata;
  handler: CommandHandler;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommandParameter {
  name: string;
  description: string;
  type: ParameterType;
  required: boolean;
  choices?: ParameterChoice[];
  autocomplete?: boolean;
  validation?: ParameterValidation;
  defaultValue?: unknown;
}

export interface ParameterChoice {
  name: string;
  value: string | number;
}

export interface ParameterValidation {
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: RegExp;
  customValidator?: (value: unknown) => boolean | string;
}

export interface CommandExample {
  description: string;
  command: string;
  expectedResult: string;
}

export interface CommandMetadata {
  author: string;
  source: CommandSource;
  tags: string[];
  usageCount: number;
  lastUsed?: Date;
  averageExecutionTime: number;
  successRate: number;
  ratingAverage: number;
  ratingCount: number;
  isExperimental: boolean;
  deprecationWarning?: string;
}

export enum CommandCategory {
  AI = 'ai',
  UTILITY = 'utility',
  MODERATION = 'moderation',
  ANALYTICS = 'analytics',
  ADMINISTRATION = 'administration',
  ENTERTAINMENT = 'entertainment',
  PRODUCTIVITY = 'productivity',
  INTEGRATION = 'integration',
  DEVELOPMENT = 'development',
  CUSTOM = 'custom'
}

export enum ParameterType {
  STRING = 'string',
  INTEGER = 'integer',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  USER = 'user',
  CHANNEL = 'channel',
  ROLE = 'role',
  ATTACHMENT = 'attachment',
  MENTIONABLE = 'mentionable'
}

export enum CommandSource {
  CORE = 'core',
  PLUGIN = 'plugin',
  CUSTOM = 'custom',
  MARKETPLACE = 'marketplace',
  COMMUNITY = 'community'
}

export type CommandHandler = (interaction: CommandInteraction, parameters: Record<string, unknown>) => Promise<CommandResult>;

export interface CommandResult {
  success: boolean;
  response?: string;
  embed?: unknown;
  files?: unknown[];
  ephemeral?: boolean;
  followUp?: string;
  error?: string;
  executionTime: number;
  metadata?: Record<string, unknown>;
}

export interface CommandRegistrationResult {
  success: boolean;
  commandId?: string;
  discordCommandId?: string;
  error?: string;
  warnings?: string[];
}

export class DynamicCommandRegistry {
  private commands: Map<string, CommandDefinition> = new Map();
  private discordCommands: Map<string, string> = new Map(); // commandId -> discordCommandId
  private commandAliases: Map<string, string> = new Map(); // alias -> commandId
  private categoryCommands: Map<CommandCategory, Set<string>> = new Map();
  private rest: REST;
  private cacheService: CacheService;
  private readonly CACHE_PREFIX = 'cmd_registry:';
  private readonly DISCORD_CACHE_TTL = 3600; // 1 hour

  constructor(discordToken: string) {
    this.rest = new REST({ version: '10' }).setToken(discordToken);
    this.cacheService = new CacheService({
      maxSize: 1000,
      maxMemory: 10 * 1024 * 1024, // 10MB
      defaultTtl: this.DISCORD_CACHE_TTL * 1000, // Convert to milliseconds
      enableMetrics: true
    });
    this.initializeCategoryMaps();
    this.loadPersistedCommands();
  }

  /**
   * Register a new command with Discord and internal registry
   */
  public async registerCommand(
    definition: Omit<CommandDefinition, 'id' | 'createdAt' | 'updatedAt'>,
    guildId?: string
  ): Promise<CommandRegistrationResult> {
    try {
      // Validate command definition
      const validation = this.validateCommandDefinition(definition);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Check permissions for registration
      const canRegister = await this.checkRegistrationPermissions();
      if (!canRegister.allowed) {
        return { success: false, error: canRegister.reason };
      }

      // Create full command definition
      const commandId = this.generateCommandId(definition.name);
      const fullDefinition: CommandDefinition = {
        ...definition,
        id: commandId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Build Discord slash command
      const slashCommand = await this.buildSlashCommand(fullDefinition);

      // Register with Discord
      const discordResult = await this.registerWithDiscord(slashCommand, guildId);
      if (!discordResult.success) {
        return discordResult;
      }

      // Store in internal registry
      this.commands.set(commandId, fullDefinition);
      this.discordCommands.set(commandId, discordResult.discordCommandId!);
      this.updateCategoryMap(fullDefinition);
      await this.persistCommand(fullDefinition);

      // Log registration event
      await securityAuditLogger.logSecurityEvent(
        SecurityEventType.ADMIN_ACTION,
        'command_registered',
        'success',
        {
          commandId,
          commandName: definition.name,
          category: definition.category,
          permissions: definition.permissions,
          guildId
        },
        { userId: definition.metadata.author }
      );

      logger.info(`Command registered successfully: ${definition.name} (${commandId})`);

      return {
        success: true,
        commandId,
        discordCommandId: discordResult.discordCommandId,
        warnings: validation.warnings
      };

    } catch (error) {
      logger.error('Command registration failed:', error);
      return { success: false, error: 'Registration failed due to internal error' };
    }
  }

  /**
   * Unregister a command
   */
  public async unregisterCommand(commandId: string, guildId?: string): Promise<boolean> {
    try {
      const command = this.commands.get(commandId);
      if (!command) {
        return false;
      }

      const discordCommandId = this.discordCommands.get(commandId);
      if (discordCommandId) {
        await this.unregisterFromDiscord(discordCommandId, guildId);
      }

      // Remove from internal registry
      this.commands.delete(commandId);
      this.discordCommands.delete(commandId);
      this.removeCategoryMapping(command);
      await this.removePersistedCommand(commandId);

      // Log unregistration event
      await securityAuditLogger.logSecurityEvent(
        SecurityEventType.ADMIN_ACTION,
        'command_unregistered',
        'success',
        {
          commandId,
          commandName: command.name,
          category: command.category,
          guildId
        }
      );

      logger.info(`Command unregistered: ${command.name} (${commandId})`);
      return true;

    } catch (error) {
      logger.error('Command unregistration failed:', error);
      return false;
    }
  }

  /**
   * Execute a command with permission checking
   */
  public async executeCommand(
    interaction: CommandInteraction,
    commandName: string
  ): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      // Find command
      const command = this.findCommand(commandName);
      if (!command) {
        return {
          success: false,
          error: 'Command not found',
          executionTime: Date.now() - startTime
        };
      }

      // Check if command is active
      if (!command.isActive) {
        return {
          success: false,
          error: 'Command is currently disabled',
          executionTime: Date.now() - startTime
        };
      }

      // Check permissions
      const hasPermission = await this.checkCommandPermissions(interaction, command);
      if (!hasPermission.allowed) {
        // Log unauthorized access attempt
        await securityAuditLogger.logSecurityEvent(
          SecurityEventType.AUTHORIZATION,
          'command_access_denied',
          'blocked',
          {
            commandId: command.id,
            commandName: command.name,
            requiredPermissions: command.permissions,
            reason: hasPermission.reason
          },
          {
            userId: interaction.user.id,
            guildId: interaction.guildId || undefined
          }
        );

        return {
          success: false,
          error: hasPermission.reason || 'Insufficient permissions',
          executionTime: Date.now() - startTime
        };
      }

      // Parse and validate parameters
      const parameters = await this.parseCommandParameters(interaction, command);
      if (!parameters.valid) {
        return {
          success: false,
          error: parameters.error || 'Invalid parameters',
          executionTime: Date.now() - startTime
        };
      }

      // Execute command
      const result = await command.handler(interaction, parameters.data);
      result.executionTime = Date.now() - startTime;

      // Update command metadata
      await this.updateCommandUsage(command, result);

      // Log successful execution
      await securityAuditLogger.logSecurityEvent(
        SecurityEventType.DATA_ACCESS,
        'command_executed',
        result.success ? 'success' : 'failure',
        {
          commandId: command.id,
          commandName: command.name,
          executionTime: result.executionTime,
          parameters: Object.keys(parameters.data)
        },
        {
          userId: interaction.user.id,
          guildId: interaction.guildId || undefined
        }
      );

      return result;

    } catch (error) {
      logger.error('Command execution failed:', error);
      
      return {
        success: false,
        error: 'Command execution failed',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get command by ID or name
   */
  public getCommand(identifier: string): CommandDefinition | null {
    // Try by ID first
    if (this.commands.has(identifier)) {
      return this.commands.get(identifier)!;
    }

    // Try by name
    for (const command of this.commands.values()) {
      if (command.name === identifier) {
        return command;
      }
    }

    // Try by alias
    const aliasedId = this.commandAliases.get(identifier);
    if (aliasedId) {
      return this.commands.get(aliasedId) || null;
    }

    return null;
  }

  /**
   * List commands with filtering options
   */
  public listCommands(options: {
    category?: CommandCategory;
    source?: CommandSource;
    active?: boolean;
    permissions?: string[];
    userId?: string;
    search?: string;
  } = {}): CommandDefinition[] {
    let commands = Array.from(this.commands.values());

    // Apply filters
    if (options.category) {
      commands = commands.filter(cmd => cmd.category === options.category);
    }

    if (options.source) {
      commands = commands.filter(cmd => cmd.metadata.source === options.source);
    }

    if (options.active !== undefined) {
      commands = commands.filter(cmd => cmd.isActive === options.active);
    }

    if (options.search) {
      const searchLower = options.search.toLowerCase();
      commands = commands.filter(cmd =>
        cmd.name.toLowerCase().includes(searchLower) ||
        cmd.description.toLowerCase().includes(searchLower) ||
        cmd.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Filter by permissions if userId provided
    if (options.userId && options.permissions) {
      commands = commands.filter(async cmd => {
        for (const permission of cmd.permissions) {
          const hasPermission = await rbacService.hasPermission(options.userId!, permission);
          if (!hasPermission) return false;
        }
        return true;
      });
    }

    return commands.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Update command definition
   */
  public async updateCommand(
    commandId: string,
    updates: Partial<Omit<CommandDefinition, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<boolean> {
    try {
      const existingCommand = this.commands.get(commandId);
      if (!existingCommand) {
        return false;
      }

      const updatedCommand: CommandDefinition = {
        ...existingCommand,
        ...updates,
        updatedAt: new Date()
      };

      // Validate updated command
      const validation = this.validateCommandDefinition(updatedCommand);
      if (!validation.isValid) {
        logger.warn(`Command update validation failed: ${validation.error}`);
        return false;
      }

      // Update Discord command if structural changes
      if (this.hasStructuralChanges(existingCommand, updatedCommand)) {
        const slashCommand = await this.buildSlashCommand(updatedCommand);
        const discordCommandId = this.discordCommands.get(commandId);
        if (discordCommandId) {
          await this.updateDiscordCommand(slashCommand, discordCommandId);
        }
      }

      // Update internal registry
      this.commands.set(commandId, updatedCommand);
      this.updateCategoryMap(updatedCommand);
      await this.persistCommand(updatedCommand);

      // Log update event
      await securityAuditLogger.logSecurityEvent(
        SecurityEventType.ADMIN_ACTION,
        'command_updated',
        'success',
        {
          commandId,
          commandName: updatedCommand.name,
          changes: Object.keys(updates)
        }
      );

      return true;

    } catch (error) {
      logger.error('Command update failed:', error);
      return false;
    }
  }

  /**
   * Get command statistics
   */
  public getCommandStats(): {
    totalCommands: number;
    activeCommands: number;
    commandsByCategory: Record<CommandCategory, number>;
    commandsBySource: Record<CommandSource, number>;
    averageExecutionTime: number;
    totalUsage: number;
    averageSuccessRate: number;
  } {
    const commands = Array.from(this.commands.values());
    const activeCommands = commands.filter(cmd => cmd.isActive);

    const commandsByCategory = {} as Record<CommandCategory, number>;
    const commandsBySource = {} as Record<CommandSource, number>;

    Object.values(CommandCategory).forEach(category => {
      commandsByCategory[category] = commands.filter(cmd => cmd.category === category).length;
    });

    Object.values(CommandSource).forEach(source => {
      commandsBySource[source] = commands.filter(cmd => cmd.metadata.source === source).length;
    });

    const totalUsage = commands.reduce((sum, cmd) => sum + cmd.metadata.usageCount, 0);
    const averageExecutionTime = commands.length > 0 ?
      commands.reduce((sum, cmd) => sum + cmd.metadata.averageExecutionTime, 0) / commands.length : 0;
    const averageSuccessRate = commands.length > 0 ?
      commands.reduce((sum, cmd) => sum + cmd.metadata.successRate, 0) / commands.length : 0;

    return {
      totalCommands: commands.length,
      activeCommands: activeCommands.length,
      commandsByCategory,
      commandsBySource,
      averageExecutionTime: Math.round(averageExecutionTime),
      totalUsage,
      averageSuccessRate: Math.round(averageSuccessRate * 100) / 100
    };
  }

  /**
   * Private helper methods
   */
  private initializeCategoryMaps(): void {
    Object.values(CommandCategory).forEach(category => {
      this.categoryCommands.set(category, new Set());
    });
  }

  private async loadPersistedCommands(): Promise<void> {
    try {
      const commandIds = await this.cacheService.get<string[]>(`${this.CACHE_PREFIX}command_list`) || [];
      
      for (const commandId of commandIds) {
        const command = await this.cacheService.get<CommandDefinition>(`${this.CACHE_PREFIX}${commandId}`);
        if (command) {
          this.commands.set(commandId, command);
          this.updateCategoryMap(command);
        }
      }

      logger.info(`Loaded ${commandIds.length} persisted commands`);
    } catch (error) {
      logger.error('Failed to load persisted commands:', error);
    }
  }

  private async persistCommand(command: CommandDefinition): Promise<void> {
    try {
      await this.cacheService.set(`${this.CACHE_PREFIX}${command.id}`, command);
      
      const commandIds = await this.cacheService.get<string[]>(`${this.CACHE_PREFIX}command_list`) || [];
      if (!commandIds.includes(command.id)) {
        commandIds.push(command.id);
        await this.cacheService.set(`${this.CACHE_PREFIX}command_list`, commandIds);
      }
    } catch (error) {
      logger.error('Failed to persist command:', error);
    }
  }

  private async removePersistedCommand(commandId: string): Promise<void> {
    try {
      await this.cacheService.delete(`${this.CACHE_PREFIX}${commandId}`);
      
      const commandIds = await this.cacheService.get<string[]>(`${this.CACHE_PREFIX}command_list`) || [];
      const updatedIds = commandIds.filter((id: string) => id !== commandId);
      await this.cacheService.set(`${this.CACHE_PREFIX}command_list`, updatedIds);
    } catch (error) {
      logger.error('Failed to remove persisted command:', error);
    }
  }

  private validateCommandDefinition(definition: Partial<CommandDefinition>): {
    isValid: boolean;
    error?: string;
    warnings?: string[];
  } {
    const warnings: string[] = [];

    if (!definition.name || definition.name.length < 1 || definition.name.length > 32) {
      return { isValid: false, error: 'Command name must be 1-32 characters' };
    }

    if (!/^[a-z0-9_-]+$/.test(definition.name)) {
      return { isValid: false, error: 'Command name must contain only lowercase letters, numbers, hyphens, and underscores' };
    }

    if (!definition.description || definition.description.length < 1 || definition.description.length > 100) {
      return { isValid: false, error: 'Command description must be 1-100 characters' };
    }

    if (definition.parameters && definition.parameters.length > 25) {
      return { isValid: false, error: 'Commands cannot have more than 25 parameters' };
    }

    if (definition.metadata?.isExperimental) {
      warnings.push('Command marked as experimental - use with caution');
    }

    return { isValid: true, warnings };
  }

  private async checkRegistrationPermissions(): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    // For now, allow all registrations (would integrate with RBAC in real implementation)
    return { allowed: true };
  }

  private getCategoryPermission(category: CommandCategory): string {
    const permissionMap: Record<CommandCategory, string> = {
      [CommandCategory.AI]: 'commands.ai.register',
      [CommandCategory.MODERATION]: 'commands.moderation.register',
      [CommandCategory.ADMINISTRATION]: 'commands.admin.register',
      [CommandCategory.ANALYTICS]: 'commands.analytics.register',
      [CommandCategory.UTILITY]: 'commands.basic.register',
      [CommandCategory.ENTERTAINMENT]: 'commands.basic.register',
      [CommandCategory.PRODUCTIVITY]: 'commands.basic.register',
      [CommandCategory.INTEGRATION]: 'commands.integration.register',
      [CommandCategory.DEVELOPMENT]: 'commands.development.register',
      [CommandCategory.CUSTOM]: 'commands.custom.register'
    };

    return permissionMap[category] || 'commands.basic.register';
  }

  private generateCommandId(name: string): string {
    return `cmd_${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateCategoryMap(command: CommandDefinition): void {
    const categorySet = this.categoryCommands.get(command.category);
    if (categorySet) {
      categorySet.add(command.id);
    }
  }

  private removeCategoryMapping(command: CommandDefinition): void {
    const categorySet = this.categoryCommands.get(command.category);
    if (categorySet) {
      categorySet.delete(command.id);
    }
  }

  private async buildSlashCommand(command: CommandDefinition): Promise<SlashCommandOptionsOnlyBuilder> {
    const builder = new SlashCommandBuilder()
      .setName(command.name)
      .setDescription(command.description);

    // Add parameters
    for (const param of command.parameters) {
      this.addParameterToBuilder(builder, param);
    }

    return builder;
  }

  private addParameterToBuilder(builder: SlashCommandBuilder, param: CommandParameter): void {
    switch (param.type) {
      case ParameterType.STRING:
        builder.addStringOption(option => {
          option.setName(param.name).setDescription(param.description).setRequired(param.required);
          if (param.choices) {
            option.addChoices(...param.choices.map(choice => ({ name: choice.name, value: choice.value as string })));
          }
          return option;
        });
        break;
      case ParameterType.INTEGER:
        builder.addIntegerOption(option => {
          option.setName(param.name).setDescription(param.description).setRequired(param.required);
          if (param.choices) {
            option.addChoices(...param.choices.map(choice => ({ name: choice.name, value: choice.value as number })));
          }
          return option;
        });
        break;
      case ParameterType.BOOLEAN:
        builder.addBooleanOption(option =>
          option.setName(param.name).setDescription(param.description).setRequired(param.required)
        );
        break;
      case ParameterType.USER:
        builder.addUserOption(option =>
          option.setName(param.name).setDescription(param.description).setRequired(param.required)
        );
        break;
      case ParameterType.CHANNEL:
        builder.addChannelOption(option =>
          option.setName(param.name).setDescription(param.description).setRequired(param.required)
        );
        break;
      case ParameterType.ROLE:
        builder.addRoleOption(option =>
          option.setName(param.name).setDescription(param.description).setRequired(param.required)
        );
        break;
      case ParameterType.ATTACHMENT:
        builder.addAttachmentOption(option =>
          option.setName(param.name).setDescription(param.description).setRequired(param.required)
        );
        break;
    }
  }

  private async registerWithDiscord(
    command: SlashCommandOptionsOnlyBuilder,
    guildId?: string
  ): Promise<{ success: boolean; discordCommandId?: string; error?: string }> {
    try {
      const route = guildId 
        ? Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, guildId)
        : Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!);

      const result = await this.rest.post(route, { body: command.toJSON() }) as { id: string };

      return { success: true, discordCommandId: result.id };
    } catch (error) {
      logger.error('Discord command registration failed:', error);
      return { success: false, error: 'Discord API registration failed' };
    }
  }

  private async unregisterFromDiscord(discordCommandId: string, guildId?: string): Promise<void> {
    try {
      const route = guildId
        ? Routes.applicationGuildCommand(process.env.DISCORD_CLIENT_ID!, guildId, discordCommandId)
        : Routes.applicationCommand(process.env.DISCORD_CLIENT_ID!, discordCommandId);

      await this.rest.delete(route);
    } catch (error) {
      logger.error('Discord command unregistration failed:', error);
    }
  }

  private async updateDiscordCommand(
    command: SlashCommandOptionsOnlyBuilder,
    discordCommandId: string,
    guildId?: string
  ): Promise<void> {
    try {
      const route = guildId
        ? Routes.applicationGuildCommand(process.env.DISCORD_CLIENT_ID!, guildId, discordCommandId)
        : Routes.applicationCommand(process.env.DISCORD_CLIENT_ID!, discordCommandId);

      await this.rest.patch(route, { body: command.toJSON() });
    } catch (error) {
      logger.error('Discord command update failed:', error);
    }
  }

  private findCommand(name: string): CommandDefinition | null {
    return this.getCommand(name);
  }

  private async checkCommandPermissions(
    interaction: CommandInteraction,
    command: CommandDefinition
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check each required permission
    for (const permission of command.permissions) {
      const hasPermission = await rbacService.hasPermission(
        interaction.user.id,
        permission,
        {
          guildId: interaction.guildId || undefined,
          channelId: interaction.channelId,
          command: command.name
        }
      );

      if (!hasPermission) {
        return {
          allowed: false,
          reason: `Missing required permission: ${permission}`
        };
      }
    }

    return { allowed: true };
  }

  private async parseCommandParameters(
    interaction: CommandInteraction,
    command: CommandDefinition
  ): Promise<{ valid: boolean; data: Record<string, unknown>; error?: string }> {
    const parameters: Record<string, unknown> = {};

    for (const param of command.parameters) {
      // Check if interaction is a chat input command
      if (!interaction.isChatInputCommand()) {
        return {
          valid: false,
          error: 'Command must be a chat input command',
          data: {}
        };
      }

      const value = interaction.options.get(param.name)?.value;

      if (param.required && (value === undefined || value === null)) {
        return {
          valid: false,
          error: `Missing required parameter: ${param.name}`,
          data: {}
        };
      }

      if (value !== undefined && value !== null) {
        // Validate parameter
        const validation = this.validateParameter(value, param);
        if (!validation.valid) {
          return {
            valid: false,
            error: `Invalid parameter ${param.name}: ${validation.error}`,
            data: {}
          };
        }

        parameters[param.name] = value;
      } else if (param.defaultValue !== undefined) {
        parameters[param.name] = param.defaultValue;
      }
    }

    return { valid: true, data: parameters };
  }

  private validateParameter(value: unknown, param: CommandParameter): { valid: boolean; error?: string } {
    if (!param.validation) {
      return { valid: true };
    }

    const validation = param.validation;

    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        return { valid: false, error: `Must be at least ${validation.minLength} characters` };
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        return { valid: false, error: `Must be no more than ${validation.maxLength} characters` };
      }
      if (validation.pattern && !validation.pattern.test(value)) {
        return { valid: false, error: 'Does not match required pattern' };
      }
    }

    if (typeof value === 'number') {
      if (validation.minValue && value < validation.minValue) {
        return { valid: false, error: `Must be at least ${validation.minValue}` };
      }
      if (validation.maxValue && value > validation.maxValue) {
        return { valid: false, error: `Must be no more than ${validation.maxValue}` };
      }
    }

    if (validation.customValidator) {
      const result = validation.customValidator(value);
      if (typeof result === 'string') {
        return { valid: false, error: result };
      }
      if (!result) {
        return { valid: false, error: 'Custom validation failed' };
      }
    }

    return { valid: true };
  }

  private async updateCommandUsage(command: CommandDefinition, result: CommandResult): Promise<void> {
    const metadata = command.metadata;
    
    // Update usage count
    metadata.usageCount++;
    metadata.lastUsed = new Date();

    // Update average execution time
    const totalTime = metadata.averageExecutionTime * (metadata.usageCount - 1) + result.executionTime;
    metadata.averageExecutionTime = totalTime / metadata.usageCount;

    // Update success rate
    const successCount = Math.round(metadata.successRate * (metadata.usageCount - 1)) + (result.success ? 1 : 0);
    metadata.successRate = successCount / metadata.usageCount;

    // Persist updated command
    await this.persistCommand(command);
  }

  private hasStructuralChanges(oldCommand: CommandDefinition, newCommand: CommandDefinition): boolean {
    return (
      oldCommand.name !== newCommand.name ||
      oldCommand.description !== newCommand.description ||
      JSON.stringify(oldCommand.parameters) !== JSON.stringify(newCommand.parameters)
    );
  }
}

// Export singleton instance (would be initialized with Discord token)
export const commandRegistry = new DynamicCommandRegistry(process.env.DISCORD_TOKEN || 'mock_token');
