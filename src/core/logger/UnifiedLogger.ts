// ═══════════════════════════════════════════════════════════════
// 🔔 Unified Logger (call-site compatible)
// - This project has inconsistent logger call signatures across modules.
// - To avoid blocking compilation, logger methods accept flexible args
//   and parse them at runtime into { level, context, message, data, error }.
// ═══════════════════════════════════════════════════════════════

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical' | 'success';

export const LogContext = {
  SYSTEM: 'SYSTEM',
  AI: 'AI',
  CORE: 'CORE',

  // Lowercase contexts used by many call sites (e.g. logger.info('filesystem', ...))
  FILE_SYSTEM: 'filesystem',
  PARSER: 'parser',
  SANDBOX: 'sandbox',
  DATABASE: 'DATABASE',
  UI: 'ui',
  TERMINAL: 'terminal',
  ERROR: 'ERROR',
  FIX: 'fix',

  GENERAL: 'general',
} as const;

export type LogContext = (typeof LogContext)[keyof typeof LogContext];

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  context: LogContext;
  message: string;
  data?: unknown;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration?: number;
}

export interface LogFilter {
  level?: LogLevel;
  context?: LogContext;
  startTime?: number;
  endTime?: number;
  search?: string;
}

export interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  byContext: Record<LogContext, number>;
  errorsLast24h: number;
  avgResponseTime?: number;
}

type PlainObject = Record<string, unknown>;

function isPlainObject(v: unknown): v is PlainObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const LOG_CONTEXT_VALUES = Object.values(LogContext) as LogContext[];
function isLogContext(v: unknown): v is LogContext {
  return typeof v === 'string' && LOG_CONTEXT_VALUES.includes(v as LogContext);
}

function toErrorDetails(e: unknown): LogEntry['error'] | undefined {
  if (e instanceof Error) return { name: e.name, message: e.message, stack: e.stack };
  if (typeof e === 'string') return { name: 'Error', message: e };
  return undefined;
}

class UnifiedLoggerClass {
  private static instance: UnifiedLoggerClass;
  private logs: LogEntry[] = [];
  private maxLogs = 10000;
  private listeners: Array<(entry: LogEntry) => void> = [];

  private performanceMarkers: Map<string, number> = new Map();
  private operations: Map<string, { startedAt: number; operation: string; context: LogContext }> = new Map();

  constructor(_scope?: string) {}

  static getInstance(): UnifiedLoggerClass {
    if (!UnifiedLoggerClass.instance) UnifiedLoggerClass.instance = new UnifiedLoggerClass();
    return UnifiedLoggerClass.instance;
  }

  // ─── Operations ──────────────────────────────────────────────
  startOperation(operation: string, context: LogContext): string {
    const id = this.generateId();
    this.operations.set(id, { startedAt: Date.now(), operation, context });
    this.debug(operation, context);
    return id;
  }

  endOperation(
    logId: string,
    details: { success: boolean; strategy?: string; error?: string; data?: unknown }
  ): void {
    const op = this.operations.get(logId);
    if (!op) {
      this.warn('endOperation: unknown logId', LogContext.GENERAL, { logId });
      return;
    }
    this.operations.delete(logId);

    const duration = Date.now() - op.startedAt;
    const baseData: PlainObject = {
      duration,
      strategy: details.strategy,
      data: details.data,
    };

    if (details.success) {
      this.success(op.operation, op.context, baseData);
    } else {
      this.error(op.operation, op.context, details.error ?? 'Unknown error', baseData);
    }
  }

  // ─── Performance helpers ─────────────────────────────────────
  startTimer(marker: string): void {
    this.performanceMarkers.set(marker, Date.now());
    this.debug(`Timer started: ${marker}`, LogContext.GENERAL);
  }

  endTimer(marker: string, context: LogContext, message: string): number | null {
    const start = this.performanceMarkers.get(marker);
    if (!start) {
      this.warn(message, context, { markerNotFound: marker });
      return null;
    }
    this.performanceMarkers.delete(marker);
    const duration = Date.now() - start;
    this.info(message, context, { duration });
    return duration;
  }

  // ─── Flexible public logging API (runtime parsing) ───────────
  debug(...args: unknown[]): void {
    this.write('debug', args);
  }
  info(...args: unknown[]): void {
    this.write('info', args);
  }
  warn(...args: unknown[]): void {
    this.write('warn', args);
  }
  success(...args: unknown[]): void {
    this.write('success', args);
  }
  error(...args: unknown[]): void {
    this.write('error', args);
  }
  critical(...args: unknown[]): void {
    this.write('critical', args);
  }
  // some code may call logger.log(...)
  log(...args: unknown[]): void {
    this.write('info', args);
  }

  // ─── Retrieval ────────────────────────────────────────────────
  getLogs(filter?: LogFilter): LogEntry[] {
    let filtered = [...this.logs];

    if (filter) {
      if (filter.level) {
        const order: LogLevel[] = ['debug', 'info', 'success', 'warn', 'error', 'critical'];
        const idx = order.indexOf(filter.level);
        filtered = filtered.filter(log => order.indexOf(log.level) >= idx);
      }

      if (filter.context) filtered = filtered.filter(log => log.context === filter.context);
      if (filter.startTime !== undefined) {
        const startTime = filter.startTime;
        filtered = filtered.filter(log => log.timestamp >= startTime);
      }
      if (filter.endTime !== undefined) {
        const endTime = filter.endTime;
        filtered = filtered.filter(log => log.timestamp <= endTime);
      }

      if (filter.search) {
        const q = filter.search.toLowerCase();
        filtered = filtered.filter(log => {
          const msg = log.message.toLowerCase();
          const data =
            typeof log.data === 'string'
              ? log.data.toLowerCase()
              : JSON.stringify(log.data ?? {}).toLowerCase();
          return msg.includes(q) || data.includes(q);
        });
      }
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  getRecent(count = 100, context?: LogContext): LogEntry[] {
    const filtered = context ? this.logs.filter(l => l.context === context) : this.logs;
    return filtered.slice(-count).reverse();
  }

  getStats(): LogStats {
    const byLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      critical: 0,
      success: 0,
    };

    const byContext = LOG_CONTEXT_VALUES.reduce((acc, ctx) => {
      acc[ctx] = 0;
      return acc;
    }, {} as Record<LogContext, number>);

    for (const log of this.logs) {
      byLevel[log.level]++;
      byContext[log.context] = (byContext[log.context] ?? 0) + 1;
    }

    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    const errorsLast24h = this.logs.filter(
      l => l.timestamp > twentyFourHoursAgo && (l.level === 'error' || l.level === 'critical')
    ).length;

    const logsWithDuration = this.logs.filter(l => l.duration !== undefined);
    const avgResponseTime =
      logsWithDuration.length > 0
        ? logsWithDuration.reduce((sum, l) => sum + (l.duration ?? 0), 0) / logsWithDuration.length
        : undefined;

    return {
      total: this.logs.length,
      byLevel,
      byContext,
      errorsLast24h,
      avgResponseTime,
    };
  }

  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') return JSON.stringify(this.logs, null, 2);

    const headers = ['timestamp', 'level', 'context', 'message', 'data'];
    const rows = this.logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.level,
      log.context,
      `"${log.message.replace(/"/g, '""')}"`,
      `"${JSON.stringify(log.data ?? {}).replace(/"/g, '""')}"`,
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  clear(context?: LogContext): void {
    if (context) {
      this.logs = this.logs.filter(l => l.context !== context);
      this.info('Logs cleared for context', { context: LogContext.GENERAL });
      return;
    }
    this.logs = [];
    this.info('All logs cleared', { context: LogContext.GENERAL });
  }

  subscribe(callback: (entry: LogEntry) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx > -1) this.listeners.splice(idx, 1);
    };
  }

  // ─── Internals ────────────────────────────────────────────────
  private write(level: LogLevel, args: unknown[]): void {
    const parsed = this.parseLogArgs(args);
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      context: parsed.context,
      message: parsed.message,
      data: parsed.data,
      error: parsed.error,
      duration: parsed.duration,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs = this.logs.slice(-this.maxLogs);

    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch {
        // ignore
      }
    }

    this.logToConsole(entry);
  }

  private parseLogArgs(args: unknown[]): {
    context: LogContext;
    message: string;
    data?: unknown;
    error?: LogEntry['error'];
    duration?: number;
  } {
    // Supported call patterns observed in this repo:
    // 1) logger.info(message, context, data?)
    // 2) logger.info(message, { context, data?, error? })
    // 3) logger.info(context, message, data?)
    // 4) logger.error(context, errorObjOrString, data?)
    // 5) logger.error(message, context, errorObjOrString, data?)
    // 6) logger.warn(message, {context, error?, data?})

    const ctxFromArg = (v: unknown): LogContext | undefined => (isLogContext(v) ? v : undefined);

    // Pattern 1: message, context, data?
    if (typeof args[0] === 'string') {
      const maybeCtx = ctxFromArg(args[1]);
      if (maybeCtx) {
        const message = args[0];
        const third = args[2];
        const fourth = args[3];

        const maybeError = fourth !== undefined ? third : undefined;
        // error signature variants:
        // logger.error(message, context, ErrorOrString, data?)
        if (maybeError instanceof Error || typeof maybeError === 'string') {
          return { context: maybeCtx, message, data: fourth, error: toErrorDetails(maybeError) };
        }

        return { context: maybeCtx, message, data: third };
      }

      // Pattern 2: message, {context, ...}
      if (isPlainObject(args[1]) && ctxFromArg((args[1] as PlainObject).context) !== undefined) {
        const opts = args[1] as { context: LogContext; data?: unknown; error?: unknown; duration?: number };
        const message = args[0];
        const error = opts.error !== undefined ? toErrorDetails(opts.error) : undefined;
        return { context: opts.context, message, data: opts.data, error, duration: opts.duration };
      }
    }

    // Pattern 3: context, message, data?
    if (ctxFromArg(args[0]) && typeof args[1] === 'string') {
      const context = args[0] as LogContext;
      const message = args[1];

      // context, message, ErrorOrString, data?
      if (args[2] instanceof Error || typeof args[2] === 'string') {
        return { context, message, error: toErrorDetails(args[2]), data: args[3] };
      }

      return { context, message, data: args[2] };
    }

    // Fallback: best-effort
    return {
      context: LogContext.GENERAL,
      message: typeof args[0] === 'string' ? args[0] : 'Logger: invalid arguments',
      data: args[0] !== undefined ? args[0] : undefined,
    };
  }

  private logToConsole(entry: LogEntry): void {
    const prefix = `[${new Date(entry.timestamp).toISOString()}] [${entry.level.toUpperCase()}] [${entry.context}]`;

    switch (entry.level) {
      case 'debug':
        console.debug(prefix, entry.message, entry.data ?? '');
        break;
      case 'info':
      case 'success':
        console.info(prefix, entry.message, entry.data ?? '');
        break;
      case 'warn':
        console.warn(prefix, entry.message, entry.data ?? '');
        break;
      case 'error':
      case 'critical':
        console.error(prefix, entry.message, entry.data ?? '', entry.error ?? '');
        break;
    }
  }

  private generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

export { UnifiedLoggerClass, UnifiedLoggerClass as UnifiedLogger };
export const logger = UnifiedLoggerClass.getInstance();
export default logger;
