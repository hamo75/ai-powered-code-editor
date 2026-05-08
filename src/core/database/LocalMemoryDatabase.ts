/**
 * LocalMemoryDatabase (Improved)
 * - Persists to localStorage (optional, enabled by default)
 * - Fixes projectId extraction for paths like "/src/App.tsx"
 * - More robust pattern extraction
 * - Real export/import via JSON string helpers
 */

import { UnifiedLoggerClass, LogContext } from '../logger/UnifiedLogger';

export interface MemoryRecord {
  id: string;
  timestamp: number;
  type: 'error' | 'fix' | 'pattern' | 'context';
  data: any;
  metadata?: {
    projectId?: string;
    filePath?: string;
    errorType?: string;
    strategy?: string;
    success?: boolean;
    confidence?: number;

    // Optional engineering-grade metadata:
    beforeSha256?: string;
    afterSha256?: string;
    verification?: { success: boolean; checks?: any[] };
  };
}

export interface ProjectContext {
  projectId: string;
  name: string;
  createdAt: number;
  lastUpdated: number;
  totalErrors: number;
  totalFixes: number;
  successRate: number;
  commonPatterns: Array<{ pattern: string; count: number }>;
  recentActivity: MemoryRecord[];
}

export interface DatabaseQuery {
  type: 'error' | 'fix' | 'pattern' | 'context' | 'all';
  filePath?: string;
  errorType?: string;
  limit?: number;
  sortBy?: 'timestamp' | 'confidence' | 'success';
  order?: 'asc' | 'desc';
}

type PersistedDB = {
  v: number;
  exportedAt: number;
  memory: Record<string, MemoryRecord[]>;
  contexts: Record<string, ProjectContext>;
};

export class LocalMemoryDatabase {
  private logger: UnifiedLoggerClass;
  private memory: Map<string, MemoryRecord[]>;
  private contexts: Map<string, ProjectContext>;
  private maxRecordsPerType: number;
  private dbPath: string;

  // persistence
  private readonly STORAGE_KEY = 'ai_code_studio_memory_v2';
  private readonly STORAGE_VERSION = 2;
  private persistenceEnabled: boolean;

  constructor(dbPath: string = './.ai-memory', options?: { persistenceEnabled?: boolean; maxRecordsPerType?: number }) {
    this.logger = UnifiedLoggerClass.getInstance();
    this.memory = new Map();
    this.contexts = new Map();
    this.maxRecordsPerType = options?.maxRecordsPerType ?? 1000;
    this.dbPath = dbPath;
    this.persistenceEnabled = options?.persistenceEnabled ?? true;

    this.loadFromStorage();

    this.logger.info('LocalMemoryDatabase initialized', {
      context: LogContext.SYSTEM,
      data: {
        dbPath,
        maxRecords: this.maxRecordsPerType,
        persistenceEnabled: this.persistenceEnabled,
      },
    });
  }

  /**
   * حفظ سجل في الذاكرة
   */
  async save(record: Omit<MemoryRecord, 'id' | 'timestamp'>): Promise<MemoryRecord> {
    const id = this.generateId();
    const timestamp = Date.now();

    const fullRecord: MemoryRecord = {
      ...record,
      id,
      timestamp,
      metadata: record.metadata ? { ...record.metadata } : undefined,
    };

    const typeKey = record.type;
    if (!this.memory.has(typeKey)) this.memory.set(typeKey, []);

    const records = this.memory.get(typeKey)!;
    records.push(fullRecord);

    // pruning
    if (records.length > this.maxRecordsPerType) {
      records.splice(0, records.length - this.maxRecordsPerType);
      this.logger.debug('Pruned old records', {
        context: LogContext.DATABASE,
        data: { type: typeKey, count: records.length },
      });
    }

    // update project context when filePath exists
    if (fullRecord.metadata?.filePath) {
      await this.updateProjectContext(fullRecord);
    }

    this.persistToStorage();

    this.logger.info('Record saved', {
      context: LogContext.DATABASE,
      data: { id, type: fullRecord.type, path: fullRecord.metadata?.filePath },
    });

    return fullRecord;
  }

  /**
   * استعلام عن السجلات
   */
  async query(query: DatabaseQuery): Promise<MemoryRecord[]> {
    this.logger.debug('Query executed', {
      context: LogContext.DATABASE,
      data: query,
    });

    let results: MemoryRecord[] = [];

    if (query.type === 'all') {
      for (const records of this.memory.values()) results = results.concat(records);
    } else {
      results = [...(this.memory.get(query.type) || [])];
    }

    if (query.filePath) {
      results = results.filter(r => r.metadata?.filePath === query.filePath);
    }

    if (query.errorType) {
      results = results.filter(r => r.metadata?.errorType === query.errorType);
    }

    const orderMultiplier = query.order === 'asc' ? 1 : -1; // default desc
    const sortBy = query.sortBy ?? 'timestamp';

    results.sort((a, b) => {
      switch (sortBy) {
        case 'timestamp':
          return (a.timestamp - b.timestamp) * orderMultiplier;
        case 'confidence':
          return ((a.metadata?.confidence || 0) - (b.metadata?.confidence || 0)) * orderMultiplier;
        case 'success':
          return (((a.metadata?.success ? 1 : 0) - (b.metadata?.success ? 1 : 0)) * orderMultiplier);
        default:
          return (a.timestamp - b.timestamp) * orderMultiplier;
      }
    });

    if (query.limit) results = results.slice(0, query.limit);

    this.logger.info('Query completed', {
      context: LogContext.DATABASE,
      data: { resultCount: results.length, query },
    });

    // return copies to prevent mutation
    return results.map(r => ({ ...r, metadata: r.metadata ? { ...r.metadata } : undefined }));
  }

  /**
   * الحصول على أنماط شائعة (أكثر ذكاءً من الاعتماد على errorType فقط)
   */
  async getCommonPatterns(limit: number = 10): Promise<Array<{ pattern: string; count: number }>> {
    const patterns = new Map<string, number>();

    const errorRecords = this.memory.get('error') || [];
    for (const record of errorRecords) {
      const pattern =
        record.metadata?.errorType ||
        this.inferErrorTypeFromRecord(record) ||
        'unknown';

      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    }

    return Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([pattern, count]) => ({ pattern, count }));
  }

  /**
   * حساب معدل النجاح للاستراتيجيات
   */
  async getStrategySuccessRates(): Promise<Map<string, number>> {
    const strategyStats = new Map<string, { total: number; success: number }>();

    const fixRecords = this.memory.get('fix') || [];
    for (const record of fixRecords) {
      const strategy = record.metadata?.strategy || 'unknown';
      if (!strategyStats.has(strategy)) strategyStats.set(strategy, { total: 0, success: 0 });

      const stats = strategyStats.get(strategy)!;
      stats.total++;
      if (record.metadata?.success) stats.success++;
    }

    const successRates = new Map<string, number>();
    for (const [strategy, stats] of strategyStats.entries()) {
      const rate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;
      successRates.set(strategy, rate);
    }

    return successRates;
  }

  async getProjectContext(projectId: string): Promise<ProjectContext | null> {
    return this.contexts.get(projectId) || null;
  }

  /**
   * Export as JSON string (real)
   */
  exportToString(): string {
    const payload: PersistedDB = {
      v: this.STORAGE_VERSION,
      exportedAt: Date.now(),
      memory: Object.fromEntries(this.memory),
      contexts: Object.fromEntries(this.contexts),
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Import from JSON string (real)
   */
  importFromString(json: string): boolean {
    try {
      const parsed = JSON.parse(json) as PersistedDB;
      if (!parsed || typeof parsed !== 'object') return false;

      const memObj = (parsed as any).memory;
      const ctxObj = (parsed as any).contexts;

      if (!memObj || typeof memObj !== 'object') return false;
      if (!ctxObj || typeof ctxObj !== 'object') return false;

      this.memory = new Map(Object.entries(memObj));
      this.contexts = new Map(Object.entries(ctxObj));
      this.persistToStorage();
      return true;
    } catch (e) {
      this.logger.error('Import from string failed', {
        context: LogContext.DATABASE,
        error: e as Error,
      });
      return false;
    }
  }

  /**
   * Export to a "filePath" (kept for compatibility) – currently returns true if string built.
   * In web app you should download the returned string via UI.
   */
  async export(filePath: string): Promise<boolean> {
    try {
      const jsonString = this.exportToString();
      this.logger.info('Memory exported (string ready)', {
        context: LogContext.DATABASE,
        data: { filePath, size: jsonString.length },
      });
      return true;
    } catch (error) {
      this.logger.error('Export failed', {
        context: LogContext.DATABASE,
        error: error as Error,
        data: { filePath },
      });
      return false;
    }
  }

  async import(filePath: string): Promise<boolean> {
    // Kept for compatibility – you can wire real file read later.
    this.logger.warn('Import(filePath) is not implemented. Use importFromString(json).', {
      context: LogContext.DATABASE,
      data: { filePath },
    });
    return false;
  }

  async clear(type?: 'error' | 'fix' | 'pattern' | 'context'): Promise<void> {
    if (type) {
      this.memory.delete(type);
    } else {
      this.memory.clear();
      this.contexts.clear();
    }
    this.persistToStorage();
  }

  getStats(): { totalRecords: number; recordsByType: Record<string, number>; contextCount: number } {
    let totalRecords = 0;
    const recordsByType: Record<string, number> = {};

    for (const [type, records] of this.memory.entries()) {
      recordsByType[type] = records.length;
      totalRecords += records.length;
    }

    return { totalRecords, recordsByType, contextCount: this.contexts.size };
  }

  // ------------------- Private -------------------

  private persistToStorage(): void {
    if (!this.persistenceEnabled) return;
    try {
      const payload: PersistedDB = {
        v: this.STORAGE_VERSION,
        exportedAt: Date.now(),
        memory: Object.fromEntries(this.memory),
        contexts: Object.fromEntries(this.contexts),
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      this.logger.warn('Failed to persist memory to storage', {
        context: LogContext.DATABASE,
        error: e as Error,
      });
    }
  }

  private loadFromStorage(): void {
    if (!this.persistenceEnabled) return;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as PersistedDB;
      if (!parsed || typeof parsed !== 'object') return;

      const memObj = (parsed as any).memory;
      const ctxObj = (parsed as any).contexts;
      if (!memObj || typeof memObj !== 'object') return;

      this.memory = new Map(Object.entries(memObj));
      this.contexts = new Map(Object.entries(ctxObj || {}));
    } catch (e) {
      this.logger.warn('Failed to load memory from storage', {
        context: LogContext.DATABASE,
        error: e as Error,
      });
    }
  }

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private inferErrorTypeFromRecord(record: MemoryRecord): string | null {
    const msg =
      (record.data && (record.data.errorMessage || record.data.message || record.data.error)) ||
      '';
    if (typeof msg !== 'string' || !msg.trim()) return null;

    const lower = msg.toLowerCase();
    if (lower.includes('type') && lower.includes('assign')) return 'type-assignment';
    if (lower.includes('null')) return 'null-safety';
    if (lower.includes('import')) return 'missing-import';
    if (lower.includes('undefined')) return 'undefined';
    if (lower.includes('syntax')) return 'syntax';
    return 'general';
  }

  private normalizePathForProjectId(filePath: string): string[] {
    const p = String(filePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
    return p.split('/').filter(Boolean);
  }

  private extractProjectId(filePath: string, metadataProjectId?: string): string {
    if (metadataProjectId && metadataProjectId.trim()) return metadataProjectId;

    const parts = this.normalizePathForProjectId(filePath);
    // If paths are like "/src/App.tsx", first segment will be "src"
    // We treat first segment as project bucket; you can later replace this with workspaceId.
    return parts[0] || 'default';
  }

  private async updateProjectContext(record: MemoryRecord): Promise<void> {
    const filePath = record.metadata!.filePath!;
    const projectId = this.extractProjectId(filePath, record.metadata?.projectId);

    if (!this.contexts.has(projectId)) {
      this.contexts.set(projectId, {
        projectId,
        name: `Project_${projectId}`,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        totalErrors: 0,
        totalFixes: 0,
        successRate: 0,
        commonPatterns: [],
        recentActivity: [],
      });
    }

    const ctx = this.contexts.get(projectId)!;
    ctx.lastUpdated = Date.now();

    if (record.type === 'error') ctx.totalErrors++;
    if (record.type === 'fix') ctx.totalFixes++;

    // successRate by projectId
    if (record.type === 'fix') {
      const fixRecords = this.memory.get('fix') || [];
      const projectFixes = fixRecords.filter(r => {
        const p = r.metadata?.filePath;
        if (!p) return false;
        return this.extractProjectId(p, r.metadata?.projectId) === projectId;
      });

      const successful = projectFixes.filter(r => r.metadata?.success).length;
      ctx.successRate = projectFixes.length ? (successful / projectFixes.length) * 100 : 0;
    }

    // recent activity (cap 50)
    ctx.recentActivity.unshift(record);
    if (ctx.recentActivity.length > 50) ctx.recentActivity.pop();

    // update patterns
    ctx.commonPatterns = await this.getCommonPatterns(10);

    this.contexts.set(projectId, ctx);
  }
}