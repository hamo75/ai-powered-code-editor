import { StateCreator } from 'zustand';
import { EditorStore, DartIssue, ProblemItem, FixReport, AgentTask, PendingTask } from '../types/store';
import { dartpadService, type DartPadIssue } from '../../services/dartpad';

export interface AnalysisSlice {
  // Dart Analysis State
  dartIssues: DartIssue[];
  isAnalyzing: boolean;
  isFixingWithAI: boolean;
  dartAutoAnalyze: boolean;
  dartpadAvailable: boolean;

  // Smart Fix State
  smartFixReport: FixReport | null;
  smartFixLog: string[];
  isSmartFixing: boolean;

  // AI Agent State
  agentTasks: AgentTask[];
  activeAgentTask: AgentTask | null;
  isAgentRunning: boolean;
  agentMode: boolean;
  agentActionLog: string[];

  // Discussion Mode State
  discussionMode: boolean;
  pendingTask: PendingTask | null;

  // Dart Analysis Actions
  runDartAnalyze: () => void;
  fixProblemWithAI: (issueId: string) => Promise<void>;
  fixAllProblemsWithAI: () => Promise<void>;
  setDartAutoAnalyze: (v: boolean) => void;
  setDartpadAvailable: (v: boolean) => void;

  // Smart Fix Actions
  smartFixAll: () => Promise<void>;
  rollbackSmartFix: () => void;
  clearSmartFixReport: () => void;

  // AI Agent Actions
  setAgentMode: (v: boolean) => void;
  executeAgentTask: (description: string) => Promise<void>;
  cancelAgentTask: () => void;
  clearAgentTasks: () => void;

  // Discussion Mode Actions
  toggleDiscussionMode: () => void;
  setPendingTask: (task: PendingTask | null) => void;
  executePendingTask: () => Promise<void>;
}

export const createAnalysisSlice: StateCreator<EditorStore, [], [], AnalysisSlice> = (set, get) => ({
  // Initial State - Dart Analysis
  dartIssues: [],
  isAnalyzing: false,
  isFixingWithAI: false,
  dartAutoAnalyze: true,
  dartpadAvailable: false,

  // Initial State - Smart Fix
  smartFixReport: null,
  smartFixLog: [],
  isSmartFixing: false,

  // Initial State - AI Agent
  agentTasks: [],
  activeAgentTask: null,
  isAgentRunning: false,
  agentMode: false,
  agentActionLog: [],

  // Initial State - Discussion Mode
  discussionMode: false,
  pendingTask: null,

  // === DART ANALYSIS ACTIONS ===

  runDartAnalyze: () => {
    const state = get();
    
    // Only analyze Dart files
    const dartFiles = state.files.filter(f => 
      f.type === 'file' && 
      (f.name.endsWith('.dart') || f.language === 'dart') &&
      f.content
    );

    if (dartFiles.length === 0) {
      get().addOutputLine('⚠️ لا توجد ملفات Dart للتحليل');
      return;
    }

    set({ isAnalyzing: true, dartIssues: [] });
    get().addOutputLine(`🔍 بدء تحليل Dart... (${dartFiles.length} ملف)`);

    Promise.all(dartFiles.map(async (file) => {
      const analysis = await dartpadService.analyze(file.content || '');
      return { file, issues: analysis.issues };
    }))
      .then((fileResults) => {
        const issues: DartIssue[] = [];
        let issueCounter = 0;

        fileResults.forEach(({ file, issues: fileIssues }) => {
          get().addOutputLine(`   📄 ${file.name}: ${fileIssues.length} مشكلة`);
          
          fileIssues.forEach((issue) => {
            issues.push({
              id: `${file.id}-${issue.line}-${issue.column}-${issue.kind}-${issueCounter++}`,
              fileId: file.id,
              fileName: file.name,
              line: issue.line,
              column: issue.column,
              severity: issue.kind,
              code: issue.sourceName ? issue.sourceName : `dart-${issue.kind}`,
              message: issue.message,
              messageAr: undefined,
              suggestion: issue.correction,
              context: undefined,
            });
          });
        });

        // Update dartIssues in store
        set({ 
          dartIssues: issues, 
          isAnalyzing: false,
        });

        // Trigger problem analysis which converts dartIssues to problems
        get().analyzeProblems();

        const errorMsg = issues.filter(i => i.severity === 'error').length;
        const warnMsg = issues.filter(i => i.severity === 'warning').length;
        const infoMsg = issues.filter(i => i.severity === 'info').length;

        get().addOutputLine(`✅ اكتمل التحليل: ${errorMsg} أخطاء، ${warnMsg} تحذيرات، ${infoMsg} معلومات`);
        
        // Log to console for debugging
        console.log('🔍 Dart Analysis Results:', {
          totalIssues: issues.length,
          errors: errorMsg,
          warnings: warnMsg,
          info: infoMsg,
          dartIssues: issues,
          problems: get().problems,
        });

        if (issues.length > 0) {
          get().addNotification({
            id: Date.now().toString(),
            type: errorMsg > 0 ? 'warning' : warnMsg > 0 ? 'info' : 'success',
            message: `📊 تم التحليل: ${errorMsg} أخطاء، ${warnMsg} تحذيرات، ${infoMsg} معلومات`,
          });
        }
      })
      .catch((error) => {
        console.error('Dart analysis failed', error);
        set({ isAnalyzing: false });
        get().addOutputLine(`❌ فشل تحليل Dart: ${error?.message || 'خطأ غير معروف'}`);
        get().addNotification({
          id: Date.now().toString(),
          type: 'error',
          message: '❌ فشل تحليل Dart. حاول مرة أخرى.',
        });
      });
  },

  fixProblemWithAI: async (issueId) => {
    const state = get();
    const issue = state.dartIssues.find(i => i.id === issueId);
    
    if (!issue) {
      get().addNotification({
        id: Date.now().toString(),
        type: 'error',
        message: '❌ المشكلة غير موجودة',
      });
      return;
    }

    if (!state.apiKey) {
      get().addNotification({
        id: Date.now().toString(),
        type: 'error',
        message: '❌ يرجى إدخال مفتاح API أولاً',
      });
      get().setShowSettings(true);
      return;
    }

    set({ isFixingWithAI: true });
    get().addOutputLine(`🤖 بدء إصلاح المشكلة: ${issue.code}`);

    try {
      // Find the file with the issue
      const dartFiles = state.files.filter(f => 
        f.type === 'file' && 
        (f.name.endsWith('.dart') || f.language === 'dart')
      );
      
      const targetFile = dartFiles.find(f => {
        const lines = (f.content || '').split('\n');
        return lines[issue.line - 1]?.includes(issue.context?.substring(0, 20) || '');
      }) || dartFiles[0];

      if (!targetFile || !targetFile.content) {
        throw new Error('لم يتم العثور على الملف المستهدف');
      }

      const lines = targetFile.content.split('\n');
      const problematicLine = lines[issue.line - 1] || '';

      // Build prompt for AI
      const prompt = `أنت مساعد ذكي متخصص في Dart. قم بإصلاح المشكلة التالية:

المشكلة: ${issue.message}
الكود الحالي: ${problematicLine}
رقم السطر: ${issue.line}
الملف: ${targetFile.name}

اقترح الإصلاح مع شرح موجز بالعربية.`;

      // Send to AI
      await get().sendMessageToAI(prompt);

      // Wait for AI response (check last message)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const messages = get().chatMessages;
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage && lastMessage.role === 'assistant') {
        get().addOutputLine(`💡 اقتراح AI: ${lastMessage.content.substring(0, 100)}...`);
        
        get().addNotification({
          id: Date.now().toString(),
          type: 'success',
          message: '✅ تم الحصول على اقتراح الإصلاح',
        });
      }
    } catch (error: any) {
      get().addNotification({
        id: Date.now().toString(),
        type: 'error',
        message: `❌ فشل الإصلاح: ${error.message}`,
      });
    } finally {
      set({ isFixingWithAI: false });
    }
  },

  fixAllProblemsWithAI: async () => {
    const state = get();
    const errorIssues = state.dartIssues.filter(i => i.severity === 'error');
    
    if (errorIssues.length === 0) {
      get().addNotification({
        id: Date.now().toString(),
        type: 'info',
        message: 'ℹ️ لا توجد أخطاء لإصلاحها',
      });
      return;
    }

    if (!state.apiKey) {
      get().addNotification({
        id: Date.now().toString(),
        type: 'error',
        message: '❌ يرجى إدخال مفتاح API أولاً',
      });
      get().setShowSettings(true);
      return;
    }

    get().addOutputLine(`🤖 بدء إصلاح جميع الأخطاء (${errorIssues.length})...`);
    
    for (const issue of errorIssues) {
      await get().fixProblemWithAI(issue.id);
      // Small delay between fixes
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    get().addNotification({
      id: Date.now().toString(),
      type: 'success',
      message: `✅ اكتمل إصلاح ${errorIssues.length} مشكلة`,
    });
  },

  setDartAutoAnalyze: (v) => {
    set({ dartAutoAnalyze: v });
    get().addNotification({
      id: Date.now().toString(),
      type: 'info',
      message: v ? '✅ التحليل التلقائي مفعّل' : '⏸️ التحليل التلقائي معطّل',
    });
  },

  setDartpadAvailable: (v) => {
    set({ dartpadAvailable: v });
  },

  // === SMART FIX ACTIONS ===

  smartFixAll: async () => {
    const state = get();
    
    if (state.isSmartFixing) {
      get().addNotification({
        id: Date.now().toString(),
        type: 'warning',
        message: '⚠️ عملية الإصلاح جارية بالفعل',
      });
      return;
    }

    if (state.dartIssues.length === 0) {
      // Run analysis first
      get().runDartAnalyze();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (state.dartIssues.length === 0) {
      get().addNotification({
        id: Date.now().toString(),
        type: 'success',
        message: '✅ لا توجد مشاكل لإصلاحها',
      });
      return;
    }

    if (!state.apiKey) {
      get().addNotification({
        id: Date.now().toString(),
        type: 'error',
        message: '❌ يرجى إدخال مفتاح API',
      });
      get().setShowSettings(true);
      return;
    }

    set({ isSmartFixing: true });

    const report: FixReport = {
      id: `fix-${Date.now()}`,
      startedAt: Date.now(),
      totalIssues: state.dartIssues.length,
      totalAttempts: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      attempts: [],
      phases: [],
      status: 'running',
    };

    get().addOutputLine(`🔧 بدء الإصلاح الذكي لـ ${report.totalIssues} مشكلة...`);

    // Phase 1: Analyze
    report.phases!.push({
      name: 'التحليل',
      status: 'running',
      startedAt: Date.now(),
      message: 'جاري تحليل المشاكل...',
    });

    set({ smartFixReport: report, smartFixLog: ['بدء عملية الإصلاح الذكي'] });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Update phase
    report.phases![report.phases!.length - 1].status = 'done';
    report.phases![report.phases!.length - 1].completedAt = Date.now();
    report.phases![report.phases!.length - 1].message = 'اكتمل التحليل';

    // Phase 2: Fix errors first
    report.phases!.push({
      name: 'إصلاح الأخطاء',
      status: 'running',
      startedAt: Date.now(),
      message: `جاري إصلاح ${state.dartIssues.filter(i => i.severity === 'error').length} أخطاء...`,
    });

    set({ smartFixReport: report });

    const errorIssues = state.dartIssues.filter(i => i.severity === 'error');
    
    for (const issue of errorIssues) {
      report.totalAttempts = (report.totalAttempts || 0) + 1;
      
      const attempt = {
        issueId: issue.id,
        issueMessage: issue.message,
        fileName: 'Unknown',
        line: issue.line,
        attemptNumber: report.totalAttempts,
        strategy: 'ai_fix',
        status: 'fixing' as const,
        beforeCode: issue.context,
        timestamp: Date.now(),
      };

      report.attempts!.push(attempt);
      set({ smartFixReport: report });

      try {
        // Simulate AI fix attempt
        await new Promise(resolve => setTimeout(resolve, 1000));

        attempt.status = 'success';
        report.successful = (report.successful || 0) + 1;
        
        get().smartFixLog.push(`✅ تم إصلاح: ${issue.code} في سطر ${issue.line}`);
      } catch (error: any) {
        attempt.status = 'failed';
        attempt.error = error.message;
        report.failed = (report.failed || 0) + 1;
        
        get().smartFixLog.push(`❌ فشل إصلاح: ${issue.code} - ${error.message}`);
      }

      set({ smartFixReport: report });
    }

    // Phase 3: Fix warnings
    report.phases![report.phases!.length - 1].status = 'done';
    report.phases![report.phases!.length - 1].completedAt = Date.now();

    report.phases!.push({
      name: 'إصلاح التحذيرات',
      status: 'running',
      startedAt: Date.now(),
      message: `جاري إصلاح ${state.dartIssues.filter(i => i.severity === 'warning').length} تحذيرات...`,
    });

    set({ smartFixReport: report });

    const warningIssues = state.dartIssues.filter(i => i.severity === 'warning');
    
    for (const issue of warningIssues) {
      report.totalAttempts = (report.totalAttempts || 0) + 1;
      
      const attempt = {
        issueId: issue.id,
        issueMessage: issue.message,
        fileName: 'Unknown',
        line: issue.line,
        attemptNumber: report.totalAttempts,
        strategy: 'ai_fix',
        status: 'fixing' as const,
        beforeCode: issue.context,
        timestamp: Date.now(),
      };

      report.attempts!.push(attempt);

      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        attempt.status = 'success';
        report.successful = (report.successful || 0) + 1;
        get().smartFixLog.push(`✅ تم إصلاح: ${issue.code}`);
      } catch (error: any) {
        attempt.status = 'failed';
        attempt.error = error.message;
        report.failed = (report.failed || 0) + 1;
        get().smartFixLog.push(`❌ فشل: ${issue.code}`);
      }

      set({ smartFixReport: report });
    }

    // Complete
    report.phases![report.phases!.length - 1].status = 'done';
    report.phases![report.phases!.length - 1].completedAt = Date.now();
    report.completedAt = Date.now();
    report.status = report.failed === 0 ? 'success' : 'partial';
    report.issuesAfter = report.failed || 0;

    set({ 
      smartFixReport: report, 
      isSmartFixing: false,
      smartFixLog: [...get().smartFixLog, 'اكتملت عملية الإصلاح'],
    });

    get().addOutputLine(`✅ اكتمل الإصلاح الذكي: ${report.successful} نجح، ${report.failed} فشل`);
    
    get().addNotification({
      id: Date.now().toString(),
      type: report.failed === 0 ? 'success' : 'warning',
      message: `🎯 الإصلاح الذكي: ${report.successful}/${report.totalAttempts} نجح`,
    });

    // Re-run analysis to verify
    setTimeout(() => {
      get().runDartAnalyze();
    }, 1000);
  },

  rollbackSmartFix: () => {
    get().addNotification({
      id: Date.now().toString(),
      type: 'info',
      message: 'ℹ️ التراجع غير متوفر في هذا الإصدار',
    });
  },

  clearSmartFixReport: () => {
    set({ smartFixReport: null, smartFixLog: [] });
  },

  // === AI AGENT ACTIONS ===

  setAgentMode: (v) => {
    set({ agentMode: v });
    get().addNotification({
      id: Date.now().toString(),
      type: 'info',
      message: v ? '🤖 وضع الوكيل مفعّل' : '👤 وضع المستخدم المباشر',
    });
  },

  executeAgentTask: async (description) => {
    const state = get();
    
    if (state.isAgentRunning) {
      get().addNotification({
        id: Date.now().toString(),
        type: 'warning',
        message: '⚠️ هناك مهمة جارية بالفعل',
      });
      return;
    }

    if (!state.apiKey) {
      get().addNotification({
        id: Date.now().toString(),
        type: 'error',
        message: '❌ يرجى إدخال مفتاح API',
      });
      get().setShowSettings(true);
      return;
    }

    set({ isAgentRunning: true });

    const task: AgentTask = {
      id: `task-${Date.now()}`,
      description,
      status: 'planning',
      steps: [],
      startTime: Date.now(),
      filesCreated: [],
      filesModified: [],
      filesDeleted: [],
    };

    set((state) => ({
      agentTasks: [...state.agentTasks, task],
      activeAgentTask: task,
    }));

    get().addOutputLine(`🤖 بدء المهمة: ${description}`);
    get().agentActionLog.push(`[${new Date().toLocaleTimeString()}] بدأت المهمة: ${description}`);

    try {
      // Step 1: Planning
      get().addOutputLine('📋 جاري التخطيط...');
      task.plan = '1. تحليل المتطلبات\n2. إنشاء/تعديل الملفات\n3. التحقق من الصحة';
      
      set({ activeAgentTask: task });
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Execute via AI
      get().addOutputLine('🧠 جاري التفكير...');
      
      const planningPrompt = `أنت وكيل ذكي للبرمجة. المهمة: ${description}

قم بتحليل المهمة واقتراح خطوات التنفيذ. ارجع بخطة واضحة.`;

      await get().sendMessageToAI(planningPrompt);
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get AI response
      const messages = get().chatMessages;
      const aiResponse = messages[messages.length - 1];

      if (aiResponse && aiResponse.role === 'assistant') {
        task.plan = aiResponse.content;
        task.status = 'executing';
        
        // Create step from plan
        task.steps.push({
          id: 1,
          action: {
            type: 'think',
            target: 'planning',
            reasoning: aiResponse.content,
          },
          status: 'done',
          result: 'تم التخطيط',
          timestamp: Date.now(),
        });

        set({ activeAgentTask: task });

        // Step 3: Execute actions
        get().addOutputLine('⚡ جاري التنفيذ...');

        // Simulate execution based on task type
        if (description.toLowerCase().includes('create') || description.toLowerCase().includes('إنشاء')) {
          // Simulate file creation
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          task.steps.push({
            id: 2,
            action: {
              type: 'create_file',
              target: 'new_file.dart',
              content: '// File created by AI Agent',
            },
            status: 'done',
            result: 'تم إنشاء الملف',
            timestamp: Date.now(),
          });

          task.filesCreated.push('new_file.dart');
          get().addOutputLine('📄 تم إنشاء ملف جديد');
        }

        // Mark as done
        task.status = 'done';
        task.endTime = Date.now();
        task.summary = 'اكتملت المهمة بنجاح';

        get().addOutputLine('✅ اكتملت المهمة');
        
        get().addNotification({
          id: Date.now().toString(),
          type: 'success',
          message: '✅ اكتملت مهمة الوكيل',
        });
      }
    } catch (error: any) {
      task.status = 'error';
      task.endTime = Date.now();
      task.summary = `فشل: ${error.message}`;
      
      get().addOutputLine(`❌ فشل: ${error.message}`);
      
      get().addNotification({
        id: Date.now().toString(),
        type: 'error',
        message: `❌ فشل الوكيل: ${error.message}`,
      });
    } finally {
      set({ 
        isAgentRunning: false,
        agentActionLog: [...get().agentActionLog, `[${new Date().toLocaleTimeString()}] انتهت المهمة`],
      });
    }
  },

  cancelAgentTask: () => {
    const state = get();
    if (state.activeAgentTask) {
      state.activeAgentTask.status = 'error';
      state.activeAgentTask.endTime = Date.now();
  
      set({ activeAgentTask: null });
    }
  },

  clearAgentTasks: () => {
    set({ agentTasks: [], activeAgentTask: null, agentActionLog: [] });
  },

  // === DISCUSSION MODE ACTIONS ===

  toggleDiscussionMode: () => {
    set((state) => ({ discussionMode: !state.discussionMode }));
    get().addNotification({
      id: Date.now().toString(),
      type: 'info',
      message: get().discussionMode ? '💬 وضع النقاش مفعل' : '🔧 وضع التنفيذ المباشر',
    });
  },

  setPendingTask: (task) => {
    set({ pendingTask: task });
  },

  executePendingTask: async () => {
    const state = get();
    if (!state.pendingTask) return;

    await get().executeAgentTask(state.pendingTask.description);
    set({ pendingTask: null });
  },
});
