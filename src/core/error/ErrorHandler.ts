// ═══════════════════════════════════════════════════════════════
// 🚨 Error Handler Service
// Centralized error handling, logging, and user notification system
// Integrated with ErrorTracker for comprehensive error tracking
// ═══════════════════════════════════════════════════════════════

import { UnifiedLogger, LogContext, LogLevel } from '../logger/UnifiedLogger';
import { errorTracker, ErrorCategory, ErrorSource, TrackedError } from './ErrorTracker';

export interface ErrorDetails {
  message: string;
  code?: string;
  context?: string;
  stack?: string;
  data?: unknown;
  recoverable?: boolean;
  userMessage?: string;
}

export interface ErrorHandlerConfig {
  enableNotifications: boolean;
  enableLogging: boolean;
  enableTracking: boolean;
  maxRetries: number;
  retryDelayMs: number;
  notifyThreshold: LogLevel;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private logger: UnifiedLogger;
  private errorTrackerInstance: typeof errorTracker;
  private config: ErrorHandlerConfig;
  private notificationCallback?: (type: 'error' | 'warning' | 'info', message: string, duration?: number) => void;

  private constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.logger = UnifiedLogger.getInstance();
    this.errorTrackerInstance = errorTracker;
    this.config = {
      enableNotifications: true,
      enableLogging: true,
      enableTracking: true,
      maxRetries: 3,
      retryDelayMs: 1000,
      notifyThreshold: 'warn',
      ...config,
    };
  }

  static getInstance(config?: Partial<ErrorHandlerConfig>): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(config);
    }
    return ErrorHandler.instance;
  }

  // Set notification callback (to be connected to store)
  setNotificationCallback(callback: (type: 'error' | 'warning' | 'info', message: string, duration?: number) => void): void {
    this.notificationCallback = callback;
  }

  // Handle errors with logging and optional notifications
  async handleError(
    error: Error | string | unknown,
    context: LogContext,
    details?: Partial<ErrorDetails>,
    level: LogLevel = 'error'
  ): Promise<void> {
    const errorDetails = this.parseError(error, details);

    // Track the error in ErrorTracker
    if (this.config.enableTracking) {
      this.trackErrorInTracker(errorDetails, context, level);
    }

    // Log the error
    if (this.config.enableLogging) {
      this.logger[level](errorDetails.message, context, {
        code: errorDetails.code,
        data: errorDetails.data,
        stack: errorDetails.stack,
        recoverable: errorDetails.recoverable,
      });
    }

    // Show notification if enabled and meets threshold
    if (this.config.enableNotifications && this.shouldNotify(level)) {
      const userMessage = details?.userMessage || errorDetails.message;
      this.showNotification(this.mapLogLevelToNotificationType(level), userMessage);
    }
  }

  // Track error in ErrorTracker with proper categorization
  private trackErrorInTracker(
    errorDetails: ErrorDetails,
    context: LogContext,
    level: LogLevel
  ): void {
    const severity = this.mapLogLevelToSeverity(level);
    const category = this.determineErrorCategory(errorDetails);
    const source = this.determineErrorSource(context);

    this.errorTrackerInstance.track({
      message: errorDetails.message,
      severity,
      category,
      source,
      context,
      stack: errorDetails.stack,
      code: errorDetails.code,
      data: errorDetails.data as Record<string, unknown> | undefined,
      userMessage: errorDetails.userMessage,
      recoverable: errorDetails.recoverable ?? false,
      resolved: false,
    });
  }

  // Map log level to error severity
  private mapLogLevelToSeverity(level: LogLevel): TrackedError['severity'] {
    switch (level) {
      case 'critical':
        return 'critical';
      case 'error':
        return 'error';
      case 'warn':
        return 'warning';
      case 'info':
      case 'success':
      case 'debug':
      default:
        return 'info';
    }
  }

  // Determine error category based on error details
  private determineErrorCategory(details: ErrorDetails): ErrorCategory {
    const code = details.code?.toUpperCase() || '';
    
    // Check error code first (highest priority)
    if (code) {
      if (code.includes('NETWORK')) return 'network';
      if (code.includes('FILE') || code.includes('FS')) return 'filesystem';
      if (code.includes('PERMISSION')) return 'permission';
      if (code.includes('TIMEOUT')) return 'timeout';
      if (code.includes('MEMORY') || code.includes('MEM')) return 'memory';
      if (code.includes('CONFIG')) return 'configuration';
      if (code.includes('VALIDATION') || code.includes('VALID')) return 'validation';
      if (code.includes('SYNTAX')) return 'syntax';
      if (code.includes('RUNTIME')) return 'runtime';
    }
    
    // Check error message content
    if (details.message) {
      const msg = details.message.toLowerCase();
      if (msg.includes('network') || msg.includes('connection')) return 'network';
      if (msg.includes('file') || msg.includes('path') || msg.includes('directory')) return 'filesystem';
      if (msg.includes('permission') || msg.includes('access denied')) return 'permission';
      if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
      if (msg.includes('memory') || msg.includes('heap') || msg.includes('out of memory')) return 'memory';
      if (msg.includes('config') || msg.includes('setting')) return 'configuration';
      if (msg.includes('valid') || msg.includes('invalid') || msg.includes('validation')) return 'validation';
      if (msg.includes('syntax') || msg.includes('parse') || msg.includes('unexpected token')) return 'syntax';
      if (msg.includes('runtime') || msg.includes('undefined') || msg.includes('cannot read')) return 'runtime';
    }

    return 'unknown';
  }

  // Determine error source based on context
  private determineErrorSource(context: LogContext): ErrorSource {
    switch (context) {
      case 'PARSER':
        return 'parser';
      case 'COMPILER':
        return 'compiler';
      case 'ANALYZER':
        return 'analyzer';
      case 'AI':
        return 'ai';
      case 'EXTENSION':
        return 'extension';
      case 'USER':
        return 'user';
      case 'SYSTEM':
      case 'GENERAL':
      default:
        return 'system';
    }
  }

  // Handle recoverable errors with retry logic
  async handleRecoverableError<T>(
    operation: () => Promise<T>,
    context: LogContext,
    details?: Partial<ErrorDetails>
  ): Promise<T | null> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        await this.handleError(error, context, {
          ...details,
          recoverable: true,
          data: { attempt, maxRetries: this.config.maxRetries },
        }, 'warn');

        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelayMs * attempt); // Exponential backoff
        }
      }
    }

    // Final failure
    await this.handleError(lastError, context, {
      ...details,
      recoverable: false,
      data: { attempts: this.config.maxRetries },
    }, 'error');

    return null;
  }

  // Handle critical system errors
  async handleCriticalError(
    error: Error | string | unknown,
    context: LogContext,
    details?: Partial<ErrorDetails>
  ): Promise<void> {
    await this.handleError(error, context, {
      ...details,
      recoverable: false,
    }, 'critical');

    // For critical errors, we might want additional handling like:
    // - Auto-healing trigger
    // - System state preservation
    // - Emergency notifications
  }

  // Handle validation errors (user input issues)
  async handleValidationError(
    message: string,
    context: LogContext,
    details?: Partial<ErrorDetails>
  ): Promise<void> {
    await this.handleError(message, context, {
      ...details,
      recoverable: true,
    }, 'warn');
  }

  // Handle network errors with specific handling
  async handleNetworkError(
    error: Error | unknown,
    context: LogContext,
    details?: Partial<ErrorDetails>
  ): Promise<void> {
    const networkDetails = {
      ...details,
      code: 'NETWORK_ERROR',
      userMessage: 'Network connection issue. Please check your internet connection.',
    };

    await this.handleError(error, context, networkDetails, 'error');
  }

  // Handle file system errors
  async handleFileSystemError(
    error: Error | unknown,
    context: LogContext,
    details?: Partial<ErrorDetails>
  ): Promise<void> {
    const fsDetails = {
      ...details,
      code: 'FILESYSTEM_ERROR',
      userMessage: 'File system operation failed. Please check file permissions and disk space.',
    };

    await this.handleError(error, context, fsDetails, 'error');
  }

  // Get error statistics
  getErrorStats() {
    return this.logger.getStats();
  }

  // Private methods
  private parseError(error: Error | string | unknown, details?: Partial<ErrorDetails>): ErrorDetails {
    let message: string;
    let stack: string | undefined;
    let code: string | undefined;

    if (error instanceof Error) {
      message = error.message;
      stack = error.stack;
      code = (error as any).code;
    } else if (typeof error === 'string') {
      message = error;
    } else {
      message = 'Unknown error occurred';
    }

    // Merge details with parsed error - ensure code from details is preserved
    return {
      message,
      code: details?.code || code,
      stack,
      context: details?.context,
      data: details?.data,
      recoverable: details?.recoverable ?? false,
      userMessage: details?.userMessage,
    };
  }

  private shouldNotify(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'success', 'warn', 'error', 'critical'];
    const thresholdIndex = levels.indexOf(this.config.notifyThreshold);
    const levelIndex = levels.indexOf(level);
    return levelIndex >= thresholdIndex;
  }

  private showNotification(type: 'error' | 'warning' | 'info', message: string, duration?: number): void {
    if (this.notificationCallback) {
      this.notificationCallback(type, message, duration);
    }
  }

  private mapLogLevelToNotificationType(level: LogLevel): 'error' | 'warning' | 'info' {
    switch (level) {
      case 'critical':
      case 'error':
        return 'error';
      case 'warn':
        return 'warning';
      case 'info':
      case 'success':
      case 'debug':
      default:
        return 'info';
    }
  }

  private getDefaultUserMessage(level: LogLevel, details: ErrorDetails): string {
    switch (level) {
      case 'critical':
        return 'A critical system error occurred. Please restart the application.';
      case 'error':
        return details.recoverable
          ? 'An error occurred, but the system is attempting to recover.'
          : 'An error occurred. Please try again or contact support.';
      case 'warn':
        return 'Warning: ' + details.message;
      default:
        return details.message;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();