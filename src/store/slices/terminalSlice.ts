import { StateCreator } from 'zustand';
import { EditorStore } from '../types/store';

export interface TerminalSlice {
  // Terminal State
  terminalOutput: string[];
  
  // Terminal Actions
  addTerminalOutput: (line: string) => void;
  clearTerminal: () => void;
  executeCommand: (cmd: string) => void;
}

export const createTerminalSlice: StateCreator<EditorStore, [], [], TerminalSlice> = (set, get) => ({
  // Initial State
  terminalOutput: [],

  // Terminal Actions
  addTerminalOutput: (line) => {
    set((state) => ({
      terminalOutput: [...state.terminalOutput, `[${new Date().toLocaleTimeString()}] ${line}`],
    }));
  },

  clearTerminal: () => {
    set({ terminalOutput: [] });
  },

  executeCommand: (cmd) => {
    const state = get();
    get().addTerminalOutput(`$ ${cmd}`);

    // Simulate command execution
    setTimeout(() => {
      if (cmd === 'clear' || cmd === 'cls') {
        get().clearTerminal();
      } else if (cmd === 'help') {
        get().addTerminalOutput('Available commands: help, clear, ls, pwd, echo <text>');
      } else if (cmd === 'ls' || cmd === 'dir') {
        const files = state.files.filter(f => f.parentId === null || f.parentId === 'root');
        files.forEach(f => {
          get().addTerminalOutput(`${f.type === 'folder' ? '📁' : '📄'} ${f.name}`);
        });
      } else if (cmd === 'pwd') {
        get().addTerminalOutput('/my-app');
      } else if (cmd.startsWith('echo ')) {
        get().addTerminalOutput(cmd.slice(5));
      } else if (cmd === 'dart --version') {
        get().addTerminalOutput('Dart SDK version: 3.2.0');
      } else if (cmd === 'flutter --version') {
        get().addTerminalOutput('Flutter 3.16.0');
      } else {
        get().addTerminalOutput(`Command not found: ${cmd}. Type 'help' for available commands.`);
      }
    }, 100);
  },
});
