import React from 'react';
import {
  Files, Search, GitBranch, Blocks, Bot, Settings, Terminal,
} from 'lucide-react';
import { useStore } from '../store/useStore';

const ActivityBar: React.FC = () => {
  const { activePanel, setActivePanel, showChat, setShowChat, setShowSettings, files, showTerminal, setShowTerminal } = useStore();
  
  const dirtyCount = files.filter((f) => f.isDirty).length;
  
  const items = [
    { id: 'explorer' as const, icon: <Files size={20} />, label: 'المستكشف', badge: 0 },
    { id: 'search' as const, icon: <Search size={20} />, label: 'بحث', badge: 0 },
    { id: 'git' as const, icon: <GitBranch size={20} />, label: 'Git', badge: dirtyCount },
    { id: 'extensions' as const, icon: <Blocks size={20} />, label: 'إضافات', badge: 0 },
  ];

  return (
    <div className="w-12 flex-shrink-0 bg-[#333333] flex flex-col items-center py-1 border-r border-[#252526]">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => setActivePanel(item.id)}
          className={`relative w-12 h-12 flex items-center justify-center transition-colors ${
            activePanel === item.id
              ? 'text-white border-l-2 border-white bg-[#1e1e1e]'
              : 'text-[#858585] hover:text-white border-l-2 border-transparent'
          }`}
          title={item.label}
        >
          {item.icon}
          {item.badge > 0 && (
            <span className="absolute top-1.5 right-1.5 bg-[#007acc] text-white text-[9px] min-w-[14px] h-[14px] flex items-center justify-center rounded-full font-bold">
              {item.badge}
            </span>
          )}
        </button>
      ))}

      <div className="flex-1" />

      <button
        onClick={() => setShowTerminal(!showTerminal)}
        className={`w-12 h-12 flex items-center justify-center transition-colors ${
          showTerminal
            ? 'text-white bg-[#1e1e1e] border-l-2 border-white'
            : 'text-[#858585] hover:text-white border-l-2 border-transparent'
        }`}
        title="الطرفية والمشاكل"
      >
        <Terminal size={20} />
      </button>

      <button
        onClick={() => setShowChat(!showChat)}
        className={`w-12 h-12 flex items-center justify-center transition-colors ${
          showChat
            ? 'text-white bg-[#1e1e1e] border-l-2 border-white'
            : 'text-[#858585] hover:text-white border-l-2 border-transparent'
        }`}
        title="مساعد AI"
      >
        <Bot size={20} />
      </button>

      <button
        onClick={() => setShowSettings(true)}
        className="w-12 h-12 flex items-center justify-center text-[#858585] hover:text-white transition-colors border-l-2 border-transparent"
        title="الإعدادات"
      >
        <Settings size={20} />
      </button>
    </div>
  );
};

export default ActivityBar;
