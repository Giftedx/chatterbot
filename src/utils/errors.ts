/**
 * Structured error types for enterprise-grade error handling
 */

import { LogContext } from './logger.js';

/**
 * Base error class with structured context and user-friendly messages
 */
export abstract class AppError extends Error {
  public readonly isOperational: boolean = true;
  public readonly context?: LogContext;
  public readonly userMessage?: string;

  constructor(
    message: string,
    context?: LogContext,
    userMessage?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
    this.userMessage = userMessage;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Get message appropriate for showing to users
   */
  public getUserFriendlyMessage(): string {
    return this.userMessage || 'An unexpected error occurred. Please try again.';
  }

  /**
   * Get detailed message for logging and debugging
   */
  public getDetailedMessage(): string {
    const contextStr = this.context ? ` [Context: ${JSON.stringify(this.context)}]` : '';
    return `${this.message}${contextStr}`;
  }
}

/**
 * Business logic errors that are expected and should be handled gracefully
 */
export class BusinessError extends AppError {
  constructor(message: string, userMessage: string, context?: LogContext) {
    super(message, context, userMessage);
  }
}

/**
 * External API failures with retry capabilities
 */
export class APIError extends AppError {
  public readonly statusCode?: number;
  public readonly retryable: boolean;

  constructor(
    message: string,
    statusCode?: number,
    retryable: boolean = false,
    context?: LogContext
  ) {
    const userMessage = retryable 
      ? 'Service temporarily unavailable. Please try again in a moment.'
      : 'External service error. Please try again later.';
    
    super(message, context, userMessage);
    this.statusCode = statusCode;
    this.retryable = retryable;
  }

  /**
   * Determine if error is retryable based on status code
   */
  public static isRetryableStatusCode(statusCode: number): boolean {
    return [429, 500, 502, 503, 504].includes(statusCode);
  }
}

/**
 * Input validation errors
 */
export class ValidationError extends AppError {
  public readonly field?: string;

  constructor(message: string, field?: string, context?: LogContext) {
    super(message, context, `Invalid input${field ? ` for ${field}` : ''}: ${message}`);
    this.field = field;
  }
}

/**
 * System/infrastructure errors that require immediate attention
 */
export class SystemError extends AppError {
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';

  constructor(
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    context?: LogContext
  ) {
    super(message, context, 'System error occurred. The team has been notified.');
    this.severity = severity;
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, context?: LogContext) {
    const userMessage = retryAfter 
      ? `Rate limit exceeded. Please try again in ${retryAfter} seconds.`
      : 'Rate limit exceeded. Please slow down your requests.';
    
    super(message, context, userMessage);
    this.retryAfter = retryAfter;
  }
}

/**
 * Permission/authorization errors
 */
export class AuthorizationError extends AppError {
  constructor(message: string, context?: LogContext) {
    super(message, context, 'You do not have permission to perform this action.');
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends AppError {
  public readonly configKey?: string;

  constructor(message: string, configKey?: string, context?: LogContext) {
    super(message, context, 'Service configuration error. Please contact an administrator.');
    this.configKey = configKey;
  }
}

/**
 * Error handler utility for consistent error processing
 */
export class ErrorHandler {
  /**
   * Wrap unknown errors into structured AppError instances
   */
  public static normalize(error: unknown, defaultContext?: LogContext): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      // Check for common API error patterns
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
        return new RateLimitError(error.message, undefined, defaultContext);
      }
      
      if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
        return new AuthorizationError(error.message, defaultContext);
      }
      
      if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
        return new ValidationError(error.message, undefined, defaultContext);
      }

      // Check for HTTP status codes in error
      const statusMatch = error.message.match(/status:?\s*(\d{3})/i);
      if (statusMatch) {
        const statusCode = parseInt(statusMatch[1], 10);
        const retryable = APIError.isRetryableStatusCode(statusCode);
        return new APIError(error.message, statusCode, retryable, defaultContext);
      }

      // Default to system error for unknown Error instances
      return new SystemError(error.message, 'medium', defaultContext);
    }

    // Handle non-Error objects
    const message = typeof error === 'string' ? error : 'Unknown error occurred';
    return new SystemError(message, 'low', defaultContext);
  }

  /**
   * Extract user-friendly error message for Discord responses
   */
  public static getUserMessage(error: unknown): string {
    const normalizedError = ErrorHandler.normalize(error);
    return normalizedError.getUserFriendlyMessage();
  }

  /**
   * Check if error should be retried
   */
  public static isRetryable(error: unknown): boolean {
    const normalizedError = ErrorHandler.normalize(error);
    
    if (normalizedError instanceof APIError) {
      return normalizedError.retryable;
    }
    
    if (normalizedError instanceof RateLimitError) {
      return true; // Rate limits can be retried after delay
    }
    
    // Check for network errors that are typically retryable
    const errorMessage = normalizedError.message.toLowerCase();
    const networkErrorPatterns = [
      'econnreset', 'etimedout', 'enotfound', 'econnrefused',
      'network', 'timeout', 'connection', 'socket hang up'
    ];
    
    if (networkErrorPatterns.some(pattern => errorMessage.includes(pattern))) {
      return true;
    }
    
    return false; // Conservative approach - most errors are not retryable
  }

  /**
   * Get retry delay in milliseconds
   */
  public static getRetryDelay(error: unknown, attempt: number): number {
    const normalizedError = ErrorHandler.normalize(error);
    
    if (normalizedError instanceof RateLimitError && normalizedError.retryAfter) {
      return normalizedError.retryAfter * 1000; // Convert to milliseconds
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max)
    return Math.min(1000 * Math.pow(2, attempt), 16000);
  }
}
