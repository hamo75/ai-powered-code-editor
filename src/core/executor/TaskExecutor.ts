// ====================================================
// src/core/executor/TaskExecutor.ts
// ====================================================
// 
// المنفذ التنفيذي للخطط الصادرة عن AIAgent.
// يستقبل AIActionPlan وينفذ خطواته بالترتيب، مع آليات:
// - معالجة الأخطاء واحتواء الفشل
// - احترام جذور الملفات المسموحة
// - تسجيل تدقيق كامل
// - عزل تنفيذ أوامر shell (ممنوع في المتصفح)
// - إمكانية التوقف المبكر أو التراجع (لاحقًا)
// 
// يعتمد على: FileSystemService و CodeSandbox و LLMGateway
// ولا يعرف شيئًا عن React أو UI.
// ====================================================

import { UnifiedLoggerClass, LogContext } from '../logger/UnifiedLogger';
import { FileSystemService } from '../filesystem/FileSystemService';
import { CodeSandbox } from '../sandbox/CodeSandbox';
import { LLMGateway } from '../llm/LLMGateway';
import { AIActionPlan, AIPlanStep, PlanActionType, EditOperation } from '../ai/AIAgent';
import { CommandRegistry } from '../commands/CommandRegistry'; // للاستفادة من أوامر النظام المسجلة

// أنواع إضافية للتحكم في التنفيذ
export type ExecutionStrategy = 'fail_fast' | 'continue_on_error' | 'skip_failed';

export interface TaskExecutorOptions {
  /** مسموح به: fail_fast (افتراضي) | continue_on_error | skip_failed */
  strategy: ExecutionStrategy;
  /** وقت أقصى لتنفيذ كل خطوة (مللي ثانية) */
  stepTimeout: number;
  /** جذور المسارات المسموحة للتعديل (موروثة من AIAgent) */
  allowedRoots: string[];
  /** هل يسمح بتنفيذ أوامر shell? في المتصفح دائمًا false */
  allowShellCommands: boolean;
}

export interface StepExecutionResult {
  stepIndex: number;
  step: AIPlanStep;
  success: boolean;
  error?: string;
  data?: unknown;
}

export interface ExecutionResult {
  success: boolean;
  stepsTotal: number;
  stepsSucceeded: number;
  stepsFailed: number;
  results: StepExecutionResult[];
  logs: string[];
}

const DEFAULT_OPTIONS: TaskExecutorOptions = {
  strategy: 'fail_fast',
  stepTimeout: 10000,
  allowedRoots: ['src', 'public', 'lib', 'ai_collaborator', 'test_project'],
  allowShellCommands: false,
};

export class TaskExecutor {
  private logger: UnifiedLoggerClass;
  private fileSystem: FileSystemService;
  private sandbox: CodeSandbox;
  private llm: LLMGateway;
  private registry: CommandRegistry;
  private options: TaskExecutorOptions;

  constructor(
    fileSystem: FileSystemService,
    sandbox: CodeSandbox,
    llm: LLMGateway,
    registry: CommandRegistry,
    options: Partial<TaskExecutorOptions> = {}
  ) {
    this.logger = UnifiedLoggerClass.getInstance();
    this.fileSystem = fileSystem;
    this.sandbox = sandbox;
    this.llm = llm;
    this.registry = registry;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // تأكيد منع shell في المتصفح
    if (typeof window !== 'undefined') {
      this.options.allowShellCommands = false;
    }
  }

  /**
   * تنفيذ خطة كاملة.
   * @returns ExecutionResult يحتوي على تفاصيل كل خطوة.
   */
  async executePlan(plan: AIActionPlan): Promise<ExecutionResult> {
    const logs: string[] = [];
    const results: StepExecutionResult[] = [];
    let failed = 0;
    let succeeded = 0;

    this.logger.info('TaskExecutor: plan execution started', {
      context: LogContext.EXECUTOR,
      data: { stepsCount: plan.steps.length },
    });

    for (const [index, step] of plan.steps.entries()) {
      // التوقف المبكر في وضع fail_fast إذا فشلت خطوة
      if (this.options.strategy === 'fail_fast' && failed > 0) {
        logs.push(`Skipping remaining steps due to fail_fast strategy.`);
        break;
      }

      const stepResult = await this.executeStep(step, index);
      results.push(stepResult);
      
      if (stepResult.success) {
        succeeded++;
        logs.push(`Step ${index + 1}: OK`);
      } else {
        failed++;
        logs.push(`Step ${index + 1}: FAILED - ${stepResult.error || 'unknown'}`);

        if (this.options.strategy === 'fail_fast') {
          // لن نكمل
          break;
        }
        // continue_on_error أو skip_failed: نكمل
      }
    }

    const finalResult: ExecutionResult = {
      success: failed === 0,
      stepsTotal: results.length,
      stepsSucceeded: succeeded,
      stepsFailed: failed,
      results,
      logs,
    };

    this.logger.info('TaskExecutor: plan execution finished', {
      context: LogContext.EXECUTOR,
      data: { succeeded, failed },
    });

    return finalResult;
  }

  // ---------- تنفيذ خطوة واحدة ----------
  private async executeStep(step: AIPlanStep, index: number): Promise<StepExecutionResult> {
    this.logger.debug(`Executing step ${index + 1}: ${step.action} on ${step.targetFile || 'none'}`, {
      context: LogContext.EXECUTOR,
    });

    try {
      let resultData: unknown = undefined;

      switch (step.action as PlanActionType) {
        case 'create_file':
          resultData = await this.handleCreateFile(step);
          break;
        case 'edit_file':
          resultData = await this.handleEditFile(step);
          break;
        case 'read_file':
          resultData = await this.handleReadFile(step);
          break;
        case 'stat_path':
          resultData = await this.handleStatPath(step);
          break;
        case 'list_directory':
          resultData = await this.handleListDirectory(step);
          break;
        case 'run_command':
          resultData = await this.handleRunCommand(step);
          break;
        default:
          throw new Error(`Unknown action: ${step.action}`);
      }

      return {
        stepIndex: index,
        step,
        success: true,
        data: resultData,
      };
    } catch (error: any) {
      this.logger.error(`Step ${index + 1} failed: ${error.message}`, {
        context: LogContext.EXECUTOR,
        error,
      });
      return {
        stepIndex: index,
        step,
        success: false,
        error: error.message,
      };
    }
  }

  // --- معالجات الإجراءات الفردية ---

  private async handleCreateFile(step: AIPlanStep): Promise<{ path: string }> {
    const path = this.validatePath(step.targetFile);
    const content = (step.parameters as any)?.content || '';
    await this.fileSystem.writeFile(path, content, { createBackup: false });
    this.logger.info(`File created: ${path}`, { context: LogContext.EXECUTOR });
    return { path };
  }

  private async handleEditFile(step: AIPlanStep): Promise<{ path: string; appliedEdits: number }> {
    const path = this.validatePath(step.targetFile);
    const edits = (step.parameters as any)?.edits;
    if (!Array.isArray(edits) || edits.length === 0) {
      throw new Error('edit_file requires parameters.edits array');
    }

    let currentContent = await this.fileSystem.readFile(path);
    if (currentContent === undefined || currentContent === null) {
      throw new Error(`File not found: ${path}`);
    }

    let appliedCount = 0;
    for (const edit of edits as EditOperation[]) {
      const result = this.applySingleEdit(currentContent, edit);
      if (result.changed) {
        currentContent = result.content;
        appliedCount++;
      } else {
        this.logger.warn(`Edit not applied (no change): ${edit.type}`, {
          context: LogContext.EXECUTOR,
          data: edit,
        });
      }
    }

    await this.fileSystem.writeFile(path, currentContent, { createBackup: true });
    this.logger.info(`File edited: ${path} (${appliedCount} edits)`, {
      context: LogContext.EXECUTOR,
    });

    return { path, appliedEdits: appliedCount };
  }

  private async handleReadFile(step: AIPlanStep): Promise<{ content: string }> {
    const path = this.validatePath(step.targetFile);
    const content = await this.fileSystem.readFile(path);
    if (content == null) throw new Error(`File not found: ${path}`);
    return { content };
  }

  private async handleStatPath(step: AIPlanStep): Promise<{ exists: boolean; isDirectory?: boolean }> {
    const path = this.validatePath(step.targetFile);
    // استخدام دالة مناسبة (إن وجدت) للتحقق من حالة المسار
    const exists = await this.fileSystem.fileExists(path);
    return { exists, isDirectory: false };
  }

  private async handleListDirectory(step: AIPlanStep): Promise<{ items: string[] }> {
    const path = this.validatePath(step.targetFile || '.');
    const items = await this.fileSystem.listDirectory(path);
    return { items };
  }

  private async handleRunCommand(step: AIPlanStep): Promise<{ command: string; output?: string }> {
    if (!this.options.allowShellCommands) {
      throw new Error('Shell commands are not allowed in browser environment.');
    }
    const command = (step.parameters as any)?.command;
    if (!command || typeof command !== 'string') {
      throw new Error('run_command requires parameters.command');
    }
    // في بيئة خلفية حقيقية، هنا ستستدعي تنفيذ shell
    // حاليًا نرفض التنفيذ
    this.logger.warn(`Shell command blocked: ${command}`, { context: LogContext.EXECUTOR });
    return { command, output: '[blocked]' };
  }

  // ---------- تطبيق تعديل واحد على النص ----------
  private applySingleEdit(
    content: string,
    edit: EditOperation
  ): { content: string; changed: boolean } {
    switch (edit.type) {
      case 'replace_exact': {
        const count = edit.count ?? 1;
        const index = content.indexOf(edit.old);
        if (index === -1) return { content, changed: false };
        let newContent = content;
        for (let i = 0; i < count && newContent.includes(edit.old); i++) {
          newContent = newContent.replace(edit.old, edit.new);
        }
        return { content: newContent, changed: newContent !== content };
      }
      case 'replace_all': {
        if (!content.includes(edit.old)) return { content, changed: false };
        const newContent = content.split(edit.old).join(edit.new);
        return { content: newContent, changed: newContent !== content };
      }
      case 'insert_line': {
        const lines = content.split('\n');
        if (edit.line < 0 || edit.line > lines.length) return { content, changed: false };
        lines.splice(edit.line, 0, edit.text);
        return { content: lines.join('\n'), changed: true };
      }
      case 'delete_line': {
        const lines = content.split('\n');
        if (edit.line < 0 || edit.line >= lines.length) return { content, changed: false };
        lines.splice(edit.line, 1);
        return { content: lines.join('\n'), changed: true };
      }
      default:
        return { content, changed: false };
    }
  }

  // ---------- التحقق من المسار ----------
  private validatePath(path?: string): string {
    if (!path) throw new Error('targetFile is required');
    const p = path.trim().replace(/\\/g, '/');
    if (p.startsWith('/') || /^[a-zA-Z]:/.test(p)) {
      throw new Error('Absolute paths are not allowed');
    }
    if (p.includes('..')) {
      throw new Error('Path traversal detected');
    }
    const root = p.split('/').filter(Boolean)[0];
    if (!root || !this.options.allowedRoots.includes(root)) {
      throw new Error(`Path root '${root}' not in allowed roots: ${this.options.allowedRoots.join(', ')}`);
    }
    return p;
  }
}