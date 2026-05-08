// src/services/commandSystem.ts
// (إصدار محدث مع دعم التنفيذ عبر CommandRegistry وإصلاح المفتاح المكرر)

import { CommandRegistry } from '../core/commands/CommandRegistry';

// ---- الأنواع (كما كانت) ----

export interface ParsedSlashCommand {
  raw: string;
  name: string;
  args: string[];
  normalized: string;
}

export interface CommandSearchEntry {
  label: string;
  description?: string;
  aliases?: string[];
  keywords?: string[];
  category?: string;
}

// ---- ثوابت التنظيف (كما كانت) ----

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670]/g;
const ARABIC_TATWEEL = /\u0640/g;
const NON_TEXT = /[^\p{L}\p{N}\s/-]+/gu;

export const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(ARABIC_DIACRITICS, '')
    .replace(ARABIC_TATWEEL, '')
    .replace(NON_TEXT, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const normalizeCommandToken = (text: string): string =>
  normalizeText(text).replace(/\s+/g, '-');

// ---- قاموس الأسماء المستعارة (مُصلح) ----

const COMMAND_ALIASES: Record<string, string> = {
  help: 'help',
  'مساعدة': 'help',
  'مساعده': 'help',
  'اوامر': 'help',
  'الأوامر': 'help',
  clear: 'clear',
  'مسح': 'clear',
  'تنظيف': 'clear',
  reset: 'clear',
  settings: 'settings',
  'اعدادات': 'settings',
  'إعدادات': 'settings',
  terminal: 'terminal',
  'طرفية': 'terminal',
  'التيرمنال': 'terminal',
  chat: 'chat',
  'دردشة': 'chat',
  'محادثة': 'chat',
  discussion: 'discussion',
  'مناقشة': 'discussion',
  execution: 'execution',
  'تنفيذ': 'execution',
  agent: 'agent',
  'وكيل': 'agent',
  smartfix: 'smartfix',
  'smart-fix': 'smartfix',
  'اصلاح-ذكي': 'smartfix',
  'إصلاح-ذكي': 'smartfix',
  analyze: 'analyze',
  'تحليل': 'analyze',
  build: 'build',
  'بناء': 'build',
  fix: 'fix',
  'إصلاح': 'fix',
  'اصلاح': 'fix',
  improve: 'improve',
  'تحسين': 'improve',   // تم إبقاء 'تحسين' لـ improve فقط
  refactor: 'refactor',
  'إعادة-هيكلة': 'refactor',
  'اعادة-هيكلة': 'refactor',
  feature: 'feature',
  'ميزة': 'feature',
  explain: 'explain',
  'شرح': 'explain',
  comment: 'comment',
  'تعليق': 'comment',
  test: 'test',
  'اختبار': 'test',
  optimize: 'optimize',
  // تمت إزالة المفتاح المكرر 'تحسين': 'optimize' لتجنب الخطأ.
};

// ---- دوال التحليل (كما كانت) ----

export const resolveCommandName = (input: string): string => {
  const normalized = normalizeCommandToken(input);
  return COMMAND_ALIASES[normalized] || normalized;
};

export const parseSlashCommand = (input: string): ParsedSlashCommand | null => {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return null;

  const body = trimmed.slice(1).trim();
  if (!body) return null;

  const [rawName, ...args] = body.split(/\s+/);
  const name = resolveCommandName(rawName);

  return {
    raw: trimmed,
    name,
    args,
    normalized: normalizeText(body),
  };
};

// ---- دوال البحث والتصنيف (كما كانت) ----

export const buildCommandSearchText = (entry: CommandSearchEntry): string => {
  return normalizeText(
    [
      entry.label,
      entry.description || '',
      entry.category || '',
      ...(entry.aliases || []),
      ...(entry.keywords || []),
    ].join(' ')
  );
};

export const scoreCommandMatch = (query: string, entry: CommandSearchEntry): number => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 1;

  const haystack = buildCommandSearchText(entry);
  const tokens = normalizedQuery.split(' ').filter(Boolean);

  let score = 0;

  if (normalizeText(entry.label) === normalizedQuery) score += 1000;
  if ((entry.aliases || []).some(alias => normalizeText(alias) === normalizedQuery)) score += 900;
  if (haystack.startsWith(normalizedQuery)) score += 500;
  if (haystack.includes(normalizedQuery)) score += 300;

  for (const token of tokens) {
    if (haystack.includes(token)) score += 20;
    else score -= 15;
  }

  return score;
};

export const filterAndRankCommands = <T extends CommandSearchEntry>(
  query: string,
  commands: T[]
): T[] => {
  const normalizedQuery = normalizeText(query);
  const filtered = normalizedQuery
    ? commands.filter(cmd => scoreCommandMatch(normalizedQuery, cmd) > 0)
    : commands;

  return [...filtered].sort((a, b) => {
    const scoreDiff = scoreCommandMatch(normalizedQuery, b) - scoreCommandMatch(normalizedQuery, a);
    if (scoreDiff !== 0) return scoreDiff;
    return a.label.localeCompare(b.label, 'ar');
  });
};

// ========== الجديد: دوال التنفيذ عبر السجل ==========

export interface CommandExecutionResult {
  success: boolean;
  commandName: string;
  args?: string[];
  error?: string;
}

/**
 * تنفيذ أمر نصي (سواء احتوى على '/' أم لا).
 * - إذا بدأ بـ '/' يتم تحليله واستخراج اسم الأمر والوسائط.
 * - ثم يبحث في السجل وينفذه.
 * - إذا لم يبدأ بـ '/' يفترض أنه أمر مباشر (يمكن استدعاء أمر help).
 *
 * @param input النص المدخل (مثلاً "/fix error message")
 * @returns نتيجة التنفيذ
 */
export const executeSlashCommand = async (
  input: string
): Promise<CommandExecutionResult> => {
  const registry = CommandRegistry.getInstance();
  
  // تحليل النص
  const parsed = parseSlashCommand(input);
  
  if (!parsed) {
    // ليس أمرًا بوضوح، يمكن استخدامه كاستفسار مساعدة
    return {
      success: false,
      commandName: 'unknown',
      error: 'Invalid slash command format.',
    };
  }

  const { name, args } = parsed;

  // تنفيذ الأمر عبر السجل
  const executed = await registry.execute(name, args);

  if (executed) {
    return {
      success: true,
      commandName: name,
      args,
    };
  } else {
    // قد لا يكون مسجلاً بعد أو فشل التنفيذ
    return {
      success: false,
      commandName: name,
      args,
      error: `Command '${name}' not found or failed to execute.`,
    };
  }
};

/**
 * تنفيذ أمر محدد بمعرفه مع وسائط اختيارية.
 * هذه دالة مختصرة للاستخدام المباشر عندما يكون الأمر معروفًا مسبقًا.
 */
export const executeCommandById = async (
  id: string,
  args?: string[]
): Promise<boolean> => {
  const registry = CommandRegistry.getInstance();
  return registry.execute(id, args);
};