// src/core/commands/defaultCommands.ts
// (إصدار محدَّث – ربط الأوامر الذكية بـ planAndExecute)

import { CommandRegistry } from './CommandRegistry';
import type { SystemOrchestrator } from '../../orchestrator/SystemOrchestrator';
import { useStore } from '../../store/useStore';

type GetStateFn = () => ReturnType<typeof useStore.getState>;

/**
 * تسجيل جميع الأوامر الافتراضية (أساسية + ذكية)
 */
export function registerDefaultCommands(
  registry: CommandRegistry,
  orchestrator: SystemOrchestrator
): void {
  const getState: GetStateFn = () => useStore.getState();

  // ========== أوامر الملفات ==========
  registry.register({
    id: 'save',
    label: 'حفظ الملف الحالي',
    category: 'ملف',
    icon: 'FileText',
    shortcut: 'Ctrl+S',
    execute: async () => {
      const state = getState();
      if (state.activeFileId) state.saveFile(state.activeFileId);
    },
  });

  registry.register({
    id: 'save-all',
    label: 'حفظ جميع الملفات',
    category: 'ملف',
    icon: 'FileText',
    shortcut: 'Ctrl+Shift+S',
    execute: async () => getState().saveAllFiles(),
  });

  registry.register({
    id: 'new-file',
    label: 'ملف جديد',
    category: 'ملف',
    icon: 'FilePlus',
    execute: async () => getState().setActivePanel('explorer'),
  });

  registry.register({
    id: 'new-folder',
    label: 'مجلد جديد',
    category: 'ملف',
    icon: 'FolderPlus',
    execute: async () => getState().setActivePanel('explorer'),
  });

  // ========== أوامر العرض ==========
  registry.register({
    id: 'toggle-sidebar',
    label: 'تبديل الشريط الجانبي',
    category: 'عرض',
    icon: 'Sidebar',
    shortcut: 'Ctrl+B',
    execute: async () => getState().toggleSidebar(),
  });

  registry.register({
    id: 'toggle-terminal',
    label: 'تبديل الطرفية',
    category: 'عرض',
    icon: 'Terminal',
    shortcut: 'Ctrl+J',
    execute: async () => {
      const state = getState();
      state.setShowTerminal(!state.showTerminal);
    },
  });

  registry.register({
    id: 'toggle-chat',
    label: 'تبديل مساعد AI',
    category: 'عرض',
    icon: 'MessageSquare',
    execute: async () => {
      const state = getState();
      state.setShowChat(!state.showChat);
    },
  });

  registry.register({
    id: 'explorer',
    label: 'المستكشف',
    category: 'عرض',
    icon: 'Folder',
    execute: async () => getState().setActivePanel('explorer'),
  });

  registry.register({
    id: 'search',
    label: 'بحث في الملفات',
    category: 'عرض',
    icon: 'Search',
    shortcut: 'Ctrl+Shift+F',
    execute: async () => getState().setActivePanel('search'),
  });

  registry.register({
    id: 'git',
    label: 'Git',
    category: 'عرض',
    icon: 'GitBranch',
    execute: async () => getState().setActivePanel('git'),
  });

  // ========== التفضيلات ==========
  registry.register({
    id: 'settings',
    label: 'الإعدادات',
    category: 'تفضيلات',
    icon: 'Settings',
    execute: async () => getState().setShowSettings(true),
  });

  registry.register({
    id: 'theme',
    label: 'تغيير السمة',
    category: 'تفضيلات',
    icon: 'Palette',
    execute: async () => getState().setShowSettings(true),
  });

  // ========== أوامر AI الذكية (مربوطة بـ planAndExecute) ==========

  /**
   * أمر `fix`:
   * - يستخدم fixEngine مباشرة (سريع) إذا كان الهدف ملفاً محدداً.
   * - وإلا يستخدم planAndExecute (للخطط المعقدة).
   */
  registry.register({
    id: 'fix',
    label: 'إصلاح الملف الحالي',
    category: 'AI',
    icon: 'Wrench',
    description: 'تحليل وإصلاح الأخطاء في الملف النشط',
    aliases: ['smartfix', 'smart-fix', 'اصلاح-ذكي', 'إصلاح-ذكي'],
    keywords: ['fix', 'repair', 'debug', 'إصلاح', 'خطأ'],
    execute: async (args) => {
      const state = getState();
      const file = state.files.find((f: any) => f.id === state.activeFileId);
      if (!file) return;

      const errorContext = args?.join(' ');
      if (errorContext) {
        // إصلاح سريع ومباشر
        await orchestrator.fixFile(file.path, errorContext);
      } else {
        // تخطيط وتنفيذ ذكي
        try {
          const result = await orchestrator.planAndExecute(
            `Fix errors in ${file.path}`,
            file.path
          );
          if (!result.execution.success) {
            console.warn('Plan execution had errors:', result.execution.errors);
          }
        } catch (e: any) {
          console.error('Fix command failed:', e.message);
        }
      }
    },
  });

  registry.register({
    id: 'refactor',
    label: 'إعادة هيكلة',
    category: 'AI',
    icon: 'Shuffle',
    description: 'إعادة هيكلة الكود (تحسين البنية بدون تغيير السلوك)',
    aliases: ['اعادة-هيكلة', 'إعادة-هيكلة'],
    keywords: ['refactor', 'restructure', 'هيكلة'],
    execute: async (args) => {
      const state = getState();
      const file = state.files.find((f: any) => f.id === state.activeFileId);
      if (!file) return;

      const instruction = args?.join(' ') || `Refactor ${file.path} to improve structure and readability`;
      try {
        const result = await orchestrator.planAndExecute(instruction, file.path);
        if (!result.execution.success) {
          console.warn('Refactor plan had errors:', result.execution.errors);
        }
      } catch (e: any) {
        console.error('Refactor command failed:', e.message);
      }
    },
  });

  registry.register({
    id: 'analyze',
    label: 'تحليل الكود',
    category: 'AI',
    icon: 'SearchCode',
    aliases: ['تحليل'],
    description: 'تحليل الكود الحالي وإظهار المشاكل والاقتراحات',
    execute: async (args) => {
      const state = getState();
      const file = state.files.find((f: any) => f.id === state.activeFileId);
      if (!file) return;

      const suggestions = await orchestrator.analyzeCode(file.content, 'typescript');
      // يمكن عرض النتيجة في إشعار أو لوحة AI (سنضيفها لاحقاً)
      console.log('Analysis suggestions:', suggestions);
    },
  });

  registry.register({
    id: 'explain',
    label: 'شرح الكود',
    category: 'AI',
    icon: 'BookOpen',
    aliases: ['شرح'],
    description: 'يطلب من الذكاء الاصطناعي شرح الكود المحدد',
    execute: async (args) => {
      // يتم التعامل معه عبر نافذة المحادثة (AiChat) في مرحلة لاحقة
      console.log('Explain command triggered – will integrate with AiChat.');
    },
  });

  registry.register({
    id: 'build',
    label: 'بناء المشروع',
    category: 'AI',
    icon: 'Hammer',
    aliases: ['بناء'],
    description: 'تخطيط وتنفيذ عملية بناء المشروع (عبر AI)',
    execute: async (args) => {
      const instruction = args?.join(' ') || 'Build the project';
      try {
        const result = await orchestrator.planAndExecute(instruction);
        if (!result.execution.success) {
          console.warn('Build plan had errors:', result.execution.errors);
        }
      } catch (e: any) {
        console.error('Build command failed:', e.message);
      }
    },
  });

  registry.register({
    id: 'test',
    label: 'اختبار المشروع',
    category: 'AI',
    icon: 'FlaskConical',
    aliases: ['اختبار'],
    description: 'تخطيط وتنفيذ اختبارات (يدعم التوليد عبر AI)',
    execute: async (args) => {
      const instruction = args?.join(' ') || 'Run and/or generate tests for the project';
      try {
        const result = await orchestrator.planAndExecute(instruction);
        if (!result.execution.success) {
          console.warn('Test plan had errors:', result.execution.errors);
        }
      } catch (e: any) {
        console.error('Test command failed:', e.message);
      }
    },
  });

  registry.register({
    id: 'optimize',
    label: 'تحسين الأداء',
    category: 'AI',
    icon: 'Zap',
    aliases: ['تحسين'],
    description: 'تحليل وتحسين أداء الكود',
    execute: async (args) => {
      const state = getState();
      const file = state.files.find((f: any) => f.id === state.activeFileId);
      const instruction = args?.join(' ') || `Optimize performance of ${file?.path || 'the project'}`;
      try {
        const result = await orchestrator.planAndExecute(instruction, file?.path);
        if (!result.execution.success) {
          console.warn('Optimize plan had errors:', result.execution.errors);
        }
      } catch (e: any) {
        console.error('Optimize command failed:', e.message);
      }
    },
  });

  // إضافات مستقبلية: يمكن إضافة أوامر مثل `deploy`, `doc`, `lint` إلخ بنفس النمط.
}