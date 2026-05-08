import { StateCreator } from 'zustand';
import { EditorStore } from '../types/store';

export interface EditorSlice {
  // Editor Settings
  editorTheme: 'vs-dark' | 'hc-black' | 'vs-light';
  fontSize: number;
  wordWrap: 'on' | 'off';
  minimap: boolean;
  tabSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
  lineNumbers: 'on' | 'off' | 'relative';
  cursorStyle: 'line' | 'block' | 'underline';
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
  autoClosingBrackets: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
  bracketPairColorization: boolean;
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all';
  smoothScrolling: boolean;
  autoSave: 'off' | 'afterDelay' | 'onFocusChange';
  autoSaveDelay: number;
  formatOnSave: boolean;
  trimTrailingWhitespace: boolean;
  insertFinalNewline: boolean;

  // AI Advanced Settings
  aiTemperature: number;
  aiMaxTokens: number;
  aiSystemPrompt: string;
  aiStreaming: boolean;
  aiAutoFix: boolean;

  // Terminal Settings
  terminalFontSize: number;
  terminalScrollback: number;
  terminalCursorStyle: 'block' | 'underline' | 'bar';

  // UI Settings
  accentColor: string;
  showActivityBar: boolean;
  showStatusBar: boolean;

  // Actions - Editor
  setEditorTheme: (theme: 'vs-dark' | 'hc-black' | 'vs-light') => void;
  setFontSize: (size: number) => void;
  setTabSize: (size: number) => void;
  setWordWrap: (wrap: 'on' | 'off') => void;
  toggleMinimap: () => void;
  formatActiveFile: () => void;
  setFontFamily: (v: string) => void;
  setLineHeight: (v: number) => void;
  setLetterSpacing: (v: number) => void;
  setLineNumbers: (v: 'on' | 'off' | 'relative') => void;
  setCursorStyle: (v: 'line' | 'block' | 'underline') => void;
  setCursorBlinking: (v: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid') => void;
  setAutoClosingBrackets: (v: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never') => void;
  setBracketPairColorization: (v: boolean) => void;
  setRenderWhitespace: (v: 'none' | 'boundary' | 'selection' | 'trailing' | 'all') => void;
  setSmoothScrolling: (v: boolean) => void;
  setAutoSave: (v: 'off' | 'afterDelay' | 'onFocusChange') => void;
  setAutoSaveDelay: (v: number) => void;
  setFormatOnSave: (v: boolean) => void;
  setTrimTrailingWhitespace: (v: boolean) => void;
  setInsertFinalNewline: (v: boolean) => void;

  // Actions - AI Settings
  setAiTemperature: (v: number) => void;
  setAiMaxTokens: (v: number) => void;
  setAiSystemPrompt: (v: string) => void;
  setAiStreaming: (v: boolean) => void;
  setAiAutoFix: (v: boolean) => void;

  // Actions - Terminal Settings
  setTerminalFontSize: (v: number) => void;
  setTerminalScrollback: (v: number) => void;
  setTerminalCursorStyle: (v: 'block' | 'underline' | 'bar') => void;

  // Actions - UI Settings
  setAccentColor: (v: string) => void;
  setShowActivityBar: (v: boolean) => void;
  setShowStatusBar: (v: boolean) => void;
}

export const createEditorSlice: StateCreator<EditorStore, [], [], EditorSlice> = (set, get) => ({
  // Initial State - Editor
  editorTheme: 'vs-dark',
  fontSize: 14,
  wordWrap: 'on',
  minimap: true,
  tabSize: 2,
  fontFamily: '',
  lineHeight: 0,
  letterSpacing: 0,
  lineNumbers: 'on',
  cursorStyle: 'line',
  cursorBlinking: 'blink',
  autoClosingBrackets: 'languageDefined',
  bracketPairColorization: true,
  renderWhitespace: 'none',
  smoothScrolling: true,
  autoSave: 'off',
  autoSaveDelay: 1000,
  formatOnSave: false,
  trimTrailingWhitespace: false,
  insertFinalNewline: false,

  // Initial State - AI Advanced
  aiTemperature: 0.7,
  aiMaxTokens: 2048,
  aiSystemPrompt: 'أنت مساعد ذكي متخصص في البرمجة. قدم حلولاً واضحة ومباشرة.',
  aiStreaming: true,
  aiAutoFix: false,

  // Initial State - Terminal
  terminalFontSize: 14,
  terminalScrollback: 1000,
  terminalCursorStyle: 'block',

  // Initial State - UI
  accentColor: '#007acc',
  showActivityBar: true,
  showStatusBar: true,

  // Editor Actions
  setEditorTheme: (theme) => set({ editorTheme: theme }),
  setFontSize: (size) => set({ fontSize: size }),
  setTabSize: (size) => set({ tabSize: size }),
  setWordWrap: (wrap) => set({ wordWrap: wrap }),
  toggleMinimap: () => set((state) => ({ minimap: !state.minimap })),
  formatActiveFile: () => {
    const state = get();
    const activeFile = state.files.find(f => f.id === state.activeFileId);
    if (activeFile && activeFile.type === 'file' && activeFile.content) {
      // Simple formatting - in real app would use prettier or similar
      let formatted = activeFile.content;
      if (activeFile.language === 'javascript' || activeFile.language === 'typescript') {
        formatted = formatted.replace(/\s+/g, ' ').trim();
      }
      get().updateFile(activeFile.id, formatted);
      get().addNotification({
        id: Date.now().toString(),
        type: 'success',
        message: '✅ تم تنسيق الملف',
      });
    }
  },
  setFontFamily: (v) => set({ fontFamily: v }),
  setLineHeight: (v) => set({ lineHeight: v }),
  setLetterSpacing: (v) => set({ letterSpacing: v }),
  setLineNumbers: (v) => set({ lineNumbers: v }),
  setCursorStyle: (v) => set({ cursorStyle: v }),
  setCursorBlinking: (v) => set({ cursorBlinking: v }),
  setAutoClosingBrackets: (v) => set({ autoClosingBrackets: v }),
  setBracketPairColorization: (v) => set({ bracketPairColorization: v }),
  setRenderWhitespace: (v) => set({ renderWhitespace: v }),
  setSmoothScrolling: (v) => set({ smoothScrolling: v }),
  setAutoSave: (v) => set({ autoSave: v }),
  setAutoSaveDelay: (v) => set({ autoSaveDelay: v }),
  setFormatOnSave: (v) => set({ formatOnSave: v }),
  setTrimTrailingWhitespace: (v) => set({ trimTrailingWhitespace: v }),
  setInsertFinalNewline: (v) => set({ insertFinalNewline: v }),

  // AI Settings Actions
  setAiTemperature: (v) => set({ aiTemperature: v }),
  setAiMaxTokens: (v) => set({ aiMaxTokens: v }),
  setAiSystemPrompt: (v) => set({ aiSystemPrompt: v }),
  setAiStreaming: (v) => set({ aiStreaming: v }),
  setAiAutoFix: (v) => set({ aiAutoFix: v }),

  // Terminal Settings Actions
  setTerminalFontSize: (v) => set({ terminalFontSize: v }),
  setTerminalScrollback: (v) => set({ terminalScrollback: v }),
  setTerminalCursorStyle: (v) => set({ terminalCursorStyle: v }),

  // UI Settings Actions
  setAccentColor: (v) => set({ accentColor: v }),
  setShowActivityBar: (v) => set({ showActivityBar: v }),
  setShowStatusBar: (v) => set({ showStatusBar: v }),
});
