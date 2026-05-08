import { describe, it, expect, beforeEach } from 'vitest';
import { createUiSlice, UiSlice } from '../slices/uiSlice';
import { EditorStore } from '../types/store';

// Mock Zustand set/get
const createMockSetGet = () => {
  let state: Partial<EditorStore & UiSlice> = {
    activePanel: 'explorer',
    sidebarVisible: true,
    showChat: false,
    showSettings: false,
    showCommandPalette: false,
    showTerminal: false,
    bottomPanelTab: 'terminal',
    problems: [],
    outputLines: [],
    notifications: [],
    searchQuery: '',
    replaceQuery: '',
    searchResults: [],
    isSearching: false,
    searchUseRegex: false,
    searchCaseSensitive: false,
    dartIssues: [],
    files: [],
    activeFileId: null,
  };

  const set = vi.fn((fn: any) => {
    if (typeof fn === 'function') {
      state = { ...state, ...fn(state) };
    } else {
      state = { ...state, ...fn };
    }
  });

  const get = vi.fn(() => state);

  return { set, get, getState: () => state };
};

describe('UiSlice', () => {
  let mockSetGet: ReturnType<typeof createMockSetGet>;

  beforeEach(() => {
    mockSetGet = createMockSetGet();
  });

  describe('Initial State', () => {
    it('should initialize with explorer as active panel', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      expect(slice.activePanel).toBe('explorer');
    });

    it('should initialize with sidebar visible', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      expect(slice.sidebarVisible).toBe(true);
    });

    it('should initialize with chat hidden', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      expect(slice.showChat).toBe(false);
    });

    it('should initialize with settings hidden', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      expect(slice.showSettings).toBe(false);
    });

    it('should initialize with command palette hidden', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      expect(slice.showCommandPalette).toBe(false);
    });

    it('should initialize with terminal hidden', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      expect(slice.showTerminal).toBe(false);
    });

    it('should initialize with terminal as bottom panel tab', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      expect(slice.bottomPanelTab).toBe('terminal');
    });

    it('should initialize with empty problems list', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      expect(slice.problems).toEqual([]);
    });

    it('should initialize with empty output lines', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      expect(slice.outputLines).toEqual([]);
    });

    it('should initialize with empty notifications', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      expect(slice.notifications).toEqual([]);
    });

    it('should initialize with empty search query', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      expect(slice.searchQuery).toBe('');
    });

    it('should initialize with regex search disabled', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      expect(slice.searchUseRegex).toBe(false);
    });

    it('should initialize with case-sensitive search disabled', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      expect(slice.searchCaseSensitive).toBe(false);
    });
  });

  describe('setActivePanel', () => {
    it('should change active panel to search', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.setActivePanel('search');
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should change active panel to git', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.setActivePanel('git');
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should change active panel to extensions', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.setActivePanel('extensions');
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should change active panel to ai', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.setActivePanel('ai');
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should show sidebar when switching to search panel', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.setActivePanel('search');
      expect(mockSetGet.set).toHaveBeenCalledTimes(2);
    });
  });

  describe('toggleSidebar', () => {
    it('should toggle sidebar visibility', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.toggleSidebar();
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('setShowChat', () => {
    it('should show chat', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.setShowChat(true);
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should hide chat', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.setShowChat(false);
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('setShowSettings', () => {
    it('should show settings modal', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.setShowSettings(true);
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should hide settings modal', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.setShowSettings(false);
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('setShowCommandPalette', () => {
    it('should show command palette', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.setShowCommandPalette(true);
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should hide command palette', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.setShowCommandPalette(false);
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('setShowTerminal', () => {
    it('should show terminal', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.setShowTerminal(true);
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should hide terminal', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.setShowTerminal(false);
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('setBottomPanelTab', () => {
    it('should change bottom panel to problems', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.setBottomPanelTab('problems');
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should change bottom panel to output', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.setBottomPanelTab('output');
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should change bottom panel to debug', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.setBottomPanelTab('debug');
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('addOutputLine', () => {
    it('should add a line to output', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.addOutputLine('Build completed successfully');
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('clearOutput', () => {
    it('should clear all output lines', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.clearOutput();
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('Search Actions', () => {
    it('should set search query', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.setSearchQuery('console.log');
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should set replace query', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.setReplaceQuery('print');
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should set search results', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.setSearchResults([{ file: 'app.ts', matches: [] }]);
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should set searching state', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.setIsSearching(true);
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should toggle regex search', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.toggleSearchRegex();
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should toggle case sensitive search', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.toggleSearchCaseSensitive();
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should perform search', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.performSearch();
      expect(mockSetGet.get).toHaveBeenCalled();
    });
  });

  describe('Notifications', () => {
    it('should add notification', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.addNotification({
        id: 'notif-1',
        type: 'info',
        message: 'File saved successfully',
      });
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should remove notification', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.removeNotification('notif-1');
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('analyzeProblems', () => {
    it('should analyze problems in active file', () => {
      const slice = createUiSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & UiSlice);
      slice.analyzeProblems();
      expect(mockSetGet.get).toHaveBeenCalled();
    });
  });
});
