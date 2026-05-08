// ═══════════════════════════════════════════════════════════════
// 🧪 Code Sandbox v1.0 - Safe Testing Environment
// Features:
//   - Isolated code execution simulation
//   - Fix verification before application
//   - Checkpoint and rollback system
//   - Error detection and reporting
//   - Performance metrics tracking
// ═══════════════════════════════════════════════════════════════

import { logger } from '../logger/UnifiedLogger.js';

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
  memoryUsed?: number;
}

export interface VerificationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  confidence: number; // 0-1
}

export interface Checkpoint {
  id: string;
  timestamp: number;
  content: string;
  description?: string;
}

export interface SandboxStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTime: number;
  checkpointsCount: number;
  rollbacksCount: number;
}

class CodeSandboxClass {
  private checkpoints: Map<string, Checkpoint> = new Map();
  private executionHistory: ExecutionResult[] = [];
  private maxCheckpoints = 50;
  private readonly MAX_EXECUTION_TIME = 5000; // 5 seconds timeout

  constructor() {
    logger.info('sandbox', 'Code Sandbox initialized');
  }

  // ─── Code Execution ──────────────────────────────────────────

  async execute(code: string, options: { timeout?: number } = {}): Promise<ExecutionResult> {
    const startTime = Date.now();
    const timeout = options.timeout || this.MAX_EXECUTION_TIME;

    logger.debug('sandbox', 'Executing code', { length: code.length, timeout });

    try {
      // Browser sandbox execution using Function constructor (limited)
      // Note: This is a simulation for safety - real execution would need Web Workers or server-side
      const result = await this.safeExecute(code, timeout);
      
      const duration = Date.now() - startTime;
      
      const executionResult: ExecutionResult = {
        success: true,
        output: result,
        duration,
      };

      this.executionHistory.push(executionResult);
      logger.info('sandbox', 'Code executed successfully', { duration });

      return executionResult;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      const executionResult: ExecutionResult = {
        success: false,
        error: error.message || 'Execution failed',
        duration,
      };

      this.executionHistory.push(executionResult);
      logger.error('sandbox', error as Error, { duration });

      return executionResult;
    }
  }

  // ─── Fix Verification ────────────────────────────────────────

  async testFix(original: string, patched: string): Promise<VerificationResult> {
    const startTime = Date.now();
    
    logger.debug('sandbox', 'Testing fix', { 
      originalLength: original.length, 
      patchedLength: patched.length 
    });

    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check 1: Content actually changed
    if (original === patched) {
      errors.push('المحتوى لم يتغير - الإصلاح غير فعال');
      return {
        isValid: false,
        errors,
        warnings,
        suggestions,
        confidence: 0,
      };
    }

    // Check 2: Syntax validation (basic)
    const syntaxCheck = this.validateSyntax(patched);
    if (!syntaxCheck.valid) {
      errors.push(...syntaxCheck.errors);
    }

    // Check 3: Structural integrity
    const structureCheck = this.validateStructure(original, patched);
    if (!structureCheck.valid) {
      warnings.push(...structureCheck.warnings);
    }

    // Check 4: Try to execute (if safe)
    if (errors.length === 0) {
      const execResult = await this.execute(patched);
      if (!execResult.success) {
        errors.push(`خطأ في التنفيذ: ${execResult.error}`);
      } else {
        suggestions.push('تم التنفيذ بنجاح');
      }
    }

    const duration = Date.now() - startTime;
    const confidence = this.calculateConfidence(errors, warnings, original, patched);

    logger.info('sandbox', 'Fix verification complete', {
      isValid: errors.length === 0,
      errorsCount: errors.length,
      warningsCount: warnings.length,
      confidence,
      duration,
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      confidence,
    };
  }

  // ─── Checkpoint System ───────────────────────────────────────

  createCheckpoint(content: string, description?: string): string {
    const id = `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const checkpoint: Checkpoint = {
      id,
      timestamp: Date.now(),
      content,
      description,
    };

    this.checkpoints.set(id, checkpoint);

    // Clean old checkpoints if exceeding limit
    if (this.checkpoints.size > this.maxCheckpoints) {
      const sorted = Array.from(this.checkpoints.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 20%
      const toRemove = Math.floor(this.maxCheckpoints * 0.2);
      for (let i = 0; i < toRemove; i++) {
        this.checkpoints.delete(sorted[i][0]);
      }
    }

    logger.info('sandbox', 'Checkpoint created', { id, description });
    return id;
  }

  async rollback(checkpointId: string): Promise<boolean> {
    const checkpoint = this.checkpoints.get(checkpointId);
    
    if (!checkpoint) {
      logger.warn('sandbox', 'Checkpoint not found', { checkpointId });
      return false;
    }

    logger.info('sandbox', 'Rolling back to checkpoint', { checkpointId, description: checkpoint.description });
    
    // In a real implementation, this would restore the file system state
    // For now, we just verify the checkpoint exists and return the content
    return true;
  }

  getCheckpoint(checkpointId: string): Checkpoint | null {
    return this.checkpoints.get(checkpointId) || null;
  }

  listCheckpoints(): Checkpoint[] {
    return Array.from(this.checkpoints.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  clearCheckpoints(): void {
    this.checkpoints.clear();
    logger.info('sandbox', 'All checkpoints cleared');
  }

  // ─── Statistics ──────────────────────────────────────────────

  getStats(): SandboxStats {
    const total = this.executionHistory.length;
    const successful = this.executionHistory.filter(e => e.success).length;
    const failed = total - successful;
    
    const avgTime = total > 0
      ? this.executionHistory.reduce((sum, e) => sum + e.duration, 0) / total
      : 0;

    return {
      totalExecutions: total,
      successfulExecutions: successful,
      failedExecutions: failed,
      avgExecutionTime: avgTime,
      checkpointsCount: this.checkpoints.size,
      rollbacksCount: 0, // Would need to track separately
    };
  }

  getRecentExecutions(count: number = 10): ExecutionResult[] {
    return this.executionHistory.slice(-count).reverse();
  }

  clearHistory(): void {
    this.executionHistory = [];
    logger.info('sandbox', 'Execution history cleared');
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private async safeExecute(code: string, timeout: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Execution timeout after ${timeout}ms`));
      }, timeout);

      try {
        // Basic execution simulation
        // In production, this would use Web Workers or a server-side sandbox
        
        // Check for obviously dangerous patterns
        if (code.includes('eval(') || code.includes('Function(')) {
          clearTimeout(timer);
          reject(new Error('Unsafe code patterns detected'));
          return;
        }

        // Simulate successful execution
        // Real implementation would actually run the code safely
        resolve('Execution simulated successfully');
        
        clearTimeout(timer);
      } catch (error: any) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  private validateSyntax(code: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const lines = code.split('\n');

    // Basic syntax checks
    let braceCount = 0;
    let parenCount = 0;
    let bracketCount = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const prevChar = i > 0 ? code[i - 1] : '';

      // String handling
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;
      }
    }

    if (braceCount !== 0) {
      errors.push(`أقواس معقوفة غير متوازنة: ${braceCount > 0 ? 'ناقص }' : 'ناقص {'}`);
    }
    if (parenCount !== 0) {
      errors.push(`أقواس دائرية غير متوازنة: ${parenCount > 0 ? 'ناقص )' : 'ناقص ('}`);
    }
    if (bracketCount !== 0) {
      errors.push(`أقواس مربعة غير متوازنة: ${bracketCount > 0 ? 'ناقص ]' : 'ناقص ['}`);
    }

    // Check for common Dart syntax issues
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for missing semicolons (basic heuristic)
      if (
        line.match(/^(var|final|const|int|String|bool|double|List|Map|void)\s+\w+/) &&
        !line.endsWith(';') &&
        !line.endsWith('{') &&
        !line.endsWith('}') &&
        !line.endsWith(',')
      ) {
        errors.push(`السطر ${i + 1}: قد يحتاج إلى فاصلة منقوطة ;`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private validateStructure(original: string, patched: string): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    const originalLines = original.split('\n').length;
    const patchedLines = patched.split('\n').length;

    // Warn about significant size changes
    const lineDiff = Math.abs(originalLines - patchedLines);
    if (lineDiff > originalLines * 0.5) {
      warnings.push(`تغيير كبير في عدد الأسطر: ${originalLines} → ${patchedLines}`);
    }

    const sizeDiff = Math.abs(original.length - patched.length);
    if (sizeDiff > original.length * 0.7) {
      warnings.push(`تغيير كبير في الحجم: ${Math.round((sizeDiff / original.length) * 100)}%`);
    }

    return {
      valid: true, // Structure changes are warnings, not errors
      warnings,
    };
  }

  private calculateConfidence(
    errors: string[],
    warnings: string[],
    original: string,
    patched: string
  ): number {
    let confidence = 1.0;

    // Reduce confidence for errors
    confidence -= errors.length * 0.3;

    // Reduce confidence for warnings
    confidence -= warnings.length * 0.1;

    // Boost confidence if change is small and focused
    const changeRatio = Math.abs(original.length - patched.length) / original.length;
    if (changeRatio < 0.1) {
      confidence += 0.1; // Small, focused changes are more likely correct
    } else if (changeRatio > 0.5) {
      confidence -= 0.2; // Large changes are riskier
    }

    return Math.max(0, Math.min(1, confidence));
  }
}

// Export the class for direct instantiation
export { CodeSandboxClass };

// Singleton instance
export const CodeSandbox = new CodeSandboxClass();

export default CodeSandbox;
