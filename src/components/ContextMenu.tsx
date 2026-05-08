import React, { useState, useEffect, useRef } from 'react';

interface ContextMenuAction {
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  separator?: false;
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string;
}

interface ContextMenuSeparator {
  separator: true;
  label?: string;
}

export type ContextMenuItem = ContextMenuAction | ContextMenuSeparator;

interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

let globalSetState: ((s: ContextMenuState | null) => void) | null = null;

export const showContextMenu = (e: React.MouseEvent | MouseEvent, items: ContextMenuItem[]) => {
  e.preventDefault();
  e.stopPropagation();
  globalSetState?.({ x: e.clientX, y: e.clientY, items });
};

const ContextMenu: React.FC = () => {
  const [state, setState] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    globalSetState = setState;
    return () => { globalSetState = null; };
  }, []);

  useEffect(() => {
    if (!state) return;
    const close = () => setState(null);
    
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };

    setTimeout(() => {
      document.addEventListener('click', handleClick);
      document.addEventListener('contextmenu', handleClick);
      document.addEventListener('scroll', close, true);
    }, 10);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleClick);
      document.removeEventListener('scroll', close, true);
    };
  }, [state]);

  useEffect(() => {
    if (!state || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    
    let { x, y } = state;
    if (x + rect.width > winW) x = winW - rect.width - 8;
    if (y + rect.height > winH) y = winH - rect.height - 8;
    if (x < 0) x = 8;
    if (y < 0) y = 8;
    
    menuRef.current.style.left = x + 'px';
    menuRef.current.style.top = y + 'px';
  }, [state]);

  if (!state) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl py-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
      style={{ left: state.x, top: state.y }}
    >
      {state.items.map((item, i) =>
        item.separator ? (
          <div key={i} className="h-px bg-[#3c3c3c] my-1" />
        ) : (
          <button
            key={i}
            onClick={() => { item.action(); setState(null); }}
            disabled={item.disabled}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] transition-colors ${
              item.danger
                ? 'text-red-400 hover:bg-red-900/30'
                : item.disabled
                  ? 'text-[#5c5c5c] cursor-not-allowed'
                  : 'text-[#cccccc] hover:bg-[#094771] hover:text-white'
            }`}
          >
            {item.icon && <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>}
            <span className="flex-1 text-right">{item.label}</span>
            {item.shortcut && (
              <kbd className="text-[10px] text-[#6c6c6c] mr-auto">{item.shortcut}</kbd>
            )}
          </button>
        )
      )}
    </div>
  );
};

export default ContextMenu;
