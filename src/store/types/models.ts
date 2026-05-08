// Canonical store model types.
// These are the source of truth for the app/UI/store code.
export type FileNodeType = 'file' | 'folder';

export type FileNode = {
  id: string;
  name: string;
  type: FileNodeType;
  parentId: string | null;
  // The codebase sometimes omits children for leaf nodes (e.g. default “file” nodes).
  children?: string[];

  // File content fields (only for type === 'file')
  content?: string;
  language?: string;

  isDirty: boolean;
  createdAt: number;
  updatedAt: number;
};

export type AiProvider = {
  id: string;
  name: string;
  endpoint: string;
  models: string[];

  // Optional icon rendered in SettingsModal.
  icon?: string;

  // Provider-specific fields used by the app (optional to keep it flexible).
  apiKeyHeaderName?: string;
  requiresApiKey?: boolean;
  defaultModel?: string;
};

export type ChatMessageRole = 'user' | 'assistant' | 'system';

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;

  // App code uses `timestamp` in several places.
  timestamp: number;

  // Keep for backward/compat with older naming.
  createdAt?: number;

  // Some UI can treat the last message as streaming.
  isStreaming?: boolean;
};

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export type Notification = {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
};

export type SearchResult = {
  fileId: string;
  fileName: string;
  line: number;
  text: string;
  matchStart: number;
  matchEnd: number;
};

export type ProblemSeverity = 'error' | 'warning' | 'info';

export type ProblemItem = {
  id: string;
  severity: ProblemSeverity;
  message: string;

  // UI groups by file name.
  fileName: string;

  // Some internal logic may also reference an id.
  fileId: string;

  line: number;
  column: number;
  source: string;
};

export type PendingTask = {
  id?: string;

  // Required by AiChat UI.
  description: string;

  // Required by AiChat UI/banner.
  timestamp: number;

  // Optional extra context.
  intent?: string;

  // Optional status used across the app.
  status?: 'pending' | 'running' | 'done' | 'error';

  // Optional metadata.
  payload?: unknown;

  // Backward/compat fields.
  title?: string;
  createdAt?: number;
};

/**
 * DartIssue is the UI/store representation for the “Dart Analyzer” results.
 * It used to come from `src/services/dartAnalyzer.ts`, but is now canonical in the store.
 */
export type DartIssue = {
  id: string;
  fileId?: string;
  fileName?: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;

  // UI often displays Arabic message as well; keep optional.
  messageAr?: string;

  suggestion?: string;
  context?: string;
};

/**
 * AgentTask is the UI/store representation for the “AI Agent” task execution.
 * It used to come from `src/services/aiAgent.ts`, but is now canonical in the store.
 */
export type AgentActionType =
  | 'create_file'
  | 'modify_file'
  | 'delete_file'
  | 'rename_file'
  | 'read_file'
  | 'create_folder'
  | 'analyze'
  | 'done'
  | 'think'
  | 'plan'
  | 'request_info'
  | 'request_structure'
  | 'request_errors'
  | 'request_lines';

export type AgentAction = {
  type: AgentActionType;
  target: string;
  content?: string;
  newTarget?: string;
  reasoning?: string;
  infoType?: 'structure' | 'file_content' | 'errors' | 'lines' | 'search';
  infoParams?: Record<string, string>;
};

export type AgentStepStatus = 'pending' | 'running' | 'done' | 'error';

export type AgentStep = {
  id: number;
  action: AgentAction;
  status: AgentStepStatus;
  result?: string;
  timestamp: number;
};

export type AgentTaskStatus = 'planning' | 'executing' | 'done' | 'error';

export type AgentTask = {
  id: string;
  description: string;
  status: AgentTaskStatus;
  steps: AgentStep[];
  startTime: number;
  endTime?: number;
  plan?: string;
  summary?: string;

  filesCreated: string[];
  filesModified: string[];
  filesDeleted: string[];
};

/**
 * FixReport is the UI/store representation for the Smart Fix results.
 * It used to come from `src/services/smartAgent.ts` / other legacy smart fix engines.
 * We intentionally keep it flexible (optional fields) because the UI supports multiple formats.
 */
export type FixAttemptStatus = 'pending' | 'fixing' | 'verifying' | 'success' | 'failed' | 'skipped';

export type FixAttempt = {
  issueId: string;
  issueMessage: string;
  fileName: string;
  line: number;
  attemptNumber: number;
  strategy: string;
  status: FixAttemptStatus;
  beforeCode?: string;
  afterCode?: string;
  error?: string;
  aiResponse?: string;
  timestamp: number;
  durationMs?: number;
};

export type PhaseReport = {
  name: string;
  status: 'running' | 'done' | 'failed';
  startedAt: number;
  completedAt?: number;
  message: string;
  details?: string;
};

export type SmartFixFileResult = {
  fileName: string;
  action?: string;
  success: boolean;
  error?: string;
};

export type SmartFixErrorLog = {
  message: string;
};

export type FixReport = {
  id: string;
  startedAt: number;
  completedAt?: number;

  // Legacy/compatible summary counters
  totalIssues?: number;
  totalAttempts?: number;
  successful?: number;
  failed?: number;
  skipped?: number;
  newIssuesAfterFix?: number;

  // Used by BottomPanel's “legacy format” rendering
  attempts?: FixAttempt[];
  summary?: string;
  phases?: PhaseReport[];

  // Used by BottomPanel's “new format” rendering
  status?: 'success' | 'partial' | 'failed' | 'rolled_back';
  totalIterations?: number;
  issuesBefore?: number;
  issuesAfter?: number;
  fileResults?: SmartFixFileResult[];
  errorLog?: SmartFixErrorLog[];
};
