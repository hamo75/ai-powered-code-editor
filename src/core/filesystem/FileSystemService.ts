// ═══════════════════════════════════════════════════════════════
// 📂 File System Service v1.1 - Virtual FS (Browser)
// Features:
//   - In-memory virtual file system persisted to localStorage
//   - Directory tree listing (direct children)
//   - File watching (chokidar-like, simplified)
//   - Safe/atomic-ish write with rollback on persistence failure
//   - Directory operations (create/delete recursive)
// ═══════════════════════════════════════════════════════════════

import { logger } from '../logger/UnifiedLogger.js';

export interface FileEntry {
  name: string;
  path: string; // normalized absolute path e.g. "/src/main.tsx"
  content: string;
  size: number;
  lastModified: number;
  isDirectory: boolean;
  language?: string;
}

export interface FileSystemStats {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
  largestFile?: FileEntry;
  recentlyModified: FileEntry[];
}

export type WatchCallback = (
  event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir',
  path: string
) => void;

interface Watcher {
  path: string;
  callback: WatchCallback;
  unsubscribe: () => void;
}

type PersistedEntry = [string, FileEntry];

class FileSystemServiceClass {
  private virtualFS: Map<string, FileEntry> = new Map();
  private watchers: Watcher[] = [];
  private writeLocks: Set<string> = new Set();

  private readonly STORAGE_KEY = 'ai_code_studio_files_v1';
  private readonly STORAGE_VERSION = 1;

  constructor() {
    this.loadFromStorage();
    logger.info('filesystem', 'File System Service initialized');
  }

  // ─── Core File Operations ────────────────────────────────────

  async read(path: string): Promise<string> {
    const startTime = Date.now();
    const normalizedPath = this.normalizePath(path);

    try {
      logger.debug('filesystem', `Reading file: ${normalizedPath}`);

      const entry = this.virtualFS.get(normalizedPath);
      if (!entry) throw new Error(`File not found: ${normalizedPath}`);
      if (entry.isDirectory) throw new Error(`Cannot read directory as file: ${normalizedPath}`);

      const duration = Date.now() - startTime;
      logger.info('filesystem', `File read: ${normalizedPath}`, {
        size: entry.size,
        duration,
      });

      return entry.content;
    } catch (error) {
      logger.error('filesystem', error as Error, { path: normalizedPath });
      throw error;
    }
  }

  async write(path: string, content: string, options: { atomic?: boolean } = {}): Promise<void> {
    const startTime = Date.now();
    const normalizedPath = this.normalizePath(path);

    if (this.writeLocks.has(normalizedPath)) {
      throw new Error(`File is locked for writing: ${normalizedPath}`);
    }

    this.writeLocks.add(normalizedPath);

    const existed = this.virtualFS.has(normalizedPath);
    const prev = this.virtualFS.get(normalizedPath);

    try {
      logger.debug('filesystem', `Writing file: ${normalizedPath}`);

      // Ensure parent directories exist as logical nodes (optional but helps list())
      this.ensureParentDirectories(normalizedPath);

      const newEntry: FileEntry = {
        name: this.getFileName(normalizedPath),
        path: normalizedPath,
        content,
        size: new Blob([content]).size,
        lastModified: Date.now(),
        isDirectory: false,
        language: this.detectLanguage(normalizedPath),
      };

      // "atomic" here means: revert if persistence fails
      this.virtualFS.set(normalizedPath, newEntry);

      await this.saveToStorage();

      const duration = Date.now() - startTime;
      logger.info('filesystem', `File written: ${normalizedPath}`, {
        size: newEntry.size,
        changed: prev?.content !== content,
        duration,
      });

      this.notifyWatchers(existed ? 'change' : 'add', normalizedPath);
    } catch (error) {
      // rollback on error if atomic (default)
      if (options.atomic !== false) {
        if (prev) this.virtualFS.set(normalizedPath, prev);
        else this.virtualFS.delete(normalizedPath);
      }

      logger.error('filesystem', error as Error, { path: normalizedPath });
      throw error;
    } finally {
      this.writeLocks.delete(normalizedPath);
    }
  }

  async exists(path: string): Promise<boolean> {
    const normalizedPath = this.normalizePath(path);
    return this.virtualFS.has(normalizedPath);
  }

  async delete(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);

    try {
      logger.debug('filesystem', `Deleting file: ${normalizedPath}`);

      const entry = this.virtualFS.get(normalizedPath);
      if (!entry) throw new Error(`File not found: ${normalizedPath}`);
      if (entry.isDirectory) throw new Error(`Path is a directory, use deleteDirectory(): ${normalizedPath}`);

      this.virtualFS.delete(normalizedPath);
      await this.saveToStorage();

      logger.info('filesystem', `File deleted: ${normalizedPath}`);
      this.notifyWatchers('unlink', normalizedPath);
    } catch (error) {
      logger.error('filesystem', error as Error, { path: normalizedPath });
      throw error;
    }
  }

  /**
   * List direct children of a directory.
   * - Returns FileEntry nodes for direct files and directories.
   * - Also synthesizes directory nodes that have children even if not explicitly created.
   */
  async list(directory: string = '/'): Promise<FileEntry[]> {
    const dir = this.normalizePath(directory);
    logger.debug('filesystem', `Listing directory: ${dir}`);

    const entries: FileEntry[] = [];
    const seen = new Set<string>();

    // 1) Explicit direct children (files or directories)
    for (const entry of this.virtualFS.values()) {
      const parent = this.getDirectoryName(entry.path);
      if (parent === dir) {
        if (!seen.has(entry.path)) {
          entries.push(entry);
          seen.add(entry.path);
        }
      }
    }

    // 2) Synthesize missing subdirectories (if a file exists deeper)
    const dirPrefix = dir === '/' ? '/' : dir + '/';
    const subdirs = new Set<string>();

    for (const entry of this.virtualFS.values()) {
      if (!entry.path.startsWith(dirPrefix)) continue;
      if (entry.path === dir) continue;

      const rel = entry.path.slice(dirPrefix.length); // "src/index.ts"
      const first = rel.split('/')[0];
      if (!first) continue;

      const childPath = dir === '/' ? `/${first}` : `${dir}/${first}`;
      if (childPath === entry.path) continue; // direct file/dir already handled above
      subdirs.add(childPath);
    }

    for (const subdirPath of subdirs) {
      if (seen.has(subdirPath)) continue;

      // If an explicit directory exists, include it; else create a synthetic one
      const explicitDir = this.virtualFS.get(subdirPath);
      if (explicitDir && explicitDir.isDirectory) {
        entries.push(explicitDir);
        seen.add(subdirPath);
        continue;
      }

      entries.push({
        name: this.getFileName(subdirPath),
        path: subdirPath,
        content: '',
        size: 0,
        lastModified: 0,
        isDirectory: true,
      });
      seen.add(subdirPath);
    }

    logger.info('filesystem', `Directory listed: ${dir}`, { count: entries.length });

    return entries.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  // ─── Directory Operations ────────────────────────────────────

  async createDirectory(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    if (normalizedPath === '/') return;

    try {
      logger.debug('filesystem', `Creating directory: ${normalizedPath}`);

      // Ensure parent directories exist too
      this.ensureParentDirectories(normalizedPath);

      const dirEntry: FileEntry = {
        name: this.getFileName(normalizedPath),
        path: normalizedPath,
        content: '',
        size: 0,
        lastModified: Date.now(),
        isDirectory: true,
      };

      const existed = this.virtualFS.has(normalizedPath);
      this.virtualFS.set(normalizedPath, dirEntry);
      await this.saveToStorage();

      logger.info('filesystem', `Directory created: ${normalizedPath}`);
      this.notifyWatchers(existed ? 'change' : 'addDir', normalizedPath);
    } catch (error) {
      logger.error('filesystem', error as Error, { path: normalizedPath });
      throw error;
    }
  }

  async deleteDirectory(path: string, recursive: boolean = false): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    if (normalizedPath === '/') throw new Error('Refusing to delete root directory "/"');

    try {
      logger.debug('filesystem', `Deleting directory: ${normalizedPath}`);

      const dirEntry = this.virtualFS.get(normalizedPath);
      if (dirEntry && !dirEntry.isDirectory) {
        throw new Error(`Path is not a directory: ${normalizedPath}`);
      }

      const prefix = normalizedPath + '/';
      const toDelete: string[] = [];

      for (const key of this.virtualFS.keys()) {
        if (key === normalizedPath) {
          toDelete.push(key);
          continue;
        }
        if (key.startsWith(prefix)) {
          if (!recursive) throw new Error(`Directory not empty: ${normalizedPath}`);
          toDelete.push(key);
        }
      }

      // If the directory was "synthetic" (not explicitly present), but has children
      if (!dirEntry) {
        const hasChildren = Array.from(this.virtualFS.keys()).some(k => k.startsWith(prefix));
        if (hasChildren && !recursive) throw new Error(`Directory not empty: ${normalizedPath}`);
        if (hasChildren && recursive) {
          for (const key of this.virtualFS.keys()) {
            if (key.startsWith(prefix)) toDelete.push(key);
          }
        }
      }

      // delete unique
      const unique = Array.from(new Set(toDelete));
      for (const key of unique) this.virtualFS.delete(key);

      await this.saveToStorage();

      logger.info('filesystem', `Directory deleted: ${normalizedPath}`, { deletedCount: unique.length });
      this.notifyWatchers('unlinkDir', normalizedPath);
    } catch (error) {
      logger.error('filesystem', error as Error, { path: normalizedPath });
      throw error;
    }
  }

  // ─── File Watching ───────────────────────────────────────────

  watch(path: string, callback: WatchCallback): () => void {
    const normalizedPath = this.normalizePath(path);
    logger.debug('filesystem', `Watching path: ${normalizedPath}`);

    const watcher: Watcher = {
      path: normalizedPath,
      callback,
      unsubscribe: () => {
        const index = this.watchers.findIndex(
          w => w.path === normalizedPath && w.callback === callback
        );
        if (index > -1) {
          this.watchers.splice(index, 1);
          logger.debug('filesystem', `Stopped watching: ${normalizedPath}`);
        }
      },
    };

    this.watchers.push(watcher);
    return watcher.unsubscribe;
  }

  private pathMatchesWatch(watchPath: string, changedPath: string): boolean {
    if (watchPath === '/') return true;
    if (changedPath === watchPath) return true;
    // boundary-safe prefix match
    return changedPath.startsWith(watchPath + '/');
  }

  private notifyWatchers(
    event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir',
    path: string
  ): void {
    for (const watcher of this.watchers) {
      if (!this.pathMatchesWatch(watcher.path, path)) continue;
      try {
        watcher.callback(event, path);
      } catch (e) {
        logger.error('filesystem', 'Watcher callback error', { error: e, path });
      }
    }
  }

  // ─── Statistics & Utilities ──────────────────────────────────

  getStats(): FileSystemStats {
    const files = Array.from(this.virtualFS.values()).filter(f => !f.isDirectory);
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    const filesByType: Record<string, number> = {};
    let largestFile: FileEntry | undefined;

    for (const file of files) {
      const ext = file.name.includes('.') ? (file.name.split('.').pop() || 'unknown') : 'noext';
      filesByType[ext] = (filesByType[ext] || 0) + 1;

      if (!largestFile || file.size > largestFile.size) largestFile = file;
    }

    const recentlyModified = [...files]
      .sort((a, b) => b.lastModified - a.lastModified)
      .slice(0, 10);

    return {
      totalFiles: files.length,
      totalSize,
      filesByType,
      largestFile,
      recentlyModified,
    };
  }

  getAllFiles(): FileEntry[] {
    return Array.from(this.virtualFS.values()).filter(f => !f.isDirectory);
  }

  clear(): void {
    this.virtualFS.clear();
    void this.saveToStorage();
    logger.info('filesystem', 'File system cleared');
  }

  // ─── Persistence ─────────────────────────────────────────────

  private async saveToStorage(): Promise<void> {
    try {
      // Only store "real" nodes. (All nodes here are real; keep as-is.)
      const data: PersistedEntry[] = Array.from(this.virtualFS.entries());
      const payload = JSON.stringify({
        v: this.STORAGE_VERSION,
        data,
      });

      localStorage.setItem(this.STORAGE_KEY, payload);
    } catch (error) {
      logger.warn('filesystem', 'Failed to save to storage', { error });
      // Storage might be full; continue with in-memory only.
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as { v?: number; data?: PersistedEntry[] } | PersistedEntry[];

      let entries: PersistedEntry[] | undefined;

      // backward compatibility: previously stored just the array
      if (Array.isArray(parsed)) {
        entries = parsed as PersistedEntry[];
      } else {
        entries = parsed.data;
      }

      if (!entries || !Array.isArray(entries)) return;

      const map = new Map<string, FileEntry>();
      for (const [key, entry] of entries) {
        if (!entry || typeof entry.path !== 'string') continue;
        const normalizedKey = this.normalizePath(key);
        const normalizedEntryPath = this.normalizePath(entry.path);
        map.set(normalizedKey, { ...entry, path: normalizedEntryPath });
      }

      this.virtualFS = map;
      logger.info('filesystem', 'Loaded file system from storage', {
        fileCount: this.virtualFS.size,
      });
    } catch (error) {
      logger.warn('filesystem', 'Failed to load from storage', { error });
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private ensureParentDirectories(fileOrDirPath: string): void {
    const dir = this.getDirectoryName(fileOrDirPath);
    if (dir === '/' || dir === fileOrDirPath) return;

    const parts = dir.split('/').filter(Boolean);
    let current = '';

    for (const part of parts) {
      current += '/' + part;
      if (!this.virtualFS.has(current)) {
        this.virtualFS.set(current, {
          name: part,
          path: current,
          content: '',
          size: 0,
          lastModified: 0,
          isDirectory: true,
        });
      }
    }
  }

  private normalizePath(path: string): string {
    if (!path) return '/';
    if (path === '/') return '/';

    // Convert backslashes and remove trailing slashes
    let normalized = path.replace(/\\/g, '/').replace(/\/+$/, '');

    // Ensure leading slash
    if (!normalized.startsWith('/')) normalized = '/' + normalized;

    // Collapse multiple slashes
    normalized = normalized.replace(/\/{2,}/g, '/');

    // Resolve "." and ".."
    const parts = normalized.split('/').filter(p => p && p !== '.');
    const resolved: string[] = [];

    for (const part of parts) {
      if (part === '..') resolved.pop();
      else resolved.push(part);
    }

    return resolved.length ? '/' + resolved.join('/') : '/';
  }

  private getFileName(path: string): string {
    const parts = path.split('/').filter(Boolean);
    return parts[parts.length - 1] || path;
  }

  private getDirectoryName(path: string): string {
    const normalized = this.normalizePath(path);
    if (normalized === '/') return '/';

    const parts = normalized.split('/');
    parts.pop(); // remove last segment
    const dir = parts.join('/');
    return dir === '' ? '/' : dir;
  }

  private detectLanguage(path: string): string {
    const name = this.getFileName(path).toLowerCase();

    // special names
    if (name === 'dockerfile') return 'dockerfile';
    if (name === 'makefile') return 'makefile';

    const ext = name.includes('.') ? name.split('.').pop() || '' : '';
    const map: Record<string, string> = {
      dart: 'dart',
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
      html: 'html',
      css: 'css',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      xml: 'xml',
      md: 'markdown',
      txt: 'plaintext',
      sh: 'shell',
      bash: 'shell',
      toml: 'toml',
      ini: 'plaintext',
    };

    return map[ext] || 'plaintext';
  }
}

// Export the class for direct instantiation (if needed)
export { FileSystemServiceClass };

// Singleton instance
export const FileSystemService = new FileSystemServiceClass();
export default FileSystemService;