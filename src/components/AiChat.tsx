// src/components/AiChat.tsx
// النسخة النهائية – مع التحليل التلقائي بعد كل تعديل
// ✅ إنشاء مجلدات تلقائي + سياق المشروع + تحليل الأخطاء فوراً

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  Brain,
  Check,
  Copy,
  Cpu,
  FileText,
  Loader2,
  MoreHorizontal,
  Settings,
  Shield,
  Trash,
  User,
  X,
} from 'lucide-react';
import { useStore, AI_PROVIDERS } from '../store/useStore';
import { showContextMenu, ContextMenuItem } from './ContextMenu';
import {
  isExecutionConfirmation,
  isRejection,
} from '../services/intentAnalyzer';
import { executeSlashCommand } from '../services/commandSystem';
import { CommandRegistry } from '../core/commands/CommandRegistry';
import {
  getRootFolder,
  ensureFolderChain,
  buildRelativePath,
} from '../store/utils/helpers';
import { buildProjectContext } from '../core/context/ProjectContextManager';

// ========== استخراج الملفات من رد AI ==========

interface FileSuggestion {
  fileName: string;
  language: string;
  code: string;
  startLine?: number;
  endLine?: number;
  isPatch: boolean;
}

const parseFileSuggestions = (content: string): FileSuggestion[] => {
  const suggestions: FileSuggestion[] = [];
  const filePattern = /\[FILE:([^\]]+)\]\s*```(\w+)?\n([\s\S]*?)```/g;
  const patchPattern = /\[PATCH:([^:]+):(\d+):(\d+)\]\s*```(\w+)?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = filePattern.exec(content)) !== null) {
    suggestions.push({ fileName: match[1].trim(), language: match[2] || '', code: match[3].trim(), isPatch: false });
  }
  while ((match = patchPattern.exec(content)) !== null) {
    suggestions.push({ fileName: match[1].trim(), startLine: parseInt(match[2]), endLine: parseInt(match[3]), language: match[4] || '', code: match[5].trim(), isPatch: true });
  }
  return suggestions;
};

// ========== تطبيق الملفات + التحليل التلقائي ==========

const splitPath = (raw: string): { folderPath: string[]; fileName: string } => {
  const cleaned = raw.trim().replace(/\\/g, '/');
  const segments = cleaned.split('/').filter(Boolean);
  if (segments.length === 0) return { folderPath: [], fileName: 'untitled' };
  const fileName = segments.pop()!;
  return { folderPath: segments, fileName };
};

const applyCodeToProject = (
  rawPath: string,
  code: string,
  isPatch: boolean,
  startLine?: number,
  endLine?: number
) => {
  const store = useStore.getState();
  const { folderPath, fileName } = splitPath(rawPath);

  // 1) ضمان وجود الجذر
  let rootFolder = getRootFolder(store.files);
  if (!rootFolder) {
    const id = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const now = Date.now();
    const newRoot = { id, name: 'workspace', type: 'folder' as const, parentId: null, children: [], isDirty: false, createdAt: now, updatedAt: now };
    useStore.setState(s => ({ files: [...s.files, newRoot] }));
    rootFolder = newRoot;
  }

  // 2) إنشاء المجلدات الوسيطة
  const targetParentId = ensureFolderChain(
    () => useStore.getState().files,
    (parentId, name) => store.addFileToFolder(parentId, name, 'folder'),
    rootFolder!.id,
    folderPath
  );

  // 3) هل الملف موجود مسبقاً؟
  const existingFile = useStore.getState().files.find(
    f => f.type === 'file' && f.name === fileName && f.parentId === targetParentId
  );

  if (isPatch && existingFile && startLine !== undefined && endLine !== undefined) {
    const lines = existingFile.content?.split('\n') || [];
    const start = Math.max(1, startLine);
    const end = Math.min(lines.length, endLine);
    const newLines = code.split('\n');
    const result = [...lines.slice(0, start - 1), ...newLines, ...lines.slice(end)];
    store.updateFile(existingFile.id, result.join('\n'));
    store.addNotification({ id: Date.now().toString(), type: 'success', message: `✅ تم PATCH ${rawPath}` });
    // 🔥 تحليل تلقائي بعد التعديل
    store.runDartAnalyze();
  } else if (existingFile) {
    store.updateFile(existingFile.id, code);
    store.addNotification({ id: Date.now().toString(), type: 'success', message: `✅ تم تحديث ${rawPath}` });
    store.runDartAnalyze();
  } else {
    const newFile = store.addFileToFolder(targetParentId, fileName, 'file');
    if (newFile) {
      store.updateFile(newFile.id, code);
      store.addNotification({ id: Date.now().toString(), type: 'success', message: `✅ تم إنشاء ${rawPath}` });
      store.runDartAnalyze();
    }
  }
};

// ========== Markdown Renderer ==========

type RenderPart =
  | { type: 'text'; content: string; key: string }
  | { type: 'code'; content: string; lang?: string; key: string }
  | { type: 'file'; content: string; lang?: string; fileName: string; key: string };

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { addNotification } = useStore();
  const suggestions = useMemo(() => parseFileSuggestions(content), [content]);

  const parts = useMemo<RenderPart[]>(() => {
    const segs = content.split(/(```[\s\S]*?```)/g);
    const out: RenderPart[] = [];
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      if (!seg) continue;
      const key = `${i}-${seg.length}`;
      if (seg.startsWith('```')) {
        const inner = seg.slice(3, -3);
        const newlineIdx = inner.indexOf('\n');
        const lang = newlineIdx >= 0 ? inner.slice(0, newlineIdx).trim() : '';
        const code = newlineIdx >= 0 ? inner.slice(newlineIdx + 1) : inner;
        const prevText = (segs[i - 1] || '').trim();
        const fileTag = prevText.match(/\[FILE:([^\]]+)\]\s*$/);
        const patchTag = prevText.match(/\[PATCH:([^:]+):(\d+):(\d+)\]\s*$/);
        if (fileTag) {
          out.push({ type: 'file', fileName: fileTag[1].trim(), content: code, lang, key });
        } else if (patchTag) {
          out.push({ type: 'file', fileName: patchTag[1].trim(), content: code, lang, key });
        } else {
          out.push({ type: 'code', content: code, lang, key });
        }
      } else {
        const cleaned = seg.replace(/\[FILE:[^\]]+\]\s*$/gm, '').replace(/\[PATCH:[^:]+:\d+:\d+\]\s*$/gm, '');
        if (cleaned.trim()) out.push({ type: 'text', content: cleaned, key });
      }
    }
    return out;
  }, [content]);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1200);
    addNotification({ id: Date.now().toString(), type: 'success', message: 'تم النسخ' });
  };

  const applyFile = (fileName: string) => {
    const sug = suggestions.find(s => s.fileName === fileName && s.isPatch) || suggestions.find(s => s.fileName === fileName && !s.isPatch);
    if (sug) applyCodeToProject(fileName, sug.code, sug.isPatch, sug.startLine, sug.endLine);
  };

  const renderText = (text: string) => {
    const chunks = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);
    return chunks.map((seg, idx) => {
      if (seg.startsWith('**') && seg.endsWith('**')) {
        return <strong key={idx} className="font-semibold text-white/90">{seg.slice(2, -2)}</strong>;
      }
      if (seg.startsWith('`') && seg.endsWith('`')) {
        return <code key={idx} className="px-1 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] font-mono text-[12px] text-[#7dd3fc]">{seg.slice(1, -1)}</code>;
      }
      return seg.split('\n').map((line, j) => (
        <React.Fragment key={`${idx}-${j}`}>
          {j > 0 && <br />}
          {line.startsWith('- ') || line.startsWith('• ') ? (
            <span className="flex items-start gap-2 my-1">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#38bdf8] flex-shrink-0" />
              <span>{line.slice(2)}</span>
            </span>
          ) : line.startsWith('# ') ? (
            <span className="block text-[15px] font-semibold text-white/90 mt-3">{line.slice(2)}</span>
          ) : line.startsWith('## ') ? (
            <span className="block text-[13px] font-semibold text-white/80 mt-2">{line.slice(3)}</span>
          ) : (
            line
          )}
        </React.Fragment>
      ));
    });
  };

  return (
    <div className="text-[13px] leading-relaxed text-white/80 space-y-3">
      {parts.map((p) => {
        if (p.type === 'text') return <div key={p.key} className="whitespace-pre-wrap">{renderText(p.content)}</div>;
        if (p.type === 'code') return (
          <div key={p.key} className="group rounded-xl overflow-hidden border border-white/[0.08] bg-black/30">
            <div className="flex items-center justify-between px-3 py-2 bg-white/[0.03] border-b border-white/[0.06]">
              <span className="text-[10px] text-white/40 font-mono tracking-widest">{p.lang || 'code'}</span>
              <button onClick={() => copy(p.content, p.key)} className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-white" title="نسخ">
                {copiedKey === p.key ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <pre className="p-3 text-[12px] text-[#dbeafe] font-mono whitespace-pre-wrap max-h-[280px] overflow-y-auto">{p.content}</pre>
          </div>
        );
        return (
          <div key={p.key} className="group rounded-xl overflow-hidden border border-[#38bdf8]/25 bg-gradient-to-b from-[#0b1220]/60 to-black/25">
            <div className="flex items-center justify-between px-3 py-2 bg-white/[0.03] border-b border-white/[0.06]">
              <div className="min-w-0 flex items-center gap-2">
                <FileText size={14} className="text-[#38bdf8]" />
                <span className="truncate text-[11px] font-mono text-[#7dd3fc]">{p.fileName}</span>
                {suggestions.find(s => s.fileName === p.fileName && s.isPatch) && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full border border-[#38bdf8]/30 text-[#7dd3fc] bg-[#38bdf8]/10">PATCH</span>
                )}
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => copy(p.content, p.key)} className="text-white/40 hover:text-white" title="نسخ">
                  {copiedKey === p.key ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <button onClick={() => applyFile(p.fileName)} className="text-[11px] px-3 py-1 rounded-full bg-[#38bdf8]/15 border border-[#38bdf8]/30 text-[#7dd3fc] hover:bg-[#38bdf8]/25 transition-colors" title="تطبيق على المشروع">
                  تطبيق
                </button>
              </div>
            </div>
            <pre className="p-3 text-[12px] text-[#dbeafe] font-mono whitespace-pre-wrap max-h-[280px] overflow-y-auto">{p.content}</pre>
          </div>
        );
      })}
    </div>
  );
};

// ========== قائمة الأوامر الديناميكية ==========

interface CommandItem {
  id: string;
  label: string;
  description: string;
  prompt: string;
  agent: boolean;
}

const getDynamicCommands = (): CommandItem[] => {
  const registry = CommandRegistry.getInstance();
  return registry.getAll()
    .filter(cmd => cmd.category === 'AI' || (cmd.aliases && cmd.aliases.length > 0))
    .map(cmd => ({ id: cmd.id, label: cmd.label, description: cmd.description || '', prompt: `/${cmd.id}`, agent: cmd.category === 'AI' }));
};

const STATIC_COMMANDS: CommandItem[] = [
  { id: 'smartfix', label: 'Smart Fix', description: 'تحليل ثم إصلاح ثم تحقق تلقائياً', prompt: '__SMART_FIX__', agent: false },
];

const CommandMenu: React.FC<{
  filter: string;
  onSelect: (cmd: CommandItem) => void;
  selectedIndex: number;
  setSelectedIndex: (i: number) => void;
}> = ({ filter, onSelect, selectedIndex, setSelectedIndex }) => {
  const dynamicCommands = useMemo(() => getDynamicCommands(), []);
  const COMMANDS = useMemo(() => [...STATIC_COMMANDS, ...dynamicCommands], [dynamicCommands]);

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return COMMANDS;
    return COMMANDS.filter(c => c.id.includes(f) || c.label.toLowerCase().includes(f) || c.description.toLowerCase().includes(f));
  }, [filter, COMMANDS]);

  useEffect(() => setSelectedIndex(0), [filter, setSelectedIndex]);

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl overflow-hidden border border-white/[0.08] bg-black/60 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-50">
      <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
        <span className="text-[10px] text-white/40 font-mono tracking-widest">COMMANDS</span>
        <span className="text-[10px] text-white/30">Enter</span>
      </div>
      {filtered.map((cmd, i) => (
        <button
          key={cmd.id}
          onClick={() => onSelect(cmd)}
          onMouseEnter={() => setSelectedIndex(i)}
          className={`w-full px-3 py-2 text-right transition-colors ${i === selectedIndex ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[12px] text-white/80 truncate">{cmd.label}</div>
              <div className="text-[10px] text-white/35 truncate">{cmd.description}</div>
            </div>
            {cmd.agent && <span className="text-[9px] px-2 py-0.5 rounded-full border border-[#a78bfa]/25 bg-[#a78bfa]/10 text-[#c4b5fd] flex-shrink-0">AGENT</span>}
          </div>
        </button>
      ))}
    </div>
  );
};

// ========== Agent Progress ==========

const AgentProgress: React.FC = () => {
  const { activeAgentTask, isAgentRunning, cancelAgentTask, isSmartFixing, smartFixLog, agentActionLog, pendingTask } = useStore();

  if (pendingTask) {
    return (
      <div className="mx-4 mt-3 rounded-2xl border border-emerald-400/15 bg-emerald-950/30 backdrop-blur-xl overflow-hidden">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 text-[12px] text-emerald-200/90">
            <Brain size={14} className="text-emerald-300" />
            <span className="font-medium">مهمة بانتظار تأكيدك</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-200/70">{pendingTask.description}</div>
          <div className="mt-2 text-[10px] text-emerald-200/60">اكتب "نعم" للتنفيذ أو "لا" للإلغاء</div>
        </div>
      </div>
    );
  }

  if (!activeAgentTask && !isAgentRunning && !isSmartFixing) return null;

  const task = activeAgentTask as any;
  const totalSteps = task?.steps?.length || 0;
  const doneSteps = task?.steps?.filter((s: any) => s.status === 'done').length || 0;
  const progress = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 45;

  const logs = agentActionLog.length > 0 ? agentActionLog : smartFixLog;
  const lastLog = logs.length ? logs[logs.length - 1] : '';

  return (
    <div className="mx-4 mt-3 rounded-2xl border border-sky-400/15 bg-slate-950/30 backdrop-blur-xl overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2">
            <Cpu size={14} className="text-sky-300" />
            <span className="text-[11px] text-white/70 truncate">{isSmartFixing ? 'Smart Fix يعمل...' : 'Agent يعمل...'}</span>
          </div>
          <button onClick={cancelAgentTask} className="p-1 rounded-lg text-white/30 hover:text-red-300 hover:bg-white/[0.06] transition-colors" title="إلغاء">
            <X size={14} />
          </button>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-sky-400/80 via-indigo-400/70 to-violet-400/70 transition-all duration-500" style={{ width: `${isSmartFixing ? 55 : progress}%` }} />
        </div>
        {lastLog && <div className="mt-2 text-[10px] text-white/35 font-mono truncate">{lastLog}</div>}
      </div>
    </div>
  );
};

// ========== المكون الرئيسي (AI-First بالكامل) ==========

const AiChat: React.FC = () => {
  const {
    chatMessages, addChatMessage, updateLastMessage, clearChat,
    apiKey, isAiThinking, setIsAiThinking, aiProviderId, aiModel, customEndpoint,
    files, activeFileId, addNotification,
    agentMode, setAgentMode, executeAgentTask, isAgentRunning, activeAgentTask, agentTasks,
    setShowSettings, smartFixAll, runDartAnalyze, setBottomPanelTab,
    discussionMode, toggleDiscussionMode, pendingTask, setPendingTask, executePendingTask,
  } = useStore();

  const [input, setInput] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const [commandFilter, setCommandFilter] = useState('');
  const [selectedCmdIndex, setSelectedCmdIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  const messagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const provider = AI_PROVIDERS.find(p => p.id === aiProviderId);

  useEffect(() => {
    const el = messagesRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 180)
      requestAnimationFrame(() => el.scrollTop = el.scrollHeight);
  }, [chatMessages, isAiThinking, activeAgentTask]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getActiveFileContent = () => {
    const file = files.find(f => f.id === activeFileId);
    if (!file) return '';
    return `الملف الحالي: ${buildRelativePath(files, file)}\n\`\`\`${file.language || ''}\n${file.content}\n\`\`\``;
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsAiThinking(false);
  };

  const sendMessage = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || isAiThinking || isAgentRunning) return;

    if (!apiKey) {
      addChatMessage({ id: Date.now().toString(), role: 'assistant', content: 'يرجى إدخال مفتاح API من الإعدادات أولاً.', timestamp: Date.now() });
      return;
    }

    if (text.startsWith('/')) {
      addChatMessage({ id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() });
      setInput(''); setShowCommands(false);
      const result = await executeSlashCommand(text);
      addChatMessage({ id: (Date.now() + 1).toString(), role: 'assistant', content: result.success ? `✓ الأمر \`${result.commandName}\` نُفذ بنجاح.` : `✗ فشل: ${result.error}`, timestamp: Date.now() });
      return;
    }

    if (pendingTask && isExecutionConfirmation(text)) {
      addChatMessage({ id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() });
      setInput(''); await executePendingTask(); return;
    }
    if (pendingTask && isRejection(text)) {
      addChatMessage({ id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() });
      setInput(''); setPendingTask(null);
      addChatMessage({ id: (Date.now() + 1).toString(), role: 'assistant', content: 'تم الإلغاء.', timestamp: Date.now() });
      return;
    }

    addChatMessage({ id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() });
    setInput(''); setShowCommands(false);

    if (text === '__SMART_FIX__') {
      addChatMessage({ id: (Date.now() + 1).toString(), role: 'assistant', content: 'بدء Smart Fix: تحليل → إصلاح → تحقق...', timestamp: Date.now() });
      runDartAnalyze(); setBottomPanelTab('problems'); await smartFixAll(); return;
    }

    if (agentMode && text.length > 15) {
      addChatMessage({ id: (Date.now() + 1).toString(), role: 'assistant', content: `Agent يبدأ: ${text}`, timestamp: Date.now() });
      await executeAgentTask(text); return;
    }

    setIsAiThinking(true);
    addChatMessage({ id: (Date.now() + 1).toString(), role: 'assistant', content: '', timestamp: Date.now(), isStreaming: true });

    const projectCtx = buildProjectContext();
    const systemPrompt = `أنت مساعد برمجي ذكي داخل محرر أكواد احترافي. أنت تتحكم بكل شيء. تتحدث بالعربية (أو لغة المستخدم) والكود بالإنجليزية.

${projectCtx.systemContext}

القواعد:
- أنشئ الملفات باستخدام [FILE:المسار] ثم \`\`\`lang ... \`\`\`
- للتعديل الجزئي استخدم [PATCH:المسار:start:end] ثم الكود الجديد فقط.
- تأكد من صحة المسارات (ابدأ بـ workspace/ أو src/ أو lib/ إلخ).
- لا تخلط لغات غريبة، استخدم العربية أو الإنجليزية فقط.
- كن دقيقاً ولا تُدخل أخطاء برمجية.`;

    const endpoint = aiProviderId === 'custom' ? customEndpoint : provider?.endpoint;
    if (!endpoint) {
      updateLastMessage('يرجى تعيين Endpoint من الإعدادات.');
      setIsAiThinking(false);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        signal: abortRef.current.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            ...chatMessages.filter(m => m.role !== 'system').slice(-10).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: text },
          ],
          max_tokens: 4096,
          temperature: 0.5,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || 'خطأ في الاتصال');
      }

      const reader = res.body?.getReader();
      let full = '';
      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try { full += JSON.parse(data)?.choices?.[0]?.delta?.content ?? ''; updateLastMessage(full); } catch {}
          }
        }
      } else {
        full = (await res.json())?.choices?.[0]?.message?.content || '';
        updateLastMessage(full);
      }

      const suggestions = parseFileSuggestions(full);
      if (suggestions.length && !discussionMode) {
        for (const s of suggestions) {
          applyCodeToProject(s.fileName, s.code, s.isPatch, s.startLine, s.endLine);
        }
        addNotification({ id: Date.now().toString(), type: 'success', message: `✅ تم تطبيق ${suggestions.length} تغيير` });
      } else if (suggestions.length && discussionMode) {
        addNotification({ id: Date.now().toString(), type: 'info', message: `📋 ${suggestions.length} اقتراحات جاهزة للمراجعة` });
      }
    } catch (err: any) {
      updateLastMessage(`خطأ: ${err.message}`);
      addNotification({ id: Date.now().toString(), type: 'error', message: err.message });
    } finally {
      setIsAiThinking(false);
      abortRef.current = null;
    }
  };

  const handleCommandSelect = useCallback(async (cmd: CommandItem) => {
    setShowCommands(false);
    setCommandFilter('');
    setInput('');
    if (cmd.prompt.startsWith('/')) {
      await sendMessage(cmd.prompt);
    } else {
      sendMessage(cmd.prompt);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && isAiThinking) { e.preventDefault(); stopStreaming(); return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); return; }
    if (e.key === '/' && input === '') { e.preventDefault(); setShowCommands(true); setCommandFilter(''); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const messageCount = chatMessages.filter(m => m.role !== 'system').length;
  const completedTasks = agentTasks.slice(-3);

  return (
    <div className="relative flex flex-col h-full min-h-0 overflow-hidden bg-[#05070b]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-sky-500/10 blur-[90px]" />
        <div className="absolute -bottom-32 -right-32 w-[520px] h-[520px] rounded-full bg-violet-500/10 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.08),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(167,139,250,0.07),transparent_45%)]" />
        <div className="absolute inset-0 opacity-[0.18] mix-blend-soft-light ai-noise" />
      </div>

      <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-black/30 backdrop-blur-2xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-2xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center shadow-[0_0_40px_rgba(56,189,248,0.08)]">
            <Brain size={16} className="text-white/70" />
          </div>
          <div className="min-w-0">
            <div className="text-[12px] text-white/80 truncate">{provider?.name || 'AI Assistant'}</div>
            <div className="flex items-center gap-2 text-[10px] text-white/35 font-mono truncate">
              <span className="truncate">{aiModel}</span>
              <span className="text-white/15">•</span>
              <span className={apiKey ? 'text-emerald-300/70' : 'text-red-300/70'}>{apiKey ? 'linked' : 'no-key'}</span>
            </div>
          </div>
          <button onClick={() => toggleDiscussionMode()} className={`ml-2 text-[10px] px-3 py-1 rounded-full border transition-colors ${discussionMode ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200/80' : 'border-sky-400/25 bg-sky-400/10 text-sky-200/80'}`}>
            {discussionMode ? 'DISCUSS' : 'EXECUTE'}
          </button>
        </div>

        <div className="flex items-center gap-2" ref={menuRef}>
          {isAiThinking && (
            <button onClick={stopStreaming} className="text-[10px] px-3 py-1 rounded-full border border-red-300/20 bg-red-300/10 text-red-200/80 hover:bg-red-300/15 transition-colors">
              STOP
            </button>
          )}
          <button onClick={() => setShowMenu(v => !v)} className="p-2 rounded-xl border border-white/[0.06] bg-white/[0.02] text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors">
            <MoreHorizontal size={16} />
          </button>
          {showMenu && (
            <div className="absolute right-4 top-[56px] w-[220px] rounded-2xl overflow-hidden border border-white/[0.08] bg-black/70 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.65)] z-50">
              <button onClick={() => { setAgentMode(!agentMode); setShowMenu(false); }} className="w-full flex items-center justify-between px-3 py-2 text-[11px] text-white/70 hover:bg-white/[0.05] transition-colors">
                <span className="flex items-center gap-2"><Cpu size={14} className={agentMode ? 'text-sky-300' : 'text-white/40'} />Agent Mode</span>
                <span className="text-white/40">{agentMode ? 'ON' : 'OFF'}</span>
              </button>
              <button onClick={() => { setShowSettings(true); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-white/70 hover:bg-white/[0.05] transition-colors">
                <Settings size={14} className="text-white/40" />API Settings
              </button>
              <button onClick={() => { sendMessage('__SMART_FIX__'); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-white/70 hover:bg-white/[0.05] transition-colors">
                <Shield size={14} className="text-white/40" />Smart Fix
              </button>
              <div className="h-px bg-white/[0.06]" />
              <button onClick={() => { clearChat(); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-red-200/80 hover:bg-white/[0.05] transition-colors">
                <Trash size={14} />Clear Chat
              </button>
            </div>
          )}
        </div>
      </div>

      <AgentProgress />

      <div ref={messagesRef} className="relative z-10 flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth select-text scrollbar-thin scrollbar-thumb-white/[0.08] scrollbar-track-transparent">
        {chatMessages.filter(m => m.role !== 'system').map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`flex-shrink-0 w-9 h-9 rounded-2xl border ${msg.role === 'user' ? 'border-sky-400/15 bg-sky-400/10' : 'border-violet-400/15 bg-violet-400/10'} flex items-center justify-center`}>
              {msg.role === 'user' ? <User size={16} className="text-sky-200/80" /> : <Brain size={16} className="text-violet-200/80" />}
            </div>
            <div className={`group relative max-w-[86%] rounded-3xl px-4 py-3 border backdrop-blur-xl ${msg.role === 'user' ? 'bg-sky-400/10 border-sky-400/15 text-white/85 rounded-tr-md' : 'bg-white/[0.03] border-white/[0.08] text-white/85 rounded-tl-md'}`}>
              {msg.role === 'assistant' ? (
                msg.isStreaming && !msg.content ? (
                  <div className="flex items-center gap-2 text-white/40"><Loader2 size={14} className="animate-spin" /><span className="text-[11px]">جاري الاستجابة...</span></div>
                ) : <MarkdownRenderer content={msg.content} />
              ) : (
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              )}
              <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-[9px] text-white/25 font-mono">{new Date(msg.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 px-4 pb-4 pt-2">
        {showCommands && <CommandMenu filter={commandFilter} onSelect={handleCommandSelect} selectedIndex={selectedCmdIndex} setSelectedIndex={setSelectedCmdIndex} />}
        <div className="rounded-3xl border border-white/[0.08] bg-black/35 backdrop-blur-2xl p-2 shadow-[0_0_50px_rgba(56,189,248,0.06)] focus-within:border-sky-400/30 transition-colors">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isAgentRunning ? 'Agent يعمل...' : agentMode ? 'اكتب مهمة...' : 'اكتب أي شيء... / للأوامر'}
              className="flex-1 bg-transparent text-[13px] text-white/80 placeholder-white/20 outline-none resize-none px-3 py-2 leading-relaxed min-h-[44px] max-h-[160px] overflow-y-auto"
              rows={1}
              dir="rtl"
              disabled={isAgentRunning}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isAiThinking || isAgentRunning}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${input.trim() && !isAiThinking && !isAgentRunning ? 'bg-sky-400/15 border-sky-400/25 text-sky-200 hover:bg-sky-400/20' : 'bg-white/[0.02] border-white/[0.06] text-white/20'}`}
            >
              {isAiThinking || isAgentRunning ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={18} />}
            </button>
          </div>
          <div className="px-3 pb-1 flex items-center justify-between text-[9px] text-white/20 font-mono">
            <span>{apiKey ? '● linked' : '○ no-key'} • {provider?.name || '—'}</span>
            <span>{agentMode ? 'agent' : 'chat'} • Esc لإيقاف البث</span>
          </div>
        </div>
      </div>

      <style>{`
        .ai-noise {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E");
          background-size: 180px 180px;
        }
      `}</style>
    </div>
  );
};

export default AiChat;