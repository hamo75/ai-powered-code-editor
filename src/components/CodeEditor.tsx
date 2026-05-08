import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { X, FileCode, Circle } from 'lucide-react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Breadcrumbs } from './Breadcrumbs';

const getLanguageFromName = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    html: 'html', css: 'css', js: 'javascript', ts: 'typescript',
    tsx: 'typescript', jsx: 'javascript', py: 'python', json: 'json',
    md: 'markdown', txt: 'plaintext', sh: 'shell', yaml: 'yaml',
    yml: 'yaml', xml: 'xml', sql: 'sql', rb: 'ruby', go: 'go',
    rs: 'rust', java: 'java', cpp: 'cpp', c: 'c', php: 'php',
    dart: 'dart',
  };
  return map[ext] || 'plaintext';
};

const EditorTabs: React.FC = () => {
  const { files, openTabs, activeFileId, setActiveFile, closeTab, closeOtherTabs } = useStore();

  return (
    <div className="flex items-center bg-[#252526] border-b border-[#1e1e1e] overflow-x-auto scrollbar-hide"
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      {openTabs.map((tabId) => {
        const file = files.find((f) => f.id === tabId);
        if (!file) return null;

        const isActive = tabId === activeFileId;
        const lang = file.language || getLanguageFromName(file.name);
        const langColors: Record<string, string> = {
          typescript: '#3178c6', javascript: '#f7df1e', html: '#e34c26',
          css: '#264de4', json: '#a8b9cc', markdown: '#083fa1', python: '#3776ab',
          dart: '#00b4ab',
        };

        return (
          <div
            key={tabId}
            onClick={() => setActiveFile(tabId)}
            className={`group flex items-center gap-1.5 px-3 py-1.5 text-[12px] border-r border-[#1e1e1e] cursor-pointer select-none transition-all ${
              isActive
                ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc]'
                : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#2a2a2a] border-t-2 border-t-transparent'
            }`}
          >
            <Circle size={8} fill={langColors[lang] || '#6c6c6c'} color={langColors[lang] || '#6c6c6c'} />
            <span className="max-w-[120px] truncate">{file.name}</span>
            {file.isDirty && <span className="w-2 h-2 rounded-full bg-[#c4c4c4] group-hover:hidden" />}
            <button
              onClick={(e) => { e.stopPropagation(); closeTab(tabId); }}
              className={`p-0.5 rounded hover:bg-[#3c3c3c] ${file.isDirty ? 'group-hover:block hidden' : 'opacity-0 group-hover:opacity-100'}`}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
      {openTabs.length > 1 && activeFileId && (
        <div className="flex items-center ml-1">
          <button
            onClick={() => closeOtherTabs(activeFileId)}
            className="text-[10px] text-[#6c6c6c] hover:text-white px-2 py-0.5 rounded hover:bg-[#3c3c3c]"
            title="إغلاق البقية"
          >
            إغلاق البقية
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Inline Error Decorations ─────────────────────────
const useEditorDecorations = (editorRef: any, activeFileId: string | null) => {
  const problems = useStore(s => s.problems);
  const prevDecorations = useRef<string[]>([]);

  useEffect(() => {
    if (!editorRef.current || !activeFileId) return;

    const fileProblems = problems.filter(p => p.fileId === activeFileId);
    const monaco = (window as any).monaco;

    // Update model markers for real squiggly lines
    const model = editorRef.current.getModel();
    if (model && monaco) {
      const markers = fileProblems.map(p => ({
        severity: p.severity === 'error'
          ? monaco.MarkerSeverity.Error
          : p.severity === 'warning'
            ? monaco.MarkerSeverity.Warning
            : monaco.MarkerSeverity.Info,
        message: p.message,
        startLineNumber: p.line,
        startColumn: p.column || 1,
        endLineNumber: p.line,
        endColumn: model.getLineMaxColumn(p.line) || (p.column || 1) + 20,
        source: p.source,
      }));
      monaco.editor.setModelMarkers(model, 'ai-studio-linter', markers);
    }

    // Gutter decorations (colored dots in the margin)
    const decorations = fileProblems.map(p => ({
      range: {
        startLineNumber: p.line,
        startColumn: 1,
        endLineNumber: p.line,
        endColumn: 1,
      },
      options: {
        isWholeLine: true,
        glyphMarginClassName: p.severity === 'error'
          ? 'error-glyph-error'
          : p.severity === 'warning'
            ? 'error-glyph-warning'
            : 'error-glyph-info',
        glyphMarginHoverMessage: { value: `**${p.severity.toUpperCase()}**: ${p.message}` },
        className: p.severity === 'error'
          ? 'error-line-error'
          : p.severity === 'warning'
            ? 'error-line-warning'
            : '',
        hoverMessage: { value: `**${p.source}**: ${p.message}` },
      },
    }));

    // Use stored decoration IDs for O(1) update instead of O(n²) getAllDecorations
    prevDecorations.current = editorRef.current.deltaDecorations(
      prevDecorations.current,
      decorations
    );
  }, [problems, activeFileId, editorRef]);
};

// ─── Main Code Editor ─────────────────────────────────
const CodeEditor: React.FC = () => {
  const {
    files, activeFileId, updateFile, editorTheme, openTabs, fontSize, minimap, wordWrap, tabSize, saveFile,
    getActiveThemeExtension, runDartAnalyze, dartAutoAnalyze,
    fontFamily, lineHeight, letterSpacing, lineNumbers, cursorStyle, cursorBlinking,
    autoClosingBrackets, bracketPairColorization, renderWhitespace, smoothScrolling,
  } = useStore();

  const activeFile = files.find((f) => f.id === activeFileId && f.type === 'file');
  const themeExt = getActiveThemeExtension();
  const activeThemeId = themeExt ? `ext-${themeExt.id}` : editorTheme;
  const editorRef = useRef<any>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Live Execution State for AI typing effect
  const [isLiveTyping, setIsLiveTyping] = useState(false);
  const [liveTypingContent, setLiveTypingContent] = useState('');
  const liveTypingRef = useRef<string>('');

  // Inline error decorations
  useEditorDecorations(editorRef, activeFileId);

  // Debounced auto-analysis on content change
  const handleChange = useCallback((value: string | undefined) => {
    if (activeFile && value !== undefined) {
      updateFile(activeFile.id, value);

      // Debounced analysis
      if (dartAutoAnalyze) {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          runDartAnalyze();
        }, 800);
      }
    }
  }, [activeFile, updateFile, dartAutoAnalyze, runDartAnalyze]);

  // Analyze on tab switch
  useEffect(() => {
    if (activeFileId && dartAutoAnalyze) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        runDartAnalyze();
      }, 300);
    }
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [activeFileId, dartAutoAnalyze, runDartAnalyze]);

  const handleBeforeMount = (monaco: any) => {
    (window as any).__monaco = monaco;
    const { extensions } = useStore.getState();
    extensions.forEach(ext => {
      if (ext.themeData && ext.installed) {
        monaco.editor.defineTheme(`ext-${ext.id}`, ext.themeData.monacoTheme as any);
      }
    });
  };

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;

    // Ctrl+S save
    editor.addCommand(
      2048 | 49,
      () => {
        if (activeFileId) {
          saveFile(activeFileId);
          if (dartAutoAnalyze) runDartAnalyze();
        }
      }
    );
    
    // Listen for live code updates from AI
    const handleLiveUpdate = (event: CustomEvent<{ fileId: string; content: string }>) => {
      if (event.detail.fileId === activeFileId && editorRef.current) {
        setIsLiveTyping(true);
        liveTypingRef.current = event.detail.content;
        setLiveTypingContent(event.detail.content);
        
        // Update editor content without triggering onChange
        const model = editorRef.current.getModel();
        if (model) {
          const position = model.getPositionAt(event.detail.content.length);
          model.setValue(event.detail.content);
          editorRef.current.setPosition(position);
          editorRef.current.revealPositionInCenter(position);
        }
      }
    };
    
    const handleFinalize = (event: CustomEvent<{ fileId: string; content: string }>) => {
      if (event.detail.fileId === activeFileId) {
        setIsLiveTyping(false);
        setLiveTypingContent('');
        liveTypingRef.current = '';
        // Final save to store
        updateFile(event.detail.fileId, event.detail.content);
      }
    };
    
    window.addEventListener('live-code-update' as any, handleLiveUpdate as any);
    window.addEventListener('live-code-finalize' as any, handleFinalize as any);
    
    return () => {
      window.removeEventListener('live-code-update' as any, handleLiveUpdate as any);
      window.removeEventListener('live-code-finalize' as any, handleFinalize as any);
    };
  };

  if (openTabs.length === 0) {
    return (
      <div className="flex-1 flex flex-col bg-[#1e1e1e]">
        <div className="flex-1 flex flex-col items-center justify-center text-[#3c3c3c]">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#007acc]/10 to-[#6a0dad]/10 border border-[#3c3c3c] flex items-center justify-center">
              <FileCode size={48} className="opacity-20" />
            </div>
          </div>
          <h2 className="text-lg font-light text-[#4c4c4c] mb-2">AI Code Studio Pro</h2>
          <p className="text-[13px] text-[#3c3c3c] mb-6">اختر ملفاً من المستكشف أو أنشئ ملفاً جديداً</p>
          <div className="flex flex-col gap-2 text-[12px] text-[#4c4c4c]">
            <div className="flex items-center gap-3">
              <kbd className="bg-[#2d2d2d] px-2 py-0.5 rounded border border-[#3c3c3c]">Ctrl+S</kbd>
              <span>حفظ الملف</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="bg-[#2d2d2d] px-2 py-0.5 rounded border border-[#3c3c3c]">Ctrl+K</kbd>
              <span>لوحة الأوامر</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="bg-[#2d2d2d] px-2 py-0.5 rounded border border-[#3c3c3c]">Ctrl+B</kbd>
              <span>تبديل الشريط الجانبي</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="bg-[#2d2d2d] px-2 py-0.5 rounded border border-[#3c3c3c]">Ctrl+J</kbd>
              <span>تبديل الطرفية</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e1e] min-h-0 overflow-hidden">
      <EditorTabs />
      <Breadcrumbs />
      {activeFile ? (
        <div className="flex-1 min-h-0 relative">
          {/* Live Typing Indicator Overlay */}
          {isLiveTyping && (
            <div className="absolute top-3 right-3 z-50 flex items-center gap-2 bg-gradient-to-r from-[#007acc]/90 to-[#6a0dad]/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[#007acc]/50 shadow-lg animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
              <span className="text-[11px] text-white font-medium">🤖 AI يكتب الكود...</span>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100" />
            </div>
          )}
          <Editor
            height="100%"
            language={activeFile.language || getLanguageFromName(activeFile.name)}
            value={isLiveTyping ? liveTypingContent : (activeFile.content || '')}
            theme={activeThemeId}
            onChange={isLiveTyping ? undefined : handleChange}
            beforeMount={handleBeforeMount}
            onMount={handleEditorMount}
            loading={
              <div className="flex items-center justify-center h-full text-[#3c3c3c]">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#007acc] border-t-transparent rounded-full animate-spin" />
                  <span>جاري التحميل...</span>
                </div>
              </div>
            }
            options={{
              fontSize,
              fontFamily,
              fontLigatures: fontFamily.includes('Fira Code') || fontFamily.includes('Cascadia') || fontFamily.includes('JetBrains'),
              minimap: { enabled: minimap, scale: 1, showSlider: 'mouseover' },
              lineNumbers,
              lineHeight: lineHeight || undefined,
              letterSpacing,
              roundedSelection: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize,
              insertSpaces: true,
              wordWrap,
              cursorStyle,
              cursorBlinking,
              cursorWidth: cursorStyle === 'block' ? undefined : 2,
              smoothScrolling,
              padding: { top: 12, bottom: 12 },
              renderLineHighlight: 'all',
              colorDecorators: true,
              bracketPairColorization: { enabled: bracketPairColorization },
              guides: { bracketPairs: bracketPairColorization, indentation: true },
              suggest: { showKeywords: true, showSnippets: true },
              folding: true,
              foldingStrategy: 'auto',
              showFoldingControls: 'mouseover',
              matchBrackets: 'always',
              renderWhitespace,
              autoClosingBrackets,
              contextmenu: true,
              copyWithSyntaxHighlighting: true,
              links: true,
              stickyScroll: { enabled: true },
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
                useShadows: false,
              },
              overviewRulerBorder: false,
              hideCursorInOverviewRuler: true,
              glyphMargin: true,
            }}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[#4c4c4c]">
          <p>اختر ملفاً لعرضه</p>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;
