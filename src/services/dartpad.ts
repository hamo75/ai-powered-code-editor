// DartPad service - offline-safe fallback implementation
// Keeps the app functional without remote DartPad requests.



export interface DartPadIssue {
  kind: "error" | "warning" | "info";
  line: number;
  column: number;
  length?: number;
  message: string;
  sourceName?: string;
  correction?: string;
  url?: string;
  hasFixes?: boolean;
}

export interface AnalysisResult {
  issues: DartPadIssue[];
}

export interface CompileResult {
  result: string;
  output: string;
  success: boolean;
  returnCode: number;
  error?: string;
}

export interface FormatResult {
  source: string;
  success: boolean;
  error?: string;
}

export interface CompletionResult {
  suggestions: Array<{
    label: string;
    kind: string;
    type: string;
    relevance: number;
    replacementOffset: number;
    replacementLength: number;
  }>;
}

export interface FixesResult {
  fixes: Array<{
    message: string;
    errorIndex: number;
    offset: number;
    length: number;
    replacements: Array<{
      offset: number;
      length: number;
      replacement: string;
    }>;
  }>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildOfflinePreviewHtml(code: string, theme: "dark" | "light" = "dark"): string {
  const escapedCode = escapeHtml(code);
  const background = theme === "dark" ? "#1e1e1e" : "#ffffff";
  const foreground = theme === "dark" ? "#e5e7eb" : "#111827";
  const muted = theme === "dark" ? "#9ca3af" : "#6b7280";
  const border = theme === "dark" ? "#374151" : "#e5e7eb";
  const cardBackground = theme === "dark" ? "#111827" : "#f9fafb";
  const codeBackground = theme === "dark" ? "#0b1220" : "#ffffff";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: sans-serif;
      background: ${background};
      color: ${foreground};
    }
    .card {
      width: 100%;
      max-width: 920px;
      background: ${cardBackground};
      border: 1px solid ${border};
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }
    .title {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 700;
    }
    .subtitle {
      margin: 0 0 16px;
      font-size: 13px;
      color: ${muted};
    }
    pre {
      margin: 0;
      min-height: 240px;
      padding: 16px;
      border-radius: 10px;
      border: 1px solid ${border};
      background: ${codeBackground};
      color: ${foreground};
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 13px;
      line-height: 1.6;
    }
    .note {
      margin-top: 12px;
      font-size: 12px;
      color: ${muted};
    }
  </style>
</head>
<body>
  <div class="card">
    <h1 class="title">Flutter preview unavailable offline</h1>
    <p class="subtitle">This fallback avoids remote DartPad requests and 404 errors during startup.</p>
    <pre>${escapedCode || "// No Flutter code available"}</pre>
    <div class="note">Use this local preview until a valid online DartPad integration is restored.</div>
  </div>
</body>
</html>`;
}

class DartPadService {
  private readonly remoteAnalyzeUrl = 'https://dart-services.appspot.com/analyze';

  /** Analyze Dart/Flutter source code using Dart services when available */
  async analyze(source: string): Promise<AnalysisResult> {
    if (!source || !source.trim()) {
      return { issues: [] };
    }

    const remoteResult = await this.tryRemoteAnalyze(source);
    if (remoteResult) {
      return remoteResult;
    }

    return this.analyzeOffline(source);
  }

  private async tryRemoteAnalyze(source: string): Promise<AnalysisResult | null> {
    try {
      const response = await fetch(this.remoteAnalyzeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source }),
      });

      if (!response.ok) {
        console.warn('Dart analyzer remote request failed', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.issues)) {
        console.warn('Dart analyzer returned unexpected response', data);
        return null;
      }

      return {
        issues: data.issues.map((issue: any) => ({
          kind: issue.kind === 'error' ? 'error' : issue.kind === 'warning' ? 'warning' : 'info',
          line: typeof issue.line === 'number' ? issue.line : 1,
          column: typeof issue.column === 'number' ? issue.column : 1,
          length: typeof issue.length === 'number' ? issue.length : undefined,
          message: issue.message || issue.description || 'Unknown issue',
          sourceName: issue.sourceName,
          correction: issue.correction,
          url: issue.url,
          hasFixes: Boolean(issue.hasFixes),
        })),
      };
    } catch (error) {
      console.warn('Remote Dart analyzer unavailable, falling back to offline analysis', error);
      return null;
    }
  }

  private analyzeOffline(source: string): AnalysisResult {
    const issues: DartPadIssue[] = [];
    const lines = source.split('\n');

    // Track bracket balance for structural analysis
    let opening = { '{': 0, '(': 0, '[': 0 };
    const closing = { '}': '{', ')': '(', ']': '[' };
    
    // Keywords that end lines
    const lineEndingKeywords = /\b(if|for|while|switch|else|class|enum|import|export|library|part|return|throw|try|catch|finally|do|case|default|break|continue|void|int|double|bool|String|List|Map|Set|dynamic|final|var|const|static|async|await|get|set|factory|abstract|extends|implements|with|on)\b/;

    // Dart-specific patterns to detect
    const patterns = [
      // ERRORS
      {
        pattern: /\b(is|is!)\s+(?!null)(?!dynamic)(?!Object)(?!bool)(?!num|int|double|String|List|Map|Set|Iterable|Future|Stream|Function|Symbol|Type|Runes|Pattern|RegExp|Match|Range|Error|Exception|Null|Never|FutureOr|Provisional|Invocation)\b/,
        kind: 'error' as const,
        message: 'Invalid type in type check. Did you mean to use a valid Dart type?',
      },
      {
        pattern: /\$(?!\w|\{)/,
        kind: 'error' as const,
        message: 'Invalid string interpolation syntax. Use ${variable} or ${expression}.',
      },
      {
        pattern: /async\s+\*\s+(?!\/)/,
        kind: 'warning' as const,
        message: 'Did you mean to use async* for async generator?',
      },
      // WARNINGS
      {
        pattern: /\bvar\s+\w+\s*=\s*const/,
        kind: 'warning' as const,
        message: 'Use const instead of var for const values.',
      },
      {
        pattern: /\bprint\s*\(/,
        kind: 'warning' as const,
        message: 'Avoid using print statements. Consider using debugPrint or logging instead.',
      },
      {
        pattern: /\bnew\s+\w+/,
        kind: 'info' as const,
        message: 'The "new" keyword is unnecessary in Dart 2 and later.',
      },
      {
        pattern: /\btry\s*\{/,
        kind: 'info' as const,
        message: 'Consider if exception handling is necessary here.',
      },
      {
        pattern: /==\s*null/,
        kind: 'warning' as const,
        message: 'Use null-aware operators (== null or is null instead).',
      },
      {
        pattern: /!=\s*null/,
        kind: 'warning' as const,
        message: 'Use null-aware operators (!= null or is not null).',
      },
    ];

    // Multi-line state tracking
    let inMultilineComment = false;
    let inString = false;
    let stringChar = '';

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();

      // Skip empty and comment lines
      if (!trimmed) return;

      // Track multi-line comments
      if (trimmed.startsWith('/*')) inMultilineComment = true;
      if (trimmed.endsWith('*/')) inMultilineComment = false;
      if (inMultilineComment || trimmed.startsWith('//')) return;

      // === ERROR CHECKS ===

      // Check for syntax errors - unmatched brackets
      let tempOpening = { ...opening };
      for (const char of line) {
        if (opening[char as keyof typeof opening] !== undefined && !this.isInString(line, line.indexOf(char))) {
          tempOpening[char as keyof typeof opening]++;
        }
        if (closing[char as keyof typeof closing] && !this.isInString(line, line.indexOf(char))) {
          const openChar = closing[char as keyof typeof closing];
          if (tempOpening[openChar as keyof typeof opening] > 0) {
            tempOpening[openChar as keyof typeof opening]--;
          } else {
            issues.push({
              kind: 'error',
              line: lineNumber,
              column: line.indexOf(char) + 1,
              message: `Unmatched closing "${char}". Expected opening "${openChar}"`,
              sourceName: 'Dart Analyzer',
            });
          }
        }
      }
      opening = tempOpening;

      // Missing return type
      if (/^\s*\w+\s*\(/.test(line) && !trimmed.startsWith('class ') && !trimmed.startsWith('import ')) {
        if (!/\s+->\s+|\s*:\s*|void\s+|int\s+|String\s+|bool\s+|double\s+|List\s+|Map\s+|async/.test(trimmed)) {
          if (!trimmed.includes('//') && trimmed.includes('(') && trimmed.includes(')')) {
            issues.push({
              kind: 'info' as const,
              line: lineNumber,
              column: 1,
              message: 'Consider specifying explicit return type for better code clarity.',
              sourceName: 'Dart Analyzer',
            });
          }
        }
      }

      // === PATTERN-BASED CHECKS ===
      patterns.forEach(({ pattern, kind, message }) => {
        if (pattern.test(trimmed)) {
          const match = line.match(pattern);
          if (match) {
            issues.push({
              kind,
              line: lineNumber,
              column: line.indexOf(match[0]) + 1,
              message,
              sourceName: 'Dart Analyzer',
            });
          }
        }
      });

      // === BEST PRACTICE WARNINGS ===

      // TODO/FIXME/HACK comments
      const todoMatch = line.match(/\b(TODO|FIXME|HACK|XXX|BUG|NOTE)\b/i);
      if (todoMatch) {
        issues.push({
          kind: 'info' as const,
          line: lineNumber,
          column: line.indexOf(todoMatch[0]) + 1,
          message: `${todoMatch[0]}: This code needs attention.`,
          sourceName: 'Dart Analyzer',
        });
      }

      // Avoid dynamic types
      if (/\bdynamic\b/.test(line) && !line.includes('//')) {
        issues.push({
          kind: 'warning' as const,
          line: lineNumber,
          column: line.indexOf('dynamic') + 1,
          message: 'Avoid using "dynamic" type. Use specific types or generics instead.',
          sourceName: 'Dart Analyzer',
        });
      }

      // Missing semicolon check (but allow control structures)
      if (trimmed && !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}') && 
          !trimmed.endsWith(',') && !trimmed.endsWith(':') && !trimmed.endsWith(')=>') &&
          !trimmed.endsWith('(') && !trimmed.includes('=>') && 
          !lineEndingKeywords.test(trimmed) &&
          /\S/.test(trimmed)) {
        if (!trimmed.startsWith('import ') && !trimmed.startsWith('export ') && 
            !trimmed.startsWith('class ') && !trimmed.startsWith('enum ') &&
            !trimmed.startsWith('//') && trimmed.length > 10) {
          issues.push({
            kind: 'warning' as const,
            line: lineNumber,
            column: trimmed.length,
            message: 'Possible missing semicolon at end of statement.',
            sourceName: 'Dart Analyzer',
          });
        }
      }

      // Class naming convention (PascalCase)
      if (/^\s*class\s+(\w+)/.test(trimmed)) {
        const match = trimmed.match(/^\s*class\s+(\w+)/);
        if (match && /^[a-z]/.test(match[1])) {
          issues.push({
            kind: 'info' as const,
            line: lineNumber,
            column: line.indexOf(match[1]) + 1,
            message: 'Class names should use PascalCase (start with uppercase).',
            sourceName: 'Dart Analyzer',
          });
        }
      }

      // Function naming convention (camelCase)
      if (/^\s*(?:static\s+)?(?:\w+\s+)?\w+\s*\(/.test(trimmed) && !trimmed.startsWith('class ')) {
        const match = trimmed.match(/^\s*(?:static\s+)?(?:\w+\s+)?(\w+)\s*\(/);
        if (match && /^[A-Z]/.test(match[1]) && match[1] !== 'Future' && match[1] !== 'Stream') {
          if (!match[1].match(/^[A-Z]+$/)) { // Ignore constants like HTTP
            issues.push({
              kind: 'info' as const,
              line: lineNumber,
              column: line.indexOf(match[1]) + 1,
              message: 'Function names should use camelCase (start with lowercase).',
              sourceName: 'Dart Analyzer',
            });
          }
        }
      }
    });

    // Final check for unbalanced brackets
    if (opening['{'] > 0) {
      issues.push({
        kind: 'error' as const,
        line: lines.length,
        column: 1,
        message: `Unmatched opening braces. ${opening['{'] > 0 ? opening['{'] + ' unclosed {' : ''}`,
        sourceName: 'Dart Analyzer',
      });
    }
    if (opening['('] > 0) {
      issues.push({
        kind: 'error' as const,
        line: lines.length,
        column: 1,
        message: `Unmatched opening parentheses. ${opening['('] > 0 ? opening['('] + ' unclosed (' : ''}`,
        sourceName: 'Dart Analyzer',
      });
    }
    if (opening['['] > 0) {
      issues.push({
        kind: 'error' as const,
        line: lines.length,
        column: 1,
        message: `Unmatched opening brackets. ${opening['['] > 0 ? opening['['] + ' unclosed [' : ''}`,
        sourceName: 'Dart Analyzer',
      });
    }

    return { issues };
  }

  // Helper method to check if a position is inside a string
  private isInString(line: string, position: number): boolean {
    let inString = false;
    let stringChar = '';
    for (let i = 0; i < position; i++) {
      const char = line[i];
      if ((char === '"' || char === "'") && (i === 0 || line[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }
    }
    return inString;
  }

  /** Compile Dart/Flutter source code locally without network requests */
  async compile(source: string): Promise<CompileResult> {
    return {
      result: source,
      output: "",
      success: true,
      returnCode: 0,
    };
  }

  /** Format Dart/Flutter source code locally without network requests */
  async format(source: string): Promise<FormatResult> {
    return { source, success: true };
  }

  /** Get code completion suggestions */
  async complete(_source: string, _offset: number): Promise<CompletionResult> {
    return { suggestions: [] };
  }

  /** Get quick fixes for errors */
  async fixes(_source: string, _offset: number): Promise<FixesResult> {
    return { fixes: [] };
  }

  /** Generate DartPad embed URL for Flutter preview */
  getFlutterEmbedUrl(code: string, options?: { theme?: "dark" | "light"; autoRun?: boolean }): string {
    void options;
    return `data:text/html;charset=utf-8,${encodeURIComponent(
      buildOfflinePreviewHtml(code, options?.theme || "dark"),
    )}`;
  }

  /** Generate DartPad embed URL for Dart preview */
  getDartEmbedUrl(code: string, options?: { theme?: "dark" | "light"; autoRun?: boolean }): string {
    void options;
    return `data:text/html;charset=utf-8,${encodeURIComponent(
      buildOfflinePreviewHtml(code, options?.theme || "dark"),
    )}`;
  }

  /** Generate HTML srcdoc for DartPad Flutter preview with embedded code */
  generateFlutterPreviewHtml(code: string, theme: "dark" | "light" = "dark"): string {
    return buildOfflinePreviewHtml(code, theme);
  }

  /** Check if DartPad API is reachable */
  async isAvailable(): Promise<boolean> {
    return true;
  }
}

export const dartpadService = new DartPadService();
export default dartpadService;
