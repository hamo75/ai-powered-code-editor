// ═══════════════════════════════════════════════════════════════
// 🎯 Error Tracker Panel Component
// Professional error tracking UI with real-time updates
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { errorTracker, TrackedError, ErrorFilter, ErrorStatistics } from '../core/error/ErrorTracker';
import { LogContext } from '../core/logger/UnifiedLogger';

interface ErrorTrackerPanelProps {
  onClose?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const ErrorTrackerPanel: React.FC<ErrorTrackerPanelProps> = ({
  onClose,
  autoRefresh = true,
  refreshInterval = 5000,
}) => {
  const [errors, setErrors] = useState<TrackedError[]>([]);
  const [statistics, setStatistics] = useState<ErrorStatistics | null>(null);
  const [selectedError, setSelectedError] = useState<TrackedError | null>(null);
  const [filter, setFilter] = useState<ErrorFilter>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    critical: true,
    error: true,
    warning: false,
    info: false,
  });

  // Subscribe to error events
  useEffect(() => {
    const unsubscribe = errorTracker.subscribe((error) => {
      setErrors(errorTracker.getErrors(filter));
      setStatistics(errorTracker.getStatistics());
    });

    return () => {
      unsubscribe();
    };
  }, [filter]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const refresh = () => {
      setErrors(errorTracker.getErrors(filter));
      setStatistics(errorTracker.getStatistics());
    };

    refresh(); // Initial load
    const interval = setInterval(refresh, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, filter]);

  // Filter errors based on search query
  const filteredErrors = useMemo(() => {
    if (!searchQuery) return errors;
    
    const query = searchQuery.toLowerCase();
    return errors.filter(
      (error) =>
        error.message.toLowerCase().includes(query) ||
        error.userMessage?.toLowerCase().includes(query) ||
        error.code?.toLowerCase().includes(query) ||
        error.context.toLowerCase().includes(query)
    );
  }, [errors, searchQuery]);

  // Group errors by severity
  const groupedErrors = useMemo(() => {
    const groups: Record<string, TrackedError[]> = {
      critical: [],
      error: [],
      warning: [],
      info: [],
    };

    filteredErrors.forEach((error) => {
      groups[error.severity].push(error);
    });

    return groups;
  }, [filteredErrors]);

  // Handle resolve error
  const handleResolve = (errorId: string) => {
    errorTracker.resolve(errorId);
    setErrors(errorTracker.getErrors(filter));
    setStatistics(errorTracker.getStatistics());
    if (selectedError?.id === errorId) {
      setSelectedError(null);
    }
  };

  // Handle clear all resolved
  const handleClearResolved = () => {
    errorTracker.cleanup();
    setErrors(errorTracker.getErrors(filter));
    setStatistics(errorTracker.getStatistics());
  };

  // Handle export errors
  const handleExport = () => {
    const exported = errorTracker.export(filter);
    const blob = new Blob([exported], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `errors-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Toggle group expansion
  const toggleGroup = (severity: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [severity]: !prev[severity],
    }));
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-900/50 border-red-500 text-red-300';
      case 'error':
        return 'bg-orange-900/50 border-orange-500 text-orange-300';
      case 'warning':
        return 'bg-yellow-900/50 border-yellow-500 text-yellow-300';
      case 'info':
        return 'bg-blue-900/50 border-blue-500 text-blue-300';
      default:
        return 'bg-gray-800 border-gray-600 text-gray-300';
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      syntax: '📝',
      runtime: '⚡',
      network: '🌐',
      filesystem: '📁',
      validation: '✅',
      permission: '🔒',
      configuration: '⚙️',
      memory: '💾',
      timeout: '⏱️',
      unknown: '❓',
    };
    return icons[category] || '❓';
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: 'short',
    });
  };

  // Format relative time
  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `منذ ${days} يوم`;
    if (hours > 0) return `منذ ${hours} ساعة`;
    if (minutes > 0) return `منذ ${minutes} دقيقة`;
    return 'الآن';
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-white" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-[#252526]">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white">🎯 تتبع الأخطاء</h2>
          {statistics && (
            <span className="text-xs px-2 py-1 bg-blue-600 rounded-full">
              {statistics.total} خطأ
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            title="تصدير الأخطاء"
          >
            📤 تصدير
          </button>
          <button
            onClick={handleClearResolved}
            className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 rounded transition-colors"
            title="مسح المحلولة"
          >
            🧹 مسح
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${
              showFilters ? 'bg-purple-600' : 'bg-gray-600 hover:bg-gray-700'
            }`}
            title="فلاتر"
          >
            🔍 فلاتر
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-red-600 rounded transition-colors"
              title="إغلاق"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Statistics Bar */}
      {statistics && (
        <div className="grid grid-cols-5 gap-2 p-3 border-b border-gray-700 bg-[#2d2d30]">
          <div className="text-center p-2 bg-red-900/30 rounded border border-red-500/30">
            <div className="text-2xl font-bold text-red-400">{statistics.criticalCount}</div>
            <div className="text-xs text-red-300">حرجة</div>
          </div>
          <div className="text-center p-2 bg-orange-900/30 rounded border border-orange-500/30">
            <div className="text-2xl font-bold text-orange-400">{statistics.bySeverity.error}</div>
            <div className="text-xs text-orange-300">أخطاء</div>
          </div>
          <div className="text-center p-2 bg-yellow-900/30 rounded border border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-400">{statistics.bySeverity.warning}</div>
            <div className="text-xs text-yellow-300">تحذيرات</div>
          </div>
          <div className="text-center p-2 bg-blue-900/30 rounded border border-blue-500/30">
            <div className="text-2xl font-bold text-blue-400">{statistics.bySeverity.info}</div>
            <div className="text-xs text-blue-300">معلومات</div>
          </div>
          <div className="text-center p-2 bg-green-900/30 rounded border border-green-500/30">
            <div className="text-2xl font-bold text-green-400">{statistics.resolved}</div>
            <div className="text-xs text-green-300">محلولّة</div>
          </div>
        </div>
      )}

      {/* Trend Indicator */}
      {statistics && (
        <div className="px-4 py-2 text-xs border-b border-gray-700 bg-[#252526]">
          <span className="text-gray-400">الاتجاه: </span>
          <span
            className={`font-bold ${
              statistics.trend.change > 0
                ? 'text-red-400'
                : statistics.trend.change < 0
                ? 'text-green-400'
                : 'text-gray-400'
            }`}
          >
            {statistics.trend.change > 0 ? '↑' : statistics.trend.change < 0 ? '↓' : '→'}
            {Math.abs(statistics.trend.change).toFixed(1)}%
          </span>
          <span className="text-gray-500 mr-2">
            ({statistics.trend.last24h} خطأ جديد في 24 ساعة)
          </span>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 border-b border-gray-700 bg-[#2d2d30] space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">البحث</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في الرسائل..."
              className="w-full px-3 py-2 bg-[#1e1e1e] border border-gray-600 rounded text-sm focus:border-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">الشدة</label>
              <select
                value={filter.severity || ''}
                onChange={(e) =>
                  setFilter({ ...filter, severity: e.target.value as any || undefined })
                }
                className="w-full px-3 py-2 bg-[#1e1e1e] border border-gray-600 rounded text-sm focus:border-blue-500 outline-none"
              >
                <option value="">الكل</option>
                <option value="critical">حرجة</option>
                <option value="error">خطأ</option>
                <option value="warning">تحذير</option>
                <option value="info">معلومات</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">الحالة</label>
              <select
                value={filter.resolved === undefined ? '' : filter.resolved ? 'resolved' : 'unresolved'}
                onChange={(e) =>
                  setFilter({
                    ...filter,
                    resolved: e.target.value === '' ? undefined : e.target.value === 'resolved',
                  })
                }
                className="w-full px-3 py-2 bg-[#1e1e1e] border border-gray-600 rounded text-sm focus:border-blue-500 outline-none"
              >
                <option value="">الكل</option>
                <option value="unresolved">غير محلولة</option>
                <option value="resolved">محلولة</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">التصنيف</label>
              <select
                value={filter.category || ''}
                onChange={(e) =>
                  setFilter({ ...filter, category: e.target.value as any || undefined })
                }
                className="w-full px-3 py-2 bg-[#1e1e1e] border border-gray-600 rounded text-sm focus:border-blue-500 outline-none"
              >
                <option value="">الكل</option>
                <option value="syntax">Syntax</option>
                <option value="runtime">Runtime</option>
                <option value="network">Network</option>
                <option value="filesystem">Filesystem</option>
                <option value="validation">Validation</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">المصدر</label>
              <select
                value={filter.source || ''}
                onChange={(e) =>
                  setFilter({ ...filter, source: e.target.value as any || undefined })
                }
                className="w-full px-3 py-2 bg-[#1e1e1e] border border-gray-600 rounded text-sm focus:border-blue-500 outline-none"
              >
                <option value="">الكل</option>
                <option value="parser">Parser</option>
                <option value="compiler">Compiler</option>
                <option value="analyzer">Analyzer</option>
                <option value="ai">AI</option>
                <option value="user">User</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => {
              setFilter({});
              setSearchQuery('');
            }}
            className="w-full px-3 py-2 text-xs bg-gray-600 hover:bg-gray-700 rounded transition-colors"
          >
            إعادة تعيين الفلاتر
          </button>
        </div>
      )}

      {/* Search Bar (Quick) */}
      {!showFilters && (
        <div className="p-3 border-b border-gray-700 bg-[#252526]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 بحث سريع..."
            className="w-full px-3 py-2 bg-[#1e1e1e] border border-gray-600 rounded text-sm focus:border-blue-500 outline-none"
          />
        </div>
      )}

      {/* Error List */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedErrors).map(([severity, severityErrors]) => {
          if (severityErrors.length === 0) return null;

          return (
            <div key={severity}>
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(severity)}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm font-semibold border-y border-gray-700 transition-colors ${getSeverityColor(
                  severity
                )}`}
              >
                <div className="flex items-center gap-2">
                  <span>{expandedGroups[severity] ? '▼' : '▶'}</span>
                  <span>
                    {severity === 'critical'
                      ? 'حرجة'
                      : severity === 'error'
                      ? 'أخطاء'
                      : severity === 'warning'
                      ? 'تحذيرات'
                      : 'معلومات'}
                  </span>
                  <span className="text-xs opacity-75">({severityErrors.length})</span>
                </div>
              </button>

              {/* Error Items */}
              {expandedGroups[severity] && (
                <div>
                  {severityErrors.map((error) => (
                    <div
                      key={error.id}
                      onClick={() => setSelectedError(error)}
                      className={`p-3 border-b border-gray-700 cursor-pointer transition-colors ${
                        selectedError?.id === error.id
                          ? 'bg-blue-900/30 border-blue-500/50'
                          : 'hover:bg-[#2a2a2b]'
                      } ${error.resolved ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{getCategoryIcon(error.category)}</span>
                            <span className="text-xs px-2 py-0.5 bg-gray-700 rounded">
                              {error.category}
                            </span>
                            {error.recoverable && (
                              <span className="text-xs px-2 py-0.5 bg-green-900/50 text-green-300 rounded">
                                قابل للاسترداد
                              </span>
                            )}
                            {error.resolved && (
                              <span className="text-xs px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded">
                                ✓ محلول
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-200 truncate">{error.message}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span>{formatRelativeTime(error.timestamp)}</span>
                            <span>•</span>
                            <span>{error.occurrenceCount} مرات</span>
                            {error.occurrenceCount > 1 && (
                              <>
                                <span>•</span>
                                <span>آخر ظهور: {formatRelativeTime(error.lastOccurrence)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {!error.resolved && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolve(error.id);
                            }}
                            className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 rounded transition-colors shrink-0"
                          >
                            ✓ حل
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredErrors.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <div className="text-4xl mb-3">✓</div>
            <p className="text-sm">لا توجد أخطاء مطابقة</p>
          </div>
        )}
      </div>

      {/* Error Details Panel */}
      {selectedError && (
        <div className="border-t border-gray-700 bg-[#252526] max-h-96 overflow-y-auto">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">تفاصيل الخطأ</h3>
              <button
                onClick={() => setSelectedError(null)}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-400">الرسالة:</span>
                <p className="text-gray-200 mt-1">{selectedError.message}</p>
              </div>

              {selectedError.userMessage && (
                <div>
                  <span className="text-gray-400">رسالة المستخدم:</span>
                  <p className="text-gray-200 mt-1">{selectedError.userMessage}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-400">التصنيف:</span>
                  <p className="text-gray-200 mt-1 capitalize">{selectedError.category}</p>
                </div>
                <div>
                  <span className="text-gray-400">المصدر:</span>
                  <p className="text-gray-200 mt-1 capitalize">{selectedError.source}</p>
                </div>
                <div>
                  <span className="text-gray-400">السياق:</span>
                  <p className="text-gray-200 mt-1">{selectedError.context}</p>
                </div>
                <div>
                  <span className="text-gray-400">الشدة:</span>
                  <p
                    className={`mt-1 capitalize ${
                      selectedError.severity === 'critical'
                        ? 'text-red-400'
                        : selectedError.severity === 'error'
                        ? 'text-orange-400'
                        : selectedError.severity === 'warning'
                        ? 'text-yellow-400'
                        : 'text-blue-400'
                    }`}
                  >
                    {selectedError.severity}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-400">وقت الحدوث:</span>
                  <p className="text-gray-200 mt-1">{formatTimestamp(selectedError.timestamp)}</p>
                </div>
                <div>
                  <span className="text-gray-400">عدد المرات:</span>
                  <p className="text-gray-200 mt-1">{selectedError.occurrenceCount}</p>
                </div>
              </div>

              {selectedError.code && (
                <div>
                  <span className="text-gray-400">الرمز:</span>
                  <code className="block mt-1 px-2 py-1 bg-black/50 rounded text-red-300 text-xs">
                    {selectedError.code}
                  </code>
                </div>
              )}

              {selectedError.stack && (
                <div>
                  <span className="text-gray-400">Stack Trace:</span>
                  <pre className="mt-1 p-2 bg-black/50 rounded text-xs text-gray-400 overflow-x-auto max-h-32">
                    {selectedError.stack}
                  </pre>
                </div>
              )}

              {selectedError.data && Object.keys(selectedError.data).length > 0 && (
                <div>
                  <span className="text-gray-400">بيانات إضافية:</span>
                  <pre className="mt-1 p-2 bg-black/50 rounded text-xs text-gray-400 overflow-x-auto max-h-32">
                    {JSON.stringify(selectedError.data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedError.metadata && (
                <div>
                  <span className="text-gray-400">بيانات وصفية:</span>
                  <pre className="mt-1 p-2 bg-black/50 rounded text-xs text-gray-400 overflow-x-auto max-h-32">
                    {JSON.stringify(selectedError.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-gray-700">
                {!selectedError.resolved ? (
                  <button
                    onClick={() => handleResolve(selectedError.id)}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                  >
                    ✓ حل هذا الخطأ
                  </button>
                ) : (
                  <div className="flex-1 px-4 py-2 bg-blue-900/30 border border-blue-500/30 rounded text-center text-sm text-blue-300">
                    ✓ تم حل هذا الخطأ
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrorTrackerPanel;
