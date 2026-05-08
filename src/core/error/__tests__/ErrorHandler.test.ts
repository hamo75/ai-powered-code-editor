// ═══════════════════════════════════════════════════════════════
// Error Handler Tests
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorHandler } from '../ErrorHandler';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockNotificationCallback: any;

  beforeEach(() => {
    mockNotificationCallback = vi.fn();
    errorHandler = new ErrorHandler({
      enableNotifications: true,
      enableLogging: false, // Disable logging for tests
      notifyThreshold: 'warn',
    });
    errorHandler.setNotificationCallback(mockNotificationCallback);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handleError', () => {
    it('should handle string errors', async () => {
      await errorHandler.handleError('Test error', 'GENERAL', {}, 'error');

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'error',
        'Test error',
        undefined
      );
    });

    it('should handle Error objects', async () => {
      const error = new Error('Test error message');
      error.stack = 'Test stack trace';

      await errorHandler.handleError(error, 'GENERAL', {}, 'error');

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'error',
        'Test error message',
        undefined
      );
    });

    it('should respect notification threshold', async () => {
      await errorHandler.handleError('Debug message', 'GENERAL', {}, 'debug');

      expect(mockNotificationCallback).not.toHaveBeenCalled();
    });

    it('should show notifications for errors at or above threshold', async () => {
      await errorHandler.handleError('Warning message', 'GENERAL', {}, 'warn');

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'warning',
        'Warning message',
        undefined
      );
    });
  });

  describe('handleRecoverableError', () => {
    it('should retry operations and succeed', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('First attempt fails'))
        .mockResolvedValueOnce('Success');

      const result = await errorHandler.handleRecoverableError(
        mockOperation,
        'GENERAL',
        { userMessage: 'Custom message' }
      );

      expect(result).toBe('Success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'warning',
        'Custom message',
        undefined
      );
    });

    it('should return null after max retries', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Always fails'));

      const result = await errorHandler.handleRecoverableError(
        mockOperation,
        'GENERAL'
      );

      expect(result).toBeNull();
      expect(mockOperation).toHaveBeenCalledTimes(3); // maxRetries default is 3
      expect(mockNotificationCallback).toHaveBeenCalledTimes(4); // 3 warnings + 1 error
    });
  });

  describe('handleValidationError', () => {
    it('should handle validation errors as warnings', async () => {
      await errorHandler.handleValidationError('Invalid input', 'UI');

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'warning',
        'Invalid input',
        undefined
      );
    });
  });

  describe('handleNetworkError', () => {
    it('should handle network errors with specific messaging', async () => {
      await errorHandler.handleNetworkError(new Error('Connection failed'), 'AI');

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'error',
        'Network connection issue. Please check your internet connection.',
        undefined
      );
    });
  });

  describe('handleFileSystemError', () => {
    it('should handle file system errors with specific messaging', async () => {
      await errorHandler.handleFileSystemError(new Error('Permission denied'), 'FILE_SYSTEM');

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'error',
        'File system operation failed. Please check file permissions and disk space.',
        undefined
      );
    });
  });
});