// ═══════════════════════════════════════════════════════════════
// 🔗 Error Handler Integration Tests
// Verifies ErrorHandler properly tracks errors in ErrorTracker
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import { errorHandler } from '../ErrorHandler';
import { errorTracker } from '../ErrorTracker';

describe('ErrorHandler-ErrorTracker Integration', () => {
  beforeEach(() => {
    errorTracker.clear();
  });

  it('should track errors in ErrorTracker when handleError is called', async () => {
    const errorMessage = 'Test network error';
    
    await errorHandler.handleError(errorMessage, 'SYSTEM', {
      code: 'NETWORK_ERROR',
      userMessage: 'Network connection failed'
    }, 'error');

    const stats = errorTracker.getStatistics();
    expect(stats.total).toBe(1);
    expect(stats.bySeverity.error).toBe(1);
    
    const errors = errorTracker.getErrors();
    expect(errors.length).toBe(1);
    expect(errors[0].message).toContain(errorMessage);
    expect(errors[0].category).toBe('network');
    expect(errors[0].severity).toBe('error');
  });

  it('should track critical errors with correct severity', async () => {
    await errorHandler.handleCriticalError('System out of memory crash', 'SYSTEM', {
      code: 'CRITICAL_ERROR'
    });

    const stats = errorTracker.getStatistics();
    expect(stats.criticalCount).toBe(1);
    expect(stats.bySeverity.critical).toBe(1);
    
    const errors = errorTracker.getErrors();
    expect(errors[0].severity).toBe('critical');
    expect(errors[0].category).toBe('memory');
  });

  it('should track warnings with warning severity', async () => {
    await errorHandler.handleError('Low disk space', 'SYSTEM', {
      code: 'FILE_WARNING'
    }, 'warn');

    const stats = errorTracker.getStatistics();
    expect(stats.bySeverity.warning).toBe(1);
    
    const errors = errorTracker.getErrors();
    expect(errors[0].severity).toBe('warning');
  });

  it('should categorize network errors correctly', async () => {
    await errorHandler.handleNetworkError(new Error('Connection timeout'), 'AI');

    const errors = errorTracker.getErrors();
    expect(errors.length).toBe(1);
    expect(errors[0].category).toBe('network');
    expect(errors[0].source).toBe('ai');
    expect(errors[0].severity).toBe('error');
  });

  it('should categorize filesystem errors correctly', async () => {
    await errorHandler.handleFileSystemError(new Error('File not found'), 'PARSER');

    const errors = errorTracker.getErrors();
    expect(errors.length).toBe(1);
    expect(errors[0].category).toBe('filesystem');
    expect(errors[0].source).toBe('parser');
  });

  it('should track multiple errors and aggregate statistics', async () => {
    await errorHandler.handleError('Error 1', 'SYSTEM', {}, 'error');
    await errorHandler.handleError('Error 2', 'SYSTEM', {}, 'error');
    await errorHandler.handleError('Warning 1', 'SYSTEM', {}, 'warn');
    await errorHandler.handleCriticalError('Critical 1', 'SYSTEM');

    const stats = errorTracker.getStatistics();
    expect(stats.total).toBe(4);
    expect(stats.criticalCount).toBe(1);
    expect(stats.bySeverity.error).toBe(2);
    expect(stats.bySeverity.warning).toBe(1);
  });

  it('should determine category from error message content', async () => {
    await errorHandler.handleError('Network connection failed', 'SYSTEM', {}, 'error');
    
    const errors = errorTracker.getErrors();
    expect(errors[0].category).toBe('network');
  });

  it('should determine category from error code', async () => {
    await errorHandler.handleError('Some error', 'SYSTEM', { 
      code: 'VALIDATION_ERROR' 
    }, 'error');
    
    const errors = errorTracker.getErrors();
    expect(errors[0].category).toBe('validation');
  });

  it('should map log levels to correct severities', async () => {
    await errorHandler.handleError('Critical error', 'SYSTEM', {}, 'critical');
    await errorHandler.handleError('Regular error', 'SYSTEM', {}, 'error');
    await errorHandler.handleError('Warning message', 'SYSTEM', {}, 'warn');
    await errorHandler.handleError('Info message', 'SYSTEM', {}, 'info');

    const errors = errorTracker.getErrors();
    const byMessage = (msg: string) => errors.find(e => e.message.includes(msg));
    
    expect(byMessage('Critical')?.severity).toBe('critical');
    expect(byMessage('Regular')?.severity).toBe('error');
    expect(byMessage('Warning')?.severity).toBe('warning');
    expect(byMessage('Info')?.severity).toBe('info');
  });

  it('should set recoverable flag for recoverable errors', async () => {
    await errorHandler.handleRecoverableError(async () => {
      throw new Error('Temporary failure');
    }, 'SYSTEM');

    const errors = errorTracker.getErrors();
    expect(errors.some(e => e.recoverable === true)).toBe(true);
  });

  it('should include stack trace in tracked errors', async () => {
    const error = new Error('Stack trace test');
    await errorHandler.handleError(error, 'SYSTEM');

    const errors = errorTracker.getErrors();
    expect(errors[0].stack).toBeDefined();
    expect(errors[0].stack).toContain('Stack trace test');
  });

  it('should include custom data in tracked errors', async () => {
    const customData = { userId: '123', action: 'delete' };
    await errorHandler.handleError('Custom data error', 'SYSTEM', {
      data: customData
    }, 'error');

    const errors = errorTracker.getErrors();
    expect(errors[0].data).toEqual(customData);
  });

  it('should include user message in tracked errors', async () => {
    const userMsg = 'Something went wrong on our end';
    await errorHandler.handleError('Internal error', 'SYSTEM', {
      userMessage: userMsg
    }, 'error');

    const errors = errorTracker.getErrors();
    expect(errors[0].userMessage).toBe(userMsg);
  });

  it('should update occurrence count for duplicate errors', async () => {
    const msg = 'Duplicate error message';
    await errorHandler.handleError(msg, 'SYSTEM');
    await errorHandler.handleError(msg, 'SYSTEM');
    await errorHandler.handleError(msg, 'SYSTEM');

    const errors = errorTracker.getErrors();
    expect(errors.length).toBe(1);
    expect(errors[0].occurrenceCount).toBe(3);
  });

  it('should track errors from different sources', async () => {
    await errorHandler.handleError('Parser error', 'PARSER');
    await errorHandler.handleError('Compiler error', 'COMPILER');
    await errorHandler.handleError('AI error', 'AI');
    await errorHandler.handleError('User error', 'USER');

    const stats = errorTracker.getStatistics();
    expect(stats.bySource.parser).toBe(1);
    expect(stats.bySource.compiler).toBe(1);
    expect(stats.bySource.ai).toBe(1);
    expect(stats.bySource.user).toBe(1);
  });

  it('should track errors from different categories', async () => {
    await errorHandler.handleError('Syntax issue', 'PARSER', { code: 'SYNTAX_ERROR' });
    await errorHandler.handleError('Timeout issue', 'AI', { code: 'TIMEOUT_ERROR' });
    await errorHandler.handleError('Config issue', 'SYSTEM', { code: 'CONFIG_ERROR' });

    const stats = errorTracker.getStatistics();
    expect(stats.byCategory.syntax).toBe(1);
    expect(stats.byCategory.timeout).toBe(1);
    expect(stats.byCategory.configuration).toBe(1);
  });
});
