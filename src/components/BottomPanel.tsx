import React, { useRef, useEffect, useState } from 'react';
import {
  Terminal as TerminalIcon, Trash2, Copy,
  AlertTriangle, AlertCircle, Info, FileText, X,
  Bug, ChevronRight, ExternalLink, Wrench,
  Cpu, Shield, CheckCircle2, XCircle,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { ProblemItem } from '../store/types/models';
import { showContextMenu, ContextMenuItem } from './ContextMenu';
import TerminalComponent from './Terminal';

// ─── Problems Tab ──────────────────────────────────────
const ProblemsTab: React.FC = () => {
  const {
    problems, setActiveFile, openTab, files,
    fixProblemWithAI, fixAllProblemsWithAI, isFixingWithAI,
    isAnalyzing, apiKey, dartIssues,
    smartFixAll, isSmartFixing, smartFixReport, smartFixLog,
    clearSmartFixReport,
  } = useStore();

  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupByFile, setGroupByFile] = useState(false);

  const errorCount = problems.filter(p => p.severity === 'error').length;
  const warnCount = problems.filter(p => p.severity === 'warning').length;
  const infoCount = problems.filter(p => p.severity === 'info').length;

  // Filter + search
  let filtered = filter === 'all' ? problems : problems.filter(p => p.severity === filter);
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      p.message.toLowerCase().includes(q) ||
      p.fileName.toLowerCase().includes(q) ||
      p.source.toLowerCase().includes(q)
    );
  }

  const handleClick = (p: ProblemItem) => {
    openTab(p.fileId);
    setActiveFile(p.fileId);
  };

  const isDartIssue = (p: ProblemItem) => p.source.startsWith('dart:');

  const getSeverityIcon = (s: string) => {
    switch (s) {
      case 'error': return <AlertCircle size={14} className="text-red-400" />;
      case 'warning': return <AlertTriangle size={14} className="text-yellow-400" />;
      default: return <Info size={14} className="text-blue-400" />;
    }
  };

  const getSeverityColor = (s: string) => {
    switch (s) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-blue-400';
    }
  };

  const copyProblemText = (p: ProblemItem) => {
    const file = files.find(f => f.id === p.fileId);
    const text = `[${p.severity.toUpperCase()}] ${p.message}\n  at ${file?.name || p.fileName}:${p.line}:${p.column}\n  Source: ${p.source}`;
    navigator.clipboard.writeText(text);
    useStore.getState().addNotification({ id: Date.now().toString(), type: 'success', message: 'تم نسخ الخطأ' });
  };

  const copyAllProblems = () => {
    const text = problems.map(p => {
      const file = files.find(f => f.id === p.fileId);
      return `[${p.severity.toUpperCase()}] ${p.message}\n  at ${file?.name || p.fileName}:${p.line}:${p.column}\n  Source: ${p.source}`;
    }).join('\n\n');
    navigator.clipboard.writeText(text);
    useStore.getState().addNotification({ id: Date.now().toString(), type: 'success', message: `تم نسخ ${problems.length} مشكلة` });
  };

  const handleProblemContextMenu = (e: React.MouseEvent, p: ProblemItem) => {
    const items: ContextMenuItem[] = [
      { label: 'نسخ الخطأ', icon: <Copy size={12} />, action: () => copyProblemText(p) },
      { label: 'الذهاب للملف', icon: <ExternalLink size={12} />, action: () => handleClick(p) },
    ];
    if (isDartIssue(p) && apiKey) {
      items.push({ separator: true });
      items.push({ label: '🤖 إصلاح بـ AI', icon: <Wrench size={12} />, action: () => fixProblemWithAI(p.id) });
    }
    showContextMenu(e, items);
  };

  const handleBulkContextMenu = (e: React.MouseEvent) => {
    const items: ContextMenuItem[] = [
      { label: `نسخ الكل (${problems.length})`, icon: <Copy size={12} />, action: copyAllProblems },
    ];
    if (apiKey && dartIssues.length > 0) {
      items.push({ separator: true });
      items.push({ label: `🤖 إصلاح الكل بـ AI (${dartIssues.length})`, action: () => fixAllProblemsWithAI() });
    }
    showContextMenu(e, items);
  };

  // Group problems by file
  const groupedProblems: Record<string, ProblemItem[]> = {};
  filtered.forEach(p => {
    if (!groupedProblems[p.fileName]) groupedProblems[p.fileName] = [];
    groupedProblems[p.fileName].push(p);
  });

  return (
    <div className="flex flex-col h-full">
      {/* Severity distribution bar */}
      {problems.length > 0 && (
        <div className="flex h-1">
          {errorCount > 0 && <div className="bg-red-500 transition-all duration-300" style={{ width: `${(errorCount / problems.length) * 100}%` }} />}
          {warnCount > 0 && <div className="bg-yellow-500 transition-all duration-300" style={{ width: `${(warnCount / problems.length) * 100}%` }} />}
          {infoCount > 0 && <div className="bg-blue-500 transition-all duration-300" style={{ width: `${(infoCount / problems.length) * 100}%` }} />}
        </div>
      )}

      {/* Search bar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-[#2d2d2d] bg-[#1e1e1e]">
        <div className="flex-1 flex items-center gap-1 bg-[#2d2d2d] rounded px-2 py-0.5">
          <span className="text-[#6c6c6c] text-[10px]">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في المشاكل..."
            className="flex-1 bg-transparent text-[11px] text-[#ccc] outline-none placeholder-[#4c4c4c]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[#6c6c6c] hover:text-white">
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-[#2d2d2d] bg-[#1e1e1e]" onContextMenu={handleBulkContextMenu}>
        <div className="flex items-center gap-1">
          <button onClick={() => setFilter('all')} className={`px-2 py-0.5 rounded text-[11px] transition-colors ${filter === 'all' ? 'bg-[#3c3c3c] text-white' : 'text-[#6c6c6c] hover:text-white'}`}>
            الكل ({problems.length})
          </button>
          <button onClick={() => setFilter('error')} className={`px-2 py-0.5 rounded text-[11px] transition-colors ${filter === 'error' ? 'bg-red-900/30 text-red-400' : 'text-[#6c6c6c] hover:text-white'}`}>
            🔴 {errorCount}
          </button>
          <button onClick={() => setFilter('warning')} className={`px-2 py-0.5 rounded text-[11px] transition-colors ${filter === 'warning' ? 'bg-yellow-900/30 text-yellow-400' : 'text-[#6c6c6c] hover:text-white'}`}>
            🟡 {warnCount}
          </button>
          <button onClick={() => setFilter('info')} className={`px-2 py-0.5 rounded text-[11px] transition-colors ${filter === 'info' ? 'bg-blue-900/30 text-blue-400' : 'text-[#6c6c6c] hover:text-white'}`}>
            🔵 {infoCount}
          </button>
          <span className="text-[#2d2d2d] mx-1">|</span>
          <button
            onClick={() => setGroupByFile(!groupByFile)}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${groupByFile ? 'bg-[#3c3c3c] text-white' : 'text-[#6c6c6c] hover:text-white'}`}
            title="تجميع حسب الملف"
          >
            📁 ملف
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {problems.length > 0 && (
            <button
              onClick={copyAllProblems}
              className="p-1 text-[#6c6c6c] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
              title="نسخ كل المشاكل"
            >
              <Copy size={12} />
            </button>
          )}
          {apiKey && (dartIssues.length > 0 || problems.length > 0) && (
            <button
              onClick={() => smartFixAll()}
              disabled={isSmartFixing || isFixingWithAI}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
                isSmartFixing
                  ? 'bg-gradient-to-r from-[#007acc]/50 to-[#6a0dad]/50 text-white/70 cursor-wait'
                  : 'bg-gradient-to-r from-[#007acc] to-[#6a0dad] text-white hover:from-[#0098ff] hover:to-[#8b5cf6] shadow-lg'
              }`}
            >
              {isSmartFixing ? (
                <>
                  <Cpu size={12} className="animate-pulse" />
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Smart Fix...
                </>
              ) : (
                <><Cpu size={12} /> Smart Fix</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Smart Fix Progress */}
      {isSmartFixing && smartFixLog.length > 0 && (
        <div className="border-t border-[#007acc]/20 bg-[#0a1628]">
          <div className="flex items-center gap-2 px-3 py-1.5">
            <Cpu size={11} className="text-[#007acc] animate-pulse" />
            <span className="text-[11px] text-[#8cb4d8] font-medium">Smart Fix يعمل...</span>
            <div className="flex-1 h-1 bg-[#1a2a3a] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#007acc] to-[#6a0dad] rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
          <div className="px-3 pb-1.5 max-h-[50px] overflow-y-auto">
            {smartFixLog.slice(-4).map((log, i) => (
              <div key={i} className="text-[10px] text-[#4a6a8a] font-mono truncate">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Smart Fix Report */}
      {smartFixReport && !isSmartFixing && (() => {
        const r = smartFixReport as any;
        const isNewFormat = r.phases !== undefined;
        return (
          <div className="border-t border-[#007acc]/20 bg-[#0a1628]">
            <div className="flex items-center justify-between px-3 py-1.5">
              <div className="flex items-center gap-2">
                <Shield size={11} className="text-[#007acc]" />
                <span className="text-[11px] text-[#8cb4d8] font-semibold">📊 تقرير Smart Fix</span>
                {isNewFormat && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    r.status === 'success' ? 'bg-green-500/20 text-green-400' :
                    r.status === 'partial' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {r.status === 'success' ? '✅ نجاح' : r.status === 'partial' ? '⚠️ جزئي' : '❌ فشل'}
                  </span>
                )}
              </div>
              <button onClick={clearSmartFixReport} className="p-0.5 text-[#4a6a8a] hover:text-white transition-colors">
                <X size={11} />
              </button>
            </div>
            <div className="px-3 pb-2 text-[10px] font-mono space-y-0.5 max-h-[120px] overflow-y-auto">
              {isNewFormat ? (
                <>
                  <div className="flex items-center gap-3 py-0.5 flex-wrap">
                    <span className="text-[#4a6a8a]">🔄 محاولات: {r.totalIterations}</span>
                    <span className="text-green-400 flex items-center gap-1">
                      <CheckCircle2 size={10} /> {r.fileResults?.filter((f: any) => f.success).length || 0} نجح
                    </span>
                    <span className="text-red-400 flex items-center gap-1">
                      <XCircle size={10} /> {r.errorLog?.length || 0} أخطاء
                    </span>
                    <span className="text-[#666]">🐛 قبل: {r.issuesBefore} → بعد: {r.issuesAfter}</span>
                  </div>
                  {r.fileResults?.slice(-8).map((f: any, i: number) => (
                    <div key={i} className={`truncate ${f.success ? 'text-green-400/70' : 'text-red-400/70'}`}>
                      {f.success ? '✅' : '❌'} {f.action === 'created' ? '📄' : '✏️'} {f.fileName} {f.error ? `— ${f.error}` : ''}
                    </div>
                  ))}
                  {r.errorLog?.slice(-3).map((e: any, i: number) => (
                    <div key={`err-${i}`} className="truncate text-red-400/50">❌ {e.message}</div>
                  ))}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 py-0.5">
                    <span className="text-green-400 flex items-center gap-1"><CheckCircle2 size={10} /> {r.successful} نجح</span>
                    <span className="text-red-400 flex items-center gap-1"><XCircle size={10} /> {r.failed} فشل</span>
                    <span className="text-[#666]">⏭️ {r.skipped} تخطي</span>
                    <span className="text-[#666]">🔄 {r.totalAttempts} محاولة</span>
                  </div>
                  {r.attempts?.slice(-8).map((a: any, i: number) => (
                    <div key={i} className={`truncate ${a.status === 'success' ? 'text-green-400/70' : a.status === 'failed' ? 'text-red-400/70' : 'text-[#4a6a8a]'}`}>
                      {a.status === 'success' ? '✅' : '❌'} {a.fileName}:{a.line} — {a.issueMessage} (محاولة {a.attemptNumber})
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* Problems list */}
      <div className="flex-1 overflow-y-auto select-text">
        {isAnalyzing ? (
          <div className="flex items-center justify-center gap-2 py-6 text-[#6c6c6c]">
            <span className="w-4 h-4 border-2 border-[#007acc]/30 border-t-[#007acc] rounded-full animate-spin" />
            <span className="text-[12px]">جاري التحليل...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#3c3c3c]">
            <CheckCircle2 size={32} className="mb-2 opacity-30" />
            <p className="text-[13px]">{searchQuery ? 'لا توجد نتائج' : 'لا توجد مشاكل ✨'}</p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[11px] text-[#007acc] hover:text-[#0098ff] mt-1">
                مسح البحث
              </button>
            )}
          </div>
        ) : groupByFile ? (
          // Grouped view
          <div>
            {Object.entries(groupedProblems)
              .sort(([,a], [,b]) => {
                const aErr = a.filter(p => p.severity === 'error').length;
                const bErr = b.filter(p => p.severity === 'error').length;
                return bErr - aErr || b.length - a.length;
              })
              .map(([fileName, probs]) => {
                const fErr = probs.filter(p => p.severity === 'error').length;
                const fWarn = probs.filter(p => p.severity === 'warning').length;
                const fInfo = probs.filter(p => p.severity === 'info').length;
                return (
                  <div key={fileName} className="border-b border-[#2d2d2d]">
                    {/* File header */}
                    <div
                      className="flex items-center justify-between px-3 py-1 bg-[#1a1a1a] hover:bg-[#222] cursor-pointer"
                      onClick={() => {
                        const file = files.find(f => f.name === fileName);
                        if (file) {
                          openTab(file.id);
                          setActiveFile(file.id);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={12} className="text-[#6c6c6c]" />
                        <span className="text-[11px] text-[#ccc] font-medium">{fileName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        {fErr > 0 && <span className="text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">{fErr}E</span>}
                        {fWarn > 0 && <span className="text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded">{fWarn}W</span>}
                        {fInfo > 0 && <span className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">{fInfo}I</span>}
                      </div>
                    </div>
                    {/* Problems for this file */}
                    {probs.map(p => (
                      <div
                        key={p.id}
                        className="group"
                        onMouseEnter={() => setHoveredId(p.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        <div
                          onClick={() => handleClick(p)}
                          onContextMenu={(e) => handleProblemContextMenu(e, p)}
                          className="flex items-start gap-2.5 px-3 py-1 pr-8 text-left hover:bg-[#2d2d2d] transition-colors cursor-pointer"
                        >
                          {getSeverityIcon(p.severity)}
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] text-[#cccccc] break-words">{p.message}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-[#4c4c4c]">Ln {p.line}, Col {p.column}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded ${getSeverityColor(p.severity)} bg-opacity-10`}>
                                {p.source}
                              </span>
                            </div>
                          </div>
                          {isDartIssue(p) && apiKey && hoveredId === p.id && (
                            <button
                              onClick={(e) => { e.stopPropagation(); fixProblemWithAI(p.id); }}
                              disabled={isFixingWithAI}
                              className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-[#007acc] hover:bg-[#0098ff] text-white text-[10px] rounded transition-all font-medium"
                            >
                              🤖 أصلح
                            </button>
                          )}
                          {hoveredId === p.id && (
                            <button
                              onClick={(e) => { e.stopPropagation(); copyProblemText(p); }}
                              className="flex-shrink-0 p-1 text-[#6c6c6c] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
                            >
                              <Copy size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
          </div>
        ) : (
          // Flat list view
          <div className="divide-y divide-[#2d2d2d]">
            {filtered.map(p => (
              <div
                key={p.id}
                className="group"
                onMouseEnter={() => setHoveredId(p.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div
                  onClick={() => handleClick(p)}
                  onContextMenu={(e) => handleProblemContextMenu(e, p)}
                  className="flex items-start gap-2.5 px-3 py-1.5 text-left hover:bg-[#2d2d2d] transition-colors cursor-pointer"
                >
                  {getSeverityIcon(p.severity)}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-[#cccccc] break-words">{p.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#6c6c6c]">{p.fileName}</span>
                      <span className="text-[10px] text-[#4c4c4c]">Ln {p.line}, Col {p.column}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${getSeverityColor(p.severity)} bg-opacity-10`}>
                        {p.source}
                      </span>
                    </div>
                  </div>
                  {isDartIssue(p) && apiKey && hoveredId === p.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); fixProblemWithAI(p.id); }}
                      disabled={isFixingWithAI}
                      className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-[#007acc] hover:bg-[#0098ff] text-white text-[10px] rounded transition-all font-medium"
                    >
                      🤖 أصلح
                    </button>
                  )}
                  {isDartIssue(p) && !apiKey && hoveredId === p.id && (
                    <span className="flex-shrink-0 text-[9px] text-[#6c6c6c] px-2">أضف مفتاح API</span>
                  )}
                  {hoveredId === p.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); copyProblemText(p); }}
                      className="flex-shrink-0 p-1 text-[#6c6c6c] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
                    >
                      <Copy size={11} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Output Tab ──────────────────────────────────────
const OutputTab: React.FC = () => {
  const { outputLines } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [outputLines]);

  const getLineColor = (line: string): string => {
    if (line.includes('[32m') || line.includes('[Ready]')) return 'text-green-400';
    if (line.includes('[31m') || line.includes('[Error]')) return 'text-red-400';
    if (line.includes('[33m') || line.includes('[Warn]')) return 'text-yellow-400';
    if (line.includes('[36m') || line.includes('[Info]')) return 'text-cyan-400';
    return 'text-[#858585]';
  };

  const cleanAnsi = (line: string) => line.replace(/\x1b\[\d+m/g, '');

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 font-mono text-[12px] select-text cursor-text">
        {outputLines.map((line, i) => (
          <div key={i} className={`leading-[22px] whitespace-pre-wrap ${getLineColor(line)}`}>
            {cleanAnsi(line)}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

// ─── Debug Console Tab ──────────────────────────────
const DebugTab: React.FC = () => {
  const { addOutputLine } = useStore();

  const handleEval = (code: string) => {
    addOutputLine(`\x1b[32m[Debug]\x1b[0m > ${code}`);
    try {
      const result = new Function('return ' + code)();
      addOutputLine(`\x1b[36m[Result]\x1b[0m ${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}`);
    } catch (err: any) {
      addOutputLine(`\x1b[31m[Error]\x1b[0m ${err.message}`);
    }
  };

  return (
    <DebugConsole onEval={handleEval} />
  );
};

const DebugConsole: React.FC<{ onEval: (code: string) => void }> = ({ onEval }) => {
  const { outputLines } = useStore();
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [outputLines]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      onEval(input);
      setInput('');
    }
  };

  const cleanAnsi = (line: string) => line.replace(/\x1b\[\d+m/g, '');
  const getLineColor = (line: string): string => {
    if (line.includes('[32m') || line.includes('[Debug]')) return 'text-green-400';
    if (line.includes('[31m') || line.includes('[Error]')) return 'text-red-400';
    if (line.includes('[36m') || line.includes('[Result]')) return 'text-cyan-400';
    return 'text-[#858585]';
  };

  return (
    <div className="flex flex-col h-full select-text" onClick={() => inputRef.current?.focus()}>
      <div className="flex-1 overflow-y-auto p-3 font-mono text-[12px]">
        {outputLines.map((line, i) => (
          <div key={i} className={`leading-[22px] whitespace-pre-wrap ${getLineColor(line)}`}>
            {cleanAnsi(line)}
          </div>
        ))}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-cyan-400 text-[12px]">{'>'}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-[#cccccc] outline-none font-mono text-[12px] caret-[#007acc]"
            spellCheck={false}
            autoComplete="off"
            placeholder="أدخل تعبيراً للتقييم..."
          />
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

// ─── Main Bottom Panel ──────────────────────────────
const BottomPanel: React.FC = () => {
  const {
    bottomPanelTab, setBottomPanelTab,
    problems,
    clearTerminal, clearOutput, setShowTerminal,
    runDartAnalyze, isAnalyzing,
  } = useStore();

  const tabs = [
    {
      id: 'terminal' as const,
      label: 'Terminal',
      icon: <TerminalIcon size={12} />,
      count: undefined,
    },
    {
      id: 'problems' as const,
      label: 'Problems',
      icon: <AlertCircle size={12} />,
      count: problems.length,
      countColor: problems.some(p => p.severity === 'error')
        ? 'text-red-400' : problems.length > 0 ? 'text-yellow-400' : undefined,
    },
    {
      id: 'output' as const,
      label: 'Output',
      icon: <FileText size={12} />,
      count: undefined,
    },
    {
      id: 'debug' as const,
      label: 'Debug Console',
      icon: <Bug size={12} />,
      count: undefined,
    },
  ];

  const handleClear = () => {
    switch (bottomPanelTab) {
      case 'terminal': clearTerminal(); break;
      case 'output': clearOutput(); break;
    }
  };

  const handleRefreshProblems = () => {
    runDartAnalyze();
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Tab bar */}
      <div className="flex items-center justify-between px-2 py-0 bg-[#252526] border-b border-[#3c3c3c] select-none">
        <div className="flex items-center gap-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setBottomPanelTab(tab.id); if (tab.id === 'problems') handleRefreshProblems(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border-b-2 transition-colors ${
                bottomPanelTab === tab.id
                  ? 'text-white border-white bg-[#1e1e1e]'
                  : 'text-[#6c6c6c] border-transparent hover:text-white hover:bg-[#1e1e1e]/50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                  tab.countColor ? `${tab.countColor} bg-opacity-10` : 'bg-[#3c3c3c] text-[#6c6c6c]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {bottomPanelTab === 'problems' && (
            <>
              <button
                onClick={runDartAnalyze}
                disabled={isAnalyzing}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  isAnalyzing
                    ? 'bg-[#3c3c3c] text-[#6c6c6c] cursor-not-allowed'
                    : 'bg-[#007acc]/20 text-[#007acc] hover:bg-[#007acc]/30'
                }`}
                title="Dart Analyze"
              >
                {isAnalyzing ? (
                  <span className="w-3 h-3 border border-[#007acc]/30 border-t-[#007acc] rounded-full animate-spin" />
                ) : (
                  <ChevronRight size={10} className="rotate-90" />
                )}
                Dart Analyze
              </button>
              <button
                onClick={handleRefreshProblems}
                className="p-1 text-[#6c6c6c] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
                title="إعادة الفحص"
              >
                <ChevronRight size={12} className="rotate-90" />
              </button>
            </>
          )}
          <button
            onClick={handleClear}
            className="p-1 text-[#6c6c6c] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
            title="مسح"
          >
            <Trash2 size={12} />
          </button>
          <button
            onClick={() => setShowTerminal(false)}
            className="p-1 text-[#6c6c6c] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
            title="إغلاق"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {bottomPanelTab === 'terminal' && <TerminalComponent />}
        {bottomPanelTab === 'problems' && <ProblemsTab />}
        {bottomPanelTab === 'output' && <OutputTab />}
        {bottomPanelTab === 'debug' && <DebugTab />}
      </div>
    </div>
  );
};

export default BottomPanel;
