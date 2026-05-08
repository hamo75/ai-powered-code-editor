// src/core/fix/SurgicalFixEngine.ts
// (نسخة مطوّرة – AI-First Hybrid Fix Engine)

/**
 * SurgicalFixEngine v3.0 – Hybrid Fix Engine (AI-First)
 * 
 * يستخدم الذكاء الاصطناعي (عبر LLMGateway و AIAgent) لتوليد إصلاحات ديناميكية
 * لأي لغة، مع استراتيجيات ثابتة كخيار احتياطي.
 * 
 * التحقق من الصحة عبر CodeSandbox.
 * النسخ الاحتياطي عبر FileSystemService.
 */

import { DartParserClass, FunctionBounds } from '../parser/DartParser';
import { CodeSandboxClass, ExecutionResult } from '../sandbox/CodeSandbox';
import { FileSystemServiceClass } from '../filesystem/FileSystemService';
import { UnifiedLoggerClass, LogContext } from '../logger/UnifiedLogger';
import { LLMGateway, FixSuggestion } from '../llm/LLMGateway';
import { AIAgent, AIActionPlan } from '../ai/AIAgent';

// ---- الأنواع ----

export interface FixStrategy {
  id: string;
  name: string;
  description: string;
  /** يمكن أن تكون sync أو async (للاستراتيجيات التي تحتاج LLM) */
  apply: (code: string, errorContext: any) => string | Promise<string>;
}

export interface SurgicalFixRequest {
  filePath: string;
  errorMessage: string;
  errorLine?: number;
  errorColumn?: number;
  suggestedFix?: string;
  context?: any;
  /** خطة من AIAgent يمكن تنفيذها بدلاً من الاستراتيجيات (اختياري) */
  plan?: AIActionPlan;
}

export interface SurgicalFixResult {
  success: boolean;
  applied: boolean;
  originalCode: string;
  fixedCode: string;
  strategyUsed: string;
  confidence: number;
  sandboxResult: ExecutionResult;
  attempts: number;
  backupPath?: string;
}

// ---- المحرك ----

export class SurgicalFixEngine {
  private parser: DartParserClass;
  private sandbox: CodeSandboxClass;
  private fileSystem: FileSystemServiceClass;
  private logger: UnifiedLoggerClass;
  private strategies: Map<string, FixStrategy>;
  
  // التبعيات الجديدة
  private llmGateway: LLMGateway | null = null;
  private aiAgent: AIAgent | null = null;

  constructor(
    llmGateway?: LLMGateway,
    aiAgent?: AIAgent
  ) {
    this.parser = new DartParserClass();
    this.sandbox = new CodeSandboxClass();
    this.fileSystem = new FileSystemServiceClass();
    this.logger = UnifiedLoggerClass.getInstance();
    this.strategies = new Map();
    
    // حقن تبعيات الذكاء الاصطناعي (اختياري للتوافق مع الاستخدام القديم)
    this.llmGateway = llmGateway || null;
    this.aiAgent = aiAgent || null;
    
    this.initializeStrategies();
  }

  /**
   * حقن أو تحديث تبعيات الذكاء الاصطناعي بعد الإنشاء
   */
  setAIDependencies(llmGateway: LLMGateway, aiAgent: AIAgent): void {
    this.llmGateway = llmGateway;
    this.aiAgent = aiAgent;
    // إضافة استراتيجية AI إذا لم تكن موجودة
    if (!this.strategies.has('ai-generated')) {
      this.strategies.set('ai-generated', {
        id: 'ai-generated',
        name: 'AI-Generated Fix',
        description: 'يستخدم LLM لتوليد إصلاح ديناميكي',
        apply: (code, ctx) => this.applyAIFix(code, ctx),
      });
    }
    this.logger.info('AI dependencies injected into SurgicalFixEngine', {
      context: LogContext.CORE,
    });
  }

  // ---- تهيئة الاستراتيجيات ----

  private initializeStrategies(): void {
    // الاستراتيجيات الثابتة (Dart أساساً، لكن يمكن تعميمها)
    this.strategies.set('null-safety', {
      id: 'null-safety',
      name: 'Null Safety Injection',
      description: 'يضيف فحوصات null وقيم افتراضية',
      apply: (code, ctx) => this.applyNullSafety(code, ctx),
    });

    this.strategies.set('type-correction', {
      id: 'type-correction',
      name: 'Type Correction',
      description: 'يصحح أخطاء توافق الأنواع',
      apply: (code, ctx) => this.applyTypeCorrection(code, ctx),
    });

    this.strategies.set('async-fix', {
      id: 'async-fix',
      name: 'Async/Await Correction',
      description: 'يضيف كلمات async/await الناقصة',
      apply: (code, ctx) => this.applyAsyncFix(code, ctx),
    });

    this.strategies.set('import-fix', {
      id: 'import-fix',
      name: 'Import Resolution',
      description: 'يضيف استيرادات missing',
      apply: (code, ctx) => this.applyImportFix(code, ctx),
    });

    this.strategies.set('syntax-patch', {
      id: 'syntax-patch',
      name: 'Syntax Patching',
      description: 'يصلح أخطاء نحوية شائعة',
      apply: (code, ctx) => this.applySyntaxPatch(code, ctx),
    });

    // استراتيجية AI (تضاف فقط إذا توفرت تبعيات LLM)
    if (this.llmGateway) {
      this.strategies.set('ai-generated', {
        id: 'ai-generated',
        name: 'AI-Generated Fix',
        description: 'يستخدم LLM لتوليد إصلاح ديناميكي',
        apply: (code, ctx) => this.applyAIFix(code, ctx),
      });
    }

    this.logger.info('SurgicalFixEngine strategies initialized', {
      context: LogContext.CORE,
      data: {
        strategyCount: this.strategies.size,
        aiEnabled: !!this.llmGateway,
      },
    });
  }

  // ---- التنفيذ الرئيسي ----

  public async analyzeAndFix(
    filePath: string,
    errorContext?: string
  ): Promise<SurgicalFixResult> {
    return this.executeFix({
      filePath,
      errorMessage: errorContext || 'Unknown error',
      context: { errorContext },
    });
  }

  public async executeFix(request: SurgicalFixRequest): Promise<SurgicalFixResult> {
    const logId = this.logger.startOperation('SurgicalFix.execute', LogContext.CORE);

    try {
      const originalCode = await this.fileSystem.readFile(request.filePath);
      if (!originalCode) throw new Error(`File not found: ${request.filePath}`);

      let currentCode = originalCode;
      let attempt = 0;
      let bestResult: ExecutionResult | null = null;
      let selectedStrategy = 'none';
      const maxAttempts = 5; // زيادة للسماح بإعادة محاولة AI

      // تحديد نطاق الإصلاح (دالة محددة)
      const scope = request.errorLine
        ? await this.parser.findFunctionAtLine(originalCode, request.errorLine)
        : null;

      // ترتيب الاستراتيجيات: AI أولاً إذا كانت متاحة، ثم الثابتة
      const strategySequence = this.getStrategySequence(request);

      while (attempt < maxAttempts) {
        attempt++;
        const strategyId = this.selectStrategyFromSequence(strategySequence, attempt, bestResult);
        const strategy = this.strategies.get(strategyId);

        if (!strategy) break;
        selectedStrategy = strategy.name;

        this.logger.debug(`Attempt ${attempt}: trying strategy "${strategy.name}"`, {
          context: LogContext.CORE,
        });

        // تطبيق الاستراتيجية (يمكن أن تكون async للاستراتيجيات المدعومة بالذكاء الاصطناعي)
        let fixedCode: string;
        try {
          const result = strategy.apply(currentCode, {
            ...request.context,
            errorMessage: request.errorMessage,
            errorLine: request.errorLine,
            scope,
          });
          fixedCode = result instanceof Promise ? await result : result;
        } catch (err) {
          this.logger.warn(`Strategy "${strategy.name}" threw error`, {
            context: LogContext.CORE,
            error: err as Error,
          });
          continue;
        }

        // التحقق من الصحة
        const sandboxResult = await this.sandbox.validate(fixedCode, {
          filePath: request.filePath,
          expectedNoErrors: true,
        });

        // تقييم النتيجة
        if (sandboxResult.isValid && sandboxResult.confidence > 0.8) {
          bestResult = sandboxResult;
          currentCode = fixedCode;
          break;
        } else {
          // تحديث أفضل نتيجة حتى الآن (قد تكون أقل جودة لكنها الأفضل المتاحة)
          if (!bestResult || sandboxResult.confidence > bestResult.confidence) {
            bestResult = sandboxResult;
            currentCode = fixedCode;
          }
          
          // إذا لم يطرأ تغيير، لا داعي للمتابعة
          if (fixedCode === originalCode) break;
        }
      }

      if (!bestResult || !bestResult.isValid) {
        throw new Error('Could not generate a valid fix');
      }

      // تطبيق الإصلاح (مع نسخ احتياطي)
      const backupPath = await this.fileSystem.writeFile(
        request.filePath,
        currentCode,
        { createBackup: true }
      );

      this.logger.endOperation(logId, {
        success: true,
        strategy: selectedStrategy,
        attempts: attempt,
      });

      return {
        success: true,
        applied: true,
        originalCode,
        fixedCode: currentCode,
        strategyUsed: selectedStrategy,
        confidence: bestResult.confidence,
        sandboxResult: bestResult,
        attempts: attempt,
        backupPath,
      };
    } catch (error: any) {
      this.logger.error('SurgicalFix failed', LogContext.CORE, error);
      this.logger.endOperation(logId, { success: false, error: error.message });

      return {
        success: false,
        applied: false,
        originalCode: '',
        fixedCode: '',
        strategyUsed: 'none',
        confidence: 0,
        sandboxResult: { isValid: false, confidence: 0, errors: [error.message] },
        attempts: 0,
      };
    }
  }

  // ---- ترتيب الاستراتيجيات ----

  private getStrategySequence(request: SurgicalFixRequest): string[] {
    const sequence: string[] = [];
    
    // 1) إذا توفر LLM، ابدأ بالذكاء الاصطناعي
    if (this.llmGateway) {
      sequence.push('ai-generated');
    }
    
    // 2) استراتيجيات محددة بناءً على رسالة الخطأ
    const lowerMsg = (request.errorMessage || '').toLowerCase();
    if (lowerMsg.includes('null')) sequence.push('null-safety');
    if (lowerMsg.includes('type') || lowerMsg.includes('assign')) sequence.push('type-correction');
    if (lowerMsg.includes('await') || lowerMsg.includes('async')) sequence.push('async-fix');
    if (lowerMsg.includes('import')) sequence.push('import-fix');
    
    // 3) استراتيجيات عامة
    sequence.push('syntax-patch');
    sequence.push('null-safety'); // null-safety مفيد في أغلب الأخطاء
    
    // إزالة التكرارات مع الحفاظ على الترتيب
    return [...new Set(sequence)];
  }

  private selectStrategyFromSequence(
    sequence: string[],
    attempt: number,
    lastResult: ExecutionResult | null
  ): string {
    // إذا كانت المحاولة السابقة ناجحة تقريباً لكنها لم تصل للحد، نكرر AI
    if (attempt > 1 && lastResult && lastResult.confidence < 0.8 && this.llmGateway) {
      return 'ai-generated';
    }
    
    const index = (attempt - 1) % sequence.length;
    return sequence[index] || 'syntax-patch';
  }

  // ---- استراتيجية AI الديناميكية ----

  private async applyAIFix(code: string, ctx: any): Promise<string> {
    if (!this.llmGateway) {
      throw new Error('LLMGateway not available for AI fix');
    }

    const errorMessage = ctx.errorMessage || 'Error';
    const language = ctx.language || 'dart'; // يمكن تحسينه لاحقاً ليكتشف اللغة تلقائياً

    this.logger.info('Requesting AI fix...', {
      context: LogContext.AI,
      data: { language, errorLength: errorMessage.length },
    });

    try {
      const suggestions: FixSuggestion[] = await this.llmGateway.analyzeCode({
        code,
        error: errorMessage,
        language,
        context: ctx.scope ? `In function: ${ctx.scope.name}` : undefined,
      });

      if (suggestions.length > 0 && suggestions[0].code) {
        // نأخذ أفضل اقتراح (الأعلى ثقة)
        const best = suggestions.sort((a, b) => b.confidence - a.confidence)[0];
        this.logger.info('AI fix generated', {
          context: LogContext.AI,
          data: {
            strategy: best.strategy,
            confidence: best.confidence,
            description: best.description,
          },
        });
        return best.code;
      }

      this.logger.warn('AI returned no fix suggestions', { context: LogContext.AI });
      return code; // لا تغيير
    } catch (error) {
      this.logger.error('AI fix failed, returning original code', {
        context: LogContext.AI,
        error: error as Error,
      });
      return code; // في حال الفشل، نعيد الكود الأصلي
    }
  }

  // ---- استراتيجيات ثابتة (Fallback) ----

  private applyNullSafety(code: string, ctx: any): string {
    // قاعدة بسيطة: إضافة فحوصات null للوصول الاختياري غير الآمن
    let result = code.replace(/(\w+)\?\.(\w+)/g, '($1 != null ? $1.$2 : null)');
    // إزالة تكرار غير مقصود
    return result;
  }

  private applyTypeCorrection(code: string, ctx: any): string {
    // في الإصدار الحالي، تعتمد على الذكاء الاصطناعي بشكل أساسي
    // لكن يمكن إضافة قواعد Dart/TS مستقبلية هنا
    const errorMsg = (ctx.errorMessage || '').toLowerCase();
    
    // مثال: تصحيح تحويل String إلى int
    if (errorMsg.includes('string') && errorMsg.includes('int')) {
      return code.replace(/(\w+)\s*=\s*int\.parse\((\w+)\);/g, 'final $1 = int.tryParse($2) ?? 0;');
    }
    
    return code;
  }

  private applyAsyncFix(code: string, ctx: any): string {
    // إضافة await للدوال غير المتزامنة
    let result = code.replace(/(?<!await\s)(fetch|http\.get)/g, 'await $1');
    
    // التأكد من وجود async في الدالة المحيطة إذا أضفنا await
    if (result !== code && ctx.scope) {
      const functionDef = new RegExp(`(\\w+\\s+)?${ctx.scope.name}\\s*\\([^)]*\\)\\s*\\{`);
      if (functionDef.test(result) && !result.match(functionDef)?.[0]?.includes('async')) {
        result = result.replace(functionDef, (match) => match.replace('{', 'async {'));
      }
    }
    
    return result;
  }

  private applyImportFix(code: string, ctx: any): string {
    if (ctx.missingImport) {
      return `import '${ctx.missingImport}';\n${code}`;
    }
    
    // محاولة استنتاج import مفقودة من رسالة الخطأ
    const errorMsg = (ctx.errorMessage || '').toLowerCase();
    if (errorMsg.includes('material')) {
      return `import 'package:flutter/material.dart';\n${code}`;
    }
    if (errorMsg.includes('http')) {
      return `import 'package:http/http.dart';\n${code}`;
    }
    
    return code;
  }

  private applySyntaxPatch(code: string, ctx: any): string {
    let result = code;
    
    // إصلاح الفواصل المنقوطة المفقودة
    if (!result.trim().endsWith(';') && !result.trim().endsWith('}') && !result.trim().endsWith('{')) {
      const lastLine = result.trim().split('\n').pop() || '';
      if (lastLine.match(/[a-zA-Z0-9)"']$/)) {
        result = result.trimEnd() + ';';
      }
    }
    
    // إصلاح الأقواس غير المتوازنة
    const openCurly = (result.match(/{/g) || []).length;
    const closeCurly = (result.match(/}/g) || []).length;
    if (openCurly > closeCurly) {
      result += '\n}';
    }
    
    return result;
  }
}