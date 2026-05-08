// ═══════════════════════════════════════════════════════════════
// 🎯 Error Tracker Service
// Centralized error tracking, aggregation, and analytics system
// ═══════════════════════════════════════════════════════════════

import { UnifiedLogger, LogContext, LogLevel } from '../logger/UnifiedLogger';

export interface TrackedError {
  id: string;
  timestamp: number;
  message: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  category: ErrorCategory;
  source: ErrorSource;
  context: LogContext;
  stack?: string;
  code?: string;
  data?: Record<string, unknown>;
  userMessage?: string;
  recoverable: boolean;
  resolved: boolean;
  resolvedAt?: number;
  occurrenceCount: number;
  firstOccurrence: number;
  lastOccurrence: number;
  relatedErrors?: string[];
  metadata?: ErrorMetadata;
}

export interface ErrorMetadata {
  fileId?: string;
  fileName?: string;
  line?: number;
  column?: number;
  extensionId?: string;
  operation?: string;
  apiEndpoint?: string;
  httpStatus?: number;
  retryCount?: number;
  duration?: number;
}

export type ErrorCategory = 
  | 'syntax'
  | 'runtime'
  | 'network'
  | 'filesystem'
  | 'validation'
  | 'permission'
  | 'configuration'
  | 'memory'
  | 'timeout'
  | 'unknown';

export type ErrorSource = 
  | 'parser'
  | 'compiler'
  | 'analyzer'
  | 'ai'
  | 'extension'
  | 'user'
  | 'system'
  | 'network'
  | 'database';

export interface ErrorFilter {
  severity?: TrackedError['severity'];
  category?: ErrorCategory;
  source?: ErrorSource;
  context?: LogContext;
  resolved?: boolean;
  timeRange?: {
    start: number;
    end: number;
  };
  searchQuery?: string;
}

export interface ErrorStatistics {
  total: number;
  bySeverity: Record<TrackedError['severity'], number>;
  byCategory: Record<ErrorCategory, number>;
  bySource: Record<ErrorSource, number>;
  byContext: Record<LogContext, number>;
  resolved: number;
  unresolved: number;
  criticalCount: number;
  trend: {
    last24h: number;
    last7d: number;
    change: number;
  };
  topErrors: Array<{
    message: string;
    count: number;
    percentage: number;
  }>;
}

export class ErrorTracker {
  private static instance: ErrorTracker;
  private logger: UnifiedLogger;
  private errors: Map<string, TrackedError> = new Map();
  private maxErrors: number = 1000;
  private autoResolveTimeout: number = 300000; // 5 minutes
  private listeners: Set<(error: TrackedError) => void> = new Set();

  private constructor() {
    this.logger = UnifiedLogger.getInstance();
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  // Track a new error
  track(error: Partial<TrackedError> & { message: string }): TrackedError {
    const existingError = this.findSimilarError(error.message);
    
    if (existingError) {
      // Update existing error
      existingError.occurrenceCount++;
      existingError.lastOccurrence = Date.now();
      existingError.data = { ...existingError.data, ...error.data };
      
      if (error.stack && !existingError.stack) {
        existingError.stack = error.stack;
      }
      
      this.notifyListeners(existingError);
      return existingError;
    }

    // Create new error
    const trackedError: TrackedError = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      message: error.message,
      severity: error.severity || 'error',
      category: error.category || 'unknown',
      source: error.source || 'unknown',
      context: error.context || 'GENERAL',
      stack: error.stack,
      code: error.code,
      data: error.data || {},
      userMessage: error.userMessage,
      recoverable: error.recoverable ?? false,
      resolved: false,
      occurrenceCount: 1,
      firstOccurrence: Date.now(),
      lastOccurrence: Date.now(),
      metadata: error.metadata,
    };

    // Store error
    this.errors.set(trackedError.id, trackedError);

    // Limit stored errors
    if (this.errors.size > this.maxErrors) {
      this.cleanupOldErrors();
    }

    // Log the error
    this.logError(trackedError);

    // Notify listeners
    this.notifyListeners(trackedError);

    return trackedError;
  }

  // Resolve an error
  resolve(errorId: string): boolean {
    const error = this.errors.get(errorId);
    if (!error) return false;

    error.resolved = true;
    error.resolvedAt = Date.now();
    
    this.logger.success(`Error resolved: ${error.message}`, LogContext.SYSTEM, {
      errorId,
      resolutionTime: Date.now() - error.timestamp,
    });

    this.notifyListeners(error);
    return true;
  }

  // Bulk resolve errors
  resolveByFilter(filter: ErrorFilter): number {
    let count = 0;
    for (const error of this.errors.values()) {
      if (this.matchesFilter(error, filter) && !error.resolved) {
        this.resolve(error.id);
        count++;
      }
    }
    return count;
  }

  // Get error by ID
  getError(errorId: string): TrackedError | undefined {
    return this.errors.get(errorId);
  }

  // Get all errors with optional filtering
  getErrors(filter?: ErrorFilter): TrackedError[] {
    let errors = Array.from(this.errors.values());

    if (filter) {
      errors = errors.filter(error => this.matchesFilter(error, filter));
    }

    // Sort by severity and timestamp
    return errors.sort((a, b) => {
      const severityOrder = { critical: 0, error: 1, warning: 2, info: 3 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.lastOccurrence - a.lastOccurrence;
    });
  }

  // Get error statistics
  getStatistics(): ErrorStatistics {
    const errors = Array.from(this.errors.values());
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const last7d = now - 7 * 24 * 60 * 60 * 1000;

    const stats: ErrorStatistics = {
      total: errors.length,
      bySeverity: { critical: 0, error: 0, warning: 0, info: 0 },
      byCategory: {} as Record<ErrorCategory, number>,
      bySource: {} as Record<ErrorSource, number>,
      byContext: {} as Record<LogContext, number>,
      resolved: 0,
      unresolved: 0,
      criticalCount: 0,
      trend: {
        last24h: 0,
        last7d: 0,
        change: 0,
      },
      topErrors: [],
    };

    // Count by severity
    errors.forEach(error => {
      stats.bySeverity[error.severity]++;
      
      if (error.severity === 'critical') {
        stats.criticalCount++;
      }

      if (error.resolved) {
        stats.resolved++;
      } else {
        stats.unresolved++;
      }

      // Count by category
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;

      // Count by source
      stats.bySource[error.source] = (stats.bySource[error.source] || 0) + 1;

      // Count by context
      stats.byContext[error.context] = (stats.byContext[error.context] || 0) + 1;

      // Trend calculation
      if (error.firstOccurrence >= last24h) {
        stats.trend.last24h++;
      }
      if (error.firstOccurrence >= last7d) {
        stats.trend.last7d++;
      }
    });

    // Calculate trend change
    const previous7d = now - 14 * 24 * 60 * 60 * 1000;
    const previousPeriod = errors.filter(
      e => e.firstOccurrence >= previous7d && e.firstOccurrence < last7d
    ).length;
    
    stats.trend.change = previousPeriod > 0 
      ? ((stats.trend.last7d - previousPeriod) / previousPeriod) * 100 
      : 0;

    // Top errors
    const errorCounts = new Map<string, number>();
    errors.forEach(error => {
      const key = error.message.substring(0, 50);
      errorCounts.set(key, (errorCounts.get(key) || 0) + error.occurrenceCount);
    });

    stats.topErrors = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([message, count]) => ({
        message,
        count,
        percentage: (count / errors.reduce((sum, e) => sum + e.occurrenceCount, 0)) * 100,
      }));

    return stats;
  }

  // Clear resolved errors older than timeout
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [id, error] of this.errors.entries()) {
      if (error.resolved && error.resolvedAt && 
          now - error.resolvedAt > this.autoResolveTimeout) {
        this.errors.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      this.logger.info(`Cleaned up ${removed} resolved errors`, LogContext.SYSTEM);
    }

    return removed;
  }

  // Subscribe to error events
  subscribe(listener: (error: TrackedError) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Clear all errors
  clear(): void {
    this.errors.clear();
    this.logger.info('All errors cleared', LogContext.SYSTEM);
  }

  // Export errors for reporting
  export(filter?: ErrorFilter): string {
    const errors = this.getErrors(filter);
    return JSON.stringify(errors, null, 2);
  }

  // Private methods

  private findSimilarError(message: string): TrackedError | undefined {
    // Find errors with similar message (simple implementation)
    for (const error of this.errors.values()) {
      if (!error.resolved && error.message === message) {
        return error;
      }
    }
    return undefined;
  }

  private matchesFilter(error: TrackedError, filter: ErrorFilter): boolean {
    if (filter.severity && error.severity !== filter.severity) return false;
    if (filter.category && error.category !== filter.category) return false;
    if (filter.source && error.source !== filter.source) return false;
    if (filter.context && error.context !== filter.context) return false;
    if (filter.resolved !== undefined && error.resolved !== filter.resolved) return false;
    
    if (filter.timeRange) {
      if (error.timestamp < filter.timeRange.start || 
          error.timestamp > filter.timeRange.end) return false;
    }

    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      return (
        error.message.toLowerCase().includes(query) ||
        error.userMessage?.toLowerCase().includes(query) ||
        error.code?.toLowerCase().includes(query)
      );
    }

    return true;
  }

  private logError(error: TrackedError): void {
    const level: LogLevel = error.severity === 'critical' ? 'critical' :
                           error.severity === 'error' ? 'error' :
                           error.severity === 'warning' ? 'warn' : 'info';

    this.logger[level](error.message, error.context, {
      errorId: error.id,
      category: error.category,
      source: error.source,
      code: error.code,
      stack: error.stack,
      data: error.data,
      recoverable: error.recoverable,
      metadata: error.metadata,
    });
  }

  private notifyListeners(error: TrackedError): void {
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (e) {
        console.error('Error listener threw an error:', e);
      }
    });
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupOldErrors(): void {
    const entries = Array.from(this.errors.entries());
    const sorted = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 10% of errors
    const toRemove = Math.floor(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.errors.delete(sorted[i][0]);
    }
  }
}

// Export singleton instance
export const errorTracker = ErrorTracker.getInstance();
