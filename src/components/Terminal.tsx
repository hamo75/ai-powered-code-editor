import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Trash2, Terminal as TerminalIcon, ChevronDown, Plus, X,
  Search, Copy, Clipboard, Maximize2, Minimize2
} from 'lucide-react';
import { useStore } from '../store/useStore';

const colorMap: Record<string, string> = {
  '30': '#4a4a4a', '31': '#ef4444', '32': '#22c55e', '33': '#eab308',
  '34': '#3b82f6', '35': '#a855f7', '36': '#06b6d4', '37': '#e5e5e5',
  '90': '#6b7280', '91': '#f87171', '92': '#4ade80', '93': '#facc15',
  '94': '#60a5fa', '95': '#c084fc', '96': '#22d3ee', '97': '#f5f5f5',
};

const parseAnsiToSpans = (text: string): React.ReactNode[] => {
  const parts = text.split(/(\x1b\[\d+m)/g);
  let currentColor = '';
  const spans: React.ReactNode[] = [];
  let key = 0;

  for (const part of parts) {
    const match = part.match(/\x1b\[(\d+)m/);
    if (match) {
      const code = match[1];
      if (code === '0' || code === '') {
        currentColor = '';
      } else {
        currentColor = colorMap[code] || '';
      }
    } else if (part) {
      if (currentColor) {
        spans.push(React.createElement('span', { key: key++, style: { color: currentColor } }, part));
      } else {
        spans.push(React.createElement('span', { key }, part));
        key++;
      }
    }
  }
  return spans;
};

const COMMANDS = [
  'help', 'clear', 'cls', 'ls', 'cd', 'pwd', 'cat', 'head', 'tail',
  'touch', 'mkdir', 'rm', 'cp', 'mv', 'echo', 'write', 'tree',
  'date', 'whoami', 'uname', 'node', 'npm', 'git', 'dart', 'stats',
  'grep', 'find', 'wc', 'chmod', 'history', 'exit', 'which', 'env',
  'curl', 'wget', 'ping', 'df', 'du', 'ps', 'man',
];

const Terminal: React.FC = () => {
  const { terminalOutput, clearTerminal, setShowTerminal, executeCommand, files } = useStore();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [cwd, setCwd] = useState('/workspace');
  const [tabs, setTabs] = useState([{ id: '1', name: 'bash' }]);
  const [activeTab, setActiveTab] = useState('1');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSugg, setSelectedSugg] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalOutput]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeTab]);

  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  const updateSuggestions = useCallback((val: string) => {
    if (!val.trim()) {
      setSuggestions([]);
      setSelectedSugg(-1);
      return;
    }
    const parts = val.split(/\s+/);
    const lastWord = parts[parts.length - 1];

    if (parts.length === 1) {
      const matches = COMMANDS.filter(c => c.startsWith(lastWord.toLowerCase()));
      setSuggestions(matches.slice(0, 8));
    } else {
      const allNames = files
        .filter(f => f.type === 'file' || f.type === 'folder')
        .map(f => f.type === 'folder' ? f.name + '/' : f.name);
      const matches = allNames.filter(n =>
        n.toLowerCase().startsWith(lastWord.toLowerCase())
      );
      setSuggestions(matches.slice(0, 8));
    }
    setSelectedSugg(-1);
  }, [files]);

  const handleInputChange = (val: string) => {
    setInput(val);
    updateSuggestions(val);
  };

  const applySuggestion = (sugg: string) => {
    const parts = input.split(/\s+/);
    parts[parts.length - 1] = sugg.replace(/\/$/, '');
    setInput(parts.join(' ') + ' ');
    setSuggestions([]);
    setSelectedSugg(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (suggestions.length > 0) {
        const idx = selectedSugg >= 0 ? selectedSugg : 0;
        applySuggestion(suggestions[idx]);
      }
      return;
    }

    if (e.key === 'ArrowDown' && suggestions.length > 0 && e.shiftKey) {
      e.preventDefault();
      setSelectedSugg(prev => Math.min(prev + 1, suggestions.length - 1));
      return;
    }

    if (e.key === 'ArrowUp' && suggestions.length > 0 && e.shiftKey) {
      e.preventDefault();
      setSelectedSugg(prev => Math.max(prev - 1, 0));
      return;
    }

    if (e.key === 'Enter') {
      const trimmed = input.trim();
      if (trimmed) {
        setHistory(h => [...h, trimmed]);
        const cmdParts = trimmed.split(/\s+/);
        if (cmdParts[0] === 'cd') {
          const target = cmdParts[1] || '/workspace';
          if (target === '..') {
            const cwdParts = cwd.split('/').filter(Boolean);
            cwdParts.pop();
            setCwd('/' + cwdParts.join('/'));
          } else if (target !== '.') {
            setCwd(target.startsWith('/') ? target : cwd + '/' + target);
          }
          executeCommand(trimmed);
        } else {
          executeCommand(trimmed);
        }
      }
      setHistIdx(-1);
      setInput('');
      setSuggestions([]);
      setSelectedSugg(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(newIdx);
      setInput(history[history.length - 1 - newIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = Math.max(histIdx - 1, -1);
      setHistIdx(newIdx);
      setInput(newIdx === -1 ? '' : history[history.length - 1 - newIdx] || '');
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      clearTerminal();
      } else if (e.key === 'c' && e.ctrlKey) {
        // If text is selected in the terminal, copy it instead of canceling
        const sel = window.getSelection();
        if (sel && sel.toString().length > 0) {
          e.preventDefault();
          navigator.clipboard.writeText(sel.toString());
          return;
        }
        if (input) {
          setHistory(h => [...h, input + ' ^C']);
        }
        setInput('');
        setSuggestions([]);
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setIsSearching(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleCopy = () => {
    const selected = window.getSelection()?.toString();
    if (selected) {
      navigator.clipboard.writeText(selected);
    }
    setContextMenu(null);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(prev => prev + text);
    } catch { /* clipboard denied */ }
    setContextMenu(null);
  };

  const addTab = () => {
    const id = String(Date.now());
    const names = ['bash', 'sh', 'zsh', 'node', 'python'];
    setTabs(prev => [...prev, { id, name: names[Math.floor(Math.random() * names.length)] }]);
    setActiveTab(id);
  };

  const removeTab = (id: string) => {
    if (tabs.length === 1) return;
    const remaining = tabs.filter(t => t.id !== id);
    setTabs(remaining);
    if (activeTab === id) setActiveTab(remaining[0].id);
  };

  const promptPath = cwd.replace('/workspace', '~');

  const filteredOutput = isSearching && searchText.trim()
    ? terminalOutput.filter(line => {
        const cleanLine = line.replace(/\x1b\[\d+m/g, '');
        return cleanLine.toLowerCase().includes(searchText.toLowerCase());
      })
    : terminalOutput;

  return (
    <div className={`flex flex-col bg-[#1e1e1e] ${isMaximized ? 'fixed inset-0 z-50' : 'h-full'}`}>
      {/* Tab Bar */}
      <div className="flex items-center justify-between bg-[#252526] border-b border-[#3c3c3c]">
        <div className="flex items-center overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer border-r border-[#3c3c3c] text-[11px] group min-w-0 ${
                activeTab === tab.id
                  ? 'bg-[#1e1e1e] text-white'
                  : 'text-[#888] hover:bg-[#2a2a2a]'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <TerminalIcon size={11} className={activeTab === tab.id ? 'text-[#007acc]' : 'text-[#555]'} />
              <span className="truncate">{tab.name}</span>
              {tabs.length > 1 && (
                <X
                  size={10}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 ml-1 shrink-0"
                  onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
                />
              )}
            </div>
          ))}
          <button
            onClick={addTab}
            className="px-2 py-1.5 text-[#6c6c6c] hover:text-white hover:bg-[#3c3c3c] text-[11px]"
            title="محطة جديدة"
          >
            <Plus size={12} />
          </button>
        </div>
        <div className="flex items-center gap-0.5 px-1">
          <button
            onClick={() => { setIsSearching(!isSearching); setTimeout(() => searchRef.current?.focus(), 50); }}
            className={`p-1 rounded text-[11px] ${isSearching ? 'text-[#007acc] bg-[#37373d]' : 'text-[#6c6c6c] hover:text-white hover:bg-[#3c3c3c]'}`}
            title="بحث"
          >
            <Search size={12} />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 text-[#6c6c6c] hover:text-white hover:bg-[#3c3c3c] rounded"
            title={isMaximized ? 'استعادة' : 'تكبير'}
          >
            {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
          <button
            onClick={clearTerminal}
            className="p-1 text-[#6c6c6c] hover:text-white hover:bg-[#3c3c3c] rounded"
            title="مسح"
          >
            <Trash2 size={12} />
          </button>
          <button
            onClick={() => setShowTerminal(false)}
            className="p-1 text-[#6c6c6c] hover:text-white hover:bg-[#3c3c3c] rounded"
            title="إغلاق"
          >
            <ChevronDown size={12} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {isSearching && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#252526] border-b border-[#3c3c3c]">
          <Search size={12} className="text-[#888]" />
          <input
            ref={searchRef}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="بحث في الطرفية..."
            className="flex-1 bg-[#3c3c3c] text-[#ccc] text-[12px] px-2 py-0.5 rounded outline-none border border-transparent focus:border-[#007acc]"
          />
          <span className="text-[11px] text-[#888]">
            {filteredOutput.length}/{terminalOutput.length}
          </span>
          <button onClick={() => { setIsSearching(false); setSearchText(''); }} className="text-[#888] hover:text-white">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Output */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 font-mono text-[12px] leading-[20px] cursor-text select-text"
        onMouseDown={(e) => {
          // Allow text selection - don't steal focus
          if (e.detail === 2) return; // double click = select word
        }}
        onClick={(e) => {
          // Only focus input if user is NOT selecting text
          const sel = window.getSelection();
          if (sel && sel.toString().length > 0) {
            e.preventDefault();
            return;
          }
          inputRef.current?.focus();
        }}
        onContextMenu={handleContextMenu}
      >
        {filteredOutput.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all">
            {parseAnsiToSpans(line)}
          </div>
        ))}

        {/* Input line */}
        <div className="flex items-center gap-1.5 mt-0.5 relative">
          <span className="text-[#6a9955] text-[12px] shrink-0">❯</span>
          <span className="text-[#569cd6] text-[12px] shrink-0">{promptPath}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-[#cccccc] outline-none font-mono text-[12px] caret-[#007acc] min-w-0"
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            placeholder="اكتب أمراً..."
          />
        </div>

        {/* Tab completion suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {suggestions.map((s, i) => (
              <button
                key={s}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  i === selectedSugg
                    ? 'bg-[#007acc] text-white'
                    : 'bg-[#2a2a2a] text-[#aaa] hover:bg-[#3c3c3c] hover:text-white'
                }`}
                onClick={() => applySuggestion(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-[#252526] border border-[#454545] rounded-md shadow-xl py-1 z-50 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-[#ccc] hover:bg-[#094771] text-left"
          >
            <Copy size={12} />
            نسخ النص المحدد
          </button>
          <button
            onClick={handlePaste}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-[#ccc] hover:bg-[#094771] text-left"
          >
            <Clipboard size={12} />
            لصق
          </button>
          <div className="border-t border-[#454545] my-1" />
          <button
            onClick={() => { handleCopy(); setContextMenu(null); }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-[#ccc] hover:bg-[#094771] text-left"
          >
            <Copy size={12} />
            نسخ الكل
          </button>
          <button
            onClick={() => { clearTerminal(); setContextMenu(null); }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-[#ccc] hover:bg-[#094771] text-left"
          >
            <Trash2 size={12} />
            مسح الكل
          </button>
          <button
            onClick={() => { setIsSearching(true); setContextMenu(null); setTimeout(() => searchRef.current?.focus(), 50); }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-[#ccc] hover:bg-[#094771] text-left"
          >
            <Search size={12} />
            بحث
          </button>
        </div>
      )}
    </div>
  );
};

export default Terminal;
