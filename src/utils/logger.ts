/**
 * Enterprise-grade logging service with structured output and contextual metadata
 */

/**
 * Severity levels for log entries.
 */
export enum LogLevel {
  /** Critical errors requiring immediate attention. */
  ERROR = 0,
  /** Warnings about potential issues or non-critical failures. */
  WARN = 1,
  /** General informational messages about system operation. */
  INFO = 2,
  /** Detailed debug information for development. */
  DEBUG = 3
}

/**
 * Contextual metadata associated with a log entry.
 */
export interface LogContext {
  /** ID of the user initiating the action. */
  userId?: string;
  /** ID of the guild where the action occurred. */
  guildId?: string;
  /** ID of the channel where the action occurred. */
  channelId?: string;
  /** Name of the command being executed. */
  command?: string;
  /** Name of the specific operation within a command. */
  operation?: string;
  /** Duration of the operation in milliseconds. */
  duration?: number;
  /** Additional structured metadata. */
  metadata?: Record<string, unknown>;
  // Allow additional properties for backwards compatibility
  [key: string]: unknown;
}

/**
 * Represents a complete log record ready for output.
 */
export interface LogEntry {
  /** ISO 8601 timestamp of the log. */
  timestamp: string;
  /** Severity level of the log. */
  level: LogLevel;
  /** The main log message. */
  message: string;
  /** Optional context data. */
  context?: LogContext;
  /** Optional error details. */
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Enterprise-grade structured logger.
 *
 * Features:
 * - Singleton pattern for global access.
 * - Environment-aware configuration (JSON in prod, colored text in dev).
 * - Automatic sensitive data redaction.
 * - Support for contextual child loggers.
 */
export class Logger {
  private static instance: Logger;
  private readonly logLevel: LogLevel;
  private readonly enableColors: boolean;
  private readonly enableJson: boolean;

  private constructor() {
    // Configure based on environment
    const env = process.env.NODE_ENV || 'development';
    this.logLevel = this.parseLogLevel(process.env.LOG_LEVEL ?? 'INFO');
    this.enableColors = env !== 'production' && process.stdout.isTTY;
    this.enableJson = env === 'production' || process.env.LOG_FORMAT === 'json';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Log error with full context and stack trace
   */
  public error(message: string, error?: Error | unknown, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log warning for non-critical issues
   */
  public warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log informational messages
   */
  public info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log debug information (development only)
   */
  public debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Create operation-specific logger with predefined context
   */
  public withContext(baseContext: LogContext): ContextLogger {
    return new ContextLogger(this, baseContext);
  }

  /**
   * Log performance metrics
   */
  public performance(operation: string, durationMs: number, context?: LogContext): void {
    this.info(`Performance: ${operation}`, {
      ...context,
      operation,
      duration: durationMs,
      metadata: { type: 'performance', ...context?.metadata }
    });
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error | unknown): void {
    if (level > this.logLevel) {
      return; // Skip logs below configured level
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };

    // Add error details if provided
    if (error) {
      if (error instanceof Error) {
        entry.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as Error & { code?: string }).code
        };
      } else {
        entry.error = {
          name: 'Unknown',
          message: String(error)
        };
      }
    }

    this.output(entry);
  }

  private output(entry: LogEntry): void {
    // Skip all output in test environment unless it's an error or warning
    if (process.env.NODE_ENV === 'test' && entry.level !== LogLevel.ERROR && entry.level !== LogLevel.WARN) {
      return;
    }

    const redact = (text: string | undefined) => {
      if (!text) return text;
      const patterns = [
        /(sk-)[a-zA-Z0-9]{10,}/g, // API keys
        /(xox[baprs]-)[a-zA-Z0-9-]{10,}/g,
        /(eyJ[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,})/g // JWT
      ];
      let out = text;
      for (const p of patterns) out = out.replace(p, '$1***');
      return out;
    };

    if (this.enableJson) {
      // JSON format for production parsing
      const safe = { ...entry } as LogEntry & { error?: { message?: string } };
      if (safe.error?.message) safe.error.message = redact(safe.error.message) || safe.error.message;
      console.log(JSON.stringify(safe));
    } else {
      // Human-readable format for development
      const timestamp = entry.timestamp.substring(11, 19); // HH:MM:SS
      const level = this.formatLevel(entry.level);
      const context = this.formatContext(entry.context);
      const error = entry.error ? ` [${entry.error.name}: ${redact(entry.error.message)}]` : '';
      console.log(`${timestamp} ${level} ${entry.message}${context}${error}`);
      if (entry.error?.stack && entry.level === LogLevel.ERROR) {
        console.log(entry.error.stack);
      }
    }
  }

  private formatLevel(level: LogLevel): string {
    const colors = {
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.INFO]: '\x1b[36m',  // Cyan
      [LogLevel.DEBUG]: '\x1b[37m'  // White
    };

    const labels = {
      [LogLevel.ERROR]: 'ERROR',
      [LogLevel.WARN]: 'WARN ',
      [LogLevel.INFO]: 'INFO ',
      [LogLevel.DEBUG]: 'DEBUG'
    };

    const label = labels[level];
    return this.enableColors ? `${colors[level]}${label}\x1b[0m` : label;
  }

  private formatContext(context?: LogContext): string {
    if (!context) return '';

    const parts: string[] = [];
    if (context.userId) parts.push(`user:${context.userId.substring(0, 8)}`);
    if (context.guildId) parts.push(`guild:${context.guildId.substring(0, 8)}`);
    if (context.operation) parts.push(`op:${context.operation}`);
    if (context.duration !== undefined) parts.push(`${context.duration}ms`);

    return parts.length > 0 ? ` [${parts.join(' ')}]` : '';
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }
}

/**
 * Context-aware logger that automatically includes predefined context
 */
export class ContextLogger {
  constructor(private logger: Logger, private context: LogContext) {}

  public error(message: string, error?: Error | unknown, additionalContext?: LogContext): void {
    this.logger.error(message, error, { ...this.context, ...additionalContext });
  }

  public warn(message: string, additionalContext?: LogContext): void {
    this.logger.warn(message, { ...this.context, ...additionalContext });
  }

  public info(message: string, additionalContext?: LogContext): void {
    this.logger.info(message, { ...this.context, ...additionalContext });
  }

  public debug(message: string, additionalContext?: LogContext): void {
    this.logger.debug(message, { ...this.context, ...additionalContext });
  }

  public performance(operation: string, durationMs: number, additionalContext?: LogContext): void {
    this.logger.performance(operation, durationMs, { ...this.context, ...additionalContext });
  }
}

// Singleton instance for global use
export const logger = Logger.getInstance();

// Convenience function for creating operation loggers
export function createLogger(context: LogContext): ContextLogger {
  return logger.withContext(context);
}

export default logger;
