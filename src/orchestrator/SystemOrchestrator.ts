// src/orchestrator/SystemOrchestrator.ts
// (الإصدار v3.0 – مع TaskExecutor وخطة التنفيذ الموحّدة)

/**
 * SystemOrchestrator v3.0
 * 
 * المنسق المركزي النهائي الذي يضم:
 * - جميع خدمات النظام (FileSystem, AI, Monitoring, Database)
 * - سجل الأوامر الموحّد (CommandRegistry)
 * - منفذ الخطط (TaskExecutor)
 * - ربط الأوامر الذكية (fix, refactor, build…) بالتنفيذ الفعلي
 */

import { UnifiedLogger, LogContext } from './core/logger/UnifiedLogger';
import { FileSystemService } from './core/filesystem/FileSystemService';
import { DartParser } from './core/parser/DartParser';
import { CodeSandbox } from './core/sandbox/CodeSandbox';
import { SurgicalFixEngine } from './core/fix/SurgicalFixEngine';
import { AIAgent } from './core/ai/AIAgent';
import { AutoHealerService } from './core/monitor/AutoHealerService';
import { InteractiveDashboard } from './core/monitor/InteractiveDashboard';
import { MonitorOrchestrator } from './core/monitor/MonitorOrchestrator';
import { LocalMemoryDatabase } from './core/database/LocalMemoryDatabase';
import { LLMGateway } from './core/llm/LLMGateway';

// الإضافات الجديدة
import { CommandRegistry } from './core/commands/CommandRegistry';
import { registerDefaultCommands } from './core/commands/defaultCommands';
import { TaskExecutor } from './core/executor/TaskExecutor';
import type { AIActionPlan } from './core/ai/AIAgent';

export interface OrchestratorConfig {
  projectName: string;
  rootPath: string;
  autoHealEnabled: boolean;
  llmProvider: 'openai' | 'anthropic' | 'local' | 'mock';
  llmApiKey?: string;
  dashboardEnabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface SystemStatus {
  isRunning: boolean;
  components: {
    fileSystem: boolean;
    parser: boolean;
    sandbox: boolean;
    fixEngine: boolean;
    aiAgent: boolean;
    autoHealer: boolean;
    dashboard: boolean;
    database: boolean;
    llmGateway: boolean;
    commandRegistry: boolean;
    taskExecutor: boolean;
  };
  stats: {
    filesMonitored: number;
    errorsDetected: number;
    fixesApplied: number;
    successRate: number;
    uptime: number;
  };
}

type StartFlags = {
  autoHealerStarted: boolean;
  dashboardStarted: boolean;
  monitorStarted: boolean;
};

export class SystemOrchestrator {
  private logger: UnifiedLogger;
  private config: OrchestratorConfig;
  private startTime: number;

  // Core Services
  public fileSystem: FileSystemService;
  public parser: DartParser;
  public sandbox: CodeSandbox;

  // AI & Fix Services
  public fixEngine: SurgicalFixEngine;
  public aiAgent: AIAgent;
  public llmGateway: LLMGateway;

  // Monitoring & UI
  public autoHealer: AutoHealerService;
  public dashboard: InteractiveDashboard;
  public monitorOrchestrator: MonitorOrchestrator;

  // Database
  public memory: LocalMemoryDatabase;

  // Command & Execution (جديد)
  public readonly commandRegistry: CommandRegistry;
  public readonly taskExecutor: TaskExecutor;

  private isRunning: boolean;
  private started: StartFlags;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = this.normalizeConfig(config);
    this.logger = new UnifiedLogger('SystemOrchestrator');
    this.startTime = Date.now();
    this.isRunning = false;
    this.started = {
      autoHealerStarted: false,
      dashboardStarted: false,
      monitorStarted: false,
    };

    // ---- تهيئة الخدمات الأساسية ----
    this.fileSystem = new FileSystemService(this.config.rootPath);
    this.parser = new DartParser();
    this.sandbox = new CodeSandbox(this.fileSystem, this.parser);

    this.llmGateway = new LLMGateway({
      provider: this.config.llmProvider,
      apiKey: this.config.llmApiKey,
    });

    this.aiAgent = new AIAgent(this.llmGateway);

    // SurgicalFixEngine يتلقى LLM و AIAgent للاستراتيجيات الذكية
    this.fixEngine = new SurgicalFixEngine(this.llmGateway, this.aiAgent);

    this.memory = new LocalMemoryDatabase();

    this.autoHealer = new AutoHealerService(
      this.fileSystem,
      this.fixEngine,
      this.memory
    );

    this.dashboard = new InteractiveDashboard();

    this.monitorOrchestrator = new MonitorOrchestrator(
      this.autoHealer,
      this.dashboard,
      this.memory
    );

    // ---- سجل الأوامر ----
    this.commandRegistry = CommandRegistry.getInstance();

    // ---- منفذ الخطط ----
    this.taskExecutor = new TaskExecutor(
      this.fileSystem,
      this.sandbox,
      this.llmGateway,
      this.commandRegistry,
      {
        allowedRoots: ['src', 'public', 'lib', 'ai_collaborator', 'test_project', 'workspace'],
      }
    );

    this.logger.info('SystemOrchestrator created (v3.0)', {
      context: LogContext.SYSTEM,
      data: this.getSafeConfigForLogs(),
    });
  }

  /**
   * بدء تشغيل النظام
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('System already running', { context: LogContext.SYSTEM });
      return;
    }

    this.logger.info('Starting system...', {
      context: LogContext.SYSTEM,
      data: { projectName: this.config.projectName },
    });

    try {
      if (this.config.autoHealEnabled) {
        await this.autoHealer.start();
        this.started.autoHealerStarted = true;
      }

      if (this.config.dashboardEnabled) {
        await this.dashboard.start();
        this.started.dashboardStarted = true;
      }

      await this.monitorOrchestrator.start();
      this.started.monitorStarted = true;

      // تسجيل الأوامر الافتراضية (تتضمن أوامر AI التي تستخدم taskExecutor)
      registerDefaultCommands(this.commandRegistry, this);

      this.isRunning = true;

      this.logger.info('System started successfully', {
        context: LogContext.SYSTEM,
        data: this.getStatus(),
      });
    } catch (error) {
      this.logger.error('Failed to start system', {
        context: LogContext.SYSTEM,
        error: error as Error,
        data: { started: { ...this.started } },
      });

      try {
        await this.stop();
      } catch {
        // تجاهل
      }

      throw error;
    }
  }

  /**
   * إيقاف النظام
   */
  async stop(): Promise<void> {
    if (!this.isRunning && !this.started.monitorStarted) {
      return;
    }

    this.logger.info('Stopping system...', { context: LogContext.SYSTEM });

    const tasks: Promise<unknown>[] = [];

    if (this.started.monitorStarted) {
      tasks.push(
        this.monitorOrchestrator.stop().catch(err =>
          this.logger.error('Failed to stop MonitorOrchestrator', {
            context: LogContext.SYSTEM,
            error: err as Error,
          })
        )
      );
    }

    if (this.started.dashboardStarted) {
      tasks.push(
        this.dashboard.stop().catch(err =>
          this.logger.error('Failed to stop Dashboard', {
            context: LogContext.SYSTEM,
            error: err as Error,
          })
        )
      );
    }

    if (this.started.autoHealerStarted) {
      tasks.push(
        this.autoHealer.stop().catch(err =>
          this.logger.error('Failed to stop AutoHealer', {
            context: LogContext.SYSTEM,
            error: err as Error,
          })
        )
      );
    }

    await Promise.allSettled(tasks);

    this.started = {
      autoHealerStarted: false,
      dashboardStarted: false,
      monitorStarted: false,
    };
    this.isRunning = false;

    this.logger.info('System stopped', {
      context: LogContext.SYSTEM,
      data: { uptime: Date.now() - this.startTime },
    });
  }

  // ---------- واجهة موحدة لتنفيذ الخطط (AI) ----------

  /**
   * إنشاء خطة من طلب مستخدم ثم تنفيذها فوراً.
   * هذه هي الدالة الأساسية التي تستخدمها الأوامر الذكية.
   */
  async planAndExecute(request: string, filePathHint?: string): Promise<{
    plan: AIActionPlan;
    execution: { success: boolean; errors: string[] };
  }> {
    this.logger.info('planAndExecute started', {
      context: LogContext.AI,
      data: { request, filePathHint },
    });

    // الخطوة 1: إنشاء خطة
    const planResult = await this.aiAgent.createPlan({
      request,
      filePathHint,
      mode: 'task',
    });

    if (planResult.kind === 'error') {
      throw new Error(`Planning failed: ${planResult.error}`);
    }

    if (planResult.kind === 'clarify') {
      // نعيد أسئلة توضيحية (يمكن للمستخدم الإجابة ثم إعادة المحاولة)
      throw new Error(`Clarification needed: ${planResult.questions.join(' | ')}`);
    }

    const plan = (planResult as { kind: 'plan'; plan: AIActionPlan }).plan;

    // الخطوة 2: تنفيذ الخطة
    const execResult = await this.taskExecutor.executePlan(plan);

    // حفظ الخطة والنتيجة في الذاكرة
    await this.memory.save({
      type: 'execution',
      data: { request, plan, execution: execResult },
      metadata: {
        success: execResult.success,
        stepsTotal: execResult.stepsTotal,
        stepsSucceeded: execResult.stepsSucceeded,
      },
    });

    return { plan, execution: execResult };
  }

  /**
   * تنفيذ خطة جاهزة (عندما تكون الخطة موجودة مسبقاً).
   */
  async executeExistingPlan(plan: AIActionPlan) {
    const execResult = await this.taskExecutor.executePlan(plan);
    return execResult;
  }

  // ---------- واجهة إصلاح الملفات (محسّنة) ----------

  async fixFile(filePath: string, errorContext?: string): Promise<boolean> {
    this.logger.info('Fixing file...', {
      context: LogContext.FIX,
      data: { filePath, hasErrorContext: Boolean(errorContext) },
    });

    try {
      const result = await this.fixEngine.analyzeAndFix(filePath, errorContext);

      await this.memory.save({
        type: 'fix',
        data: { filePath, result },
        metadata: {
          filePath,
          strategy: result.strategyUsed,
          success: result.success,
          confidence: result.confidence,
        },
      });

      return result.success;
    } catch (error) {
      this.logger.error('File fix failed', {
        context: LogContext.FIX,
        error: error as Error,
        data: { filePath },
      });
      return false;
    }
  }

  async analyzeCode(code: string, language: string = 'dart') {
    this.logger.info('Analyzing code...', {
      context: LogContext.AI,
      data: { language, codeLength: code.length },
    });

    try {
      const suggestions = await this.llmGateway.analyzeCode({ code, language });
      return suggestions;
    } catch (error) {
      this.logger.error('Code analysis failed', {
        context: LogContext.AI,
        error: error as Error,
      });
      return [];
    }
  }

  // ---------- عمليات الملفات المباشرة (للأوامر) ----------
  
  async createFile(path: string, content: string): Promise<boolean> {
    try {
      await this.fileSystem.writeFile(path, content, { createBackup: false });
      return true;
    } catch {
      return false;
    }
  }

  async readFile(path: string): Promise<string | null> {
    const content = await this.fileSystem.readFile(path);
    return content ?? null;
  }

  // ---------- حالة النظام ----------

  getStatus(): SystemStatus {
    const uptime = Date.now() - this.startTime;
    const dbStats = this.memory.getStats();

    return {
      isRunning: this.isRunning,
      components: {
        fileSystem: true,
        parser: true,
        sandbox: true,
        fixEngine: true,
        aiAgent: true,
        autoHealer: this.config.autoHealEnabled,
        dashboard: this.config.dashboardEnabled,
        database: true,
        llmGateway: true,
        commandRegistry: true,
        taskExecutor: true,
      },
      stats: {
        filesMonitored: this.autoHealer.getWatchedFiles().length,
        errorsDetected: dbStats.recordsByType['error'] || 0,
        fixesApplied: dbStats.recordsByType['fix'] || 0,
        successRate: this.calculateSuccessRate(),
        uptime,
      },
    };
  }

  async generateReport(): Promise<string> {
    const status = this.getStatus();
    const patterns = await this.memory.getCommonPatterns(10);
    const strategyRates = await this.memory.getStrategySuccessRates();

    const activeComponents = Object.entries(status.components)
      .filter(([_, active]) => active)
      .map(([name]) => `- ${name}: نشط`)
      .join('\n');

    return `
# تقرير نظام AI المتكامل
## تاريخ: ${new Date().toISOString()}

### حالة النظام
- الحالة: ${status.isRunning ? 'يعمل' : 'متوقف'}
- مدة التشغيل: ${Math.floor(status.stats.uptime / 1000)} ثانية

### المكونات النشطة
${activeComponents || '- لا يوجد'}

### الإحصائيات
- ملفات تحت المراقبة: ${status.stats.filesMonitored}
- أخطاء تم اكتشافها: ${status.stats.errorsDetected}
- إصلاحات تم تطبيقها: ${status.stats.fixesApplied}
- معدل النجاح: ${status.stats.successRate.toFixed(2)}%

### الأنماط الشائعة
${patterns.length ? patterns.map(p => `- ${p.pattern}: ${p.count} مرة`).join('\n') : '- لا يوجد'}

### أداء الاستراتيجيات
${
  Array.from(strategyRates.entries()).length
    ? Array.from(strategyRates.entries())
        .map(([strategy, rate]) => `- ${strategy}: ${rate.toFixed(1)}%`)
        .join('\n')
    : '- لا يوجد'
}
`;
  }

  // ==================== Private Methods ====================

  private normalizeConfig(config: Partial<OrchestratorConfig>): OrchestratorConfig {
    return {
      projectName: 'DefaultProject',
      rootPath: './workspace',
      autoHealEnabled: true,
      llmProvider: 'mock',
      llmApiKey: undefined,
      dashboardEnabled: true,
      logLevel: 'info',
      ...config,
    };
  }

  private getSafeConfigForLogs() {
    return {
      projectName: this.config.projectName,
      rootPath: this.config.rootPath,
      autoHealEnabled: this.config.autoHealEnabled,
      llmProvider: this.config.llmProvider,
      dashboardEnabled: this.config.dashboardEnabled,
      logLevel: this.config.logLevel,
      llmApiKey: this.config.llmApiKey ? '***' : undefined,
    };
  }

  private calculateSuccessRate(): number {
    const fixRecords = this.memory.query({ type: 'fix' });
    if (fixRecords.length === 0) return 0;

    const successfulFixes = fixRecords.filter(r => r.metadata?.success === true).length;
    return Math.round((successfulFixes / fixRecords.length) * 100 * 100) / 100;
  }
}

// دالة مساعدة لإنشاء وتشغيل النظام بسرعة
export async function createAndStartSystem(
  config: Partial<OrchestratorConfig> = {}
): Promise<SystemOrchestrator> {
  const orchestrator = new SystemOrchestrator(config);
  await orchestrator.start();
  return orchestrator;
}