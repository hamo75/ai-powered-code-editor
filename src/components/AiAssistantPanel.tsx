import React, { useState, useRef, useEffect } from 'react';
import { 
  Cpu, Sparkles, Wand2, Zap, CheckCircle, AlertCircle, 
  X, ChevronDown, ChevronUp, Loader2, MessageSquare,
  Play, StopCircle, RefreshCw, Settings2, Lightbulb
} from 'lucide-react';
import { useStore } from '../store/useStore';

interface AiAssistantPanelProps {
  onClose?: () => void;
}

/**
 * لوحة مساعد الذكاء الاصطناعي المتقدمة
 * توفر واجهة تفاعلية شاملة لميزات التحليل والإصلاح الذكي
 */
export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({ onClose }) => {
  const {
    runDartAnalyze,
    isAnalyzing,
    dartIssues,
    problems,
    fixProblemWithAI,
    isFixingWithAI,
    fixAllProblemsWithAI,
    smartFixAll,
    isSmartFixing,
    smartFixReport,
    smartFixLog,
    clearSmartFixReport,
    executeAgentTask,
    isAgentRunning: isExecutingAgent,
    pendingTask,
    setPendingTask,
    executePendingTask,
    toggleDiscussionMode,
    discussionMode: isDiscussionMode,
    apiKey,
    addNotification,
    files,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'analyze' | 'smart-fix' | 'agent'>('analyze');
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [autoRunAnalysis, setAutoRunAnalysis] = useState(false);
  const taskInputRef = useRef<HTMLTextAreaElement>(null);

  // تشغيل التحليل التلقائي عند التبويب
  useEffect(() => {
    if (activeTab === 'analyze' && dartIssues.length === 0 && !isAnalyzing) {
      runDartAnalyze();
    }
  }, [activeTab]);

  // تحديث المشاكل المحددة
  const toggleIssueSelection = (issueId: string) => {
    const newSelected = new Set(selectedIssues);
    if (newSelected.has(issueId)) {
      newSelected.delete(issueId);
    } else {
      newSelected.add(issueId);
    }
    setSelectedIssues(newSelected);
  };

  const selectAllIssues = () => {
    setSelectedIssues(new Set(dartIssues.map(i => i.id)));
  };

  const clearSelection = () => {
    setSelectedIssues(new Set());
  };

  const handleFixSelected = async () => {
    if (selectedIssues.size === 0) return;
    
    addNotification({
      id: Date.now().toString(),
      type: 'info',
      message: `جاري إصلاح ${selectedIssues.size} مشكلة مختارة...`,
    });

    for (const issueId of selectedIssues) {
      await fixProblemWithAI(issueId);
    }

    addNotification({
      id: Date.now().toString(),
      type: 'success',
      message: 'تم إصلاح المشاكل المختارة',
    });
    
    clearSelection();
  };

  const handleExecuteTask = () => {
    if (!taskDescription.trim()) return;
    
    addNotification({
      id: Date.now().toString(),
      type: 'info',
      message: 'جاري تنفيذ المهمة...',
    });

    executeAgentTask(taskDescription);
    setTaskDescription('');
  };

  const getStats = () => {
    const errors = problems.filter(p => p.severity === 'error').length;
    const warnings = problems.filter(p => p.severity === 'warning').length;
    const infos = problems.filter(p => p.severity === 'info').length;
    return { errors, warnings, infos, total: problems.length };
  };

  const stats = getStats();

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-[#2d2d2d]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d2d2d] bg-gradient-to-r from-[#007acc]/10 to-[#6a0dad]/10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-[#007acc] to-[#6a0dad] rounded-lg">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">مساعد الذكاء الاصطناعي</h2>
            <p className="text-xs text-[#6c6c6c]">تحليل ذكي وإصلاح تلقائي</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {apiKey ? (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle size={12} /> متصل
            </span>
          ) : (
            <span className="text-xs text-yellow-400 flex items-center gap-1">
              <AlertCircle size={12} /> يحتاج API Key
            </span>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-[#6c6c6c] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[#2d2d2d] bg-[#252526]">
        <button
          onClick={() => setActiveTab('analyze')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-all ${
            activeTab === 'analyze'
              ? 'bg-[#007acc] text-white shadow-lg'
              : 'text-[#6c6c6c] hover:text-white hover:bg-[#3c3c3c]'
          }`}
        >
          <RefreshCw size={14} className={isAnalyzing ? 'animate-spin' : ''} />
          تحليل
          {dartIssues.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full">
              {dartIssues.length}
            </span>
          )}
        </button>
        
        <button
          onClick={() => setActiveTab('smart-fix')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-all ${
            activeTab === 'smart-fix'
              ? 'bg-gradient-to-r from-[#007acc] to-[#6a0dad] text-white shadow-lg'
              : 'text-[#6c6c6c] hover:text-white hover:bg-[#3c3c3c]'
          }`}
        >
          <Wand2 size={14} />
          إصلاح ذكي
          {smartFixReport && (
            <span className="text-[9px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full">
              ✓
            </span>
          )}
        </button>
        
        <button
          onClick={() => setActiveTab('agent')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-all ${
            activeTab === 'agent'
              ? 'bg-[#6a0dad] text-white shadow-lg'
              : 'text-[#6c6c6c] hover:text-white hover:bg-[#3c3c3c]'
          }`}
        >
          <Cpu size={14} className={isExecutingAgent ? 'animate-pulse' : ''} />
          وكيل المهام
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'analyze' && (
          <div className="p-4 space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-400">{stats.errors}</div>
                <div className="text-xs text-red-300/70">أخطاء</div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-400">{stats.warnings}</div>
                <div className="text-xs text-yellow-300/70">تحذيرات</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">{stats.infos}</div>
                <div className="text-xs text-blue-300/70">معلومات</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={runDartAnalyze}
                disabled={isAnalyzing}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isAnalyzing
                    ? 'bg-[#3c3c3c] text-[#6c6c6c] cursor-not-allowed'
                    : 'bg-[#007acc] hover:bg-[#0098ff] text-white shadow-lg hover:shadow-xl'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    جاري التحليل...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    تشغيل Dart Analyze
                  </>
                )}
              </button>

              {dartIssues.length > 0 && apiKey && (
                <>
                  <div className="flex gap-2">
                    <button
                      onClick={handleFixSelected}
                      disabled={selectedIssues.size === 0 || isFixingWithAI}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        selectedIssues.size === 0 || isFixingWithAI
                          ? 'bg-[#3c3c3c] text-[#6c6c6c] cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                      }`}
                    >
                      <Wand2 size={14} />
                      إصلاح المحدد ({selectedIssues.size})
                    </button>
                    
                    <button
                      onClick={fixAllProblemsWithAI}
                      disabled={isFixingWithAI}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isFixingWithAI
                          ? 'bg-[#3c3c3c] text-[#6c6c6c] cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg'
                      }`}
                    >
                      <Zap size={14} />
                      إصلاح الكل
                    </button>
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <button
                      onClick={selectAllIssues}
                      className="text-xs text-[#007acc] hover:text-[#0098ff]"
                    >
                      تحديد الكل
                    </button>
                    {selectedIssues.size > 0 && (
                      <button
                        onClick={clearSelection}
                        className="text-xs text-[#6c6c6c] hover:text-white"
                      >
                        مسح التحديد
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Issues List */}
            {dartIssues.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-[#ccc]">المشاكل المكتشفة</h3>
                  <span className="text-xs text-[#6c6c6c]">{dartIssues.length} مشكلة</span>
                </div>
                
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {dartIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`group flex items-start gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                        selectedIssues.has(issue.id)
                          ? 'bg-[#007acc]/20 border-[#007acc]/50'
                          : 'bg-[#252526] border-[#2d2d2d] hover:border-[#3c3c3c]'
                      }`}
                      onClick={() => toggleIssueSelection(issue.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIssues.has(issue.id)}
                        onChange={() => {}}
                        className="mt-0.5 w-3 h-3 rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#007acc] focus:ring-[#007acc]/50"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                            issue.severity === 'error' ? 'bg-red-500/20 text-red-400' :
                            issue.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {issue.severity.toUpperCase()}
                          </span>
                          <span className="text-xs text-[#6c6c6c] truncate">{issue.fileName}:{issue.line}</span>
                        </div>
                        <p className="text-xs text-[#ccc] line-clamp-2">{issue.message}</p>
                      </div>
                      {apiKey && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fixProblemWithAI(issue.id);
                          }}
                          disabled={isFixingWithAI}
                          className="opacity-0 group-hover:opacity-100 p-1.5 bg-[#007acc] hover:bg-[#0098ff] text-white rounded transition-all"
                          title="إصلاح بـ AI"
                        >
                          <Wand2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advanced Options */}
            <div className="border-t border-[#2d2d2d] pt-3">
              <button
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="flex items-center gap-2 text-xs text-[#6c6c6c] hover:text-white transition-colors"
              >
                {showAdvancedOptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                خيارات متقدمة
              </button>
              
              {showAdvancedOptions && (
                <div className="mt-2 space-y-2">
                  <label className="flex items-center gap-2 text-xs text-[#ccc]">
                    <input
                      type="checkbox"
                      checked={autoRunAnalysis}
                      onChange={(e) => setAutoRunAnalysis(e.target.checked)}
                      className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#007acc] focus:ring-[#007acc]/50"
                    />
                    تشغيل التحليل تلقائياً عند الفتح
                  </label>
                  
                  <button
                    onClick={toggleDiscussionMode}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isDiscussionMode
                        ? 'bg-purple-600/20 border border-purple-500/50 text-purple-400'
                        : 'bg-[#252526] border border-[#2d2d2d] text-[#6c6c6c] hover:text-white'
                    }`}
                  >
                    <MessageSquare size={14} />
                    {isDiscussionMode ? 'تعطيل وضع النقاش' : 'تفعيل وضع النقاش'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'smart-fix' && (
          <div className="p-4 space-y-4">
            {/* Smart Fix Info */}
            <div className="bg-gradient-to-br from-[#007acc]/10 to-[#6a0dad]/10 border border-[#007acc]/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Lightbulb size={20} className="text-[#007acc] mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">الإصلاح الذكي المتقدم</h3>
                  <p className="text-xs text-[#8cb4d8] leading-relaxed">
                    نظام ذكي يقوم بتحليل جميع المشاكل وإصلاحها تلقائياً باستخدام الذكاء الاصطناعي،
                    مع تتبع التقدم وعرض تقارير مفصلة عن كل عملية إصلاح.
                  </p>
                </div>
              </div>
            </div>

            {/* Smart Fix Button */}
            <button
              onClick={smartFixAll}
              disabled={isSmartFixing || problems.length === 0 || !apiKey}
              className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-sm font-bold transition-all ${
                isSmartFixing
                  ? 'bg-gradient-to-r from-[#007acc]/50 to-[#6a0dad]/50 text-white/70 cursor-wait'
                  : problems.length === 0 || !apiKey
                  ? 'bg-[#3c3c3c] text-[#6c6c6c] cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#007acc] to-[#6a0dad] hover:from-[#0098ff] hover:to-[#8b5cf6] text-white shadow-xl hover:shadow-2xl transform hover:scale-105'
              }`}
            >
              {isSmartFixing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <div className="flex flex-col items-start">
                    <span>جاري الإصلاح الذكي...</span>
                    <span className="text-xs opacity-70">لا تغلق الصفحة</span>
                  </div>
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  <div className="flex flex-col items-start">
                    <span>تشغيل Smart Fix</span>
                    <span className="text-xs opacity-70">
                      {problems.length > 0 ? `سيتم إصلاح ${problems.length} مشكلة` : 'لا توجد مشاكل'}
                    </span>
                  </div>
                </>
              )}
            </button>

            {/* Progress Log */}
            {isSmartFixing && smartFixLog.length > 0 && (
              <div className="bg-[#0a1628] border border-[#007acc]/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 size={14} className="text-[#007acc] animate-spin" />
                  <span className="text-xs font-semibold text-[#8cb4d8]">سجل العمليات</span>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto font-mono text-xs">
                  {smartFixLog.slice(-10).map((log, i) => (
                    <div key={i} className="text-[#4a6a8a] truncate">
                      <span className="text-[#007acc] mr-2">›</span>{log}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Report */}
            {smartFixReport && !isSmartFixing && (
              <div className="bg-[#0a1628] border border-[#007acc]/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-400" />
                    <h3 className="text-sm font-semibold text-white">تقرير الإصلاح</h3>
                  </div>
                  <button
                    onClick={clearSmartFixReport}
                    className="p-1 text-[#6c6c6c] hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                
                <div className="space-y-2 text-xs font-mono">
                  {(smartFixReport as any).fileResults?.slice(-5).map((result: any, i: number) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 ${
                        result.success ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {result.success ? '✓' : '✗'}
                      <span className="truncate">{result.fileName}</span>
                      {result.error && (
                        <span className="text-red-400/70 text-[10px]">({result.error})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'agent' && (
          <div className="p-4 space-y-4">
            {/* Agent Info */}
            <div className="bg-gradient-to-br from-[#6a0dad]/10 to-[#007acc]/10 border border-[#6a0dad]/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Cpu size={20} className="text-[#6a0dad] mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">وكيل المهام الذكي</h3>
                  <p className="text-xs text-[#b89bd8] leading-relaxed">
                    صف المهمة التي تريد تنفيذها وسيقوم الوكيل بتخطيط وتنفيذ الخطوات اللازمة تلقائياً.
                  </p>
                </div>
              </div>
            </div>

            {/* Task Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#ccc]">وصف المهمة</label>
              <textarea
                ref={taskInputRef}
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="مثال: أنشئ ملف widget.dart يحتوي على StatefulWidget مع counter..."
                className="w-full h-32 px-3 py-2 bg-[#252526] border border-[#2d2d2d] rounded-lg text-xs text-[#ccc] placeholder-[#4c4c4c] focus:border-[#6a0dad] focus:ring-1 focus:ring-[#6a0dad]/50 outline-none resize-none"
              />
            </div>

            {/* Execute Button */}
            <button
              onClick={handleExecuteTask}
              disabled={!taskDescription.trim() || isExecutingAgent || !apiKey}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                !taskDescription.trim() || isExecutingAgent || !apiKey
                  ? 'bg-[#3c3c3c] text-[#6c6c6c] cursor-not-allowed'
                  : 'bg-[#6a0dad] hover:bg-[#8b5cf6] text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {isExecutingAgent ? (
                <>
                  <StopCircle size={18} className="animate-pulse" />
                  جاري التنفيذ...
                </>
              ) : (
                <>
                  <Play size={18} />
                  تنفيذ المهمة
                </>
              )}
            </button>

            {/* Pending Task */}
            {pendingTask && !isExecutingAgent && (
              <div className="bg-[#252526] border border-[#2d2d2d] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#ccc]">مهمة معلّقة</span>
                  <button
                    onClick={executePendingTask}
                    className="text-xs text-[#007acc] hover:text-[#0098ff] flex items-center gap-1"
                  >
                    <Play size={12} />
                    تنفيذ
                  </button>
                </div>
                <p className="text-xs text-[#6c6c6c] line-clamp-2">{pendingTask.description}</p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="border-t border-[#2d2d2d] pt-3">
              <h4 className="text-xs font-semibold text-[#ccc] mb-2">إجراءات سريعة</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTaskDescription('أنشئ ملف main.dart مع runApp')}
                  className="px-3 py-2 bg-[#252526] hover:bg-[#2d2d2d] border border-[#2d2d2d] rounded text-xs text-[#6c6c6c] hover:text-white transition-all text-left"
                >
                  📄 إنشاء main.dart
                </button>
                <button
                  onClick={() => setTaskDescription('أضف imports للمكتبات الشائعة')}
                  className="px-3 py-2 bg-[#252526] hover:bg-[#2d2d2d] border border-[#2d2d2d] rounded text-xs text-[#6c6c6c] hover:text-white transition-all text-left"
                >
                  📦 إضافة imports
                </button>
                <button
                  onClick={() => setTaskDescription('حسّن الكود الحالي بإضافة comments')}
                  className="px-3 py-2 bg-[#252526] hover:bg-[#2d2d2d] border border-[#2d2d2d] rounded text-xs text-[#6c6c6c] hover:text-white transition-all text-left"
                >
                  💡 إضافة تعليقات
                </button>
                <button
                  onClick={() => setTaskDescription('اختبر الدوال الموجودة وأنشئ unit tests')}
                  className="px-3 py-2 bg-[#252526] hover:bg-[#2d2d2d] border border-[#2d2d2d] rounded text-xs text-[#6c6c6c] hover:text-white transition-all text-left"
                >
                  ✅ إنشاء اختبارات
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[#2d2d2d] bg-[#252526]">
        <div className="flex items-center justify-between text-[10px] text-[#6c6c6c]">
          <span>الملفات: {files.length}</span>
          <span>المشاكل: {problems.length}</span>
          {apiKey && (
            <span className="text-green-400 flex items-center gap-1">
              <CheckCircle size={10} />
              AI جاهز
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiAssistantPanel;
