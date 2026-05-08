// ═══════════════════════════════════════════════════════════════
// Error Tracker Tests
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorTracker, errorTracker } from '../ErrorTracker';

describe('ErrorTracker', () => {
  let tracker: ErrorTracker;

  beforeEach(() => {
    tracker = ErrorTracker.getInstance();
    tracker.clear();
  });

  describe('track', () => {
    it('should track a new error', () => {
      const error = tracker.track({
        message: 'Test error',
        severity: 'error',
        category: 'runtime',
        source: 'system',
      });

      expect(error.id).toBeDefined();
      expect(error.message).toBe('Test error');
      expect(error.severity).toBe('error');
      expect(error.occurrenceCount).toBe(1);
      expect(error.resolved).toBe(false);
    });

    it('should aggregate duplicate errors', () => {
      const error1 = tracker.track({ message: 'Duplicate error' });
      const error2 = tracker.track({ message: 'Duplicate error' });

      expect(error1.id).toBe(error2.id);
      expect(error1.occurrenceCount).toBe(2);
    });

    it('should track error with metadata', () => {
      const error = tracker.track({
        message: 'File error',
        category: 'filesystem',
        metadata: {
          fileId: 'file-123',
          fileName: 'test.dart',
          line: 42,
          column: 5,
        },
      });

      expect(error.metadata?.fileId).toBe('file-123');
      expect(error.metadata?.fileName).toBe('test.dart');
      expect(error.metadata?.line).toBe(42);
    });
  });

  describe('resolve', () => {
    it('should resolve an error', () => {
      const error = tracker.track({ message: 'To be resolved' });
      
      const result = tracker.resolve(error.id);
      
      expect(result).toBe(true);
      expect(error.resolved).toBe(true);
      expect(error.resolvedAt).toBeDefined();
    });

    it('should return false for non-existent error', () => {
      const result = tracker.resolve('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('getErrors', () => {
    it('should return all errors sorted by severity', () => {
      tracker.track({ message: 'Info', severity: 'info' });
      tracker.track({ message: 'Critical', severity: 'critical' });
      tracker.track({ message: 'Warning', severity: 'warning' });
      tracker.track({ message: 'Error', severity: 'error' });

      const errors = tracker.getErrors();

      expect(errors[0].severity).toBe('critical');
      expect(errors[1].severity).toBe('error');
      expect(errors[2].severity).toBe('warning');
      expect(errors[3].severity).toBe('info');
    });

    it('should filter errors by severity', () => {
      tracker.track({ message: 'Error 1', severity: 'error' });
      tracker.track({ message: 'Warning 1', severity: 'warning' });
      tracker.track({ message: 'Error 2', severity: 'error' });

      const errors = tracker.getErrors({ severity: 'error' });

      expect(errors.length).toBe(2);
      expect(errors.every(e => e.severity === 'error')).toBe(true);
    });

    it('should filter errors by search query', () => {
      tracker.track({ message: 'Network connection failed' });
      tracker.track({ message: 'File not found' });
      tracker.track({ message: 'Network timeout' });

      const errors = tracker.getErrors({ searchQuery: 'network' });

      expect(errors.length).toBe(2);
      expect(errors.every(e => 
        e.message.toLowerCase().includes('network')
      )).toBe(true);
    });
  });

  describe('getStatistics', () => {
    it('should return accurate statistics', () => {
      tracker.track({ message: 'Critical error', severity: 'critical' });
      tracker.track({ message: 'Error 1', severity: 'error' });
      tracker.track({ message: 'Error 2', severity: 'error' });
      tracker.track({ message: 'Warning', severity: 'warning' });

      const stats = tracker.getStatistics();

      expect(stats.total).toBe(4);
      expect(stats.bySeverity.critical).toBe(1);
      expect(stats.bySeverity.error).toBe(2);
      expect(stats.bySeverity.warning).toBe(1);
      expect(stats.unresolved).toBe(4);
      expect(stats.resolved).toBe(0);
    });

    it('should count resolved errors separately', () => {
      const error = tracker.track({ message: 'Will be resolved' });
      tracker.track({ message: 'Unresolved' });
      
      tracker.resolve(error.id);

      const stats = tracker.getStatistics();

      expect(stats.resolved).toBe(1);
      expect(stats.unresolved).toBe(1);
    });

    it('should calculate top errors', () => {
      tracker.track({ message: 'Common error' });
      tracker.track({ message: 'Common error' });
      tracker.track({ message: 'Common error' });
      tracker.track({ message: 'Rare error' });

      const stats = tracker.getStatistics();

      expect(stats.topErrors.length).toBeGreaterThan(0);
      expect(stats.topErrors[0].message).toContain('Common error');
      expect(stats.topErrors[0].count).toBe(3);
    });
  });

  describe('subscribe', () => {
    it('should notify subscribers when error is tracked', () => {
      const listener = vi.fn();
      tracker.subscribe(listener);

      tracker.track({ message: 'New error' });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].message).toBe('New error');
    });

    it('should notify subscribers when error is resolved', () => {
      const listener = vi.fn();
      tracker.subscribe(listener);

      const error = tracker.track({ message: 'To resolve' });
      tracker.resolve(error.id);

      expect(listener).toHaveBeenCalledTimes(2); // track + resolve
    });

    it('should unsubscribe correctly', () => {
      const listener = vi.fn();
      const unsubscribe = tracker.subscribe(listener);

      unsubscribe();

      tracker.track({ message: 'After unsubscribe' });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should remove old resolved errors', async () => {
      // Set short timeout for testing
      (tracker as any).autoResolveTimeout = 100;

      const error = tracker.track({ message: 'Will be cleaned' });
      tracker.resolve(error.id);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      const removed = tracker.cleanup();

      expect(removed).toBe(1);
      expect(tracker.getError(error.id)).toBeUndefined();
    });
  });

  describe('export', () => {
    it('should export errors as JSON', () => {
      tracker.track({ 
        message: 'Export test', 
        severity: 'error',
        category: 'runtime' 
      });

      const json = tracker.export();
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
      expect(parsed[0].message).toBe('Export test');
    });

    it('should export filtered errors', () => {
      tracker.track({ message: 'Error', severity: 'error' });
      tracker.track({ message: 'Warning', severity: 'warning' });

      const json = tracker.export({ severity: 'error' });
      const parsed = JSON.parse(json);

      expect(parsed.length).toBe(1);
      expect(parsed[0].severity).toBe('error');
    });
  });

  describe('resolveByFilter', () => {
    it('should resolve multiple errors by filter', () => {
      tracker.track({ message: 'Error 1', severity: 'error' });
      tracker.track({ message: 'Error 2', severity: 'error' });
      tracker.track({ message: 'Warning', severity: 'warning' });

      const count = tracker.resolveByFilter({ severity: 'error' });

      expect(count).toBe(2);
      
      const errors = tracker.getErrors();
      expect(errors.filter(e => e.severity === 'error' && !e.resolved).length).toBe(0);
    });
  });
});
