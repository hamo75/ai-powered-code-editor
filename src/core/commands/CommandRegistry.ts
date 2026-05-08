// src/core/commands/CommandRegistry.ts

/**
 * CommandRegistry - سجل الأوامر المركزي (v2.0)
 * 
 * يوفر آلية واحدة لتسجيل واستدعاء جميع أوامر التطبيق:
 * - أوامر واجهة المستخدم (لوحة الأوامر)
 * - أوامر Slash (/fix, /analyze...)
 * - أوامر الإضافات الديناميكية
 * - أوامر النظام الداخلية
 * 
 * مصمم ليكون قابلًا للتوسع، آمنًا، ومتوافقًا مع:
 * - commandSystem.ts (تحليل الأوامر النصية)
 * - CommandPalette.tsx (عرض وتنفيذ الأوامر)
 * - AIAgent / TaskExecutor (تنفيذ أوامر ذكية)
 * - Extension Host (إضافة أوامر جديدة)
 */

import { UnifiedLoggerClass, LogContext } from '../logger/UnifiedLogger';

// --- الأنواع الأساسية ---

/** تصنيف الأمر (يُستخدم في التجميع والعرض) */
export type CommandCategory =
  | 'ملف'
  | 'عرض'
  | 'تفضيلات'
  | 'إضافات'
  | 'أدوات'
  | 'AI'
  | 'محطة'
  | 'نظام'
  | 'قصاصة'
  | 'إضافة';

/** واصف الأمر الكامل */
export interface CommandDescriptor {
  /** معرف فريد (يُستخدم في Slash Command: /fix) */
  id: string;
  /** التسمية المعروضة للمستخدم */
  label: string;
  /** أيقونة من Lucide (مثلاً "FileText"، "Search") */
  icon?: string;
  /** التصنيف */
  category: CommandCategory;
  /** وصف قصير */
  description?: string;
  /** أسماء مستعارة (عربي/إنجليزي) تستخدم للبحث والوصول */
  aliases?: string[];
  /** كلمات مفتاحية للبحث المساعد */
  keywords?: string[];
  /** اختصار لوحة مفاتيح (للإظهار فقط، لا يُنفذ الاختصار) */
  shortcut?: string;
  /** الدالة المنفذة (يمكن أن تكون async) */
  execute: (args?: string[]) => Promise<void> | void;
  /** هل الأمر مخفي (لا يظهر في لوحة الأوامر) */
  hidden?: boolean;
}

// --- السجل ---

export class CommandRegistry {
  private static instance: CommandRegistry;
  private commands: Map<string, CommandDescriptor> = new Map();
  private logger: UnifiedLoggerClass;
  
  /** سجل تنفيذي بسيط: آخر أمر منفذ وتوقيته */
  private lastExecuted: { id: string; timestamp: number } | null = null;

  private constructor() {
    this.logger = UnifiedLoggerClass.getInstance();
  }

  /** الحصول على النسخة الوحيدة */
  static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry();
    }
    return CommandRegistry.instance;
  }

  /**
   * تسجيل أمر جديد.
   * إذا كان المعرف موجودًا مسبقًا، يتم تسجيل تحذير ولا يتم الاستبدال
   * (يمكن استخدام unregister ثم register لتحديث أمر).
   * كما يتم تسجيل الأسماء المستعارة كمداخل منفصلة تشير إلى نفس الأمر.
   */
  register(command: CommandDescriptor): void {
    if (this.commands.has(command.id)) {
      this.logger.warn(`Command already registered: ${command.id}`, {
        context: LogContext.SYSTEM,
        data: { existing: this.commands.get(command.id)?.label },
      });
      return;
    }

    this.commands.set(command.id, command);

    // تسجيل الأسماء المستعارة
    if (command.aliases) {
      for (const alias of command.aliases) {
        if (!this.commands.has(alias)) {
          this.commands.set(alias, { ...command, id: alias });
        }
      }
    }

    this.logger.debug(`Command registered: ${command.id}`, {
      context: LogContext.SYSTEM,
      data: { category: command.category, aliases: command.aliases },
    });
  }

  /**
   * إلغاء تسجيل أمر مع جميع أسمائه المستعارة.
   */
  unregister(id: string): boolean {
    const cmd = this.commands.get(id);
    if (!cmd) return false;

    // حذف المعرف الأساسي
    this.commands.delete(id);
    // حذف الأسماء المستعارة
    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        this.commands.delete(alias);
      }
    }

    this.logger.debug(`Command unregistered: ${id}`, { context: LogContext.SYSTEM });
    return true;
  }

  /**
   * جلب أمر بالمعرف (أو اسم مستعار).
   */
  get(id: string): CommandDescriptor | undefined {
    return this.commands.get(id);
  }

  /**
   * جلب جميع الأوامر (عدا المخفية).
   * يُستخدم في لوحة الأوامر للعرض والبحث.
   */
  getAll(): CommandDescriptor[] {
    return Array.from(this.commands.values()).filter(cmd => !cmd.hidden);
  }

  /**
   * تنفيذ أمر بالمعرف مع وسائط اختيارية.
   * يعيد `true` إذا تم التنفيذ بنجاح، `false` إذا فشل أو لم يُوجد الأمر.
   * يُحدث سجل `lastExecuted`.
   */
  async execute(id: string, args?: string[]): Promise<boolean> {
    const cmd = this.commands.get(id);
    if (!cmd) {
      this.logger.warn(`Command not found: ${id}`, { context: LogContext.SYSTEM });
      return false;
    }

    try {
      this.logger.info(`Executing command: ${cmd.id}`, {
        context: LogContext.SYSTEM,
        data: { args: args || [] },
      });

      await cmd.execute(args);
      this.lastExecuted = { id, timestamp: Date.now() };
      return true;
    } catch (error) {
      this.logger.error(`Command failed: ${cmd.id}`, {
        context: LogContext.SYSTEM,
        error: error as Error,
      });
      return false;
    }
  }

  /**
   * الحصول على معلومات آخر أمر منفذ (للتصحيح والاختبار).
   */
  getLastExecuted(): { id: string; timestamp: number } | null {
    return this.lastExecuted;
  }

  /**
   * مسح السجل (اختياري).
   */
  clearLastExecuted(): void {
    this.lastExecuted = null;
  }

  /**
   * إعادة تعيين السجل بالكامل (إزالة كل الأوامر).
   */
  reset(): void {
    this.commands.clear();
    this.lastExecuted = null;
    this.logger.info('CommandRegistry reset', { context: LogContext.SYSTEM });
  }
}