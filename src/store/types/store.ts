// Store type definitions

export type {
  FileNode,
  ChatMessage,
  Notification,
  AiProvider,
  SearchResult,
  ProblemItem,
  PendingTask,
} from './models';

import {
  FileNode,
  ChatMessage,
  Notification,
  AiProvider,
  SearchResult,
  ProblemItem,
  PendingTask,
} from './models';

import {
  EditorTheme,
  CursorStyle,
  CursorBlinkingMode,
  AutoClosingBracketsMode,
  RenderWhitespaceMode,
  AutoSaveMode,
  LineNumberMode,
  WordWrapMode,
  BottomPanelTab,
  SidePanel,
  TerminalCursorStyle
} from '../constants';

import type { AgentTask, FixReport, DartIssue } from './models';
import { Extension, ExtensionSnippet, ExtensionCommandDef, ExtensionAiProviderDef } from '../../extensions/registry';

export interface EditorStore {
  // File system
  files: FileNode[];
  activeFileId: string | null;
  openTabs: string[];
  expandedFolders: Set<string>;

  // Editor
  editorTheme: EditorTheme;
  fontSize: number;
  wordWrap: WordWrapMode;
  minimap: boolean;
  tabSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
  lineNumbers: LineNumberMode;
  cursorStyle: CursorStyle;
  cursorBlinking: CursorBlinkingMode;
  autoClosingBrackets: AutoClosingBracketsMode;
  bracketPairColorization: boolean;
  renderWhitespace: RenderWhitespaceMode;
  smoothScrolling: boolean;
  autoSave: AutoSaveMode;
  autoSaveDelay: number;
  formatOnSave: boolean;
  trimTrailingWhitespace: boolean;
  insertFinalNewline: boolean;

  // AI Advanced
  aiTemperature: number;
  aiMaxTokens: number;
  aiSystemPrompt: string;
  aiStreaming: boolean;
  aiAutoFix: boolean;

  // Terminal Settings
  terminalFontSize: number;
  terminalScrollback: number;
  terminalCursorStyle: TerminalCursorStyle;

  // UI
  accentColor: string;
  showActivityBar: boolean;
  showStatusBar: boolean;

  // AI
  chatMessages: ChatMessage[];
  apiKey: string;
  aiProviderId: string;
  aiModel: string;
  customEndpoint: string;
  isAiThinking: boolean;

  // Terminal
  terminalOutput: string[];
  showTerminal: boolean;

  // Bottom Panel
  bottomPanelTab: BottomPanelTab | 'agent';
  problems: ProblemItem[];
  outputLines: string[];

  // Dart Analysis
  dartIssues: DartIssue[];
  isAnalyzing: boolean;
  isFixingWithAI: boolean;
  dartAutoAnalyze: boolean;
  dartpadAvailable: boolean;

  // AI Agent
  agentTasks: AgentTask[];
  activeAgentTask: AgentTask | null;
  isAgentRunning: boolean;
  agentMode: boolean;
  agentActionLog: string[];

  // Intent-based Interaction (Dual Mode)
  discussionMode: boolean;
  pendingTask: PendingTask | null;

  // Smart Fix
  smartFixReport: FixReport | null;
  smartFixLog: string[];
  isSmartFixing: boolean;

  // Search
  searchQuery: string;
  replaceQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  searchUseRegex: boolean;
  searchCaseSensitive: boolean;

  // UI
  activePanel: SidePanel;
  sidebarVisible: boolean;
  showChat: boolean;
  showSettings: boolean;
  showCommandPalette: boolean;

  // Notifications
  notifications: Notification[];

  // Extensions
  extensions: Extension[];

  // Project Management
  projectName: string;
  recentProjects: Array<{ name: string; files: FileNode[]; savedAt: number }>;

  // === ACTIONS ===

  // Files
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

  // Import/Export
  downloadActiveFile: () => void;
  importFiles: (files: { name: string; content: string; path: string[] }[]) => void;
  importFolder: (files: { name: string; content: string; path: string[] }[]) => void;
  setActiveProjectName: (name: string) => void;
  saveProjectAs: (name: string) => void;
  loadProject: (name: string) => void;
  deleteSavedProject: (name: string) => void;

  // Editor
  setEditorTheme: (theme: EditorTheme) => void;
  setFontSize: (size: number) => void;
  setTabSize: (size: number) => void;
  setWordWrap: (wrap: WordWrapMode) => void;
  toggleMinimap: () => void;
  formatActiveFile: () => void;
  setFontFamily: (v: string) => void;
  setLineHeight: (v: number) => void;
  setLetterSpacing: (v: number) => void;
  setLineNumbers: (v: LineNumberMode) => void;
  setCursorStyle: (v: CursorStyle) => void;
  setCursorBlinking: (v: CursorBlinkingMode) => void;
  setAutoClosingBrackets: (v: AutoClosingBracketsMode) => void;
  setBracketPairColorization: (v: boolean) => void;
  setRenderWhitespace: (v: RenderWhitespaceMode) => void;
  setSmoothScrolling: (v: boolean) => void;
  setAutoSave: (v: AutoSaveMode) => void;
  setAutoSaveDelay: (v: number) => void;
  setFormatOnSave: (v: boolean) => void;
  setTrimTrailingWhitespace: (v: boolean) => void;
  setInsertFinalNewline: (v: boolean) => void;
  setAiTemperature: (v: number) => void;
  setAiMaxTokens: (v: number) => void;
  setAiSystemPrompt: (v: string) => void;
  setAiStreaming: (v: boolean) => void;
  setAiAutoFix: (v: boolean) => void;
  setTerminalFontSize: (v: number) => void;
  setTerminalScrollback: (v: number) => void;
  setTerminalCursorStyle: (v: TerminalCursorStyle) => void;
  setAccentColor: (v: string) => void;
  setShowActivityBar: (v: boolean) => void;
  setShowStatusBar: (v: boolean) => void;

  // AI
  addChatMessage: (msg: ChatMessage) => void;
  updateLastMessage: (content: string) => void;
  clearChat: () => void;
  setApiKey: (key: string) => void;
  setAiProvider: (id: string) => void;
  setAiModel: (model: string) => void;
  setCustomEndpoint: (url: string) => void;
  setIsAiThinking: (val: boolean) => void;
  applyCodeToFile: (fileName: string, code: string) => boolean;

  // Terminal
  addTerminalOutput: (line: string) => void;
  clearTerminal: () => void;
  executeCommand: (cmd: string) => void;
  setShowTerminal: (val: boolean) => void;

  // Bottom Panel
  setBottomPanelTab: (tab: BottomPanelTab) => void;
  analyzeProblems: () => void;
  addOutputLine: (line: string) => void;
  clearOutput: () => void;

  // Dart Analysis + AI Fix
  runDartAnalyze: () => void;
  fixProblemWithAI: (issueId: string) => Promise<void>;
  fixAllProblemsWithAI: () => Promise<void>;
  setDartAutoAnalyze: (v: boolean) => void;
  setDartpadAvailable: (v: boolean) => void;

  // Smart Fix
  smartFixAll: () => Promise<void>;
  rollbackSmartFix: () => void;
  clearSmartFixReport: () => void;

  // AI Agent
  setAgentMode: (v: boolean) => void;
  executeAgentTask: (description: string) => Promise<void>;
  cancelAgentTask: () => void;
  clearAgentTasks: () => void;

  // Intent-based Interaction (Dual Mode)
  toggleDiscussionMode: () => void;
  setPendingTask: (task: PendingTask | null) => void;
  executePendingTask: () => Promise<void>;

  // Search
  setSearchQuery: (q: string) => void;
  setReplaceQuery: (q: string) => void;
  setSearchResults: (r: SearchResult[]) => void;
  setIsSearching: (v: boolean) => void;
  toggleSearchRegex: () => void;
  toggleSearchCaseSensitive: () => void;
  performSearch: () => void;
  performReplace: (fileId: string) => void;
  performReplaceAll: () => void;

  // UI
  setActivePanel: (panel: SidePanel) => void;
  toggleSidebar: () => void;
  setShowChat: (val: boolean) => void;
  setShowSettings: (val: boolean) => void;
  setShowCommandPalette: (val: boolean) => void;

  // Notifications
  addNotification: (n: Notification) => void;
  removeNotification: (id: string) => void;

  // Extensions
  installExtension: (id: string) => void;
  uninstallExtension: (id: string) => void;
  toggleExtension: (id: string) => void;
  getExtensionSnippets: () => ExtensionSnippet[];
  getExtensionCommands: () => ExtensionCommandDef[];
  getExtensionAiProviders: () => ExtensionAiProviderDef[];
  getActiveThemeExtension: () => Extension | null;
  getAvailableAiProviders: () => AiProvider[];
  persistExtensions: () => void;

  // Persistence
  persist: () => void;
  resetProject: () => void;
  exportProject: () => string;
  importProject: (json: string) => boolean;
}
