import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';

const FlutterPreview: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const activeFileId = useStore(s => s.activeFileId);
  const files = useStore(s => s.files);
  const dartpadAvailable = useStore(s => s.dartpadAvailable);
  const setDartpadAvailable = useStore(s => s.setDartpadAvailable);
  const hasCheckedRef = useRef(false);

  // Assume DartPad is available and avoid a failing network probe on startup.
  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    setDartpadAvailable(true);
  }, [setDartpadAvailable]);

  // Get the Dart/Flutter code to preview
  const getCode = useCallback(() => {
    if (!activeFileId) return null;
    const file = files.find(f => f.id === activeFileId);
    if (!file) return null;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.dart')) return null;
    return file.content || '';
  }, [activeFileId, files]);

  // Build a complete Flutter app from the current file
  const buildFlutterApp = useCallback((code: string): string => {
    if (code.includes('void main()') || code.includes('main()')) {
      return code;
    }

    const classMatch = code.match(/class\s+(\w+)\s+extends\s+StatelessWidget/);
    if (classMatch) {
      const className = classMatch[1];
      return `import 'package:flutter/material.dart';\n\n${code}\n\nvoid main() => runApp(const ${className}());\n`;
    }

    const statefulMatch = code.match(/class\s+(\w+)\s+extends\s+StatefulWidget/);
    if (statefulMatch) {
      const className = statefulMatch[1];
      return `import 'package:flutter/material.dart';\n\n${code}\n\nvoid main() => runApp(const ${className}());\n`;
    }

    return `import 'package:flutter/material.dart';\n\nvoid main() {\n${code.split('\n').map((line: string) => '  ' + line).join('\n')}\n}\n`;
  }, []);

  // Run the preview
  const runPreview = useCallback(() => {
    const code = getCode();
    if (!code) {
      setError('No Dart file is currently open');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setError('');

    const fullCode = buildFlutterApp(code);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #1e1e1e; }
    .loading { display: flex; align-items: center; justify-content: center; flex-direction: column;
      height: 100vh; font-family: system-ui; color: #999; font-size: 13px; }
    .spinner { width: 24px; height: 24px; border: 2px solid #333; border-top-color: #5AF;
      border-radius: 50%; animation: spin 0.7s linear infinite; margin-bottom: 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    iframe { width: 100%; height: 100%; border: none; display: block; }
  </style>
</head>
<body>
  <div class="loading" id="ld"><div class="spinner"></div>Loading Flutter Preview...</div>
  <script>
    var appCode = ${JSON.stringify(fullCode)};
    var iframe = document.createElement('iframe');
    iframe.src = 'https://dartpad.dev/embed-flutter.html?theme=dark&split=false&run=true&ga_id=ai-studio';
    iframe.onload = function() {
      document.getElementById('ld').style.display = 'none';
      setTimeout(function() {
        try {
          iframe.contentWindow.postMessage({ type: 'sourceCodeUpdate', source: appCode }, '*');
        } catch(e) {
          document.getElementById('ld').innerHTML = 'Error: ' + e.message;
          document.getElementById('ld').style.display = 'flex';
        }
      }, 1500);
    };
    document.body.appendChild(iframe);
  </script>
</body>
</html>`;

    if (iframeRef.current) {
      iframeRef.current.srcdoc = html;
    }
  }, [getCode, buildFlutterApp]);

  // Auto-run when active file changes (if it's a dart file)
  useEffect(() => {
    const code = getCode();
    if (code && dartpadAvailable) {
      const timer = setTimeout(() => runPreview(), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [activeFileId, getCode, runPreview, dartpadAvailable]);

  const currentFile = files.find(f => f.id === activeFileId);
  const isDartFile = currentFile?.name.toLowerCase().endsWith('.dart');

  if (!dartpadAvailable && hasCheckedRef.current) {
    return (
      <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-gray-400 text-sm">
        <div className="text-center p-4">
          <div className="text-3xl mb-3">⚠️</div>
          <div className="font-medium text-gray-300 mb-1">DartPad غير متاح</div>
          <div className="text-xs text-gray-500 mb-3">
            تأكد من اتصالك بالإنترنت ويمكن الوصول إلى dartpad.dev
          </div>
          <button
            onClick={() => { hasCheckedRef.current = false; }}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-500"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-[#3c3c3c] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-blue-400 text-sm">💙 Flutter Preview</span>
          {currentFile && (
            <span className="text-xs text-gray-500 truncate max-w-[150px]">
              {currentFile.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {status === 'loading' && (
            <div className="flex items-center gap-1 text-xs text-yellow-400">
              <div className="w-3 h-3 border border-yellow-400 border-t-transparent rounded-full animate-spin" />
              جاري التحميل...
            </div>
          )}
          {status === 'ready' && (
            <span className="text-xs text-green-400">✓ جاهز</span>
          )}
          {status === 'error' && (
            <span className="text-xs text-red-400">✗ خطأ</span>
          )}
          <button
            onClick={runPreview}
            disabled={!isDartFile}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              isDartFile
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
            title={isDartFile ? 'تشغيل (Ctrl+Enter)' : 'افتح ملف Dart أولاً'}
          >
            ▶ تشغيل
          </button>
        </div>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 relative">
        {!isDartFile ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            <div className="text-center">
              <div className="text-4xl mb-3">📄</div>
              <div>افتح ملف Dart/Flutter لعرض المعاينة</div>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            className="w-full h-full border-none"
            title="Flutter Preview"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            onLoad={() => setStatus('ready')}
            onError={() => { setStatus('error'); setError('Failed to load preview'); }}
          />
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute bottom-0 left-0 right-0 bg-red-900/90 text-red-200 p-3 text-xs font-mono">
            <div className="flex justify-between items-start">
              <span>{error}</span>
              <button onClick={() => setError('')} className="text-red-300 hover:text-white">✕</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlutterPreview;
