/**
 * Intent Analyzer - طبقة ذكية لفهم نية المستخدم
 *
 * تحدد ما إذا كان الطلب:
 * - Chat (محادثة عادية)
 * - Task (مهمة تنفيذية)
 * - Hybrid (مختلط: نقاش + تنفيذ)
 *
 * الهدف من هذه الطبقة هو جعل سلوك النظام مرنًا:
 * - التحية والأسئلة العامة → رد فقط
 * - الطلبات التنفيذية الواضحة → تنفيذ مباشر
 * - الطلبات الملتبسة أو متعددة الخطوات → مناقشة أولًا ثم تنفيذ
 */

export type IntentType = 'chat' | 'task' | 'hybrid';

export interface IntentAnalysis {
  type: IntentType;
  confidence: number; // 0.0 - 1.0
  requiresExecution: boolean;
  requiresConfirmation: boolean;
  suggestedAction?: string;
  shouldAskClarifyingQuestion?: boolean;
  reasoning?: string;
  detectedSignals?: string[];
}

const CHAT_INDICATORS = [
  'مرحبا', 'مرحباً', 'السلام عليكم', 'أهلاً', 'اهلا',
  'hi', 'hello', 'hey', 'good morning', 'good evening',
  'كيف حالك', 'كيف الحال', 'شو أخبارك',
  'شكراً', 'thanks', 'thank you', 'مشكور',
  'مع السلامة', 'bye', 'goodbye', 'إلى اللقاء',
  'ما رأيك', 'شنو رأيك', 'what do you think',
  'هل يمكن', 'هل تستطيع', 'can you', 'could you',
  'أريد أن أسأل', 'لدي سؤال', 'question',
  'شرح', 'اشرح', 'explain', 'tell me about',
  'ما هو', 'ما هي', 'what is', 'what are',
  'لماذا', 'why', 'how', 'كيف',
  'نقاش', 'discuss', 'نتحدث', 'talk about',
  'فكرة', 'idea', 'اقتراح', 'suggestion',
  'مساعدة', 'help', 'ساعدني',
  'هل', 'do you', 'is it', 'are you',
];

const TASK_INDICATORS = [
  'أنشئ', 'انشئ', 'create', 'build', 'make', 'generate',
  'نفذ', 'نفّذ', 'execute', 'run', 'implement',
  'عدّل', 'عدل', 'modify', 'edit', 'update', 'change',
  'أصلح', 'اصلح', 'fix', 'repair', 'debug',
  'احذف', 'delete', 'remove', 'eliminate',
  'أضف', 'اضف', 'add', 'insert', 'include',
  'اكتب', 'write', 'code', 'برمج',
  'حوّل', 'حول', 'convert', 'transform',
  'ركّب', 'ركب', 'install', 'setup', 'configure',
  'اختبر', 'test', 'verify', 'check',
  'حلّل', 'حلل', 'analyze', 'scan', 'review',
  'طبّق', 'طبق', 'apply', 'deploy',
  'أعِد هيكلة', 'اعادة هيكلة', 'refactor', 'restructure',
  'طوّر', 'طور', 'develop', 'enhance', 'improve',
  'استبدل', 'replace', 'swap',
  'انقل', 'move', 'relocate',
  'دمج', 'merge', 'combine',
  'فكّ', 'فك', 'extract', 'separate',
  '__SMART_FIX__', 'smart fix',
];

const HYBRID_INDICATORS = [
  'خلينا', 'دعنا', "let's", 'we should',
  'أريد', 'اريد', 'i want', 'i need',
  'ابنِ لي', 'ابنلي', 'build me', 'create for me',
  'ساعدني في', 'help me with',
  'أحتاج', 'i need to', 'need to',
  'ابدأ', 'start', 'begin',
  'جهّز', 'جهز', 'prepare', 'set up',
  'يمكنك', 'could you', 'can you',
];

const EXECUTION_TRIGGERS = [
  'الآن', 'now', 'فوراً', 'immediately',
  'ابدأ', 'start', 'begin', 'go ahead',
  'نفّذ', 'execute', 'do it', 'افعلها',
  'تم', 'done', 'confirm', 'موافق', 'yes', 'ok',
  'بالضبط', 'exactly', 'correct', 'صحيح',
];

const DISCUSSION_INDICATORS = [
  'ربما', 'maybe', 'perhaps', 'might',
  'ماذا لو', 'what if', 'suppose',
  'هل من الأفضل', 'would it be better',
  'أفكّر في', 'thinking about', 'considering',
  'هل تقترح', 'do you suggest', 'recommend',
  'قبل أن', 'before', 'first let\'s discuss',
  'ما الخطوات', 'what steps', 'how would',
  'خطة', 'plan', 'strategy', 'approach',
  'أي خيار', 'which option', 'pros and cons',
];

const AMBIGUITY_INDICATORS = [
  'شيء', 'anything', 'somehow', 'something',
  'بشكل عام', 'generally', 'kind of',
  'تقريباً', 'roughly', 'maybe',
  'اشوف', 'see', 'let me know',
  'ما الفرق', 'what is the difference',
  'غير واضح', 'unclear', 'not sure',
  'لو سمحت', 'please', 'could you maybe',
];

const FIX_INDICATORS = [
  'خطأ', 'error', 'bug', 'issue', 'problem', 'exception',
  'تعطل', 'crash', 'failed', 'failing', 'broken',
  'لا يعمل', 'does not work', 'not working',
  'مشكلة', 'misbehaving', 'unexpected',
  'semicolons', 'syntax', 'compile', 'analyze',
];

const normalize = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[^\p{L}\p{N}\s/-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const includesAny = (text: string, candidates: string[]): boolean => {
  return candidates.some(candidate => text.includes(candidate.toLowerCase()));
};

const collectSignals = (text: string): string[] => {
  const signals: string[] = [];

  if (includesAny(text, CHAT_INDICATORS)) signals.push('chat');
  if (includesAny(text, TASK_INDICATORS)) signals.push('task');
  if (includesAny(text, HYBRID_INDICATORS)) signals.push('hybrid');
  if (includesAny(text, EXECUTION_TRIGGERS)) signals.push('execute-now');
  if (includesAny(text, DISCUSSION_INDICATORS)) signals.push('discussion');
  if (includesAny(text, AMBIGUITY_INDICATORS)) signals.push('ambiguous');
  if (includesAny(text, FIX_INDICATORS)) signals.push('fix');

  return signals;
};



const isShortGreeting = (normalizedText: string, originalText: string): boolean => {
  const greetings = ['مرحبا', 'مرحباً', 'hi', 'hello', 'hey', 'أهلاً', 'اهلا', 'السلام عليكم'];
  return greetings.some(g => normalizedText === g || normalizedText.startsWith(g + ' ')) && originalText.length < 60;
};

const buildReasoning = (
  type: IntentType,
  chatScore: number,
  taskScore: number,
  hybridScore: number,
  ambiguityScore: number,
  executionBoost: number,
  discussionPenalty: number,
): string => {
  const parts = [
    `chat=${chatScore}`,
    `task=${taskScore}`,
    `hybrid=${hybridScore}`,
    `ambiguity=${ambiguityScore}`,
    `executionBoost=${executionBoost}`,
    `discussionPenalty=${discussionPenalty}`,
  ];
  return `النوع النهائي: ${type} | ${parts.join(', ')}`;
};

/**
 * تحليل نص المدخلات لتحديد النية
 */
export const analyzeIntent = (text: string): IntentAnalysis => {
  const normalizedText = normalize(text);
  const signals = collectSignals(normalizedText);

  let chatScore = 0;
  let taskScore = 0;
  let hybridScore = 0;
  let executionBoost = 0;
  let discussionPenalty = 0;
  let ambiguityScore = 0;

  for (const indicator of CHAT_INDICATORS) {
    if (normalizedText.includes(indicator.toLowerCase())) {
      chatScore += 2;
    }
  }

  for (const indicator of TASK_INDICATORS) {
    if (normalizedText.includes(indicator.toLowerCase())) {
      taskScore += 3;
      executionBoost += 2;
    }
  }

  for (const indicator of HYBRID_INDICATORS) {
    if (normalizedText.includes(indicator.toLowerCase())) {
      hybridScore += 2;
      taskScore += 1;
    }
  }

  for (const trigger of EXECUTION_TRIGGERS) {
    if (normalizedText.includes(trigger.toLowerCase())) {
      executionBoost += 3;
    }
  }

  for (const indicator of DISCUSSION_INDICATORS) {
    if (normalizedText.includes(indicator.toLowerCase())) {
      discussionPenalty += 2;
    }
  }

  for (const indicator of AMBIGUITY_INDICATORS) {
    if (normalizedText.includes(indicator.toLowerCase())) {
      ambiguityScore += 1;
    }
  }

  taskScore += executionBoost;
  taskScore -= discussionPenalty;

  if (isShortGreeting(normalizedText, text)) {
    return {
      type: 'chat',
      confidence: 0.98,
      requiresExecution: false,
      requiresConfirmation: false,
      suggestedAction: 'respond_only',
      shouldAskClarifyingQuestion: false,
      reasoning: 'تحية قصيرة واضحة بدون طلب تنفيذ',
      detectedSignals: signals,
    };
  }

  const hasFixIntent = includesAny(normalizedText, FIX_INDICATORS);
  if (hasFixIntent && taskScore === 0) {
    taskScore += 4;
  }

  const totalScore = chatScore + taskScore + hybridScore;

  if (totalScore === 0) {
    const looksLikeQuestion = normalizedText.endsWith('?') || normalizedText.includes('؟') || normalizedText.startsWith('هل ');
    return {
      type: looksLikeQuestion ? 'chat' : 'hybrid',
      confidence: looksLikeQuestion ? 0.7 : 0.55,
      requiresExecution: false,
      requiresConfirmation: false,
      suggestedAction: looksLikeQuestion ? 'respond_only' : 'discuss_and_plan',
      shouldAskClarifyingQuestion: !looksLikeQuestion,
      reasoning: looksLikeQuestion
        ? 'سؤال عام بدون مؤشرات تنفيذ واضحة'
        : 'النص غامض ويحتاج توضيح قبل التنفيذ',
      detectedSignals: signals,
    };
  }

  const chatConfidence = chatScore / totalScore;
  const taskConfidence = (taskScore + hybridScore * 0.5) / totalScore;
  const hybridConfidence = hybridScore > 0 ? Math.min(hybridScore / totalScore + 0.2, 0.9) : 0;

  let intentType: IntentType;
  let finalConfidence: number;

  const ambiguityPenalty = Math.min(ambiguityScore * 0.08, 0.24);

  if (taskConfidence >= 0.6 && taskScore >= 3) {
    intentType = 'task';
    finalConfidence = Math.min(taskConfidence + (executionBoost * 0.1) - ambiguityPenalty, 1.0);
  } else if (hybridConfidence >= 0.4 && hybridScore >= 2) {
    intentType = 'hybrid';
    finalConfidence = Math.max(Math.min(hybridConfidence - ambiguityPenalty, 0.9), 0.35);
  } else {
    intentType = 'chat';
    finalConfidence = Math.max(chatConfidence - ambiguityPenalty, 0.35);
  }

  const requiresExecution = intentType === 'task' && finalConfidence > 0.7;
  const requiresConfirmation =
    (intentType === 'task' && finalConfidence >= 0.5 && finalConfidence <= 0.75) ||
    (intentType === 'hybrid' && finalConfidence < 0.75) ||
    (ambiguityScore > 0 && taskScore > 0 && finalConfidence < 0.9);

  const shouldAskClarifyingQuestion =
    intentType !== 'chat' && (ambiguityScore > 0 || discussionPenalty > 0 || finalConfidence < 0.65);

  let suggestedAction: string;
  if (requiresExecution) {
    suggestedAction = 'execute_immediately';
  } else if (requiresConfirmation) {
    suggestedAction = 'propose_then_execute';
  } else if (intentType === 'hybrid') {
    suggestedAction = 'discuss_and_plan';
  } else {
    suggestedAction = 'respond_only';
  }

  return {
    type: intentType,
    confidence: parseFloat(finalConfidence.toFixed(2)),
    requiresExecution,
    requiresConfirmation,
    suggestedAction,
    shouldAskClarifyingQuestion,
    reasoning: buildReasoning(
      intentType,
      chatScore,
      taskScore,
      hybridScore,
      ambiguityScore,
      executionBoost,
      discussionPenalty,
    ),
    detectedSignals: signals,
  };
};

/**
 * توليد رد مبدئي بناءً على النية
 */
export const generateIntentResponse = (text: string, analysis: IntentAnalysis): string | null => {
  switch (analysis.type) {
    case 'chat':
      return null;

    case 'task':
      if (analysis.requiresConfirmation || analysis.shouldAskClarifyingQuestion) {
        return `🤔 **فهمت طلبك!**\n\nيبدو أنك تريد: "${text}"\n\n💡 **الخطة المقترحة:**\n1️⃣ تحليل المتطلبات\n2️⃣ تحديد الملفات المتأثرة\n3️⃣ تنفيذ التغييرات\n4️⃣ التحقق من النتائج\n\n${analysis.shouldAskClarifyingQuestion ? '❓ **قبل التنفيذ:** هل تريدني أن أبدأ مباشرة أم تفضل مناقشة التفاصيل أولاً؟' : '✅ هل أبدأ بالتنفيذ؟ (اكتب "نعم" أو "ابدأ")'}`;
      }
      return null;

    case 'hybrid':
      return `💬 **فهمت!** دعنا نناقش هذا أولاً.\n\n📋 **ما فهمته:** ${text}\n\n🎯 **اقتراحي:**\n• يمكننا البدء بتحليل الوضع الحالي\n• ثم نضع خطة مناسبة\n• وأخيراً ننفذ الحل الأمثل\n\n💭 **ما رأيك؟ هل لديك متطلبات محددة؟**`;

    default:
      return null;
  }
};

/**
 * تحقق سريع مما إذا كان النص مجرد تحية
 */
export const isSimpleGreeting = (text: string): boolean => {
  const normalized = normalize(text);
  const greetings = [
    'مرحبا', 'مرحباً', 'hi', 'hello', 'hey', 'أهلاً', 'اهلا',
    'السلام عليكم', 'good morning', 'good evening', 'good afternoon',
  ];
  return greetings.some(g => normalized === g || normalized.startsWith(g + '!') || normalized.startsWith(g + ',')) && text.length < 60;
};

/**
 * تحقق مما إذا كان المستخدم يوافق على التنفيذ
 */
export const isExecutionConfirmation = (text: string): boolean => {
  const normalized = normalize(text);
  const confirmations = [
    'نعم', 'ايوة', 'أيوه', 'yes', 'yeah', 'yep', 'sure', 'ok', 'okay',
    'موافق', 'تمام', 'بالطبع', 'أكيد', 'بالتأكيد', 'affirmative',
    'ابدأ', 'start', 'go', 'go ahead', 'do it', 'نفذ', 'نفّذ',
    'يلا', 'هيا', "let's go", 'proceed', 'confirm',
    'صح', 'صحيح', 'correct', 'exactly', 'بالضبط',
  ];
  return confirmations.some(c => normalized === c || normalized.startsWith(c + '!') || normalized.includes(c));
};

/**
 * تحقق مما إذا كان المستخدم يرفض التنفيذ
 */
export const isRejection = (text: string): boolean => {
  const normalized = normalize(text);
  const rejections = [
    'لا', 'no', 'nop', 'nope', 'nah',
    'ملغى', 'cancel', 'abort', 'stop', 'توقف',
    'لاحقاً', 'later', 'ليس الآن', 'not now',
    'تراجع', 'nevermind', 'forget it', 'انسَ',
  ];
  return rejections.some(r => normalized === r || normalized.startsWith(r + '!') || normalized.startsWith(r + ','));
};
