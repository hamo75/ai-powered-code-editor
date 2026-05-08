import { StateCreator } from 'zustand';
import { FileNode, EditorStore } from '../types/store';
import { defaultFiles } from '../utils/defaultFiles';
import { getRootFolder, ensureFolderChain } from '../utils/helpers';
import { readFolderFiles } from '../../utils/fileSystem';
import { FileSystemService } from '../../core/filesystem/FileSystemService';
import { NativeFileSystemService } from '../../core/fs/NativeFileSystemService';
import { logger } from '../../core/logger/UnifiedLogger';

export interface FileSlice {
  // State
  files: FileNode[];
  activeFileId: string | null;
  openTabs: string[];
  expandedFolders: Set<string>;
  projectName: string;
  recentProjects: Array<{ name: string; files: FileNode[]; savedAt: number }>;

  // Actions - Files
  addFile: (file: FileNode) => void;
  importFolderFromDevice: (fileList: FileList) => void;
  addFileToFolder: (parentId: string, name: string, type: 'file' | 'folder') => FileNode | null;
  updateFile: (id: string, content: string) => void;
  deleteFile: (id: string) => void;
  renameFile: (id: string, name: string) => void;
  moveFile: (fileId: string, newParentId: string) => void;
  setActiveFile: (id: string | null) => void;
  openTab: (id: string) => void;
  closeTab: (id: string) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (keepId: string) => void;
  toggleFolder: (id: string) => void;
  saveFile: (id: string) => void;
  saveAllFiles: () => void;
  markClean: (id: string) => void;

  // Actions - Import/Export
  downloadActiveFile: () => void;
  importFiles: (files: { name: string; content: string; path: string[] }[]) => void;
  importFolder: (files: { name: string; content: string; path: string[] }[]) => void;
  setActiveProjectName: (name: string) => void;
  saveProjectAs: (name: string) => void;
  loadProject: (name: string) => void;
  deleteSavedProject: (name: string) => void;

  // Actions - Persistence
  persist: () => void;
  resetProject: () => void;
  exportProject: () => string;
  importProject: (json: string) => boolean;

  // Actions - Real File System
  openRealFolder: () => Promise<void>;
  saveFileToDisk: (id: string) => Promise<void>;
  syncWithRealFile: (id: string, path: string) => Promise<void>;
  loadFileFromDisk: (path: string) => Promise<FileNode | null>;
}

export const createFileSlice: StateCreator<EditorStore, [], [], FileSlice> = (set, get) => ({
  // Initial State
  files: defaultFiles,
  activeFileId: null,
  openTabs: [],
  expandedFolders: new Set(['root', 'src', 'lib', 'components', 'public']),
  projectName: 'my-app',
  recentProjects: [],

  // ─────────────────────────────────────────────────────────────
  // File Actions
  // ─────────────────────────────────────────────────────────────
  addFile: (file) => {
    set((state) => {
      const newFiles = [...state.files, file];
      if (file.parentId) {
        const parent = newFiles.find((f) => f.id === file.parentId);
        if (parent && parent.type === 'folder') {
          parent.children = [...(parent.children || []), file.id];
          parent.updatedAt = Date.now();
        }
      }
      return { files: newFiles };
    });
  },

  /**
   * Import folder using <input webkitdirectory>.
   * ✅ يستخدم readFolderFiles (فلترة + حدود + استثناء node_modules/.git... + الحفاظ على مجلد المشروع كجذر)
   */
  importFolderFromDevice: (fileList) => {
    (async () => {
      if (!fileList || fileList.length === 0) {
        get().addNotification({
          id: Date.now().toString(),
          type: 'info',
          message: 'ℹ️ لم يتم اختيار أي ملفات',
        });
        return;
      }

      const { files, stats } = await readFolderFiles(fileList, {
        preserveRootFolder: true, // مهم: إظهار مجلد المشروع كجذر داخل الشجرة
      });

      if (files.length === 0) {
        get().addNotification({
          id: Date.now().toString(),
          type: 'info',
          message: '📂 لم يتم استيراد ملفات (قد تكون كلها مستثناة أو ثنائية/كبيرة)',
        });
        return;
      }

      // files هنا ImportedFile { name, content, path: dirs[] }
      get().importFolder(
        files.map((f) => ({
          name: f.name,
          content: f.content,
          path: f.path, // dirs فقط
        }))
      );

      get().addNotification({
        id: Date.now().toString(),
        type: 'success',
        message: `✅ تم استيراد ${stats.imported} ملف (تم تخطي ${stats.skipped})`,
      });
    })().catch((error: any) => {
      logger.error('fileImport', error as Error);
      get().addNotification({
        id: Date.now().toString(),
        type: 'error',
        message: `❌ فشل استيراد المجلد: ${error?.message || 'خطأ غير معروف'}`,
      });
    });
  },

  addFileToFolder: (parentId, name, type) => {
    const state = get();
    const parent = state.files.find((f) => f.id === parentId);
    if (!parent || parent.type !== 'folder') return null;

    const exists = state.files.some((f) => f.parentId === parentId && f.name === name);
    if (exists) return null;

    const id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const newNode: FileNode = {
      id,
      name,
      type,
      parentId,
      isDirty: false,
      createdAt: now,
      updatedAt: now,
      ...(type === 'file'
        ? { content: '', language: getLanguageFromName(name) }
        : { children: [] }),
    };

    set((state) => {
      const newFiles = [...state.files, newNode];
      const parentIndex = newFiles.findIndex((f) => f.id === parentId);
      if (parentIndex !== -1) {
        newFiles[parentIndex] = {
          ...newFiles[parentIndex],
          children: [...(newFiles[parentIndex].children || []), id],
          updatedAt: now,
        };
      }
      return { files: newFiles };
    });

    return newNode;
  },

  updateFile: (id, content) => {
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, content, isDirty: true, updatedAt: Date.now() } : f
      ),
    }));
  },

  deleteFile: (id) => {
    set((state) => {
      const fileToDelete = state.files.find((f) => f.id === id);
      if (!fileToDelete) return state;

      const idsToDelete = new Set<string>([id]);
      if (fileToDelete.type === 'folder') {
        const collectChildren = (folderId: string) => {
          state.files
            .filter((f) => f.parentId === folderId)
            .forEach((child) => {
              idsToDelete.add(child.id);
              if (child.type === 'folder') collectChildren(child.id);
            });
        };
        collectChildren(id);
      }

      const newFiles = state.files.filter((f) => !idsToDelete.has(f.id));
      newFiles.forEach((f) => {
        if (f.children) f.children = f.children.filter((cid) => !idsToDelete.has(cid));
      });

      const newOpenTabs = state.openTabs.filter((tabId) => !idsToDelete.has(tabId));
      const newActiveFileId =
        state.activeFileId && idsToDelete.has(state.activeFileId)
          ? newOpenTabs.length > 0
            ? newOpenTabs[newOpenTabs.length - 1]
            : null
          : state.activeFileId;

      return {
        files: newFiles,
        openTabs: newOpenTabs,
        activeFileId: newActiveFileId,
      };
    });
  },

  renameFile: (id, name) => {
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id
          ? {
              ...f,
              name,
              isDirty: f.type === 'file' ? f.isDirty : false,
              updatedAt: Date.now(),
              ...(f.type === 'file' && { language: getLanguageFromName(name) }),
            }
          : f
      ),
    }));
  },

  moveFile: (fileId, newParentId) => {
    set((state) => {
      const file = state.files.find((f) => f.id === fileId);
      const newParent = state.files.find((f) => f.id === newParentId);

      if (!file || !newParent || newParent.type !== 'folder') return state;

      const newFiles = state.files.map((f) => {
        if (f.id === file.parentId && f.children) {
          return {
            ...f,
            children: f.children.filter((cid) => cid !== fileId),
            updatedAt: Date.now(),
          };
        }
        if (f.id === newParentId) {
          return {
            ...f,
            children: [...(f.children || []), fileId],
            updatedAt: Date.now(),
          };
        }
        if (f.id === fileId) {
          return { ...f, parentId: newParentId };
        }
        return f;
      });

      return { files: newFiles };
    });
  },

  setActiveFile: (id) => {
    set({ activeFileId: id });
    if (id) get().openTab(id);
  },

  openTab: (id) => {
    set((state) => {
      if (state.openTabs.includes(id)) return { activeFileId: id };
      return { openTabs: [...state.openTabs, id], activeFileId: id };
    });
  },

  closeTab: (id) => {
    set((state) => {
      const newTabs = state.openTabs.filter((tabId) => tabId !== id);
      let newActiveFileId = state.activeFileId;

      if (state.activeFileId === id) {
        const closedIndex = state.openTabs.indexOf(id);
        newActiveFileId =
          newTabs.length > 0
            ? newTabs[Math.min(closedIndex, newTabs.length - 1)]
            : null;
      }

      return { openTabs: newTabs, activeFileId: newActiveFileId };
    });
  },

  closeAllTabs: () => {
    set({ openTabs: [], activeFileId: null });
  },

  closeOtherTabs: (keepId) => {
    set({ openTabs: [keepId], activeFileId: keepId });
  },

  toggleFolder: (id) => {
    set((state) => {
      const newExpanded = new Set(state.expandedFolders);
      if (newExpanded.has(id)) newExpanded.delete(id);
      else newExpanded.add(id);
      return { expandedFolders: newExpanded };
    });
  },

  saveFile: (id) => {
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, isDirty: false, updatedAt: Date.now() } : f
      ),
    }));
    get().addNotification({
      id: Date.now().toString(),
      type: 'success',
      message: '✅ تم حفظ الملف',
    });
  },

  saveAllFiles: () => {
    set((state) => ({
      files: state.files.map((f) =>
        f.type === 'file' && f.isDirty ? { ...f, isDirty: false, updatedAt: Date.now() } : f
      ),
    }));
    get().addNotification({
      id: Date.now().toString(),
      type: 'success',
      message: '✅ تم حفظ جميع الملفات',
    });
  },

  markClean: (id) => {
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, isDirty: false } : f)),
    }));
  },

  // ─────────────────────────────────────────────────────────────
  // Import/Export
  // ─────────────────────────────────────────────────────────────
  downloadActiveFile: () => {
    const state = get();
    const file = state.files.find((f) => f.id === state.activeFileId);

    // ✅ يسمح بتنزيل ملف فارغ (content === '')
    if (file && file.type === 'file' && file.content !== undefined) {
      const blob = new Blob([file.content || ''], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);

      get().addNotification({
        id: Date.now().toString(),
        type: 'success',
        message: `📥 تم تنزيل ${file.name}`,
      });
    }
  },

  /**
   * ✅ توحيد معنى path:
   * - path يجب أن يمثل "مجلدات فقط" (بدون اسم الملف)
   * - لكن لدعم بيانات قديمة: إذا كان آخر عنصر من path يساوي name سنقوم بإزالته.
   */
  importFiles: (files) => {
    const state = get();

    // Ensure a root folder exists
    let rootId = getRootFolder(state.files)?.id;
    if (!rootId) {
      const rootFolder: FileNode = {
        id: 'root',
        name: 'root',
        type: 'folder',
        parentId: null,
        children: [],
        isDirty: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      set((s) => ({ files: [rootFolder, ...s.files] }));
      rootId = 'root';
    }

    const upsertImportedContent = (fileId: string, content: string) => {
      const now = Date.now();
      // استيراد = نظيف (غير dirty)
      set((s) => ({
        files: s.files.map((f) =>
          f.id === fileId ? { ...f, content, isDirty: false, updatedAt: now } : f
        ),
      }));
    };

    let importedDartFiles = 0;

    files.forEach(({ name, content, path }) => {
      const normalizedDirs =
        path.length > 0 && path[path.length - 1] === name ? path.slice(0, -1) : path;

      const parentId =
        normalizedDirs.length > 0
          ? ensureFolderChain(
              () => get().files,
              (parentId, folderName) => get().addFileToFolder(parentId, folderName, 'folder'),
              rootId!,
              normalizedDirs
            )
          : rootId!;

      const existing = get().files.find(
        (f) => f.type === 'file' && f.parentId === parentId && f.name === name
      );

      const node = existing ?? get().addFileToFolder(parentId, name, 'file');
      if (node) {
        upsertImportedContent(node.id, content);
        
        // Track Dart files for analysis
        if (name.endsWith('.dart')) {
          importedDartFiles++;
        }
      }
    });

    get().addOutputLine(`📁 تم استيراد ${files.length} ملف${importedDartFiles > 0 ? ` (${importedDartFiles} ملف Dart)` : ''}`);

    get().addNotification({
      id: Date.now().toString(),
      type: 'success',
      message: `📁 تم استيراد ${files.length} ملف`,
    });

    // Trigger automatic analysis if Dart files were imported
    if (importedDartFiles > 0) {
      setTimeout(() => {
        get().addOutputLine('🔍 بدء تحليل الملفات المستوردة...');
        get().runDartAnalyze();
      }, 200);
    }
  },

  importFolder: (files) => {
    get().importFiles(files);
  },

  setActiveProjectName: (name) => {
    set({ projectName: name });
  },

  saveProjectAs: (name) => {
    const state = get();
    const projects = [...state.recentProjects];

    const existingIndex = projects.findIndex((p) => p.name === name);
    const projectData = { name, files: state.files, savedAt: Date.now() };

    if (existingIndex !== -1) projects[existingIndex] = projectData;
    else projects.push(projectData);

    localStorage.setItem('ai-code-studio-projects', JSON.stringify(projects));
    set({ recentProjects: projects });

    get().addNotification({
      id: Date.now().toString(),
      type: 'success',
      message: `💾 تم حفظ المشروع "${name}"`,
    });
  },

  loadProject: (name) => {
    const state = get();
    const project = state.recentProjects.find((p) => p.name === name);
    if (project) {
      set({ files: project.files, activeFileId: null, openTabs: [] });
      get().addNotification({
        id: Date.now().toString(),
        type: 'success',
        message: `📦 تم تحميل المشروع "${name}"`,
      });
    }
  },

  deleteSavedProject: (name) => {
    set((state) => ({
      recentProjects: state.recentProjects.filter((p) => p.name !== name),
    }));
    localStorage.setItem('ai-code-studio-projects', JSON.stringify(get().recentProjects));
    get().addNotification({
      id: Date.now().toString(),
      type: 'info',
      message: `🗑️ تم حذف المشروع "${name}"`,
    });
  },

  // ─────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────
  persist: () => {
    const state = get();
    const toSave = {
      files: state.files,
      apiKey: state.apiKey,
      aiProviderId: state.aiProviderId,
      aiModel: state.aiModel,
      customEndpoint: state.customEndpoint,
      editorTheme: state.editorTheme,
      fontSize: state.fontSize,
      wordWrap: state.wordWrap,
      minimap: state.minimap,
      tabSize: state.tabSize,
      fontFamily: state.fontFamily,
      lineHeight: state.lineHeight,
      letterSpacing: state.letterSpacing,
      lineNumbers: state.lineNumbers,
      cursorStyle: state.cursorStyle,
      cursorBlinking: state.cursorBlinking,
      autoClosingBrackets: state.autoClosingBrackets,
      bracketPairColorization: state.bracketPairColorization,
      renderWhitespace: state.renderWhitespace,
      smoothScrolling: state.smoothScrolling,
      autoSave: state.autoSave,
      autoSaveDelay: state.autoSaveDelay,
      formatOnSave: state.formatOnSave,
      trimTrailingWhitespace: state.trimTrailingWhitespace,
      insertFinalNewline: state.insertFinalNewline,
      aiTemperature: state.aiTemperature,
      aiMaxTokens: state.aiMaxTokens,
      aiSystemPrompt: state.aiSystemPrompt,
      aiStreaming: state.aiStreaming,
      aiAutoFix: state.aiAutoFix,
      terminalFontSize: state.terminalFontSize,
      terminalScrollback: state.terminalScrollback,
      terminalCursorStyle: state.terminalCursorStyle,
      accentColor: state.accentColor,
      showActivityBar: state.showActivityBar,
      showStatusBar: state.showStatusBar,
    };
    localStorage.setItem('ai-code-studio', JSON.stringify(toSave));
  },

  resetProject: () => {
    set({
      files: defaultFiles,
      activeFileId: null,
      openTabs: [],
      expandedFolders: new Set(['root', 'src', 'lib', 'components', 'public']),
    });
    get().addNotification({
      id: Date.now().toString(),
      type: 'info',
      message: '🔄 تم إعادة تعيين المشروع',
    });
  },

  exportProject: () => {
    const state = get();
    return JSON.stringify(state.files, null, 2);
  },

  importProject: (json) => {
    try {
      const files = JSON.parse(json);
      if (Array.isArray(files)) {
        set({ files, activeFileId: null, openTabs: [] });
        get().addNotification({
          id: Date.now().toString(),
          type: 'success',
          message: '📦 تم استيراد المشروع بنجاح',
        });
        return true;
      }
      return false;
    } catch {
      get().addNotification({
        id: Date.now().toString(),
        type: 'error',
        message: '❌ فشل استيراد المشروع',
      });
      return false;
    }
  },

  // ─────────────────────────────────────────────────────────────
  // Real File System Actions
  // ─────────────────────────────────────────────────────────────
  openRealFolder: async () => {
    try {
      const result = await NativeFileSystemService.openDirectory();

      if (!result) {
        get().addNotification({
          id: Date.now().toString(),
          type: 'error',
          message: '❌ فشل فتح المجلد',
        });
        return;
      }

      // ✅ اجعل اسم المشروع = اسم مجلد القرص المفتوح
      set({ projectName: result.name });

      logger.info('filesystem', 'Folder opened', { name: result.name });

      get().addNotification({
        id: Date.now().toString(),
        type: 'success',
        message: `📁 جاري تحميل المجلد: ${result.name}...`,
      });

      // Clear existing files and load from real system
      set({
        files: [],
        activeFileId: null,
        openTabs: [],
        expandedFolders: new Set(['root']),
      });

      const allFiles = await NativeFileSystemService.getAllFilesFromDirectory();

      if (allFiles.length === 0) {
        get().addNotification({
          id: Date.now().toString(),
          type: 'info',
          message: '📂 المجلد فارغ أو لا يحتوي على ملفات',
        });
        return;
      }

      // ✅ أضف "مجلد المشروع" كجذر داخل شجرة التطبيق كي لا يبدو كأنه Root
      get().importFiles(
        allFiles.map((file) => {
          const dirs =
            file.path.length > 0 && file.path[file.path.length - 1] === file.name
              ? file.path.slice(0, -1)
              : file.path;

          return {
            name: file.name,
            content: file.content,
            path: [result.name, ...dirs], // workspace root
          };
        })
      );

      // Expand all folders to show the complete tree (قد يكون كبيرًا—اختياري)
      const state = get();
      const allFolderIds = new Set(['root']);
      state.files
        .filter((f) => f.type === 'folder')
        .forEach((f) => allFolderIds.add(f.id));

      set({ expandedFolders: allFolderIds });

      get().addNotification({
        id: Date.now().toString(),
        type: 'success',
        message: `✅ تم تحميل ${allFiles.length} ملف من المجلد "${result.name}"`,
      });
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        logger.error('filesystem', error as Error);
        get().addNotification({
          id: Date.now().toString(),
          type: 'error',
          message: `❌ فشل فتح المجلد: ${error?.message || 'خطأ غير معروف'}`,
        });
      }
    }
  },

  saveFileToDisk: async (id: string) => {
    try {
      const state = get();
      const file = state.files.find((f) => f.id === id);

      if (!file || file.type !== 'file') {
        throw new Error('ملف غير صالح');
      }

      if (!NativeFileSystemService.isDirectoryOpen()) {
        get().addNotification({
          id: Date.now().toString(),
          type: 'warning',
          message: '⚠️ لم يتم فتح مجلد حقيقي. استخدم "Open Local Folder" أولاً.',
        });
        return;
      }

      // Build path from file structure
      const pathParts: string[] = [];
      let current: FileNode | undefined = file;

      while (current) {
        pathParts.unshift(current.name);
        if (current.parentId) current = state.files.find((f) => f.id === current!.parentId);
        else break;
      }

      // ✅ احذف root الداخلي
      if (pathParts[0] === 'root') pathParts.shift();

      // ✅ احذف مجلد workspace (اسم المجلد الحقيقي) حتى يكون المسار نسبيًا للقرص
      // (لأننا أضفناه داخل openRealFolder كجذر لعرض الشجرة)
      const workspaceName = get().projectName;
      if (pathParts[0] === workspaceName) pathParts.shift();

      const relativePath = pathParts.join('/');

      await NativeFileSystemService.writeFile(relativePath, file.content || '');

      get().markClean(id);
      logger.info('filesystem', 'File saved to disk', { name: file.name, path: relativePath });

      get().addNotification({
        id: Date.now().toString(),
        type: 'success',
        message: `💾 تم حفظ ${file.name} على القرص`,
      });
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        logger.error('filesystem', error as Error);
        get().addNotification({
          id: Date.now().toString(),
          type: 'error',
          message: `❌ فشل الحفظ: ${error?.message || 'خطأ غير معروف'}`,
        });
      }
    }
  },

  syncWithRealFile: async (id: string, path: string) => {
    try {
      const state = get();
      const file = state.files.find((f) => f.id === id);

      if (!file || file.type !== 'file') {
        throw new Error('ملف غير صالح');
      }

      // حفظ في نظام الملفات الافتراضي
      await FileSystemService.write(path, file.content);

      logger.info('filesystem', 'File synced', { id, path });

      get().addNotification({
        id: Date.now().toString(),
        type: 'success',
        message: '✅ تم مزامنة الملف',
      });
    } catch (error: any) {
      logger.error('filesystem', error as Error);
      get().addNotification({
        id: Date.now().toString(),
        type: 'error',
        message: `❌ فشل المزامنة: ${error?.message || 'خطأ غير معروف'}`,
      });
    }
  },

  loadFileFromDisk: async (path: string): Promise<FileNode | null> => {
    try {
      const content = await FileSystemService.read(path);
      const fileName = path.split('/').pop() || 'unknown';

      const id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = Date.now();

      const newNode: FileNode = {
        id,
        name: fileName,
        type: 'file',
        parentId: undefined,
        content,
        language: getLanguageFromName(fileName),
        isDirty: false,
        createdAt: now,
        updatedAt: now,
      };

      logger.info('filesystem', 'File loaded from disk', { path, fileName });

      return newNode;
    } catch (error: any) {
      logger.error('filesystem', error as Error);
      get().addNotification({
        id: Date.now().toString(),
        type: 'error',
        message: `❌ فشل تحميل الملف: ${error?.message || 'خطأ غير معروف'}`,
      });
      return null;
    }
  },
});

const getLanguageFromName = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower === 'dockerfile') return 'dockerfile';
  if (lower === 'makefile') return 'makefile';

  const ext = lower.split('.').pop() || '';
  const map: Record<string, string> = {
    html: 'html',
    css: 'css',
    js: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    jsx: 'javascript',
    py: 'python',
    json: 'json',
    md: 'markdown',
    txt: 'plaintext',
    sh: 'shell',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    sql: 'sql',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    php: 'php',
    dart: 'dart',
    env: 'plaintext',
    gitignore: 'plaintext',
  };
  return map[ext] || 'plaintext';
};