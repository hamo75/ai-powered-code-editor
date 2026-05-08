// Breadcrumbs.tsx
import React, { useState, useRef, useEffect, MouseEvent } from 'react';
import { useStore } from '../store/useStore';

export const Breadcrumbs: React.FC = () => {
  const { 
    files,
    activeFileId,
    setActiveFile,
    runDartAnalyze,
    addFileToFolder,
    deleteFile,
  } = useStore();

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    fileRef: string;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // Find the file/folder in the tree by ID
  const findNodeById = (nodes: any[], id: string): any => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Build path relative to root
  const getRelativePath = (fileId: string): string[] => {
    if (!fileId || fileId === 'root') return [];
    
    const node = findNodeById(files, fileId);
    if (!node) return [];
    
    const parts: string[] = [];
    let current = node;
    
    while (current && current.parentId !== null) {
      parts.unshift(current.name);
      current = findNodeById(files, current.parentId!);
    }
    
    return parts;
  };

  // Find ancestor folder given folder ID
  const findFolderById = (nodes: any[], folderId: string): any => {
    for (const node of nodes) {
      if (node.id === folderId) return node;
      if (node.children) {
        const found = findFolderById(node.children, folderId);
        if (found) return found;
      }
    }
    return null;
  };

  const handleBreadcrumbClick = (_e: MouseEvent, clickPath: string[]) => {
    // Find file/folder by full path
    let currentNodes = files as any[];
    let foundNode: any = null;
    
    for (const part of clickPath) {
      const partNode = currentNodes.find(n => n.name === part);
      if (partNode) {
        if (part === clickPath[clickPath.length - 1]) {
          foundNode = partNode;
        } else if (partNode.children) {
          currentNodes = partNode.children;
        }
      }
    }
    
    if (foundNode && !foundNode.children && foundNode.id) {
      setActiveFile(foundNode.id);
    }
  };

  const handleFileRightClick = (e: MouseEvent) => {
    if (!activeFileId) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      fileRef: activeFileId,
    });
  };

  const handleNewFile = async () => {
    if (!contextMenu) return;
    
    const name = prompt('Enter file name:');
    if (!name) return;
    
    // Determine parent folder
    const node = findNodeById(files, contextMenu.fileRef);
    const parentId = node?.type === 'folder' ? node.id : node?.parentId || 'root';
    
    addFileToFolder(parentId, name, 'file');
    setContextMenu(null);
  };

  const handleNewFolder = async () => {
    if (!contextMenu) return;
    
    const name = prompt('Enter folder name:');
    if (!name) return;
    
    const node = findNodeById(files, contextMenu.fileRef);
    const parentId = node?.type === 'folder' ? node.id : node?.parentId || 'root';
    
    addFileToFolder(parentId, name, 'folder');
    setContextMenu(null);
  };

  const handleRename = () => {
    if (!contextMenu) return;
    setContextMenu(null);
    alert('Rename feature coming soon - use F2 in file explorer');
  };

  const handleDelete = async () => {
    if (!contextMenu) return;
    
    const node = findNodeById(files, contextMenu.fileRef);
    if (!node) return;
    
    if (node.children) {
      // It's a folder
      const confirmed = confirm(`Delete folder "${node.name}" and all its contents?`);
      if (confirmed) {
        // Show error - folder deletion not implemented in store
        alert('Folder deletion coming soon');
        setContextMenu(null);
      }
    } else {
      // It's a file
      const confirmed = confirm(`Delete file "${node.name}"?`);
      if (confirmed) {
        deleteFile(contextMenu.fileRef);
        setContextMenu(null);
      }
    }
  };

  const handleDuplicate = async () => {
    if (!contextMenu) return;
    
    const node = findNodeById(files, contextMenu.fileRef);
    if (!node || !node.content) return;
    
    const parts = contextMenu.fileRef.split('/');
    const originalName = parts[parts.length - 1];
    const dotIndex = originalName.lastIndexOf('.');
    const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
    const ext = dotIndex > 0 ? originalName.slice(dotIndex) : '';
    const newName = `${base}_copy${ext}`;
    
    const parentId = node.parentId || 'root';
    
    const newFile = addFileToFolder(parentId, newName, 'file');
    if (newFile && node.content) {
      useStore.getState().updateFile(newFile.id, node.content);
    }
    
    setContextMenu(null);
  };

  // Build breadcrumb path
  const CurrentPath = getRelativePath(activeFileId || '');
  
  // Get file language icon based on extension
  const getFileIcon = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const icons: Record<string, string> = {
      ts: '📘',
      tsx: '⚛️',
      js: '📕',
      jsx: '⚛️',
      dart: '🎯',
      py: '🐍',
      rs: '🦀',
      go: '🐹',
      java: '☕',
      json: '📋',
      html: '🌐',
      css: '🎨',
      scss: '💄',
      md: '📝',
    };
    return icons[ext] || '📄';
  };

  return (
    <div className="flex items-center gap-1 px-2 py-1 border-b border-slate-700/50 bg-slate-800/50 text-xs overflow-x-auto select-none">
      {/* Project root */}
      <button 
        onClick={() => setActiveFile(null)}
        className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-700 transition-colors ${!activeFileId ? 'text-blue-400' : 'text-slate-400'}`}
      >
        <span>📁</span>
        <span>Project</span>
      </button>
      
      {/* Breadcrumb path */}
      {CurrentPath.map((part, index) => {
        const isLast = index === CurrentPath.length - 1;
        const icon = isLast ? getFileIcon(part) : '📁';
        
        return (
          <React.Fragment key={index}>
            <span className="text-slate-600">›</span>
            <button
              onClick={(e) => handleBreadcrumbClick(e, CurrentPath.slice(0, index + 1))}
              onContextMenu={isLast ? handleFileRightClick : undefined}
              className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-700 transition-colors ${
                isLast ? 'text-blue-400 font-medium cursor-pointer' : 'text-slate-500'
              }`}
              title={isLast ? 'Right-click for options' : part}
            >
              {isLast && <span className="mr-1">{icon}</span>}
              <span className="max-w-[200px] truncate">{part}</span>
            </button>
          </React.Fragment>
        );
      })}

      {/* Context Menu */}
      {contextMenu && activeFileId && (() => {
        const node = findNodeById(files, contextMenu.fileRef);
        if (!node) return null;
        return (
          <div
            ref={menuRef}
            className="fixed bg-slate-800 border border-slate-700 rounded-lg shadow-2xl py-1 z-[9999] min-w-[200px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* File Operations */}
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
              Operations
            </div>
            
            <button
              onClick={handleNewFile}
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-slate-700 flex items-center gap-3 transition-colors"
            >
              <span className="text-base">📄</span>
              <span>New File...</span>
              <span className="ml-auto text-xs text-slate-500 keyboard-hint">Ctrl+N</span>
            </button>
            
            <button
              onClick={handleNewFolder}
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-slate-700 flex items-center gap-3 transition-colors"
            >
              <span className="text-base">📁</span>
              <span>New Folder...</span>
              <span className="ml-auto text-xs text-slate-500 keyboard-hint">Ctrl+Shift+N</span>
            </button>
            
            <div className="my-1 border-t border-slate-700"></div>
            
            <button
              onClick={handleRename}
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-slate-700 flex items-center gap-3 transition-colors"
            >
              <span className="text-base">✏️</span>
              <span>Rename...</span>
              <span className="ml-auto text-xs text-slate-500 keyboard-hint">F2</span>
            </button>
            
            <button
              onClick={handleDuplicate}
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-slate-700 flex items-center gap-3 transition-colors"
            >
              <span className="text-base">📋</span>
              <span>Duplicate...</span>
            </button>
            
            <button
              onClick={handleDelete}
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-slate-700 hover:text-red-400 flex items-center gap-3 transition-colors"
            >
              <span className="text-base">🗑️</span>
              <span>Delete...</span>
              <span className="ml-auto text-xs text-slate-500 keyboard-hint">Del</span>
            </button>
            
            <div className="my-1 border-t border-slate-700"></div>
            
            {/* File Info */}
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
              File Info
            </div>
            
            <div className="px-4 py-3 text-xs space-y-2 bg-slate-900/50">
              <div className="flex justify-between">
                <span className="text-slate-500">Name:</span>
                <span className="text-slate-200 font-medium">{node.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Type:</span>
                <span className="text-slate-200 capitalize">{node.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Size:</span>
                <span className="text-slate-200">
                  {node.content ? `${node.content.length.toLocaleString()} chars` : '0 chars'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Lines:</span>
                <span className="text-slate-200">
                  {node.content ? node.content.split('\n').length : 0}
                </span>
              </div>
            </div>
            
            <div className="my-1 border-t border-slate-700"></div>
            
            {/* Quick Actions */}
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase">
              Quick Actions
            </div>
            
            <button
              onClick={() => {
                if (activeFileId) {
                  navigator.clipboard.writeText(activeFileId);
                }
                setContextMenu(null);
              }}
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-slate-700 flex items-center gap-3 transition-colors"
            >
              <span className="text-base">📋</span>
              <span>Copy Path</span>
              <span className="ml-auto text-xs text-slate-500 keyboard-hint">Ctrl+Shift+C</span>
            </button>
            
            <button
              onClick={() => {
                const node = findNodeById(files, activeFileId || '');
                if (node?.content) {
                  navigator.clipboard.writeText(node.content);
                }
                setContextMenu(null);
              }}
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-slate-700 flex items-center gap-3 transition-colors"
            >
              <span className="text-base">📄</span>
              <span>Copy Content</span>
              <span className="ml-auto text-xs text-slate-500 keyboard-hint">Ctrl+A, Ctrl+C</span>
            </button>
            
            {activeFileId && activeFileId.endsWith('.dart') && (
              <>
                <button
                  onClick={() => {
                    runDartAnalyze();
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-slate-700 flex items-center gap-3 transition-colors"
                >
                  <span className="text-base">🔍</span>
                  <span>Run Dart Analyze</span>
                </button>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
};