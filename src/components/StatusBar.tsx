import React, { useState, useEffect } from 'react';
import { useStore, ProblemItem } from '../store/useStore';
import { GitBranch, AlertCircle, AlertTriangle, CheckCircle, Bell, PanelBottom, PanelRightOpen, PanelRightClose, RefreshCw, X } from 'lucide-react';

const StatusBar: React.FC = () => {
  const {
    files, activeFileId, editorTheme, fontSize, tabSize, notifications,
    showTerminal, setShowTerminal, showChat, setShowChat,
    problems, sidebarVisible, toggleSidebar,
    isAnalyzing, runDartAnalyze, dartAutoAnalyze, setDartAutoAnalyze,
  } = useStore();

  const [showErrorPopover, setShowErrorPopover] = useState(false);

  const activeFile = files.find((f) => f.id === activeFileId);
  const dirtyCount = files.filter((f) => f.isDirty).length;
  const fileCount = files.filter((f) => f.type === 'file').length;
  const errorCount = problems.filter(p => p.severity === 'error').length;
  const warnCount = problems.filter(p => p.severity === 'warning').length;
  const infoCount = problems.filter(p => p.severity === 'info').length;

  // Debug logging for status bar state
  useEffect(() => {
    if (errorCount > 0 || warnCount > 0 || infoCount > 0) {
      console.log('🔴 StatusBar - Problems Updated:', {
        totalProblems: problems.length,
        errors: errorCount,
        warnings: warnCount,
        info: infoCount,
        problems: problems.slice(0, 5), // Show first 5 problems
      });
    }
  }, [problems, errorCount, warnCount, infoCount]);

  // Group problems by file
  const fileGroups = problems.reduce<Record<string, ProblemItem[]>>((acc, p) => {
    const key = p.fileName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});
  const fileCount_withErrors = Object.keys(fileGroups).length;

  // Active file problems
  const activeFileProblems = activeFileId ? problems.filter(p => p.fileId === activeFileId) : [];
  const activeErrors = activeFileProblems.filter(p => p.severity === 'error').length;
  const activeWarnings = activeFileProblems.filter(p => p.severity === 'warning').length;

  const openProblemsPanel = () => {
    useStore.getState().setShowTerminal(true);
    useStore.getState().setBottomPanelTab('problems');
  };

  return (
    <div className="h-6 bg-[#007acc] flex items-center justify-between px-1 flex-shrink-0 select-none text-[11px] relative">
      <div className="flex items-center gap-0.5">
        {/* Git branch */}
        <button className="flex items-center gap-1.5 text-white/90 hover:bg-white/10 px-2 py-0.5 rounded transition-colors">
          <GitBranch size={12} />
          <span>main</span>
        </button>

        {/* Dirty files */}
        {dirtyCount > 0 && (
          <div className="flex items-center gap-1 text-yellow-200 px-2">
            <AlertCircle size={11} />
            <span>{dirtyCount} معدّل</span>
          </div>
        )}

        {/* File count */}
        <div className="flex items-center gap-1 text-white/70 px-2">
          <CheckCircle size={11} />
          <span>{fileCount} ملف</span>
        </div>

        {/* Analyzing indicator */}
        {isAnalyzing && (
          <div className="flex items-center gap-1.5 text-cyan-200 px-2 analysis-pulse">
            <RefreshCw size={10} />
            <span>يحلل...</span>
          </div>
        )}

        {/* Auto-analyze toggle */}
        <button
          onClick={() => setDartAutoAnalyze(!dartAutoAnalyze)}
          className={`px-2 py-0.5 rounded transition-colors ${
            dartAutoAnalyze ? 'text-green-200 hover:bg-white/10' : 'text-white/40 hover:bg-white/10'
          }`}
          title={dartAutoAnalyze ? 'التحليل التلقائي مفعل' : 'التحليل التلقائي معطل'}
        >
          {dartAutoAnalyze ? '●' : '○'} تلقائي
        </button>
      </div>

      <div className="flex items-center gap-0.5">
        {/* Problem indicators - Show all three types separately when they exist */}
        {problems.length > 0 ? (
          <div className="flex items-center gap-1 px-2 py-0.5 text-white/80">
            {/* Error indicator */}
            {errorCount > 0 && (
              <button
                onClick={() => {
                  openProblemsPanel();
                  setShowErrorPopover(true);
                }}
                onMouseEnter={() => setShowErrorPopover(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/15 transition-colors"
                title={`${errorCount} أخطاء`}
              >
                <AlertCircle size={11} className="text-red-400" />
                <span className="text-red-300 font-semibold">{errorCount}</span>
              </button>
            )}
            
            {/* Warning indicator */}
            {warnCount > 0 && (
              <button
                onClick={() => {
                  openProblemsPanel();
                  setShowErrorPopover(true);
                }}
                onMouseEnter={() => setShowErrorPopover(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/15 transition-colors"
                title={`${warnCount} تحذيرات`}
              >
                <AlertTriangle size={11} className="text-yellow-400" />
                <span className="text-yellow-300 font-semibold">{warnCount}</span>
              </button>
            )}
            
            {/* Info indicator */}
            {infoCount > 0 && (
              <button
                onClick={() => {
                  openProblemsPanel();
                  setShowErrorPopover(true);
                }}
                onMouseEnter={() => setShowErrorPopover(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/15 transition-colors"
                title={`${infoCount} معلومات`}
              >
                <span className="text-blue-400 font-semibold">ℹ️</span>
                <span className="text-blue-300 font-semibold">{infoCount}</span>
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              openProblemsPanel();
              setShowErrorPopover(!showErrorPopover);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="لا توجد مشاكل"
          >
            <CheckCircle size={11} />
            <span>0</span>
          </button>
        )}

        {/* Error Popover - Shared for all problem types */}
        <div className="relative">
          {showErrorPopover && problems.length > 0 && (
            <div
              className="absolute bottom-7 right-0 w-80 bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg shadow-2xl z-50 overflow-hidden"
              onMouseLeave={() => setShowErrorPopover(false)}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#3c3c3c]">
                <div className="flex items-center gap-3">
                  {errorCount > 0 && <span className="text-red-400 text-[11px] flex items-center gap-1"><AlertCircle size={11} /> {errorCount} خطأ</span>}
                  {warnCount > 0 && <span className="text-yellow-400 text-[11px] flex items-center gap-1"><AlertTriangle size={11} /> {warnCount} تحذير</span>}
                  {infoCount > 0 && <span className="text-blue-400 text-[11px] flex items-center gap-1">ℹ️ {infoCount}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                       e.stopPropagation();
                       runDartAnalyze();
                     }}
                    className="p-1 text-[#6c6c6c] hover:text-white hover:bg-[#3c3c3c] rounded"
                    title="إعادة التحليل"
                  >
                    <RefreshCw size={11} />
                  </button>
                  <button
                    onClick={() => setShowErrorPopover(false)}
                    className="p-1 text-[#6c6c6c] hover:text-white hover:bg-[#3c3c3c] rounded"
                  >
                    <X size={11} />
                  </button>
                </div>
              </div>

              {/* Severity bar */}
              <div className="flex h-1.5">
                {errorCount > 0 && (
                  <div className="bg-red-500" style={{ width: `${(errorCount / problems.length) * 100}%` }} />
                )}
                {warnCount > 0 && (
                  <div className="bg-yellow-500" style={{ width: `${(warnCount / problems.length) * 100}%` }} />
                )}
                {infoCount > 0 && (
                  <div className="bg-blue-500" style={{ width: `${(infoCount / problems.length) * 100}%` }} />
                )}
              </div>

              {/* Active file errors */}
              {activeFile && activeFileProblems.length > 0 && (
                <div className="border-b border-[#3c3c3c]">
                  <div className="px-3 py-1.5 bg-[#1a1a2e]">
                    <span className="text-[10px] text-cyan-400 font-semibold">📄 {activeFile.name}</span>
                    <span className="text-[10px] text-[#6c6c6c] mr-2">
                      {activeErrors > 0 && <span className="text-red-400">{activeErrors}E </span>}
                      {activeWarnings > 0 && <span className="text-yellow-400">{activeWarnings}W </span>}
                    </span>
                  </div>
                  {activeFileProblems.slice(0, 5).map(p => (
                    <div
                      key={p.id}
                      onClick={() => openProblemsPanel()}
                      className="flex items-start gap-2 px-3 py-1 hover:bg-[#2d2d2d] cursor-pointer transition-colors"
                    >
                      {p.severity === 'error' ? <AlertCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" /> :
                       p.severity === 'warning' ? <AlertTriangle size={12} className="text-yellow-400 mt-0.5 flex-shrink-0" /> :
                       <span className="text-blue-400 text-[10px] mt-0.5 flex-shrink-0">ℹ️</span>}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-[#ccc] truncate">{p.message}</p>
                        <span className="text-[9px] text-[#6c6c6c]">Ln {p.line}, Col {p.column}</span>
                      </div>
                    </div>
                  ))}
                  {activeFileProblems.length > 5 && (
                    <div className="px-3 py-1 text-[10px] text-[#007acc] hover:text-white cursor-pointer" onClick={openProblemsPanel}>
                      +{activeFileProblems.length - 5} مشاكل أخرى...
                    </div>
                  )}
                </div>
              )}

              {/* All files summary */}
              <div className="max-h-[150px] overflow-y-auto">
                {Object.entries(fileGroups)
                  .sort(([,a], [,b]) => {
                    const aErr = a.filter(p => p.severity === 'error').length;
                    const bErr = b.filter(p => p.severity === 'error').length;
                    return bErr - aErr;
                  })
                  .map(([fileName, probs]) => {
                    const fErr = probs.filter(p => p.severity === 'error').length;
                    const fWarn = probs.filter(p => p.severity === 'warning').length;
                    const fInfo = probs.filter(p => p.severity === 'info').length;
                    return (
                      <div
                        key={fileName}
                        onClick={() => {
                          const file = files.find(f => f.name === fileName);
                          if (file) {
                            useStore.getState().openTab(file.id);
                            useStore.getState().setActiveFile(file.id);
                          }
                          openProblemsPanel();
                          setShowErrorPopover(false);
                        }}
                        className="flex items-center justify-between px-3 py-1 hover:bg-[#2d2d2d] cursor-pointer transition-colors"
                      >
                        <span className="text-[11px] text-[#ccc] truncate max-w-[180px]">{fileName}</span>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          {fErr > 0 && <span className="text-red-400">{fErr}E</span>}
                          {fWarn > 0 && <span className="text-yellow-400">{fWarn}W</span>}
                          {fInfo > 0 && <span className="text-blue-400">{fInfo}I</span>}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Footer */}
              <div className="px-3 py-1.5 bg-[#252526] border-t border-[#3c3c3c] text-[10px] text-[#6c6c6c]">
                {fileCount_withErrors} ملف من أصل {fileCount} يحتوي مشاكل
              </div>
            </div>
          )}
        </div>

        {/* Sidebar toggle */}
        <button
          onClick={toggleSidebar}
          className="text-white/70 hover:text-white hover:bg-white/10 px-1.5 py-0.5 rounded transition-colors"
          title={sidebarVisible ? 'إخفاء الشريط الجانبي' : 'إظهار الشريط الجانبي'}
        >
          {sidebarVisible ? <PanelRightOpen size={12} style={{ transform: 'scaleX(-1)' }} /> : <PanelRightClose size={12} style={{ transform: 'scaleX(-1)' }} />}
        </button>

        {/* Bottom panel toggle */}
        <button
          onClick={() => setShowTerminal(!showTerminal)}
          className="text-white/80 hover:text-white hover:bg-white/10 px-1.5 py-0.5 rounded transition-colors flex items-center gap-1"
          title={showTerminal ? 'إخفاء الأسفل' : 'إظهار الأسفل'}
        >
          <PanelBottom size={12} />
        </button>

        {/* AI Chat toggle */}
        <button
          onClick={() => setShowChat(!showChat)}
          className={`px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 ${
            showChat ? 'text-white bg-white/15' : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
          title={showChat ? 'إخفاء AI' : 'إظهار AI'}
        >
          🤖
        </button>

        {/* File info */}
        {activeFile && (
          <>
            <span className="text-white/70 px-1">|</span>
            <span className="text-white/80">{activeFile.language || 'plaintext'}</span>
            <span className="text-white/60">UTF-8</span>
            <span className="text-white/60">Tabs: {tabSize}</span>
            <span className="text-white/60">{fontSize}px</span>
            <span className="text-white/60">{editorTheme === 'vs-dark' ? 'داكن' : editorTheme === 'vs-light' ? 'فاتح' : 'عالي التباين'}</span>
          </>
        )}

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-1 text-white/80 px-1">
            <Bell size={11} />
            <span>{notifications.length}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusBar;
