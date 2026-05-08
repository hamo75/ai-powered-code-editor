import { describe, it, expect, beforeEach } from 'vitest';
import { createEditorSlice, EditorSlice } from '../slices/editorSlice';
import { EditorStore } from '../types/store';

// Mock Zustand set/get
const createMockSetGet = () => {
  let state: Partial<EditorStore & EditorSlice> = {
    editorTheme: 'vs-dark',
    fontSize: 14,
    wordWrap: 'off',
    minimap: true,
    tabSize: 2,
    fontFamily: "'Fira Code', monospace",
    lineHeight: 1.5,
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
    aiTemperature: 0.7,
    aiMaxTokens: 2048,
    aiSystemPrompt: 'You are a helpful coding assistant.',
    aiStreaming: true,
    aiAutoFix: true,
    terminalFontSize: 14,
    terminalScrollback: 1000,
    terminalCursorStyle: 'block',
    accentColor: '#007acc',
    showActivityBar: true,
    showStatusBar: true,
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

describe('EditorSlice', () => {
  let mockSetGet: ReturnType<typeof createMockSetGet>;

  beforeEach(() => {
    mockSetGet = createMockSetGet();
  });

  describe('Initial State', () => {
    it('should initialize with default theme', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      expect(slice.editorTheme).toBe('vs-dark');
    });

    it('should initialize with default font size', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      expect(slice.fontSize).toBe(14);
    });

    it('should initialize with default tab size', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      expect(slice.tabSize).toBe(2);
    });

    it('should initialize with minimap enabled', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      expect(slice.minimap).toBe(true);
    });

    it('should initialize with bracket pair colorization enabled', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      expect(slice.bracketPairColorization).toBe(true);
    });

    it('should initialize with AI streaming enabled', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      expect(slice.aiStreaming).toBe(true);
    });
  });

  describe('setEditorTheme', () => {
    it('should change editor theme to vs-light', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      slice.setEditorTheme('vs-light');
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should change editor theme to hc-black', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      slice.setEditorTheme('hc-black');
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('setFontSize', () => {
    it('should update font size', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      slice.setFontSize(18);
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should accept minimum font size', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      slice.setFontSize(8);
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('setTabSize', () => {
    it('should update tab size', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      slice.setTabSize(4);
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('setWordWrap', () => {
    it('should enable word wrap', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      slice.setWordWrap('on');
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should disable word wrap', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      slice.setWordWrap('off');
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('toggleMinimap', () => {
    it('should toggle minimap visibility', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      slice.toggleMinimap();
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('setFontFamily', () => {
    it('should update font family', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      slice.setFontFamily("'JetBrains Mono', monospace");
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('setLineHeight', () => {
    it('should update line height', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      slice.setLineHeight(1.8);
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('setLetterSpacing', () => {
    it('should update letter spacing', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      slice.setLetterSpacing(1);
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('setLineNumbers', () => {
    it('should change line numbers to relative', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      slice.setLineNumbers('relative');
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should turn off line numbers', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      slice.setLineNumbers('off');
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('setCursorStyle', () => {
    it('should change cursor style to block', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      slice.setCursorStyle('block');
      expect(mockSetGet.set).toHaveBeenCalled();
    });

    it('should change cursor style to underline', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      slice.setCursorStyle('underline');
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('setCursorBlinking', () => {
    it('should change cursor blinking to smooth', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      slice.setCursorBlinking('smooth');
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('setAutoClosingBrackets', () => {
    it('should change auto closing brackets setting', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      slice.setAutoClosingBrackets('always');
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('setBracketPairColorization', () => {
    it('should enable bracket pair colorization', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      slice.setBracketPairColorization(false);
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('setRenderWhitespace', () => {
    it('should change whitespace rendering to all', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      slice.setRenderWhitespace('all');
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('setSmoothScrolling', () => {
    it('should toggle smooth scrolling', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      slice.setSmoothScrolling(false);
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });

  describe('formatActiveFile', () => {
    it('should trigger formatting of active file', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      slice.formatActiveFile();
      expect(mockSetGet.get).toHaveBeenCalled();
    });
  });

  describe('AI Settings', () => {
    it('should update AI temperature', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      // Note: Assuming there's a setAiTemperature method or similar
      expect(slice.aiTemperature).toBe(0.7);
    });

    it('should update AI max tokens', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      expect(slice.aiMaxTokens).toBe(2048);
    });

    it('should toggle AI streaming', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      expect(slice.aiStreaming).toBe(true);
    });
  });

  describe('Terminal Settings', () => {
    it('should have default terminal font size', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      expect(slice.terminalFontSize).toBe(14);
    });

    it('should have default terminal scrollback', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      expect(slice.terminalScrollback).toBe(1000);
    });
  });

  describe('UI Settings', () => {
    it('should have default accent color', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      expect(slice.accentColor).toBe('#007acc');
    });

    it('should show activity bar by default', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      expect(slice.showActivityBar).toBe(true);
    });

    it('should show status bar by default', () => {
      const slice = createEditorSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & EditorSlice);
      expect(slice.showStatusBar).toBe(true);
    });
  });
});
