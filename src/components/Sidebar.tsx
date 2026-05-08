import React, { useState, useRef } from 'react';
import {
  ChevronRight, ChevronDown, File, Folder, FolderOpen,
  Trash2, Edit3, FilePlus, FolderPlus, Search, Replace,
  Regex, CaseSensitive, Download, Upload, RotateCcw,
  Copy, Clipboard,
} from 'lucide-react';
import { useStore, FileNode } from '../store/useStore';
import ExtensionsPanel from './ExtensionsPanel';
import { showContextMenu, ContextMenuItem } from './ContextMenu';

const languageIcons: Record<string, string> = {
  html: '🌐', css: '🎨', javascript: '🟨', typescript: '🔷',
  python: '🐍', json: '📋', markdown: '📝', tsx: '⚛️', jsx: '⚛️',
};

const getLanguageFromName = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    html: 'html', css: 'css', js: 'javascript', ts: 'typescript',
    tsx: 'typescript', jsx: 'javascript', py: 'python', json: 'json', md: 'markdown',
  };
  return map[ext] || 'plaintext';
};

const getFileIcon = (name: string) => languageIcons[getLanguageFromName(name)] || '📄';

// File Explorer Panel
const ExplorerPanel: React.FC = () => {
  const { files, addFileToFolder, exportProject, importProject, resetProject, openRealFolder } = useStore();
  const [showNewRoot, setShowNewRoot] = useState<'file' | 'folder' | null>(null);
  const [newRootName, setNewRootName] = useState('');
  const [filterText, setFilterText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const rootItems = files.filter((f) => f.parentId === null);

  const handleAddRoot = (type: 'file' | 'folder') => {
    if (!newRootName.trim()) return;
    // Find the root folder to add to
    const rootFolder = files.find((f) => f.type === 'folder' && f.parentId === null);
    if (rootFolder) {
      addFileToFolder(rootFolder.id, newRootName.trim(), type);
    } else {
      // If no root folder, create as root-level
      addFileToFolder('', newRootName.trim(), type);
    }
    setNewRootName('');
    setShowNewRoot(null);
  };

  const handleExport = () => {
    const json = exportProject();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      importProject(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleOpenFolder = () => {
    folderInputRef.current?.click();
  };

  const handleFolderImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    useStore.getState().importFolderFromDevice(files);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 text-[11px] font-semibold text-[#bbbbbb] uppercase tracking-wider flex items-center justify-between">
        <span>مستكشف الملفات</span>
        <div className="flex gap-0.5">
          <button onClick={() => setShowNewRoot('file')} className="p-1 hover:bg-[#3c3c3c] rounded text-[#858585] hover:text-white" title="ملف جديد">
            <FilePlus size={13} />
          </button>
          <button onClick={() => setShowNewRoot('folder')} className="p-1 hover:bg-[#3c3c3c] rounded text-[#858585] hover:text-white" title="مجلد جديد">
            <FolderPlus size={13} />
          </button>
          <button onClick={() => setFilterText(filterText ? '' : ' ')} className="p-1 hover:bg-[#3c3c3c] rounded text-[#858585] hover:text-white" title="تصفية">
            <Search size={13} />
          </button>
        </div>
      </div>

      {filterText !== '' && (
        <div className="px-2 pb-1">
          <input
            autoFocus
            value={filterText === ' ' ? '' : filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="تصفية الملفات..."
            className="w-full bg-[#3c3c3c] text-white text-[12px] px-2 py-1 rounded outline-none border border-[#3c3c3c] focus:border-[#007acc]"
          />
        </div>
      )}

      {showNewRoot && (
        <div className="flex items-center gap-1 px-3 py-1">
          {showNewRoot === 'file' ? <File size={12} className="text-gray-400" /> : <Folder size={12} className="text-[#dcb67a]" />}
          <input
            autoFocus
            value={newRootName}
            onChange={(e) => setNewRootName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddRoot(showNewRoot);
              if (e.key === 'Escape') { setShowNewRoot(null); setNewRootName(''); }
            }}
            onBlur={() => { if (!newRootName.trim()) { setShowNewRoot(null); setNewRootName(''); } }}
            placeholder={showNewRoot === 'file' ? 'اسم الملف...' : 'اسم المجلد...'}
            className="flex-1 bg-[#3c3c3c] text-white text-[12px] px-1.5 py-0.5 rounded outline-none border border-[#007acc]"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {rootItems.map((file) => (
          <FileItem key={file.id} file={file} depth={0} allFiles={files} filter={filterText.trim()} />
        ))}
      </div>

      {/* Bottom actions */}
      <div className="border-t border-[#3c3c3c] p-1.5 flex items-center justify-center gap-1">
        <button
          onClick={openRealFolder}
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#858585] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
          title="فتح مجلد حقيقي من الجهاز (Native File System)"
        >
          <FolderOpen size={11} />
          فتح مجلد حقيقي
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#858585] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
          title="تصدير المشروع"
        >
          <Download size={11} />
          تصدير
        </button>
        <button
          onClick={handleImport}
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#858585] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
          title="استيراد مشروع"
        >
          <Upload size={11} />
          استيراد
        </button>
        <button
          onClick={() => { if (confirm('هل أنت متأكد من إعادة تعيين المشروع؟ سيتم حذف جميع التغييرات.')) resetProject(); }}
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#858585] hover:text-[#f44747] hover:bg-[#3c3c3c] rounded transition-colors"
          title="إعادة تعيين"
        >
          <RotateCcw size={11} />
          تعيين
        </button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileImport} className="hidden" />
        <input
          ref={folderInputRef}
          type="file"
          onChange={handleFolderImport}
          className="hidden"
          /* @ts-expect-error webkitdirectory is not in the types */
          webkitdirectory=""
          directory=""
          multiple
        />
      </div>
    </div>
  );
};

interface FileItemProps {
  file: FileNode;
  depth: number;
  allFiles: FileNode[];
  filter?: string;
}

const FileItem: React.FC<FileItemProps> = ({ file, depth, allFiles, filter }) => {
  const { activeFileId, expandedFolders, openTab, deleteFile, renameFile, toggleFolder, addFileToFolder } = useStore();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenaming] = useState(file.name);
  const [showNewInput, setShowNewInput] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const isExpanded = expandedFolders.has(file.id);
  const isActive = activeFileId === file.id;
  const childFiles = allFiles.filter((f) => f.parentId === file.id);

  if (filter && file.type === 'file' && !file.name.toLowerCase().includes(filter.toLowerCase())) return null;

  const handleRename = () => {
    if (renameValue.trim() && renameValue !== file.name) {
      renameFile(file.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  const handleAddItem = (type: 'file' | 'folder') => {
    if (!newItemName.trim()) return;
    addFileToFolder(file.type === 'folder' ? file.id : (file.parentId || ''), newItemName.trim(), type);
    setNewItemName('');
    setShowNewInput(null);
  };

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-[2px] cursor-pointer text-[13px] relative transition-colors duration-75
          ${isActive && file.type === 'file' ? 'bg-[#094771] text-white' : isDragOver ? 'bg-[#094771]/30' : 'hover:bg-[#2a2d2e] text-[#cccccc]'}
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => {
          if (file.type === 'folder') toggleFolder(file.id);
          else openTab(file.id);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          const items: ContextMenuItem[] = [];
          if (file.type === 'file') {
            items.push({ label: 'فتح الملف', icon: <File size={12} />, action: () => openTab(file.id) });
            items.push({ separator: true });
            items.push({ label: 'نسخ الاسم', icon: <Copy size={12} />, action: () => navigator.clipboard.writeText(file.name) });
            items.push({ label: 'نسخ المحتوى', icon: <Clipboard size={12} />, action: () => navigator.clipboard.writeText(file.content || '') });
            items.push({ separator: true });
          } else {
            items.push({ label: 'ملف جديد', icon: <FilePlus size={12} />, action: () => setShowNewInput('file') });
            items.push({ label: 'مجلد جديد', icon: <FolderPlus size={12} />, action: () => setShowNewInput('folder') });
            items.push({ separator: true });
          }
          items.push({ label: 'إعادة تسمية', icon: <Edit3 size={12} />, action: () => { setIsRenaming(true); setRenaming(file.name); } });
          items.push({ label: `حذف ${file.name}`, icon: <Trash2 size={12} />, action: () => { if (confirm(`حذف ${file.name}؟`)) deleteFile(file.id); }, danger: true });
          showContextMenu(e, items);
        }}
        onDragOver={(e) => { e.preventDefault(); if (file.type === 'folder') setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const dragFileId = e.dataTransfer.getData('fileId');
          if (dragFileId && file.type === 'folder' && dragFileId !== file.id) {
            useStore.getState().moveFile(dragFileId, file.id);
          }
        }}
        draggable={file.type === 'file'}
        onDragStart={(e) => {
          e.dataTransfer.setData('fileId', file.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
      >
        {file.type === 'folder' ? (
          <span className="flex items-center gap-0.5 text-[#c4c4c4]">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {isExpanded ? <FolderOpen size={14} className="text-[#dcb67a]" /> : <Folder size={14} className="text-[#dcb67a]" />}
          </span>
        ) : (
          <span className="w-[22px] text-center text-[13px] flex-shrink-0">{getFileIcon(file.name)}</span>
        )}

        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenaming(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            className="bg-[#3c3c3c] text-white text-[12px] px-1.5 rounded outline-none flex-1 min-w-0 border border-[#007acc]"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate">{file.name}</span>
        )}

        {file.isDirty && <span className="w-2 h-2 rounded-full bg-[#007acc] flex-shrink-0" />}

        <div className="hidden group-hover:flex gap-0.5 ml-1 flex-shrink-0">
          {file.type === 'folder' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setShowNewInput('file'); }} className="p-0.5 hover:text-white rounded" title="ملف جديد">
                <FilePlus size={12} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setShowNewInput('folder'); }} className="p-0.5 hover:text-white rounded" title="مجلد جديد">
                <FolderPlus size={12} />
              </button>
            </>
          )}
          <button onClick={(e) => { e.stopPropagation(); setIsRenaming(true); setRenaming(file.name); }} className="p-0.5 hover:text-white rounded" title="إعادة تسمية">
            <Edit3 size={12} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); if (confirm(`حذف ${file.name}؟`)) deleteFile(file.id); }} className="p-0.5 hover:text-red-400 rounded" title="حذف">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* New item input */}
      {showNewInput && (
        <div className="flex items-center gap-1" style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}>
          {showNewInput === 'file' ? <File size={12} className="text-gray-400 flex-shrink-0" /> : <Folder size={12} className="text-[#dcb67a] flex-shrink-0" />}
          <input
            autoFocus
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddItem(showNewInput);
              if (e.key === 'Escape') { setShowNewInput(null); setNewItemName(''); }
            }}
            onBlur={() => { if (!newItemName.trim()) { setShowNewInput(null); setNewItemName(''); } }}
            placeholder={showNewInput === 'file' ? 'اسم الملف...' : 'اسم المجلد...'}
            className="flex-1 bg-[#3c3c3c] text-white text-[12px] px-1.5 py-0.5 rounded outline-none border border-[#007acc]"
          />
        </div>
      )}

      {/* Children */}
      {file.type === 'folder' && isExpanded && childFiles.map((child) => (
        <FileItem key={child.id} file={child} depth={depth + 1} allFiles={allFiles} filter={filter} />
      ))}
    </div>
  );
};

// Search Panel
const SearchPanel: React.FC = () => {
  const {
    searchQuery, setSearchQuery, replaceQuery, setReplaceQuery,
    searchResults, performSearch, performReplaceAll,
    searchUseRegex, toggleSearchRegex, searchCaseSensitive, toggleSearchCaseSensitive,
    openTab,
  } = useStore();

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 text-[11px] font-semibold text-[#bbbbbb] uppercase tracking-wider">بحث واستبدال</div>

      <div className="px-2 space-y-1.5">
        <div className="flex items-center gap-1">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') performSearch(); }}
            placeholder="بحث..."
            className="flex-1 bg-[#3c3c3c] text-white text-[12px] px-2 py-1 rounded outline-none border border-[#3c3c3c] focus:border-[#007acc]"
          />
          <button onClick={toggleSearchRegex} className={`p-1 rounded ${searchUseRegex ? 'text-[#007acc] bg-[#007acc]/20' : 'text-[#6c6c6c] hover:text-white'}`}>
            <Regex size={13} />
          </button>
          <button onClick={toggleSearchCaseSensitive} className={`p-1 rounded ${searchCaseSensitive ? 'text-[#007acc] bg-[#007acc]/20' : 'text-[#6c6c6c] hover:text-white'}`}>
            <CaseSensitive size={13} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <input
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            placeholder="استبدال بـ..."
            className="flex-1 bg-[#3c3c3c] text-white text-[12px] px-2 py-1 rounded outline-none border border-[#3c3c3c] focus:border-[#007acc]"
          />
          <button onClick={performReplaceAll} className="p-1 text-[#6c6c6c] hover:text-[#007acc]" title="استبدال الكل">
            <Replace size={13} />
          </button>
        </div>
        <button
          onClick={performSearch}
          className="w-full bg-[#007acc] hover:bg-[#0098ff] text-white text-[12px] py-1.5 rounded transition-colors flex items-center justify-center gap-1"
        >
          <Search size={13} />
          بحث
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="flex-1 overflow-y-auto mt-2">
          <div className="px-3 py-1 text-[11px] text-[#6c6c6c]">
            {searchResults.length} نتيجة
          </div>
          {searchResults.map((result, i) => (
            <div
              key={i}
              className="px-3 py-1 hover:bg-[#2a2d2e] cursor-pointer text-[12px] text-[#cccccc]"
              onClick={() => openTab(result.fileId)}
            >
              <div className="text-[#007acc] text-[11px]">{result.fileName}:{result.line}</div>
              <div className="truncate text-[#858585]">{result.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Git Panel
const GitPanel: React.FC = () => {
  const { files } = useStore();
  const dirtyFiles = files.filter((f) => f.isDirty);
  const allFiles = files.filter((f) => f.type === 'file');

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 text-[11px] font-semibold text-[#bbbbbb] uppercase tracking-wider">التحكم بالإصدارات</div>

      {dirtyFiles.length > 0 ? (
        <div className="px-3">
          <div className="text-[11px] text-[#6c6c6c] mb-2">ملفات معدّلة ({dirtyFiles.length})</div>
          {dirtyFiles.map((f) => (
            <div key={f.id} className="flex items-center gap-2 py-1 text-[12px]">
              <span className="text-[#f44747] text-[10px] font-mono">M</span>
              <span className="text-[#cccccc]">{f.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-3 py-4 text-center text-[#3c3c3c] text-[12px]">
          لا توجد تغييرات
        </div>
      )}

      <div className="mt-auto border-t border-[#3c3c3c] p-3">
        <div className="text-[11px] text-[#6c6c6c]">
          📊 {allFiles.length} ملف • {dirtyFiles.length} معدّل
        </div>
      </div>
    </div>
  );
};

// Main Sidebar
const Sidebar: React.FC = () => {
  const { activePanel } = useStore();

  return (
    <div className="flex flex-col h-full bg-[#252526]">
      {activePanel === 'explorer' && <ExplorerPanel />}
      {activePanel === 'search' && <SearchPanel />}
      {activePanel === 'git' && <GitPanel />}
      {activePanel === 'extensions' && <ExtensionsPanel />}
    </div>
  );
};

export default Sidebar;
