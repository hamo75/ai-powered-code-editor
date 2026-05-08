// Constants for the Store

import { AiProvider } from '../types';

export const STORAGE_KEY = 'ai-code-studio';

export const AI_PROVIDERS: AiProvider[] = [
  {
    id: 'mistral',
    name: 'Mistral AI',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest', 'open-mistral-nemo', 'open-mistral-7b'],
    icon: '🌀',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    icon: '🤖',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    icon: '💎',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    models: ['anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-70b-instruct', 'google/gemini-pro-1.5'],
    icon: '🌐',
  },
  {
    id: 'custom',
    name: 'مخصص (Custom)',
    endpoint: '',
    models: [],
    icon: '⚙️',
  },
];

export const DEFAULT_API_TIMEOUT_MS = 90000;

export const EDITOR_THEMES = ['vs-dark', 'hc-black', 'vs-light'] as const;
export type EditorTheme = typeof EDITOR_THEMES[number];

export const CURSOR_STYLES = ['line', 'block', 'underline'] as const;
export type CursorStyle = typeof CURSOR_STYLES[number];

export const CURSOR_BLINKING_MODES = ['blink', 'smooth', 'phase', 'expand', 'solid'] as const;
export type CursorBlinkingMode = typeof CURSOR_BLINKING_MODES[number];

export const AUTO_CLOSING_BRACKETS_MODES = ['always', 'languageDefined', 'beforeWhitespace', 'never'] as const;
export type AutoClosingBracketsMode = typeof AUTO_CLOSING_BRACKETS_MODES[number];

export const RENDER_WHITESPACE_MODES = ['none', 'boundary', 'selection', 'trailing', 'all'] as const;
export type RenderWhitespaceMode = typeof RENDER_WHITESPACE_MODES[number];

export const AUTO_SAVE_MODES = ['off', 'afterDelay', 'onFocusChange'] as const;
export type AutoSaveMode = typeof AUTO_SAVE_MODES[number];

export const LINE_NUMBER_MODES = ['on', 'off', 'relative'] as const;
export type LineNumberMode = typeof LINE_NUMBER_MODES[number];

export const WORD_WRAP_MODES = ['on', 'off'] as const;
export type WordWrapMode = typeof WORD_WRAP_MODES[number];

export const BOTTOM_PANEL_TABS = ['terminal', 'problems', 'output', 'debug', 'agent'] as const;
export type BottomPanelTab = typeof BOTTOM_PANEL_TABS[number];

export const SIDE_PANELS = ['explorer', 'search', 'git', 'extensions', 'ai'] as const;
export type SidePanel = typeof SIDE_PANELS[number];

export const TERMINAL_CURSOR_STYLES = ['block', 'underline', 'bar'] as const;
export type TerminalCursorStyle = typeof TERMINAL_CURSOR_STYLES[number];
