/**
 * Native File System Service (Improved)
 * Uses the File System Access API to interact with real files on the user's device.
 * Works on Chrome, Edge, and other Chromium-based browsers.
 *
 * ✅ تحسينات أساسية:
 * 1) استثناء node_modules و .git وملفات lock تلقائيًا لتجنب “تحميل كل شيء”
 * 2) قراءة الملفات عبر walk مباشر (بدل scan + flatten) مع حدود للعدد/الحجم + concurrency
 * 3) Cache لمقابض الملفات (File Handles) لتسريع readFile/exists
 * 4) توافق كامل مع الاستدعاءات الحالية:
 *    - openDirectory(): Promise<DirectoryContent | null>
 *    - getAllFilesFromDirectory(): Promise<FlatFileEntry[]>
 */

export interface NativeFileHandle {
  kind: 'file' | 'directory';
  name: string;
  path: string;
  handle: FileSystemHandle;
}

export interface DirectoryContent {
  name: string;
  path: string; // relative path from chosen folder. root will be "/"
  children?: DirectoryContent[];
  isDirectory: boolean;
  handle?: FileSystemDirectoryHandle;
  fileHandle?: FileSystemFileHandle;
}

export interface FlatFileEntry {
  name: string;
  /**
   * ✅ مهم: هذا path يمثل "المجلدات فقط" بدون اسم الملف
   * مثال: src/components وليس src/components/Button.tsx
   */
  path: string[];
  content: string;
}

export interface OpenDirectoryOptions {
  mode?: 'read' | 'readwrite';
  scan?: {
    recursive?: boolean;
    maxDepth?: number; // undefined = unlimited
    excludeDotDirs?: boolean;
    excludeDotFiles?: boolean;
    excludedDirs?: string[];
    excludedFiles?: string[];
  };
}

export interface ReadAllFilesOptions {
  maxFiles?: number;
  maxFileSizeBytes?: number;
  concurrency?: number;
  excludeDotDirs?: boolean;
  excludeDotFiles?: boolean;
  excludedDirs?: string[];
  excludedFiles?: string[];
  textOnly?: boolean; // skip likely-binary files by extension + NUL check
}

const DEFAULT_EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '.idea',
  '.vscode',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '.cache',
  'coverage',
  '.turbo',
  'target',
  'bin',
  'obj',
]);

const DEFAULT_EXCLUDED_FILES = new Set([
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'npm-debug.log',
  'yarn-error.log',
]);

/**
 * Approx binary extensions.
 * NOTE: svg is text (xml) so it's NOT included.
 */
const BINARY_EXTENSIONS = new Set([
  // images (except svg)
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

  // media
  'mp4',
  'avi',
  'mov',
  'mkv',
  'webm',
  'mp3',
  'wav',
  'flac',
  'ogg',

  // archives
  'zip',
  'rar',
  '7z',
  'tar',
  'gz',
  'bz2',
  'xz',
  'tgz',
  'zst',

  // fonts
  'ttf',
  'otf',
  'woff',
  'woff2',
  'eot',

  // binaries
  'exe',
  'dll',
  'so',
  'dylib',
  'wasm',

  // docs/db
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'sqlite',
  'db',
]);

const normalizeRelPath = (p: string): string =>
  (p ?? '').replace(/\\/g, '/').replace(/^\/+/, '');
const splitRelPath = (p: string) =>
  normalizeRelPath(p)
    .split('/')
    .map(s => s.trim())
    .filter(Boolean);

const mergeSet = (base: Set<string>, add?: string[]) => {
  if (!add || add.length === 0) return base;
  const s = new Set(base);
  for (const v of add) s.add(v);
  return s;
};

const looksBinaryByName = (name: string) => {
  const lower = name.toLowerCase();
  const ext = lower.includes('.') ? lower.split('.').pop() || '' : '';
  return ext ? BINARY_EXTENSIONS.has(ext) : false;
};

type WalkFile = {
  fileHandle: FileSystemFileHandle;
  relPath: string; // e.g. "src/index.ts"
  dirParts: string[]; // e.g. ["src"]
  name: string; // e.g. "index.ts"
};

class NativeFileSystemServiceClass {
  private rootHandle: FileSystemDirectoryHandle | null = null;

  // cache: "src/index.ts" -> FileSystemFileHandle
  private fileHandleCache: Map<string, FileSystemFileHandle> = new Map();

  /**
   * Open a directory picker and request access to the real file system.
   */
  async openDirectory(options: OpenDirectoryOptions = {}): Promise<DirectoryContent | null> {
    try {
      if (!('showDirectoryPicker' in window)) {
        throw new Error('File System Access API is not supported in this browser.');
      }

      const mode = options.mode ?? 'readwrite';

      // @ts-ignore - showDirectoryPicker is experimental
      const dirHandle: FileSystemDirectoryHandle = await window.showDirectoryPicker({ mode });

      this.rootHandle = dirHandle;
      this.fileHandleCache.clear();

      const scan = options.scan ?? {};
      return await this.scanDirectory(dirHandle, '', 0, {
        recursive: scan.recursive ?? true,
        maxDepth: scan.maxDepth,
        excludeDotDirs: scan.excludeDotDirs ?? false,
        excludeDotFiles: scan.excludeDotFiles ?? false,
        excludedDirs: scan.excludedDirs,
        excludedFiles: scan.excludedFiles,
      });
    } catch (error) {
      console.error('Failed to open directory:', error);
      return null;
    }
  }

  private shouldSkipEntry(
    entry: FileSystemHandle,
    opts: {
      excludeDotDirs: boolean;
      excludeDotFiles: boolean;
      excludedDirs: Set<string>;
      excludedFiles: Set<string>;
    }
  ): boolean {
    const name = entry.name;

    if (entry.kind === 'directory') {
      if (opts.excludeDotDirs && name.startsWith('.')) return true;
      if (opts.excludedDirs.has(name)) return true;
      return false;
    }

    // file
    if (opts.excludeDotFiles && name.startsWith('.')) return true;
    if (opts.excludedFiles.has(name)) return true;
    return false;
  }

  /**
   * Recursively scan a directory handle (for UI tree).
   * Includes exclusions to avoid scanning huge dirs.
   */
  private async scanDirectory(
    dirHandle: FileSystemDirectoryHandle,
    basePath: string,
    depth: number,
    scan: {
      recursive: boolean;
      maxDepth?: number;
      excludeDotDirs: boolean;
      excludeDotFiles: boolean;
      excludedDirs?: string[];
      excludedFiles?: string[];
    }
  ): Promise<DirectoryContent> {
    const entries: DirectoryContent[] = [];

    const excludedDirs = mergeSet(DEFAULT_EXCLUDED_DIRS, scan.excludedDirs);
    const excludedFiles = mergeSet(DEFAULT_EXCLUDED_FILES, scan.excludedFiles);

    const opts = {
      excludeDotDirs: scan.excludeDotDirs,
      excludeDotFiles: scan.excludeDotFiles,
      excludedDirs,
      excludedFiles,
    };

    const stopHere = typeof scan.maxDepth === 'number' ? depth >= scan.maxDepth : false;

    for await (const entry of dirHandle.values()) {
      if (this.shouldSkipEntry(entry, opts)) continue;

      const fullPath = basePath ? `${basePath}/${entry.name}` : entry.name;

      if (entry.kind === 'directory') {
        if (!scan.recursive || stopHere) {
          // Lazy tree node (no children scan)
          entries.push({
            name: entry.name,
            path: fullPath,
            isDirectory: true,
            handle: entry as FileSystemDirectoryHandle,
            children: [],
          });
          continue;
        }

        const subDir = await this.scanDirectory(
          entry as FileSystemDirectoryHandle,
          fullPath,
          depth + 1,
          scan
        );

        entries.push({
          name: entry.name,
          path: fullPath,
          isDirectory: true,
          handle: entry as FileSystemDirectoryHandle,
          children: subDir.children,
        });
      } else {
        entries.push({
          name: entry.name,
          path: fullPath,
          isDirectory: false,
          fileHandle: entry as FileSystemFileHandle,
        });
      }
    }

    return {
      name: dirHandle.name,
      path: basePath || '/',
      isDirectory: true,
      handle: dirHandle,
      children: entries,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Walk & Read all files (optimized)
  // ─────────────────────────────────────────────────────────────
  private async *walkFiles(
    dirHandle: FileSystemDirectoryHandle,
    basePath: string,
    opts: {
      excludedDirs: Set<string>;
      excludedFiles: Set<string>;
      excludeDotDirs: boolean;
      excludeDotFiles: boolean;
    }
  ): AsyncGenerator<WalkFile> {
    for await (const entry of dirHandle.values()) {
      if (
        this.shouldSkipEntry(entry, {
          excludeDotDirs: opts.excludeDotDirs,
          excludeDotFiles: opts.excludeDotFiles,
          excludedDirs: opts.excludedDirs,
          excludedFiles: opts.excludedFiles,
        })
      ) {
        continue;
      }

      const fullPath = basePath ? `${basePath}/${entry.name}` : entry.name;

      if (entry.kind === 'directory') {
        yield* this.walkFiles(entry as FileSystemDirectoryHandle, fullPath, opts);
      } else {
        const parts = splitRelPath(fullPath);
        const name = parts[parts.length - 1] || entry.name;
        const dirParts = parts.slice(0, -1);

        yield {
          fileHandle: entry as FileSystemFileHandle,
          relPath: fullPath,
          dirParts,
          name,
        };
      }
    }
  }

  private async mapConcurrently<T, R>(
    items: T[],
    concurrency: number,
    fn: (item: T, index: number) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let idx = 0;

    const worker = async () => {
      while (idx < items.length) {
        const i = idx++;
        results[i] = await fn(items[i], i);
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
    await Promise.all(workers);
    return results;
  }

  /**
   * Read and return all files from opened directory recursively.
   * ✅ مع استثناءات + حدود + فلترة ملفات ثنائية تقريبية.
   */
  async getAllFilesFromDirectory(options: ReadAllFilesOptions = {}): Promise<FlatFileEntry[]> {
    if (!this.rootHandle) {
      throw new Error('No directory opened. Please open a folder first.');
    }

    const maxFiles = options.maxFiles ?? 2000;
    const maxSize = options.maxFileSizeBytes ?? 1 * 1024 * 1024; // 1MB
    const concurrency = options.concurrency ?? 25;
    const textOnly = options.textOnly ?? true;

    const excludedDirs = mergeSet(DEFAULT_EXCLUDED_DIRS, options.excludedDirs);
    const excludedFiles = mergeSet(DEFAULT_EXCLUDED_FILES, options.excludedFiles);

    const walkOpts = {
      excludedDirs,
      excludedFiles,
      excludeDotDirs: options.excludeDotDirs ?? false,
      excludeDotFiles: options.excludeDotFiles ?? false,
    };

    const collected: WalkFile[] = [];
    for await (const f of this.walkFiles(this.rootHandle, '', walkOpts)) {
      collected.push(f);
      if (collected.length >= maxFiles) break;
    }

    const loaded = await this.mapConcurrently(
      collected,
      concurrency,
      async (f): Promise<FlatFileEntry | null> => {
        try {
          if (textOnly && looksBinaryByName(f.name)) return null;

          const file = await f.fileHandle.getFile();
          if (file.size > maxSize) return null;

          const content = await file.text();

          // Quick binary sanity check (NUL byte)
          if (textOnly && content.includes('\u0000')) return null;

          return {
            name: f.name,
            path: f.dirParts, // ✅ dirs only
            content,
          };
        } catch (err) {
          console.error(`Failed to read file ${f.relPath}:`, err);
          return null;
        }
      }
    );

    return loaded.filter((x): x is FlatFileEntry => Boolean(x));
  }

  // ─────────────────────────────────────────────────────────────
  // Single file ops
  // ─────────────────────────────────────────────────────────────
  private async resolveFileHandle(path: string): Promise<FileSystemFileHandle> {
    if (!this.rootHandle) {
      throw new Error('No directory opened. Please open a folder first.');
    }

    const normalized = normalizeRelPath(path);
    const cached = this.fileHandleCache.get(normalized);
    if (cached) return cached;

    const parts = splitRelPath(normalized);
    if (parts.length === 0) throw new Error('Invalid path');

    let current: FileSystemDirectoryHandle = this.rootHandle;

    // Navigate to the parent directory
    for (let i = 0; i < parts.length - 1; i++) {
      const segment = parts[i];
      // @ts-ignore
      current = await current.getDirectoryHandle(segment, { create: false });
    }

    const fileName = parts[parts.length - 1];
    const fileHandle = await current.getFileHandle(fileName, { create: false });

    this.fileHandleCache.set(normalized, fileHandle);
    return fileHandle;
  }

  /**
   * Read content from a real file (relative to opened root folder).
   */
  async readFile(path: string): Promise<string> {
    try {
      const handle = await this.resolveFileHandle(path);
      const file = await handle.getFile();
      return await file.text();
    } catch (error: any) {
      console.error(`[NativeFileSystemService] Failed to read file "${path}":`, error);
      throw error;
    }
  }

  /**
   * Write content to a real file (relative to opened root folder).
   */
  async writeFile(path: string, content: string): Promise<void> {
    try {
      if (!this.rootHandle) {
        throw new Error('No directory opened. Please open a folder first.');
      }

      const normalized = normalizeRelPath(path);
      const parts = splitRelPath(normalized);
      if (parts.length === 0) throw new Error('Invalid path');

      let current: FileSystemDirectoryHandle = this.rootHandle;

      // Navigate/Create directories
      for (let i = 0; i < parts.length - 1; i++) {
        const segment = parts[i];
        // @ts-ignore
        current = await current.getDirectoryHandle(segment, { create: true });
      }

      const fileName = parts[parts.length - 1];
      const fileHandle = await current.getFileHandle(fileName, { create: true });

      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();

      this.fileHandleCache.set(normalized, fileHandle);
    } catch (error: any) {
      console.error(`[NativeFileSystemService] Failed to write file "${path}":`, error);
      throw error;
    }
  }

  /**
   * Check if a file exists.
   */
  async exists(path: string): Promise<boolean> {
    try {
      await this.resolveFileHandle(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the root handle status.
   */
  isDirectoryOpen(): boolean {
    return this.rootHandle !== null;
  }

  /**
   * Close the current session (clears handles).
   */
  closeDirectory(): void {
    this.rootHandle = null;
    this.fileHandleCache.clear();
  }
}

export const NativeFileSystemService = new NativeFileSystemServiceClass();