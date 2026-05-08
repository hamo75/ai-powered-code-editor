// src/core/context/ProjectContextManager.ts
// (إصدار احترافي ومتقدم – يبني سياقاً ذكياً للمشروع بالكامل)

/**
 * ProjectContextManager (v1.0)
 * 
 * يبني سياقاً شاملاً للمشروع يُحقن مع كل محادثة AI.
 * يمنح الذكاء الاصطناعي فهماً كاملاً لـ:
 * - بنية المجلدات والملفات
 * - محتوى الملفات الأساسية (محدودة الحجم)
 * - المشاكل والأخطاء الظاهرة
 * - إحصائيات سريعة (عدد الملفات، اللغات، الحجم)
 * - الملفات المعدلة حديثاً (غير محفوظة / dirty)
 * - تاريخ آخر تعديل
 */

import { useStore } from '../../store/useStore';
import { getRootFolder, buildRelativePath } from '../../store/utils/helpers';
import type { FileNode } from '../../store/types';

// تكوينات قابلة للتعديل
const MAX_FILES_IN_TREE = 60; // أقصى عدد ملفات تظهر في الشجرة النصية
const MAX_FILE_CONTENT_SIZE = 3000; // أقصى طول لمحتوى الملف المضمّن
const IMPORTANT_FILES = [
  'pubspec.yaml', 'package.json', 'Cargo.toml', 'go.mod',
  'requirements.txt', 'Dockerfile', 'Makefile', 'README.md',
  'main.dart', 'main.ts', 'main.py', 'App.js', 'index.html',
  'analysis_options.yaml', 'tsconfig.json', 'vite.config.ts',
];
const MAX_IMPORTANT_FILES_CONTENT = 3; // عدد الملفات المهمة التي نضمّن محتواها

export interface ProjectContext {
  /** النص الكامل للسياق – يُضاف إلى system prompt */
  systemContext: string;
  /** شجرة ملفات مختصرة */
  tree: string;
  /** ملفات مهمة مع محتواها */
  importantFiles: { path: string; content: string }[];
  /** إحصائيات */
  stats: { totalFiles: number; totalFolders: number; languages: Record<string, number> };
}

/**
 * بناء سياق المشروع الكامل
 */
export function buildProjectContext(): ProjectContext {
  const store = useStore.getState();
  const files = store.files;
  const rootFolder = getRootFolder(files);

  // 1) بناء شجرة نصية (UTF-8 box-drawing)
  const tree = buildFileTree(files, rootFolder);

  // 2) جمع الملفات المهمة مع محتواها
  const importantFiles = collectImportantFiles(files);

  // 3) إحصائيات سريعة
  const stats = computeStats(files);

  // 4) صياغة النص النهائي
  const systemContext = [
    `### Project Structure`,
    '```',
    tree,
    '```',
    '',
    `### Project Statistics`,
    `- Total files: ${stats.totalFiles}`,
    `- Total folders: ${stats.totalFolders}`,
    `- Languages: ${Object.entries(stats.languages).map(([lang, count]) => `${lang} (${count})`).join(', ') || 'none'}`,
    '',
  ];

  if (importantFiles.length > 0) {
    systemContext.push(`### Key Files`);
    for (const file of importantFiles) {
      systemContext.push(`**${file.path}**`);
      systemContext.push('```' + (getLanguageFromName(file.path.split('/').pop() || '') || '') + '\n' + file.content + '\n```');
    }
  }

  // 5) ملفات غير محفوظة
  const dirtyFiles = files.filter(f => f.type === 'file' && f.isDirty);
  if (dirtyFiles.length > 0) {
    systemContext.push(`### ⚠️ Unsaved Files (Dirty)`);
    for (const file of dirtyFiles) {
      systemContext.push(`- ${buildRelativePath(files, file)}`);
    }
  }

  return {
    systemContext: systemContext.join('\n'),
    tree,
    importantFiles,
    stats,
  };
}

/**
 * بناء شجرة ملفات بشكل نصي
 */
function buildFileTree(files: FileNode[], rootFolder?: FileNode): string {
  if (files.length === 0) return '(empty project)';

  const root = rootFolder || { id: null, name: 'root', children: [] } as any;
  const lines: string[] = [];
  const children = files.filter(f => f.parentId === root.id);
  
  // إذا لم يكن هناك root folder، نبدأ من الملفات التي parentId = null
  const startNodes = root.id ? children : files.filter(f => f.parentId === null);
  
  renderTreeLevel(files, startNodes, '', lines, 0);
  return lines.join('\n');
}

function renderTreeLevel(
  files: FileNode[],
  nodes: FileNode[],
  prefix: string,
  lines: string[],
  depth: number
) {
  if (lines.length >= MAX_FILES_IN_TREE) {
    lines.push(`${prefix}... (truncated)`);
    return;
  }

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const label = node.type === 'folder' ? `${node.name}/` : node.name;

    lines.push(`${prefix}${connector}${label}`);

    if (node.type === 'folder') {
      const children = files.filter(f => f.parentId === node.id);
      const childPrefix = prefix + (isLast ? '    ' : '│   ');
      renderTreeLevel(files, children, childPrefix, lines, depth + 1);
    }
  }
}

/**
 * جمع الملفات المهمة (حسب قائمة IMPORTANT_FILES) مع محتواها
 */
function collectImportantFiles(files: FileNode[]): { path: string; content: string }[] {
  const result: { path: string; content: string }[] = [];
  const allPaths = files.filter(f => f.type === 'file').map(f => buildRelativePath(files, f));
  
  for (const name of IMPORTANT_FILES) {
    const matched = files.find(f => {
      const path = buildRelativePath(files, f);
      return path.endsWith(name) || f.name === name;
    });
    if (matched && matched.content && result.length < MAX_IMPORTANT_FILES_CONTENT) {
      result.push({
        path: buildRelativePath(files, matched),
        content: truncateContent(matched.content, MAX_FILE_CONTENT_SIZE),
      });
    }
  }

  return result;
}

/**
 * إحصائيات سريعة
 */
function computeStats(files: FileNode[]) {
  const totalFiles = files.filter(f => f.type === 'file').length;
  const totalFolders = files.filter(f => f.type === 'folder').length;
  const languages: Record<string, number> = {};

  for (const file of files) {
    if (file.type !== 'file' || !file.language) continue;
    languages[file.language] = (languages[file.language] || 0) + 1;
  }

  return { totalFiles, totalFolders, languages };
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + `\n... (truncated, total ${content.length} chars)`;
}

function getLanguageFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    html: 'html', css: 'css', js: 'javascript', ts: 'typescript',
    tsx: 'tsx', jsx: 'jsx', py: 'python', json: 'json', md: 'markdown',
    yaml: 'yaml', yml: 'yaml', xml: 'xml', sql: 'sql', sh: 'bash',
    dart: 'dart', go: 'go', rs: 'rust', java: 'java', cpp: 'cpp',
    c: 'c', php: 'php', rb: 'ruby', env: 'plaintext', gitignore: 'plaintext',
  };
  return map[ext] || '';
}