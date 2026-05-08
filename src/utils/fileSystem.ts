// ============================================================================
// 📂 File System Operations for AI Code Studio
// Handles file/folder import/export with browser capabilities
//
// ملاحظة أمنية مهمة:
// - المتصفح لا يسمح بقراءة "كل ملفات الجهاز" تلقائيًا.
// - هذا الكود يقرأ فقط الملفات داخل المجلد الذي يختاره المستخدم.
// ============================================================================

import { errorHandler } from '../core/error/ErrorHandler';
import { LogContext } from '../core/logger/UnifiedLogger';

export interface ImportedFile {
  name: string;
  content: string;
  path: string[]; // directory segments (without the filename)
  size?: number;
  lastModified?: number;
}

export interface ProjectExport {
  name: string;
  exportedAt: number;
  fileCount: number;
  files: ExportedFile[];
}

export interface ExportedFile {
  name: string;
  content: string;
  path: string; // string path (optional usage)
  language: string;
  isDirty: boolean;
}

export interface ImportStats {
  total: number; // original FileList length
  imported: number;
  skipped: number;
  skippedReasons: { file: string; reason: string }[];
  totalSize: number;

  // إضافات اختيارية (لا تكسر الاستعمال الحالي)
  rootFolder?: string | null;
  truncated?: boolean;
  durationMs?: number;
}

// ============================================================================
// ⚙️ Import Options (تسمح بسلوك VS Code Workspace)
// ============================================================================
export interface FolderImportOptions {
  /**
   * ✅ مهم: عند true سيتم الاحتفاظ باسم مجلد المشروع كأول جزء من المسار.
   * هذا يجعل الشجرة تظهر مثل VS Code: project-name/src/...
   * بدل ظهور src/... مباشرة تحت '/'
   */
  preserveRootFolder: boolean;

  /**
   * حد أقصى لعمق المجلدات (عدد مستويات الدلائل).
   * مثال: 1 = فقط ملفات جذر المشروع (بدون subfolders)
   * 2 = جذر + مستوى واحد
   * undefined = لا حد (افتراضي)
   */
  maxDepth?: number;

  /** استثناء الملفات المخفية التي تبدأ بـ "." (اختياري). */
  excludeDotFiles: boolean;

  /** استثناء المجلدات المخفية التي تبدأ بـ "." (اختياري). */
  excludeDotDirs: boolean;
}

const DEFAULT_FOLDER_IMPORT_OPTIONS: FolderImportOptions = {
  preserveRootFolder: true,
  maxDepth: undefined,
  excludeDotFiles: false,
  excludeDotDirs: false,
};

// ============================================================================
// 🚫 Exclusions
// ============================================================================
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '__pycache__',
  '.DS_Store',
  '.idea',
  '.vscode',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '.cache',
  '.toast',
  'coverage',
  '.turbo',
  'test_output',
  '.angular',
  '.svelte-kit',
  '.vercel',
  '.netlify',
  'vendor',
  'Pods',
  '.gradle',
  'target',
  'bin',
  'obj',
]);

const EXCLUDED_FILES = new Set([
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  '.npmrc',
  'yarn-error.log',
  'npm-debug.log',
]);

const EXCLUDED_SENSITIVE = new Set([
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.production.local',
  '.env.staging.local',
  '.env.test.local',
]);

const EXCLUDED_PREFIXES = ['.git/'];

/**
 * امتدادات الملفات الثنائية (لا تُقرأ كنص)
 * ملاحظة: SVG نصّي (XML) لذا لا نضعه هنا.
 */
const BINARY_EXTENSIONS = new Set([
  // Images (except svg)
  'png',
  'jpg',
  'jpeg',
  'gif',
  'bmp',
  'ico',
  'webp',
  'tiff',
  'tif',
  'avif',
  'heic',
  'heif',
  'raw',
  'psd',
  'ai',

  // Video
  'mp4',
  'avi',
  'mov',
  'wmv',
  'flv',
  'mkv',
  'webm',
  'm4v',
  'mpg',
  'mpeg',

  // Audio
  'mp3',
  'wav',
  'ogg',
  'flac',
  'aac',
  'wma',
  'm4a',
  'opus',

  // Fonts
  'ttf',
  'otf',
  'woff',
  'woff2',
  'eot',

  // Archives
  'zip',
  'rar',
  '7z',
  'tar',
  'gz',
  'bz2',
  'xz',
  'tgz',
  'zst',

  // Executables / libs
  'exe',
  'dll',
  'so',
  'dylib',
  'app',
  'dmg',
  'msi',
  'deb',
  'rpm',

  // Databases
  'sqlite',
  'sqlite3',
  'db',
  'mdb',

  // Office / PDF
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'odt',
  'ods',
  'odp',
  'pdf',

  // Java
  'class',
  'jar',
  'war',

  // Python
  'pyc',
  'pyo',
  'pyd',
  'whl',
  'egg',

  // Other
  'wasm',
  'proto',
  'pb',
]);

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_FILE_COUNT = 2000;
const CONCURRENCY_LIMIT = 50;

// ============================================================================
// 🔧 Helpers
// ============================================================================
const normalizeRelPath = (p: string): string =>
  (p || '').replaceAll('\\', '/').replace(/^\/+/, '');

const splitPath = (p: string): string[] =>
  normalizeRelPath(p)
    .split('/')
    .map(s => s.trim())
    .filter(Boolean);

const extractRootFolder = (fileList: FileList | File[]): string | null => {
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i] as File;
    const relPath = normalizeRelPath((file as any).webkitRelativePath || '');
    if (relPath.includes('/')) return relPath.split('/')[0];
  }
  return null;
};

const stripRootFolder = (parts: string[], rootFolder: string | null): string[] => {
  if (rootFolder && parts.length > 0 && parts[0] === rootFolder) return parts.slice(1);
  return parts;
};

const hasDotSegment = (parts: string[]): boolean => parts.some(p => p.startsWith('.') && p !== '.');

const shouldIncludeFileByPath = (
  relativePath: string,
  opts: Pick<FolderImportOptions, 'excludeDotFiles' | 'excludeDotDirs'>
): { include: boolean; reason?: string } => {
  const rel = normalizeRelPath(relativePath);

  for (const prefix of EXCLUDED_PREFIXES) {
    if (rel.startsWith(prefix)) return { include: false, reason: 'مجلد مستثنى (.git)' };
  }

  const parts = splitPath(rel);
  if (parts.length === 0) return { include: true };

  const fileName = parts[parts.length - 1];

  // optional: exclude dot dirs
  if (opts.excludeDotDirs && parts.slice(0, -1).some(p => p.startsWith('.'))) {
    return { include: false, reason: 'مجلد مخفي' };
  }

  // optional: exclude dot files
  if (opts.excludeDotFiles && fileName.startsWith('.')) {
    return { include: false, reason: 'ملف مخفي' };
  }

  for (const part of parts.slice(0, -1)) {
    if (EXCLUDED_DIRS.has(part)) return { include: false, reason: `مجلد مستثنى (${part})` };
  }

  if (EXCLUDED_FILES.has(fileName)) return { include: false, reason: `ملف مستثنى (${fileName})` };
  if (EXCLUDED_SENSITIVE.has(fileName)) return { include: false, reason: 'ملف حساس (يحتوي أسرار)' };

  return { include: true };
};

const isTextFileByName = (fileName: string): boolean => {
  const lower = fileName.toLowerCase();

  // أسماء نصيّة شائعة بدون امتداد
  const exactTextNames = new Set([
    'makefile',
    'dockerfile',
    'vagrantfile',
    'gemfile',
    'rakefile',
    'procfile',
    'license',
    'readme',
    'changelog',
    'contributing',
    'cmakelists.txt',
  ]);
  if (exactTextNames.has(lower)) return true;

  // docker-compose.yml etc
  if (lower === 'docker-compose.yml' || lower === 'docker-compose.yaml') return true;

  const ext = lower.includes('.') ? lower.split('.').pop() || '' : '';

  if (!ext) {
    // dotfiles بدون امتداد تعتبر نصية غالبًا
    return fileName.startsWith('.');
  }

  if (BINARY_EXTENSIONS.has(ext)) return false;

  return true;
};

const inferImportDepth = (parts: string[], rootFolder: string | null, preserveRootFolder: boolean): number => {
  // depth هنا = عدد أجزاء الدلائل فقط (بدون اسم الملف)
  // مثال: root/src/index.ts
  // - preserveRootFolder=true => dir parts = [root, src] => depth=2
  // - preserveRootFolder=false => dir parts = [src] => depth=1
  const effectiveParts = preserveRootFolder ? parts : stripRootFolder(parts, rootFolder);
  return Math.max(0, effectiveParts.length - 1);
};

const readFilesConcurrently = async (
  files: File[],
  concurrency: number
): Promise<{ content: string; error: boolean }[]> => {
  const results: { content: string; error: boolean }[] = new Array(files.length);
  let currentIndex = 0;

  const worker = async () => {
    while (currentIndex < files.length) {
      const index = currentIndex++;
      const f = files[index];
      try {
        const content = await readFileContent(f);
        results[index] = { content, error: false };
      } catch (error: any) {
        await errorHandler.handleError(error, LogContext.SYSTEM, {
          filePath: f.name,
          operation: 'readFile',
        });
        results[index] = { content: '', error: true };
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, files.length) }, () => worker());
  await Promise.all(workers);

  // fill any holes (safety)
  for (let i = 0; i < results.length; i++) {
    if (!results[i]) results[i] = { content: '', error: true };
  }
  return results;
};

const smartSort = (a: ImportedFile, b: ImportedFile): number => {
  const aIsRoot = a.path.length === 0;
  const bIsRoot = b.path.length === 0;
  if (aIsRoot && !bIsRoot) return -1;
  if (!aIsRoot && bIsRoot) return 1;

  const aFull = `${a.path.join('/')}/${a.name}`.replace(/^\/+/, '');
  const bFull = `${b.path.join('/')}/${b.name}`.replace(/^\/+/, '');
  return aFull.localeCompare(bFull);
};

// ============================================================================
// 📊 Stats formatting
// ============================================================================
export const formatImportStats = (stats: ImportStats): string => {
  const lines: string[] = [
    `📊 ملخص الاستيراد:`,
    `   📁 الجذر: ${stats.rootFolder ?? '-'}`,
    `   ✅ تم استيراد: ${stats.imported} ملف`,
    `   ⏭️ تم تخطي: ${stats.skipped} ملف`,
    `   📦 الحجم الإجمالي: ${formatFileSize(stats.totalSize)}`,
  ];

  if (stats.truncated) lines.push(`   ⚠️ تم اقتطاع عدد الملفات للحد الأقصى`);

  if (typeof stats.durationMs === 'number') {
    lines.push(`   ⏱️ الزمن: ${stats.durationMs}ms`);
  }

  if (stats.skippedReasons.length > 0 && stats.skippedReasons.length <= 10) {
    lines.push('   📋 أسباب التخطي:');
    stats.skippedReasons.forEach(({ file, reason }) => lines.push(`      • ${file}: ${reason}`));
  } else if (stats.skippedReasons.length > 10) {
    lines.push(`   📋 وأخرى ${stats.skippedReasons.length - 10} ملفات متخطاة...`);
  }

  return lines.join('\n');
};

// ============================================================================
// ✅ Main APIs
// ============================================================================

/**
 * Parse webkitdirectory FileList into structure (بدون قراءة المحتوى)
 * مفيد لبناء شجرة الملفات بسرعة.
 */
export const parseFolderImport = (files: FileList): ImportedFile[] => {
  const opts = DEFAULT_FOLDER_IMPORT_OPTIONS;
  const rootFolder = extractRootFolder(files);
  const result: ImportedFile[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const webkitRelativePath = normalizeRelPath((file as any).webkitRelativePath || file.name);
    if (!webkitRelativePath) continue;

    const { include } = shouldIncludeFileByPath(webkitRelativePath, opts);
    if (!include) continue;

    if (!isTextFileByName(file.name)) continue;

    const parts = splitPath(webkitRelativePath);

    // depth filter (optional)
    if (opts.maxDepth !== undefined) {
      const depth = inferImportDepth(parts, rootFolder, opts.preserveRootFolder);
      if (depth > opts.maxDepth) continue;
    }

    const effectiveParts = opts.preserveRootFolder ? parts : stripRootFolder(parts, rootFolder);
    if (effectiveParts.length === 0) continue;

    const fileName = effectiveParts[effectiveParts.length - 1];
    const dirParts = effectiveParts.slice(0, -1);

    result.push({
      name: fileName,
      content: '',
      path: dirParts,
      size: file.size,
      lastModified: file.lastModified,
    });
  }

  return result.sort(smartSort);
};

export const readFileContent = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => {
      const error = new Error(`فشل قراءة الملف: ${file.name}`);
      errorHandler.handleError(error, LogContext.SYSTEM, {
        filePath: file.name,
        operation: 'readFileContent',
        fileSize: file.size,
      });
      reject(error);
    };
    reader.readAsText(file);
  });

export const readMultipleFiles = async (
  files: File[]
): Promise<{ name: string; content: string; size: number; error: boolean }[]> => {
  const results = await readFilesConcurrently(files, CONCURRENCY_LIMIT);
  return files.map((file, i) => ({
    name: file.name,
    content: results[i]?.content || '',
    size: file.size,
    error: results[i]?.error || false,
  }));
};

/**
 * Read files from <input webkitdirectory>
 * ✅ افتراضيًا: preserveRootFolder=true لإظهار مجلد المشروع كجذر (VS Code-like)
 */
export const readFolderFiles = async (
  fileList: FileList,
  options: Partial<FolderImportOptions> = {}
): Promise<{ files: ImportedFile[]; stats: ImportStats }> => {
  const started = Date.now();
  const opts: FolderImportOptions = { ...DEFAULT_FOLDER_IMPORT_OPTIONS, ...options };

  const stats: ImportStats = {
    total: fileList.length,
    imported: 0,
    skipped: 0,
    skippedReasons: [],
    totalSize: 0,
    rootFolder: null,
    truncated: false,
    durationMs: 0,
  };

  if (!fileList || fileList.length === 0) {
    stats.durationMs = Date.now() - started;
    return { files: [], stats };
  }

  const rootFolder = extractRootFolder(fileList);
  stats.rootFolder = rootFolder;

  // soft note if too many files
  if (fileList.length > MAX_FILE_COUNT) {
    stats.truncated = true;
    stats.skippedReasons.push({
      file: '---',
      reason: `عدد الملفات يتجاوز الحد (${MAX_FILE_COUNT}). سيتم اقتطاع القائمة.`,
    });
  }

  const files = Array.from(fileList);

  // Step 1: filter
  const filtered: { file: File; relPath: string; parts: string[]; effectiveParts: string[] }[] = [];

  for (const file of files) {
    const relPath = normalizeRelPath((file as any).webkitRelativePath || file.name);

    // بعض المتصفحات لا ترجع عناصر مجلدات؛ لكن لو حصل، نتجاوز
    if (!relPath) {
      stats.skipped++;
      stats.skippedReasons.push({ file: file.name, reason: 'مسار غير صالح' });
      continue;
    }

    // exclude by rules
    const { include, reason } = shouldIncludeFileByPath(relPath, opts);
    if (!include) {
      stats.skipped++;
      stats.skippedReasons.push({ file: relPath, reason: reason || 'مستثنى' });
      continue;
    }

    // skip binary by name
    if (!isTextFileByName(file.name)) {
      stats.skipped++;
      stats.skippedReasons.push({ file: relPath, reason: 'ملف ثنائي (حسب الامتداد)' });
      continue;
    }

    // skip big
    if (file.size > MAX_FILE_SIZE) {
      stats.skipped++;
      stats.skippedReasons.push({ file: relPath, reason: `ملف كبير (${formatFileSize(file.size)})` });
      continue;
    }

    // count limit
    if (filtered.length >= MAX_FILE_COUNT) {
      stats.skipped++;
      continue;
    }

    const parts = splitPath(relPath);

    // optional: exclude dot segments generally
    if ((opts.excludeDotDirs || opts.excludeDotFiles) && hasDotSegment(parts)) {
      // already handled by shouldIncludeFileByPath for file and dirs, but this is extra guard
    }

    // depth filter
    if (opts.maxDepth !== undefined) {
      const depth = inferImportDepth(parts, rootFolder, opts.preserveRootFolder);
      if (depth > opts.maxDepth) {
        stats.skipped++;
        stats.skippedReasons.push({ file: relPath, reason: `عمق أكبر من المسموح (${opts.maxDepth})` });
        continue;
      }
    }

    const effectiveParts = opts.preserveRootFolder ? parts : stripRootFolder(parts, rootFolder);
    if (effectiveParts.length === 0) {
      stats.skipped++;
      stats.skippedReasons.push({ file: relPath, reason: 'مسار فارغ بعد المعالجة' });
      continue;
    }

    filtered.push({ file, relPath, parts, effectiveParts });
  }

  // Step 2: read contents concurrently
  const actualFiles = filtered.map(f => f.file);
  const contents = await readFilesConcurrently(actualFiles, CONCURRENCY_LIMIT);

  // Step 3: build result
  const result: ImportedFile[] = [];

  for (let i = 0; i < filtered.length; i++) {
    const { file, relPath, effectiveParts } = filtered[i];
    const contentResult = contents[i];

    if (contentResult?.error) {
      stats.skipped++;
      stats.skippedReasons.push({ file: relPath, reason: 'فشل القراءة' });
      continue;
    }

    // final safety: reject text that looks binary
    const text = contentResult?.content || '';
    if (text.includes('\u0000')) {
      stats.skipped++;
      stats.skippedReasons.push({ file: relPath, reason: 'محتوى ثنائي (NUL bytes)' });
      continue;
    }

    stats.imported++;
    stats.totalSize += file.size;

    const fileName = effectiveParts[effectiveParts.length - 1];
    const dirParts = effectiveParts.slice(0, -1);

    result.push({
      name: fileName,
      content: text,
      path: dirParts,
      size: file.size,
      lastModified: file.lastModified,
    });
  }

  stats.durationMs = Date.now() - started;

  return { files: result.sort(smartSort), stats };
};

// ============================================================================
// Downloads / Export
// ============================================================================
export const downloadFile = (name: string, content: string): void => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadJSON = (name: string, data: any): void => {
  downloadFile(name, JSON.stringify(data, null, 2));
};

export const createProjectExport = (
  projectName: string,
  files: { name: string; content: string; language: string; isDirty: boolean }[]
): ProjectExport => ({
  name: projectName,
  exportedAt: Date.now(),
  fileCount: files.length,
  files: files.map(f => ({
    name: f.name,
    content: f.content,
    path: '', // يبقى كما هو لتوافق الخلفية الحالية
    language: f.language,
    isDirty: f.isDirty,
  })),
});

export const exportProjectJSON = (projectName: string, data: any): void => {
  downloadJSON(`${projectName || 'project'}-export.json`, data);
};

export const readProjectImport = (file: File): Promise<any> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result ?? '')));
      } catch (error: any) {
        errorHandler.handleError(error, LogContext.SYSTEM, {
          filePath: file.name,
          operation: 'readProjectImport',
          fileSize: file.size,
        });
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => {
      const error = new Error('فشل قراءة الملف');
      errorHandler.handleError(error, LogContext.SYSTEM, {
        filePath: file.name,
        operation: 'readProjectImport',
        fileSize: file.size,
      });
      reject(error);
    };
    reader.readAsText(file);
  });

// ============================================================================
// Tree utils
// ============================================================================
export const getDirectoryTree = (files: ImportedFile[]): { [path: string]: string[] } => {
  const tree: { [path: string]: string[] } = { '/': [] };

  for (const file of files) {
    const dirPath = file.path.length > 0 ? '/' + file.path.join('/') : '/';

    if (!tree[dirPath]) tree[dirPath] = [];
    tree[dirPath].push(file.name);

    // ensure all parent dirs exist
    for (let i = file.path.length; i >= 1; i--) {
      const parentPath = '/' + file.path.slice(0, i).join('/');
      if (!tree[parentPath]) tree[parentPath] = [];
    }
  }

  for (const key of Object.keys(tree)) {
    tree[key].sort((a, b) => a.localeCompare(b));
  }

  return tree;
};

// ============================================================================
// Validation / Language / Size
// ============================================================================
export const isValidImportFile = (file: File): boolean => {
  if (!isTextFileByName(file.name)) return false;
  if (file.size > MAX_FILE_SIZE) return false;

  const lower = file.name.toLowerCase();

  // allow special filenames
  if (lower === 'dockerfile') return true;
  if (lower === 'makefile') return true;
  if (lower === 'docker-compose.yml' || lower === 'docker-compose.yaml') return true;

  // allow common text extensions
  const ext = lower.includes('.') ? lower.split('.').pop() || '' : '';
  const validExtensions = new Set([
    'html',
    'htm',
    'css',
    'js',
    'jsx',
    'ts',
    'tsx',
    'json',
    'py',
    'java',
    'cpp',
    'c',
    'h',
    'rs',
    'go',
    'rb',
    'php',
    'dart',
    'yaml',
    'yml',
    'xml',
    'toml',
    'ini',
    'env',
    'md',
    'txt',
    'sh',
    'bash',
    'ps1',
    'sql',
    'csv',
    'svg', // نصّي
  ]);

  // ملفات بدون امتداد (قد تكون نصية)
  if (!lower.includes('.')) return true;

  return validExtensions.has(ext);
};

export const getLanguageFromPath = (path: string): string => {
  const p = (path || '').toLowerCase();
  const fileName = p.split('/').pop() || p;

  if (fileName === 'dockerfile') return 'dockerfile';
  if (fileName === 'makefile') return 'makefile';
  if (fileName === 'docker-compose.yml' || fileName === 'docker-compose.yaml') return 'yaml';
  if (fileName.endsWith('.d.ts')) return 'typescript';

  const ext = fileName.includes('.') ? fileName.split('.').pop() || '' : '';
  const map: Record<string, string> = {
    html: 'html',
    htm: 'html',
    css: 'css',
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    rs: 'rust',
    go: 'go',
    rb: 'ruby',
    php: 'php',
    dart: 'dart',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    toml: 'toml',
    md: 'markdown',
    txt: 'plaintext',
    sh: 'shell',
    bash: 'shell',
    svg: 'xml',
    sql: 'sql',
    csv: 'plaintext',
  };

  return map[ext] || 'plaintext';
};

export const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};