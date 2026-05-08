// src/core/ai/AIAgent.ts
// (الإصدار v3.0 – AI Software Engineer متكامل)

/**
 * AIAgent v3.0 – AI Software Engineer
 * 
 * - مهندس برمجي ذاتي: يخطط ويُنفذ ويتحقق ويُصلح الأخطاء تلقائياً.
 * - يفهم سياق المشروع الكامل (جميع الملفات، العلاقات، البنية).
 * - يستخدم أدوات (Tools) حقيقية: قراءة/كتابة الملفات، تشغيل أوامر، فحص أخطاء.
 * - يتكامل مع LLMGateway (تفكير) و TaskExecutor (تنفيذ).
 * - يدعم إنشاء مشاريع كاملة من وصف بسيط.
 * - حلقة تنفيذ ذاتية: Plan → Execute → Verify → Fix (إذا لزم) → Repeat.
 */

import { UnifiedLoggerClass, LogContext } from '../logger/UnifiedLogger';
import { LLMGateway, type LLMMessage } from '../llm/LLMGateway';
import { TaskExecutor } from '../executor/TaskExecutor';
import type { AIActionPlan, AIPlanStep, PlanActionType, EditOperation } from '../executor/TaskExecutor';
import { CommandRegistry } from '../commands/CommandRegistry';

// ---- أنواع محسّنة ----

export { PlanActionType, EditOperation };

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AIAnalysis {
  intent: string;
  confidence: number;
  description: string;
  suggestedStrategy?: string;
  affectedFiles: string[];
  riskLevel: RiskLevel;
  positives?: string[];
  negatives?: string[];
}

export interface AIVerificationPlan {
  level: 'none' | 'quick' | 'standard';
  commands: string[];
}

export { AIActionPlan, AIPlanStep };

export type AIAgentResult =
  | { kind: 'clarify'; questions: string[]; partialPlan?: Partial<AIActionPlan> }
  | { kind: 'plan'; plan: AIActionPlan }
  | { kind: 'error'; error: string };

export interface AIAgentOptions {
  /** الجذور المسموحة للملفات */
  allowedRoots: string[];
  /** أقصى عدد للخطوات في الخطة */
  maxSteps: number;
  /** أقصى محاولات لإعادة التخطيط عند الفشل */
  maxRetries: number;
}

const DEFAULT_OPTIONS: AIAgentOptions = {
  allowedRoots: ['src', 'public', 'lib', 'ai_collaborator', 'test_project', 'workspace'],
  maxSteps: 15,
  maxRetries: 3,
};

/**
 * وصف أداة (Tool) ليمررها الوكيل إلى LLM.
 * يمكن أن يمثل قراءة ملف، كتابة، تشغيل أمر، إلخ.
 */
interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, string>;
}

/**
 * نتيجة تنفيذ خطة من قبل الوكيل (بعد التنفيذ والتحقق).
 */
export interface AgentExecutionResult {
  success: boolean;
  plan: AIActionPlan;
  executionLog: string[];
  finalVerdict?: string;
}

export class AIAgent {
  private logger: UnifiedLoggerClass;
  private llm: LLMGateway;
  private executor: TaskExecutor | null = null;
  private opts: AIAgentOptions;

  /** أدوات مُمرّرة إلى LLM لتمكينه من طلب إجراءات محددة */
  private tools: ToolDefinition[] = [
    {
      name: 'read_file',
      description: 'قراءة محتوى ملف',
      parameters: { path: 'المسار النسبي للملف' },
    },
    {
      name: 'write_file',
      description: 'كتابة محتوى إلى ملف (إنشاء أو تعديل كامل)',
      parameters: { path: 'المسار النسبي', content: 'المحتوى' },
    },
    {
      name: 'list_directory',
      description: 'عرض محتويات مجلد',
      parameters: { path: 'مسار المجلد' },
    },
    {
      name: 'run_command',
      description: 'تشغيل أمر آمن (مثل npm test)',
      parameters: { command: 'الأمر' },
    },
  ];

  constructor(llm: LLMGateway, options: Partial<AIAgentOptions> = {}) {
    this.logger = UnifiedLoggerClass.getInstance();
    this.llm = llm;
    this.opts = { ...DEFAULT_OPTIONS, ...options };

    this.logger.info('AIAgent v3.0 initialized', {
      context: LogContext.AI,
      data: { allowedRoots: this.opts.allowedRoots, maxSteps: this.opts.maxSteps },
    });
  }

  /**
   * حقن منفذ الخطط لتمكين التنفيذ الذاتي.
   */
  setExecutor(executor: TaskExecutor): void {
    this.executor = executor;
    this.logger.info('TaskExecutor injected into AIAgent', { context: LogContext.AI });
  }

  // ---------- إنشاء خطة من طلب (مع سياق المشروع الكامل) ----------

  async createPlan(input: {
    request: string;
    context?: string;
    projectFiles?: { path: string; content: string }[];
    mode?: 'task' | 'fix';
    filePathHint?: string;
    errorMessage?: string;
    errorLine?: number;
  }): Promise<AIAgentResult> {
    const request = (input.request || '').trim();
    if (!request) return { kind: 'clarify', questions: ['اكتب الطلب بشكل واضح.'] };

    const mode = input.mode ?? (input.errorMessage ? 'fix' : 'task');

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input, mode);

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      const { value } = await this.llm.chatJSON<AIActionPlan>(messages, {
        validator: this.isAIActionPlan,
        repairHint: 'Return ONLY valid JSON matching the schema. All paths relative. No markdown.',
      });

      const planErrors = this.validatePlan(value);
      if (planErrors.length > 0) {
        return {
          kind: 'clarify',
          questions: ['الخطة المقترحة غير صالحة/تخالف القيود:', ...planErrors.map(e => `- ${e}`)],
          partialPlan: value,
        };
      }

      const clarification = this.extractClarificationQuestions(value);
      if (clarification.length > 0) {
        return { kind: 'clarify', questions: clarification, partialPlan: value };
      }

      return { kind: 'plan', plan: value };
    } catch (e) {
      this.logger.error('AIAgent.createPlan failed', { context: LogContext.AI, error: e as Error });
      return { kind: 'error', error: (e as Error).message };
    }
  }

  // ---------- تنفيذ خطة ذاتياً مع مراقبة وإعادة تخطيط ----------

  async executePlanAndVerify(plan: AIActionPlan, maxRetries: number = this.opts.maxRetries): Promise<AgentExecutionResult> {
    if (!this.executor) throw new Error('TaskExecutor not injected into AIAgent');

    const log: string[] = [];
    let currentPlan = plan;
    let attempt = 0;
    let finalSuccess = false;

    while (attempt < maxRetries) {
      attempt++;
      log.push(`🔁 المحاولة ${attempt}...`);

      const execResult = await this.executor.executePlan(currentPlan);
      log.push(`📋 التنفيذ: ${execResult.success ? 'نجح' : 'فشل'}. خطوات ناجحة: ${execResult.stepsSucceeded}/${execResult.stepsTotal}`);

      if (execResult.success) {
        finalSuccess = true;
        break;
      }

      // إعادة تخطيط بناءً على الأخطاء
      const errorSummary = execResult.results
        .filter(r => !r.success)
        .map(r => `الخطوة ${r.stepIndex + 1} (${r.step.action}): ${r.error}`)
        .join('\n');

      if (attempt < maxRetries) {
        log.push(`🔄 إعادة تخطيط بسبب الأخطاء...`);
        const retryPlan = await this.createPlan({
          request: `أصلح الأخطاء التالية:\n${errorSummary}`,
          mode: 'fix',
        });

        if (retryPlan.kind === 'plan') {
          currentPlan = retryPlan.plan;
        } else {
          log.push(`⚠️ تعذر إعادة التخطيط.`);
          break;
        }
      }
    }

    return {
      success: finalSuccess,
      plan: currentPlan,
      executionLog: log,
      finalVerdict: finalSuccess ? 'تمت المهمة بنجاح' : 'فشلت بعد عدة محاولات',
    };
  }

  // ---------- إنشاء مشروع كامل من وصف ----------

  async createProjectFromDescription(description: string): Promise<AgentExecutionResult> {
    const planResult = await this.createPlan({
      request: description,
      mode: 'task',
    });

    if (planResult.kind !== 'plan') {
      throw new Error('لم يتمكن الوكيل من إعداد خطة للمشروع.');
    }

    return this.executePlanAndVerify(planResult.plan);
  }

  // ---------- تحضير المطالبات ----------

  private buildSystemPrompt(): string {
    const toolDescriptions = this.tools.map(t => `- ${t.name}: ${t.description}`).join('\n');

    return [
      `أنت مهندس برمجيات خبير (AI Software Engineer).`,
      `مهمتك: فهم طلبات المستخدم، تحليل المشروع، وضع خطة دقيقة، وتنفيذها.`,
      ``,
      `الأدوات المتاحة لك (يمكنك طلبها في الخطة):`,
      toolDescriptions,
      ``,
      `يجب أن تخرج JSON فقط بالمخطط التالي:`,
      `{
        "analysis": {
          "intent": "FIX_ERROR|REFACTOR|ADD_FEATURE|OPTIMIZE|EXPLAIN|CREATE_PROJECT",
          "confidence": number,
          "description": string,
          "suggestedStrategy": string?,
          "affectedFiles": string[],
          "riskLevel": "LOW|MEDIUM|HIGH",
          "positives": string[]?,
          "negatives": string[]?
        },
        "steps": [
          { "action": "create_file|edit_file|read_file|list_directory|run_command",
            "targetFile": string?,
            "parameters": object?
          }
        ],
        "verification": { "level": "none|quick|standard", "commands": string[] }
      }`,
      ``,
      `قيود مشددة:`,
      `- كل المسارات نسبية وتبدأ بأحد الجذور: ${this.opts.allowedRoots.join(', ')}.`,
      `- لا تستخدم مسارات مطلقة أو "..".`,
      `- عدد الخطوات ≤ ${this.opts.maxSteps}.`,
      `- إذا احتجت معلومات غير متوفرة، أعد أسئلة استيضاحية في حقل "negatives" بصيغة سؤال (تنتهي بـ ?).`,
    ].join('\n');
  }

  private buildUserPrompt(input: any, mode: string): string {
    const projectFiles = input.projectFiles || [];
    let projectContext = '';
    if (projectFiles.length > 0) {
      projectContext = 'ملفات المشروع الحالية:\n' + projectFiles.map(f => `- ${f.path} (${f.content.length} حرف)`).join('\n');
    }

    return [
      `MODE: ${mode}`,
      input.context ? `CONTEXT:\n${input.context}` : '',
      projectContext,
      input.filePathHint ? `FILE_HINT: ${input.filePathHint}` : '',
      input.errorMessage ? `ERROR: ${input.errorMessage}` : '',
      typeof input.errorLine === 'number' ? `ERROR_LINE: ${input.errorLine}` : '',
      `REQUEST:\n${input.request}`,
      `\nتذكر: JSON فقط.`,
    ].filter(Boolean).join('\n');
  }

  // ---------- التحقق وتنظيف الخطة ----------

  private validatePlan(plan: AIActionPlan): string[] {
    const errs: string[] = [];
    if (!plan.steps || plan.steps.length === 0) errs.push('Plan has no steps.');
    if (plan.steps.length > this.opts.maxSteps) errs.push(`Too many steps: ${plan.steps.length}.`);

    for (const [i, step] of plan.steps.entries()) {
      if (!step || typeof step !== 'object') { errs.push(`Step ${i + 1}: invalid.`); continue; }
      const allowed = ['create_file', 'edit_file', 'read_file', 'list_directory', 'run_command'];
      if (!allowed.includes(step.action as string)) errs.push(`Step ${i + 1}: action not allowed: ${step.action}`);

      if (['create_file', 'edit_file', 'read_file'].includes(step.action)) {
        const p = String(step.targetFile || '');
        const pErr = this.validatePath(p);
        if (pErr) errs.push(`Step ${i + 1}: ${pErr}`);
      }

      if (step.action === 'run_command' && (step.parameters as any)?.shell === true) {
        errs.push(`Step ${i + 1}: shell=true not allowed`);
      }
    }
    return errs;
  }

  private validatePath(path: string): string | null {
    const p = (path || '').trim().replace(/\\/g, '/');
    if (!p) return 'targetFile is empty';
    if (p.startsWith('/') || /^[a-zA-Z]:/.test(p)) return 'absolute paths not allowed';
    if (p.includes('..')) return "path traversal '..' not allowed";
    const first = p.split('/').filter(Boolean)[0];
    if (!first || !this.opts.allowedRoots.includes(first)) {
      return `path must start with one of: ${this.opts.allowedRoots.join(', ')}`;
    }
    return null;
  }

  private extractClarificationQuestions(plan: AIActionPlan): string[] {
    const neg = plan.analysis?.negatives ?? [];
    return neg.filter(s => typeof s === 'string' && s.trim().endsWith('?'));
  }

  private isAIActionPlan(v: unknown): v is AIActionPlan {
    if (!v || typeof v !== 'object') return false;
    const obj = v as any;
    return (
      typeof obj.analysis?.intent === 'string' &&
      typeof obj.analysis?.confidence === 'number' &&
      Array.isArray(obj.steps) &&
      obj.steps.every((s: any) => s && typeof s.action === 'string') &&
      obj.verification && Array.isArray(obj.verification.commands)
    );
  }
}