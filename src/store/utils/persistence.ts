// LocalStorage persistence utilities

import { STORAGE_KEY } from '../constants';
import { FileNode } from '../types';
import { emptyDefaultFiles } from '../utils/defaultFiles';

export interface PersistedState {
  files: FileNode[];
  apiKey: string;
  aiProviderId: string;
  aiModel: string;
  customEndpoint: string;
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
  aiTemperature: number;
  aiMaxTokens: number;
  aiSystemPrompt: string;
  aiStreaming: boolean;
  aiAutoFix: boolean;
  terminalFontSize: number;
  terminalScrollback: number;
  terminalCursorStyle: 'block' | 'underline' | 'bar';
  accentColor: string;
  showActivityBar: boolean;
  showStatusBar: boolean;
}

export const loadState = (): Partial<PersistedState> | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        files: parsed.files || emptyDefaultFiles,
        apiKey: parsed.apiKey || '',
        aiProviderId: parsed.aiProviderId || 'mistral',
        aiModel: parsed.aiModel || 'mistral-small-latest',
        customEndpoint: parsed.customEndpoint || '',
        editorTheme: parsed.editorTheme || 'vs-dark',
        fontSize: parsed.fontSize || 14,
        wordWrap: parsed.wordWrap || 'on',
        minimap: parsed.minimap !== undefined ? parsed.minimap : true,
        tabSize: parsed.tabSize || 2,
        fontFamily: parsed.fontFamily || undefined,
        lineHeight: parsed.lineHeight || undefined,
        letterSpacing: parsed.letterSpacing || undefined,
        lineNumbers: parsed.lineNumbers || undefined,
        cursorStyle: parsed.cursorStyle || undefined,
        cursorBlinking: parsed.cursorBlinking || undefined,
        autoClosingBrackets: parsed.autoClosingBrackets || undefined,
        bracketPairColorization: parsed.bracketPairColorization !== undefined ? parsed.bracketPairColorization : undefined,
        renderWhitespace: parsed.renderWhitespace || undefined,
        smoothScrolling: parsed.smoothScrolling || undefined,
        autoSave: parsed.autoSave || undefined,
        autoSaveDelay: parsed.autoSaveDelay || undefined,
        formatOnSave: parsed.formatOnSave || undefined,
        trimTrailingWhitespace: parsed.trimTrailingWhitespace || undefined,
        insertFinalNewline: parsed.insertFinalNewline || undefined,
        aiTemperature: parsed.aiTemperature !== undefined ? parsed.aiTemperature : undefined,
        aiMaxTokens: parsed.aiMaxTokens !== undefined ? parsed.aiMaxTokens : undefined,
        aiSystemPrompt: parsed.aiSystemPrompt || undefined,
        aiStreaming: parsed.aiStreaming !== undefined ? parsed.aiStreaming : undefined,
        aiAutoFix: parsed.aiAutoFix || undefined,
        terminalFontSize: parsed.terminalFontSize || undefined,
        terminalScrollback: parsed.terminalScrollback || undefined,
        terminalCursorStyle: parsed.terminalCursorStyle || undefined,
        accentColor: parsed.accentColor || undefined,
        showActivityBar: parsed.showActivityBar !== undefined ? parsed.showActivityBar : undefined,
        showStatusBar: parsed.showStatusBar !== undefined ? parsed.showStatusBar : undefined,
      };
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return null;
};

export const saveState = (state: Partial<PersistedState>): void => {
  try {
    const toSave: PersistedState = {
      files: state.files!,
      apiKey: state.apiKey!,
      aiProviderId: state.aiProviderId!,
      aiModel: state.aiModel!,
      customEndpoint: state.customEndpoint!,
      editorTheme: state.editorTheme!,
      fontSize: state.fontSize!,
      wordWrap: state.wordWrap!,
      minimap: state.minimap!,
      tabSize: state.tabSize!,
      fontFamily: state.fontFamily!,
      lineHeight: state.lineHeight!,
      letterSpacing: state.letterSpacing!,
      lineNumbers: state.lineNumbers!,
      cursorStyle: state.cursorStyle!,
      cursorBlinking: state.cursorBlinking!,
      autoClosingBrackets: state.autoClosingBrackets!,
      bracketPairColorization: state.bracketPairColorization!,
      renderWhitespace: state.renderWhitespace!,
      smoothScrolling: state.smoothScrolling!,
      autoSave: state.autoSave!,
      autoSaveDelay: state.autoSaveDelay!,
      formatOnSave: state.formatOnSave!,
      trimTrailingWhitespace: state.trimTrailingWhitespace!,
      insertFinalNewline: state.insertFinalNewline!,
      aiTemperature: state.aiTemperature!,
      aiMaxTokens: state.aiMaxTokens!,
      aiSystemPrompt: state.aiSystemPrompt!,
      aiStreaming: state.aiStreaming!,
      aiAutoFix: state.aiAutoFix!,
      terminalFontSize: state.terminalFontSize!,
      terminalScrollback: state.terminalScrollback!,
      terminalCursorStyle: state.terminalCursorStyle!,
      accentColor: state.accentColor!,
      showActivityBar: state.showActivityBar!,
      showStatusBar: state.showStatusBar!,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
};
