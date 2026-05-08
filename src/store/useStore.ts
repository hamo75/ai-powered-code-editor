// Main store implementation - Combines all slices using Zustand
import { create } from 'zustand';
import { EditorStore } from './types/store';
import { 
  createFileSlice, 
  createEditorSlice, 
  createAiSlice, 
  createUiSlice, 
  createTerminalSlice,
  createAnalysisSlice
} from './slices';
import { ALL_EXTENSIONS, type Extension } from '../extensions/registry';

// Helper to load extensions state from localStorage
const getStoredExtensionsState = (): Map<string, { installed: boolean; enabled: boolean }> => {
  try {
    const stored = localStorage.getItem('extensions_state');
    if (!stored) return new Map();
    const parsed = JSON.parse(stored);
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
};

// Helper to save extensions state to localStorage
const saveExtensionsState = (state: Extension[]) => {
  try {
    const obj = state.reduce((acc, ext) => {
      acc[ext.id] = { installed: ext.installed, enabled: ext.enabled };
      return acc;
    }, {} as Record<string, { installed: boolean; enabled: boolean }>);
    localStorage.setItem('extensions_state', JSON.stringify(obj));
  } catch (e) {
    console.warn('Failed to save extensions state:', e);
  }
};

// Initialize extensions state
const initialExtensionsState: Extension[] = (() => {
  const stored = getStoredExtensionsState();
  return ALL_EXTENSIONS.map(ext => {
    const storedState = stored.get(ext.id);
    return {
      ...ext,
      installed: storedState ? storedState.installed : ext.installed,
      enabled: storedState ? storedState.enabled : ext.enabled,
    };
  });
})();

export { AI_PROVIDERS } from './constants';

export type {
  FileNode,
  ChatMessage,
  Notification,
  AiProvider,
  SearchResult,
  ProblemItem,
  PendingTask,
} from './types/store';

// Combine all slices into the main store
export const useStore = create<EditorStore>((...args) => ({
  // File Slice
  ...createFileSlice(...args),
  
  // Editor Slice
  ...createEditorSlice(...args),
  
  // AI Slice
  ...createAiSlice(...args),
  
  // UI Slice
  ...createUiSlice(...args),
  
  // Terminal Slice
  ...createTerminalSlice(...args),
  
  // Analysis Slice (Dart Analysis, Smart Fix, AI Agent, Discussion Mode)
  ...createAnalysisSlice(...args),
  
  // Extensions - Initialize with state from localStorage
  extensions: initialExtensionsState,

  // Extensions Actions
  installExtension: (id: string) => {
    const set = args[0] as (updater: (state: EditorStore) => Partial<EditorStore>) => void;
    set(state => {
      const updated = state.extensions.map(ext => 
        ext.id === id ? { ...ext, installed: true, enabled: true } : ext
      );
      saveExtensionsState(updated);
      return { extensions: updated };
    });
  },
  
  uninstallExtension: (id: string) => {
    const set = args[0] as (updater: (state: EditorStore) => Partial<EditorStore>) => void;
    set(state => {
      const updated = state.extensions.map(ext => 
        ext.id === id ? { ...ext, installed: false, enabled: false } : ext
      );
      saveExtensionsState(updated);
      return { extensions: updated };
    });
  },
  
  toggleExtension: (id: string) => {
    const set = args[0] as (updater: (state: EditorStore) => Partial<EditorStore>) => void;
    set(state => {
      const updated = state.extensions.map(ext => {
        if (ext.id === id && ext.installed) {
          return { ...ext, enabled: !ext.enabled };
        }
        return ext;
      });
      saveExtensionsState(updated);
      return { extensions: updated };
    });
  },
  
  getExtensionSnippets: () => {
    const get = args[1] as () => EditorStore;
    const state = get();
    const snippets: any[] = [];
    state.extensions.filter(ext => ext.installed && ext.enabled && ext.snippetData).forEach(ext => {
      ext.snippetData!.forEach(snippet => {
        snippets.push({ ...snippet, extensionId: ext.id, extensionName: ext.name });
      });
    });
    return snippets;
  },
  
  getExtensionCommands: () => {
    const get = args[1] as () => EditorStore;
    const state = get();
    const commands: any[] = [];
    state.extensions.filter(ext => ext.installed && ext.enabled && ext.commandData).forEach(ext => {
      ext.commandData!.forEach(cmd => {
        commands.push({ ...cmd, extensionId: ext.id, extensionName: ext.name });
      });
    });
    return commands;
  },
  
  getExtensionAiProviders: () => {
    const get = args[1] as () => EditorStore;
    const state = get();
    const providers: any[] = [];
    state.extensions.filter(ext => ext.installed && ext.enabled && ext.aiProviderData).forEach(ext => {
      providers.push({ ...ext.aiProviderData!, extensionId: ext.id, extensionName: ext.name });
    });
    return providers;
  },
  
  getActiveThemeExtension: () => {
    return null;
  },
  
  persistExtensions: () => {
    // Implementation
  },
}));

// Initialize error handler with notification callback
import { errorHandler } from '../core/error/ErrorHandler';
import { errorTracker } from '../core/error/ErrorTracker';
const store = useStore;
errorHandler.setNotificationCallback((type, message, duration) => {
  switch (type) {
    case 'error':
      store.getState().showError(message, duration);
      break;
    case 'warning':
      store.getState().showWarning(message, duration);
      break;
    case 'info':
      store.getState().showInfo(message, duration);
      break;
  }
});

// Subscribe to ErrorTracker to update problems when errors are tracked
errorTracker.subscribe(() => {
  store.getState().analyzeProblems();
});

export default useStore;
