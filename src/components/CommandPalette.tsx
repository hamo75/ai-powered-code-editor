import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { filterAndRankCommands } from '../services/commandSystem';
import {
  Search, FileText, Settings, Palette, Terminal, GitBranch,
  FolderPlus, FilePlus, Code2, Blocks,
} from 'lucide-react';

interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  category: string;
  action: () => void;
  shortcut?: string;
  description?: string;
  aliases?: string[];
  keywords?: string[];
}

const CommandPalette: React.FC = () => {
  const {
    setShowCommandPalette, setShowSettings, setShowTerminal, showTerminal,
    toggleSidebar, setActivePanel, setShowChat, showChat, saveAllFiles,
    saveFile, activeFileId, updateFile, files, activeFileId: currentFileId,
    getExtensionSnippets, extensions,
  } = useStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const activeFile = files.find((f: { id: string | null }) => f.id === currentFileId);

  // Build snippet commands from installed extensions
  const snippetCommands: Command[] = useMemo(() => {
    const snippets = getExtensionSnippets();
    return snippets.map((snippet, i) => ({
      id: `snippet-${i}`,
      label: `${snippet.prefix} — ${snippet.description}`,
      icon: <Code2 size={14} />,
      category: 'قصاصة',
      action: () => {
        if (activeFile) {
          const code = snippet.body.join('\n');
          const newContent = (activeFile.content || '') + '\n' + code;
          updateFile(activeFile.id, newContent);
        }
      },
    }));
  }, [getExtensionSnippets, activeFile, updateFile]);

  // Extension management commands
  const extensionCommands: Command[] = [
    { id: 'extensions', label: 'فتح الإضافات', icon: <Blocks size={14} />, category: 'إضافات', action: () => setActivePanel('extensions') },
    ...extensions.filter(e => e.installed && e.enabled && e.commandData).flatMap((ext, ei) =>
      (ext.commandData || []).map((cmd, ci) => ({
        id: `ext-cmd-${ei}-${ci}`,
        label: `${cmd.name} — ${cmd.description}`,
        icon: <Blocks size={14} />,
        category: 'إضافة',
        action: () => {
          useStore.getState().executeCommand(cmd.name);
          setShowTerminal(true);
        },
      }))
    ),
  ];

  const commands: Command[] = [
    { id: 'save', label: 'حفظ الملف الحالي', icon: <FileText size={14} />, category: 'ملف', action: () => { if (activeFileId) saveFile(activeFileId); }, shortcut: 'Ctrl+S' },
    { id: 'save-all', label: 'حفظ جميع الملفات', icon: <FileText size={14} />, category: 'ملف', action: saveAllFiles, shortcut: 'Ctrl+Shift+S' },
    { id: 'new-file', label: 'ملف جديد', icon: <FilePlus size={14} />, category: 'ملف', action: () => setActivePanel('explorer') },
    { id: 'new-folder', label: 'مجلد جديد', icon: <FolderPlus size={14} />, category: 'ملف', action: () => setActivePanel('explorer') },
    { id: 'toggle-sidebar', label: 'تبديل الشريط الجانبي', icon: <FileText size={14} />, category: 'عرض', action: toggleSidebar, shortcut: 'Ctrl+B' },
    { id: 'toggle-terminal', label: 'تبديل الطرفية', icon: <Terminal size={14} />, category: 'عرض', action: () => setShowTerminal(!showTerminal), shortcut: 'Ctrl+J' },
    { id: 'toggle-chat', label: 'تبديل مساعد AI', icon: <FileText size={14} />, category: 'عرض', action: () => setShowChat(!showChat) },
    { id: 'explorer', label: 'المستكشف', icon: <FileText size={14} />, category: 'عرض', action: () => setActivePanel('explorer') },
    { id: 'search', label: 'بحث في الملفات', icon: <Search size={14} />, category: 'عرض', action: () => setActivePanel('search'), shortcut: 'Ctrl+Shift+F' },
    { id: 'git', label: 'Git', icon: <GitBranch size={14} />, category: 'عرض', action: () => setActivePanel('git') },
    { id: 'settings', label: 'الإعدادات', icon: <Settings size={14} />, category: 'تفضيلات', action: () => setShowSettings(true) },
    { id: 'theme', label: 'تغيير السمة', icon: <Palette size={14} />, category: 'تفضيلات', action: () => setShowSettings(true) },
    ...snippetCommands,
    ...extensionCommands,
  ];

  const filtered = useMemo(
    () => filterAndRankCommands(query, commands),
    [query, commands]
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const executeCommand = (cmd: Command) => {
    setShowCommandPalette(false);
    cmd.action();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15%]" onClick={() => setShowCommandPalette(false)}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-[520px] bg-[#252526] border border-[#3c3c3c] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#3c3c3c]">
          <Search size={16} className="text-[#6c6c6c]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowCommandPalette(false);
              if (e.key === 'Enter' && filtered.length > 0) executeCommand(filtered[0]);
            }}
            placeholder="اكتب أمراً..."
            className="flex-1 bg-transparent text-white text-[14px] outline-none placeholder-[#4c4c4c]"
            autoFocus
          />
          <kbd className="text-[10px] text-[#6c6c6c] bg-[#3c3c3c] px-2 py-0.5 rounded">Esc</kbd>
        </div>

        <div className="max-h-[300px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[#4c4c4c] text-[13px]">لا توجد أوامر مطابقة</div>
          ) : (
            filtered.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => executeCommand(cmd)}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#094771] text-[#cccccc] hover:text-white transition-colors"
              >
                <span className="text-[#6c6c6c]">{cmd.icon}</span>
                <span className="flex-1 text-[13px] text-right">{cmd.label}</span>
                <span className="text-[10px] text-[#4c4c4c]">{cmd.category}</span>
                {cmd.shortcut && (
                  <kbd className="text-[10px] text-[#6c6c6c] bg-[#1e1e1e] px-1.5 py-0.5 rounded border border-[#3c3c3c]">{cmd.shortcut}</kbd>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
