import { StateCreator } from 'zustand';
import { EditorStore, Notification, ProblemItem } from '../types/store';
import { errorHandler } from '../../core/error/ErrorHandler';
import { errorTracker } from '../../core/error/ErrorTracker';

export interface UiSlice {
  // UI State
  activePanel: 'explorer' | 'search' | 'git' | 'extensions' | 'ai';
  sidebarVisible: boolean;
  showChat: boolean;
  showSettings: boolean;
  showCommandPalette: boolean;
  showTerminal: boolean;
  bottomPanelTab: 'terminal' | 'problems' | 'output' | 'debug' | 'agent';
  problems: ProblemItem[];
  outputLines: string[];
  notifications: Notification[];

  // Search State
  searchQuery: string;
  replaceQuery: string;
  searchResults: any[];
  isSearching: boolean;
  searchUseRegex: boolean;
  searchCaseSensitive: boolean;

  // UI Actions
  setActivePanel: (panel: 'explorer' | 'search' | 'git' | 'extensions' | 'ai') => void;
  toggleSidebar: () => void;
  setShowChat: (val: boolean) => void;
  setShowSettings: (val: boolean) => void;
  setShowCommandPalette: (val: boolean) => void;
  setShowTerminal: (val: boolean) => void;
  setBottomPanelTab: (tab: 'terminal' | 'problems' | 'output' | 'debug' | 'agent') => void;
  addOutputLine: (line: string) => void;
  clearOutput: () => void;
  analyzeProblems: () => void;

  // Search Actions
  setSearchQuery: (q: string) => void;
  setReplaceQuery: (q: string) => void;
  setSearchResults: (r: any[]) => void;
  setIsSearching: (v: boolean) => void;
  toggleSearchRegex: () => void;
  toggleSearchCaseSensitive: () => void;
  performSearch: () => void;
  performReplace: (fileId: string) => void;
  performReplaceAll: () => void;

  // Notifications Actions
  addNotification: (n: Notification) => void;
  removeNotification: (id: string) => void;

  // Error Handling Actions
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
}

export const createUiSlice: StateCreator<EditorStore, [], [], UiSlice> = (set, get) => ({
  // Initial State - UI
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

  // Initial State - Search
  searchQuery: '',
  replaceQuery: '',
  searchResults: [],
  isSearching: false,
  searchUseRegex: false,
  searchCaseSensitive: false,

  // UI Actions
  setActivePanel: (panel) => {
    set({ activePanel: panel });
    if (panel === 'search') {
      set({ sidebarVisible: true });
    }
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarVisible: !state.sidebarVisible }));
  },

  setShowChat: (val) => {
    set({ showChat: val });
  },

  setShowSettings: (val) => {
    set({ showSettings: val });
  },

  setShowCommandPalette: (val) => {
    set({ showCommandPalette: val });
  },

  setShowTerminal: (val) => {
    set({ showTerminal: val });
  },

  setBottomPanelTab: (tab) => {
    set({ bottomPanelTab: tab });
  },

  addOutputLine: (line) => {
    set((state) => ({
      outputLines: [...state.outputLines, `[${new Date().toLocaleTimeString()}] ${line}`],
    }));
  },

  clearOutput: () => {
    set({ outputLines: [] });
  },

  analyzeProblems: () => {
    const state = get();
    const issues: ProblemItem[] = [];
    
    // Add Dart analysis issues
    state.dartIssues.forEach((issue, index) => {
      issues.push({
        id: issue.id || `dart-${index}`,
        severity: issue.severity as 'error' | 'warning' | 'info',
        message: issue.message,
        fileName: issue.fileName || 'Unknown',
        fileId: issue.fileId || state.activeFileId || 'unknown',
        line: issue.line,
        column: issue.column,
        source: issue.code ? issue.code : 'Dart Analyzer',
      });
    });

    // Add errors from ErrorTracker
    const trackedErrors = errorTracker.getErrors();
    trackedErrors.forEach((error, index) => {
      // Map ErrorTracker severity to ProblemSeverity
      // critical -> error, error -> error, warning -> warning, info -> info
      let problemSeverity: 'error' | 'warning' | 'info';
      if (error.severity === 'critical' || error.severity === 'error') {
        problemSeverity = 'error';
      } else if (error.severity === 'warning') {
        problemSeverity = 'warning';
      } else {
        problemSeverity = 'info';
      }
      
      issues.push({
        id: `tracker-${error.id}` || `error-${index}`,
        severity: problemSeverity,
        message: error.message,
        fileName: error.context?.fileName || error.metadata?.fileName || 'System',
        fileId: error.context?.fileId || error.metadata?.fileId || state.activeFileId || 'unknown',
        line: error.context?.line || error.metadata?.line || 1,
        column: error.context?.column || error.metadata?.column || 1,
        source: error.category || 'ErrorTracker',
      });
    });

    // Update problems in store
    set({ problems: issues });

    // Debug logging
    const errorCount = issues.filter(p => p.severity === 'error').length;
    const warnCount = issues.filter(p => p.severity === 'warning').length;
    const infoCount = issues.filter(p => p.severity === 'info').length;

    console.log('📊 Problems Analysis Complete:', {
      totalProblems: issues.length,
      errors: errorCount,
      warnings: warnCount,
      info: infoCount,
      issues: issues,
    });
  },

  // Search Actions
  setSearchQuery: (q) => {
    set({ searchQuery: q });
  },

  setReplaceQuery: (q) => {
    set({ replaceQuery: q });
  },

  setSearchResults: (r) => {
    set({ searchResults: r });
  },

  setIsSearching: (v) => {
    set({ isSearching: v });
  },

  toggleSearchRegex: () => {
    set((state) => ({ searchUseRegex: !state.searchUseRegex }));
  },

  toggleSearchCaseSensitive: () => {
    set((state) => ({ searchCaseSensitive: !state.searchCaseSensitive }));
  },

  performSearch: () => {
    const state = get();
    if (!state.searchQuery) return;

    set({ isSearching: true, searchResults: [] });

    const results: any[] = [];
    const query = state.searchQuery;
    const useRegex = state.searchUseRegex;
    const caseSensitive = state.searchCaseSensitive;

    let pattern: RegExp | null = null;
    if (useRegex) {
      try {
        pattern = new RegExp(query, caseSensitive ? 'g' : 'gi');
      } catch {
        set({ isSearching: false });
        return;
      }
    }

    state.files.forEach(file => {
      if (file.type !== 'file' || !file.content) return;

      const lines = file.content.split('\n');
      lines.forEach((line, lineIndex) => {
        const searchText = caseSensitive ? line : line.toLowerCase();
        const searchQuery = caseSensitive ? query : query.toLowerCase();
        
        let matchIndex = -1;
        if (useRegex && pattern) {
          const match = pattern.exec(line);
          if (match) {
            matchIndex = match.index;
          }
        } else {
          matchIndex = searchText.indexOf(searchQuery);
        }

        if (matchIndex !== -1) {
          results.push({
            fileId: file.id,
            fileName: file.name,
            line: lineIndex + 1,
            text: line.trim(),
            matchStart: matchIndex,
            matchEnd: matchIndex + query.length,
          });
        }
      });
    });

    set({ searchResults: results, isSearching: false });
    get().addNotification({
      id: Date.now().toString(),
      type: 'info',
      message: `🔍 تم العثور على ${results.length} نتيجة`,
    });
  },

  performReplace: (fileId) => {
    const state = get();
    const file = state.files.find(f => f.id === fileId);
    if (!file || file.type !== 'file' || !file.content) return;

    const { searchQuery, replaceQuery, searchUseRegex, searchCaseSensitive } = state;
    
    let newContent = file.content;
    if (searchUseRegex) {
      try {
        const pattern = new RegExp(searchQuery, searchCaseSensitive ? 'g' : 'gi');
        newContent = newContent.replace(pattern, replaceQuery);
      } catch {
        return;
      }
    } else {
      const search = searchCaseSensitive ? searchQuery : searchQuery.toLowerCase();
      if (searchCaseSensitive) {
        newContent = newContent.split(searchQuery).join(replaceQuery);
      } else {
        newContent = newContent.replace(new RegExp(searchQuery, 'gi'), replaceQuery);
      }
    }

    get().updateFile(fileId, newContent);
    get().addNotification({
      id: Date.now().toString(),
      type: 'success',
      message: '✅ تم الاستبدال في الملف',
    });
  },

  performReplaceAll: () => {
    const state = get();
    const { searchQuery, replaceQuery, searchUseRegex, searchCaseSensitive } = state;
    
    let replaceCount = 0;
    
    state.files.forEach(file => {
      if (file.type !== 'file' || !file.content) return;

      let newContent = file.content;
      let fileChanged = false;

      if (searchUseRegex) {
        try {
          const pattern = new RegExp(searchQuery, searchCaseSensitive ? 'g' : 'gi');
          const matches = newContent.match(pattern);
          if (matches) {
            replaceCount += matches.length;
            newContent = newContent.replace(pattern, replaceQuery);
            fileChanged = true;
          }
        } catch {
          return;
        }
      } else {
        const search = searchCaseSensitive ? searchQuery : searchQuery.toLowerCase();
        const regex = new RegExp(searchQuery, searchCaseSensitive ? 'g' : 'gi');
        const matches = newContent.match(regex);
        if (matches) {
          replaceCount += matches.length;
          newContent = newContent.replace(regex, replaceQuery);
          fileChanged = true;
        }
      }

      if (fileChanged) {
        get().updateFile(file.id, newContent);
      }
    });

    get().addNotification({
      id: Date.now().toString(),
      type: 'success',
      message: `✅ تم استبدال ${replaceCount} عنصر`,
    });
  },

  // Notifications Actions
  addNotification: (notification) => {
    set((state) => ({
      notifications: [...state.notifications, notification],
    }));

    // Auto-remove after duration
    const duration = notification.duration || 3000;
    setTimeout(() => {
      get().removeNotification(notification.id);
    }, duration);
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id),
    }));
  },

  // Error Handling Actions
  showError: (message, duration) => {
    get().addNotification({
      id: Date.now().toString(),
      type: 'error',
      message,
      duration,
    });
  },

  showWarning: (message, duration) => {
    get().addNotification({
      id: Date.now().toString(),
      type: 'warning',
      message,
      duration,
    });
  },

  showInfo: (message, duration) => {
    get().addNotification({
      id: Date.now().toString(),
      type: 'info',
      message,
      duration,
    });
  },

  showSuccess: (message, duration) => {
    get().addNotification({
      id: Date.now().toString(),
      type: 'success',
      message,
      duration,
    });
  },
});
