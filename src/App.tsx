import React, { useEffect, useCallback, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from './store/useStore';
import ActivityBar from './components/ActivityBar';
import Sidebar from './components/Sidebar';
import CodeEditor from './components/CodeEditor';
import AiChat from './components/AiChat';
import BottomPanel from './components/BottomPanel';
import StatusBar from './components/StatusBar';
import SettingsModal from './components/SettingsModal';
import CommandPalette from './components/CommandPalette';
import Notifications from './components/Notifications';
import ContextMenu from './components/ContextMenu';
import AiAssistantPanel from './components/AiAssistantPanel';
import ErrorBoundary from './components/ErrorBoundary';
import { useResize } from './hooks/useResize';

interface MenuItem {
  label: string;
  action?: () => void;
  shortcut?: string;
  separator?: boolean;
}

const MenuDropdown: React.FC<{
  items: MenuItem[];
  onClose: () => void;
}> = ({ items, onClose }) => (
  <div
    className="absolute top-full left-0 mt-0.5 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl py-1 min-w-[220px] z-50 animate-in fade-in slide-in-from-top-1 duration-100"
    onMouseLeave={onClose}
  >
    {items.map((item, i) =>
      item.separator ? (
        <div key={i} className="h-px bg-[#3c3c3c] my-1" />
      ) : (
        <button
          key={i}
          onClick={() => { item.action?.(); onClose(); }}
          className="w-full flex items-center justify-between px-4 py-1.5 text-[12px] text-[#cccccc] hover:bg-[#094771] hover:text-white transition-colors"
        >
          <span>{item.label}</span>
          {item.shortcut && (
            <kbd className="text-[10px] text-[#6c6c6c]">{item.shortcut}</kbd>
          )}
        </button>
      )
    )}
  </div>
);

const ResizeHandle: React.FC<{
  direction: 'horizontal' | 'vertical';
  onMouseDown: (e: React.MouseEvent) => void;
  isResizing: boolean;
  doubleClick?: () => void;
}> = ({ direction, onMouseDown, isResizing, doubleClick }) => (
  <div
    className={`flex-shrink-0 transition-colors group relative ${
      direction === 'horizontal'
        ? 'w-[3px] cursor-col-resize hover:bg-[#007acc] active:bg-[#0098ff]'
        : 'h-[3px] cursor-row-resize hover:bg-[#007acc] active:bg-[#0098ff]'
    } ${isResizing ? '!bg-[#007acc]' : 'bg-transparent'}`}
    onMouseDown={onMouseDown}
    onDoubleClick={doubleClick}
  >
    {/* Visual indicator on hover */}
    <div className={`absolute opacity-0 group-hover:opacity-100 transition-opacity ${
      direction === 'horizontal'
        ? 'top-0 bottom-0 -left-1 -right-1'
        : 'left-0 right-0 -top-1 -bottom-1'
    }`} />
  </div>
);

type StoreState = ReturnType<typeof useStore.getState>;

const App: React.FC = () => {
  const {
    showChat,
    showTerminal,
    showSettings,
    showCommandPalette,
    sidebarVisible,
    activeFileId,
    extensions,
  } = useStore(
    useShallow((state: StoreState) => ({
      showChat: state.showChat,
      showTerminal: state.showTerminal,
      showSettings: state.showSettings,
      showCommandPalette: state.showCommandPalette,
      sidebarVisible: state.sidebarVisible,
      activeFileId: state.activeFileId,
      extensions: state.extensions,
    }))
  );

  const {
    setShowSettings,
    setShowCommandPalette,
    toggleSidebar,
    setShowTerminal,
    saveFile,
    saveAllFiles,
    setActivePanel,
    getActiveThemeExtension,
    setShowChat,
    executeCommand,
  } = useStore(
    useShallow((state: StoreState) => ({
      setShowSettings: state.setShowSettings,
      setShowCommandPalette: state.setShowCommandPalette,
      toggleSidebar: state.toggleSidebar,
      setShowTerminal: state.setShowTerminal,
      saveFile: state.saveFile,
      saveAllFiles: state.saveAllFiles,
      setActivePanel: state.setActivePanel,
      getActiveThemeExtension: state.getActiveThemeExtension,
      setShowChat: state.setShowChat,
      executeCommand: state.executeCommand,
    }))
  );

  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [isCompactViewport, setIsCompactViewport] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth < 1280 : false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);

  useEffect(() => {
    const handleViewportChange = () => setIsCompactViewport(window.innerWidth < 1280);
    handleViewportChange();
    window.addEventListener('resize', handleViewportChange);
    return () => window.removeEventListener('resize', handleViewportChange);
  }, []);

  useEffect(() => {
    if (isCompactViewport) {
      setShowChat(false);
      setShowAiAssistant(false);
    }
  }, [isCompactViewport, setShowChat]);

  // ─── Resizable panels ───
  const sidebar = useResize({ direction: 'horizontal', initialSize: 220, minSize: 150, maxSize: 500, collapsed: !sidebarVisible });
  const chatPanel = useResize({ direction: 'horizontal', initialSize: 320, minSize: 260, maxSize: 620, collapsed: !showChat });
  const bottomPanel = useResize({ direction: 'vertical', initialSize: 180, minSize: 120, maxSize: 460, collapsed: !showTerminal });

  // Sync collapsed state
  useEffect(() => { sidebar.setSize(sidebar.fullSize); }, [sidebarVisible]);
  useEffect(() => { chatPanel.setSize(chatPanel.fullSize); }, [showChat]);
  useEffect(() => { bottomPanel.setSize(bottomPanel.fullSize); }, [showTerminal]);

  // Apply theme extension CSS variables
  React.useEffect(() => {
    const themeExt = getActiveThemeExtension();
    const root = document.documentElement;
    if (themeExt?.themeData) {
      root.style.setProperty('--ext-accent', themeExt.themeData.accentColor);
      root.style.setProperty('--ext-sidebar-bg', themeExt.themeData.sidebarBg);
      root.style.setProperty('--ext-activity-bg', themeExt.themeData.activityBarBg);
      root.style.setProperty('--ext-status-bg', themeExt.themeData.statusBarBg);
      root.style.setProperty('--ext-title-bg', themeExt.themeData.titleBarBg);
      root.classList.add('has-ext-theme');
    } else {
      root.style.removeProperty('--ext-accent');
      root.style.removeProperty('--ext-sidebar-bg');
      root.style.removeProperty('--ext-activity-bg');
      root.style.removeProperty('--ext-status-bg');
      root.style.removeProperty('--ext-title-bg');
      root.classList.remove('has-ext-theme');
    }
  }, [getActiveThemeExtension, extensions]);

  const menus: Record<string, MenuItem[]> = {
    'ملف': [
      { label: 'ملف جديد', action: () => setActivePanel('explorer'), shortcut: '' },
      { label: 'حفظ', action: () => { if (activeFileId) saveFile(activeFileId); }, shortcut: 'Ctrl+S' },
      { label: 'حفظ الكل', action: saveAllFiles, shortcut: 'Ctrl+Shift+S' },
      { separator: true, label: '' },
      { label: '📂 فتح مجلد من الجهاز', action: () => {
        const input = document.createElement('input');
        input.type = 'file';
        (input as any).webkitdirectory = true;
        (input as any).directory = true;
        input.multiple = true;
        input.onchange = (e) => {
          const files = (e.target as any).files;
          if (files && files.length > 0) {
            useStore.getState().importFolderFromDevice(files);
          }
        };
        input.click();
      }},
      { separator: true, label: '' },
      { label: 'الإعدادات', action: () => setShowSettings(true), shortcut: 'Ctrl+,' },
    ],
    'تعديل': [
      { label: 'بحث', action: () => setActivePanel('search'), shortcut: 'Ctrl+Shift+F' },
      { label: 'استبدال', action: () => setActivePanel('search'), shortcut: 'Ctrl+H' },
    ],
    'عرض': [
      { label: 'لوحة الأوامر', action: () => setShowCommandPalette(true), shortcut: 'Ctrl+Shift+P' },
      { label: 'تبديل الشريط الجانبي', action: toggleSidebar, shortcut: 'Ctrl+B' },
      { label: 'تبديل الطرفية', action: () => setShowTerminal(!showTerminal), shortcut: 'Ctrl+J' },
      { label: 'تبديل مساعد AI', action: () => setShowChat(!showChat) },
      { label: 'مساعد الذكاء الاصطناعي المتقدم', action: () => setShowAiAssistant(!showAiAssistant) },
      { separator: true, label: '' },
      { label: 'المستكشف', action: () => setActivePanel('explorer') },
      { label: 'البحث', action: () => setActivePanel('search') },
      { label: 'Git', action: () => setActivePanel('git') },
    ],
    'تشغيل': [
      { label: 'npm install', action: () => { setShowTerminal(true); executeCommand('npm install'); } },
      { label: 'npm run dev', action: () => { setShowTerminal(true); executeCommand('npm run dev'); } },
      { label: 'npm run build', action: () => { setShowTerminal(true); executeCommand('npm run build'); } },
      { separator: true, label: '' },
      { label: 'فتح الطرفية', action: () => setShowTerminal(true), shortcut: 'Ctrl+J' },
    ],
    'مساعدة': [
      { label: 'الأوامر المتاحة', action: () => { setShowTerminal(true); setTimeout(() => executeCommand('help'), 100); } },
      { label: 'الإعدادات', action: () => setShowSettings(true) },
    ],
  };

  const handleSidebarResize = useCallback((e: React.MouseEvent) => {
    // Sidebar is on the left side of the code editor
    // We need to track the distance from the left edge
    e.preventDefault();
    const startX = e.clientX;
    const startSize = sidebar.fullSize;
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    const handleMove = (ev: MouseEvent) => {
      const diff = ev.clientX - startX;
      const newSize = Math.min(500, Math.max(150, startSize + diff));
      sidebar.setSize(newSize);
    };
    
    const handleUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [sidebar]);

  const handleChatResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startSize = chatPanel.fullSize;
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    const handleMove = (ev: MouseEvent) => {
      // Dragging left = growing the panel
      const diff = startX - ev.clientX;
      const newSize = Math.min(700, Math.max(280, startSize + diff));
      chatPanel.setSize(newSize);
    };
    
    const handleUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [chatPanel]);

  const handleBottomResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startSize = bottomPanel.fullSize;
    
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    
    const handleMove = (ev: MouseEvent) => {
      // Dragging up = growing the panel
      const diff = startY - ev.clientY;
      const newSize = Math.min(500, Math.max(120, startSize + diff));
      bottomPanel.setSize(newSize);
    };
    
    const handleUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [bottomPanel]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault();
        setShowTerminal(!useStore.getState().showTerminal);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setShowSettings(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        useStore.getState().formatActiveFile();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        useStore.getState().setShowTerminal(true);
        useStore.getState().setBottomPanelTab('problems');
        useStore.getState().analyzeProblems();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showTerminal, setShowTerminal, setShowCommandPalette, toggleSidebar, setShowSettings]);

  const anyResizing = sidebar.isResizing || chatPanel.isResizing || bottomPanel.isResizing;

  return (
    <ErrorBoundary>
      <div className={`flex h-screen max-h-screen w-full flex-col overflow-hidden bg-[#1e1e1e] text-white font-sans ${anyResizing ? 'select-none' : ''}`} style={{ fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif" }}>
      {/* Title bar - Professional */}
      <div className="grid h-10 grid-cols-[auto,1fr,auto] items-center gap-3 bg-[#323233] px-3 flex-shrink-0 border-b border-[#252526] select-none shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          {/* Window controls - macOS style */}
          <div className="flex gap-2 group shrink-0">
            <button className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] flex items-center justify-center transition-all duration-200 group-hover:brightness-110" title="إغلاق">
              <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-black/60">×</span>
            </button>
            <button className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-[#ff9500] flex items-center justify-center transition-all duration-200 group-hover:brightness-110" title="تصغير">
              <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-black/60">−</span>
            </button>
            <button className="w-3 h-3 rounded-full bg-[#28ca41] hover:bg-[#30d158] flex items-center justify-center transition-all duration-200 group-hover:brightness-110" title="تكبير">
              <span className="opacity-0 group-hover:opacity-100 text-[6px] font-bold text-black/60">⤢</span>
            </button>
          </div>

          {/* Menu bar */}
          <div className="flex items-center gap-0.5 text-[12px] text-[#cccccc] min-w-0 overflow-x-auto whitespace-nowrap scrollbar-hide">
            {Object.entries(menus).map(([name, items]) => (
              <div key={name} className="relative">
                <button
                  onClick={() => setOpenMenu(openMenu === name ? null : name)}
                  onMouseEnter={() => openMenu && setOpenMenu(name)}
                  className={`hover:text-white px-3 py-1.5 rounded-md transition-all duration-200 ${
                    openMenu === name
                      ? 'bg-[#505050] text-white shadow-sm'
                      : 'hover:bg-[#505050]/80'
                  }`}
                >
                  {name}
                </button>
                {openMenu === name && (
                  <MenuDropdown items={items} onClose={() => setOpenMenu(null)} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* App title - responsive */}
        <div className="flex min-w-0 items-center justify-center gap-2.5 select-none overflow-hidden px-2">
          <div className="hidden h-5 w-5 items-center justify-center rounded-lg bg-gradient-to-br from-[#0078d4] to-[#6a0dad] text-[11px] font-bold shadow-lg sm:flex">
            A
          </div>
          <span className="truncate text-[12px] font-semibold tracking-wide text-white">
            AI Code Studio Pro
          </span>
          <span className="hidden shrink-0 rounded-full border border-[#0078d4]/30 bg-gradient-to-r from-[#0078d4]/20 to-[#6a0dad]/20 px-2.5 py-0.5 text-[9px] font-medium text-[#9cdcfe] sm:inline-flex">
            v3.0
          </span>
        </div>

        {/* Right side - Command palette shortcut */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => setShowCommandPalette(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#3c3c3c] bg-[#404040] px-3 py-1.5 text-[11px] text-[#969696] shadow-sm transition-all duration-200 hover:border-[#505050] hover:bg-[#505050] hover:text-white hover:shadow-md"
          >
            <span className="text-[10px]">⌘K</span>
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <ActivityBar />

        {/* Sidebar */}
        <div
          className="flex-shrink-0 overflow-hidden bg-[#252526] transition-all duration-200 ease-out"
          style={{ width: sidebarVisible ? sidebar.size : 0, opacity: sidebarVisible ? 1 : 0 }}
        >
          <div className="h-full" style={{ width: sidebarVisible ? sidebar.fullSize : 260 }}>
            <Sidebar />
          </div>
        </div>
        
        {/* Sidebar resize handle */}
        {sidebarVisible && (
          <ResizeHandle direction="horizontal" onMouseDown={handleSidebarResize} isResizing={sidebar.isResizing} />
        )}

        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div className="flex flex-col flex-1 min-w-0 min-h-0">
              <CodeEditor />
            </div>

            {/* AI Chat resize handle */}
            {showChat && (
              <ResizeHandle direction="horizontal" onMouseDown={handleChatResize} isResizing={chatPanel.isResizing} />
            )}

            {/* AI Chat panel */}
            <div
              className="flex-shrink-0 h-full min-h-0 overflow-hidden border-l border-[#252526] transition-all duration-200 ease-out"
              style={{ width: showChat ? chatPanel.size : 0, opacity: showChat ? 1 : 0 }}
            >
              <div className="h-full min-h-0 overflow-hidden" style={{ width: showChat ? chatPanel.fullSize : 400 }}>
                <AiChat />
              </div>
            </div>

            {/* AI Assistant Panel */}
            {showAiAssistant && (
              <>
                <ResizeHandle direction="horizontal" onMouseDown={(e) => {}} isResizing={false} />
                <div className="w-[400px] flex-shrink-0 border-l border-[#252526]">
                  <AiAssistantPanel onClose={() => setShowAiAssistant(false)} />
                </div>
              </>
            )}
          </div>

          {/* Bottom panel resize handle */}
          {showTerminal && (
            <ResizeHandle direction="vertical" onMouseDown={handleBottomResize} isResizing={bottomPanel.isResizing} />
          )}

          {/* Bottom panel */}
          <div
            className="flex-shrink-0 h-full min-h-0 overflow-hidden border-t border-[#3c3c3c] transition-all duration-200 ease-out"
            style={{ height: showTerminal ? bottomPanel.size : 0, opacity: showTerminal ? 1 : 0 }}
          >
            <div className="h-full min-h-0 overflow-hidden" style={{ height: showTerminal ? bottomPanel.fullSize : 220 }}>
              <BottomPanel />
            </div>
          </div>
        </div>
      </div>

      <StatusBar />

      {/* Modals & Overlays */}
      {showSettings && <SettingsModal />}
      {showCommandPalette && <CommandPalette />}
      <Notifications />
      <ContextMenu />
      </div>
    </ErrorBoundary>
  );
};

export default App;
