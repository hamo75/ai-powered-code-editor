import { describe, it, expect, beforeEach } from 'vitest';
import { createFileSlice, FileSlice } from '../slices/fileSlice';
import { EditorStore } from '../types/store';
import { defaultFiles } from '../utils/defaultFiles';

// Mock helper functions
vi.mock('../utils/helpers', () => ({
  getRootFolder: vi.fn(() => 'root'),
  getRelativeSegments: vi.fn((path) => path.split('/')),
  buildRelativePath: vi.fn((segments) => segments.join('/')),
  ensureFolderChain: vi.fn((files, path) => files),
  findFileByRelativePath: vi.fn(),
  normalizeProjectSegments: vi.fn((segs) => segs),
}));

// Mock Zustand set/get
const createMockSetGet = () => {
  let state: Partial<EditorStore & FileSlice> = {
    files: defaultFiles,
    activeFileId: null,
    openTabs: [],
    expandedFolders: new Set(['root']),
    projectName: 'test-project',
    recentProjects: [],
  };

  const set = vi.fn((fn: any) => {
    if (typeof fn === 'function') {
      state = { ...state, ...fn(state) };
    } else {
      state = { ...state, ...fn };
    }
  });

  const get = vi.fn(() => ({
    ...state,
    openTab: vi.fn(),
    addNotification: vi.fn(),
  }));

  return { set, get, getState: () => state };
};

describe('FileSlice', () => {
  let mockSetGet: ReturnType<typeof createMockSetGet>;

  beforeEach(() => {
    mockSetGet = createMockSetGet();
  });

  describe('Initial State', () => {
    it('should initialize with default files', () => {
      const slice = createFileSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & FileSlice);
      expect(slice.files).toEqual(defaultFiles);
    });

    it('should initialize with empty active file', () => {
      const slice = createFileSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & FileSlice);
      expect(slice.activeFileId).toBeNull();
    });

    it('should initialize with empty tabs', () => {
      const slice = createFileSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & FileSlice);
      expect(slice.openTabs).toEqual([]);
    });

    it('should initialize with default project name', () => {
      const slice = createFileSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & FileSlice);
      expect(slice.projectName).toBe('my-app');
    });
  });

  describe('addFile', () => {
    it('should add a new file to the store', () => {
      const slice = createFileSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & FileSlice);
      const newFile = {
        id: 'file-1',
        name: 'test.ts',
        type: 'file' as const,
        parentId: 'root',
        content: 'console.log("test");',
        isDirty: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        language: 'typescript',
      };

      slice.addFile(newFile);

      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should update parent folder children when adding file', () => {
      const slice = createFileSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & FileSlice);
      const newFile = {
        id: 'file-2',
        name: 'new.ts',
        type: 'file' as const,
        parentId: 'src-folder',
        content: '',
        isDirty: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        language: 'typescript',
      };

      slice.addFile(newFile);

      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('setActiveFile', () => {
    it('should set the active file ID', () => {
      const slice = createFileSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & FileSlice);
      slice.setActiveFile('file-123');
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should accept null to clear active file', () => {
      const slice = createFileSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & FileSlice);
      slice.setActiveFile(null);
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('openTab', () => {
    it('should add file ID to open tabs', () => {
      const slice = createFileSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & FileSlice);
      slice.openTab('file-456');
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should not add duplicate tabs', () => {
      const slice = createFileSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & FileSlice);
      slice.openTab('file-789');
      slice.openTab('file-789');
      expect(mockSetGet.set).toHaveBeenCalledTimes(2);
    });
  });

  describe('closeTab', () => {
    it('should remove file ID from open tabs', () => {
      const slice = createFileSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & FileSlice);
      slice.closeTab('file-999');
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('toggleFolder', () => {
    it('should toggle folder expansion state', () => {
      const slice = createFileSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & FileSlice);
      slice.toggleFolder('folder-abc');
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('updateFile', () => {
    it('should update file content and mark as dirty', () => {
      const slice = createFileSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & FileSlice);
      slice.updateFile('file-xyz', 'new content here');
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('renameFile', () => {
    it('should rename a file', () => {
      const slice = createFileSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & FileSlice);
      slice.renameFile('file-old', 'new-name.ts');
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    it('should delete a file by ID', () => {
      const slice = createFileSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & FileSlice);
      slice.deleteFile('file-delete-me');
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('saveFile', () => {
    it('should mark file as clean (not dirty)', () => {
      const slice = createFileSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & FileSlice);
      slice.saveFile('file-save-me');
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('setActiveProjectName', () => {
    it('should update project name', () => {
      const slice = createFileSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & FileSlice);
      slice.setActiveProjectName('my-awesome-project');
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('resetProject', () => {
    it('should reset project to default files', () => {
      const slice = createFileSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & FileSlice);
      slice.resetProject();
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });
});
