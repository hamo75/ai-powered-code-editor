// ═══════════════════════════════════════════════════════════════
// 📦 Core Module Exports - Phase 2 Integration
// Centralized export for all core functionality
// ═══════════════════════════════════════════════════════════════

// Logger
export { UnifiedLogger, logger } from './logger/UnifiedLogger';
export type { LogLevel, LogContext, LogEntry, LogFilter, LogStats } from './logger/UnifiedLogger';

// Error Handler & Tracker
export { ErrorHandler, errorHandler } from './error/ErrorHandler';
export type { ErrorDetails, ErrorHandlerConfig } from './error/ErrorHandler';

export { ErrorTracker, errorTracker } from './error/ErrorTracker';
export type { 
  TrackedError, 
  ErrorMetadata, 
  ErrorCategory, 
  ErrorSource, 
  ErrorFilter, 
  ErrorStatistics 
} from './error/ErrorTracker';

// File System
export { FileSystemService } from './filesystem/FileSystemService';
export type { FileEntry, FileSystemStats, WatchCallback } from './filesystem/FileSystemService';

// Parser
export { DartParser } from './parser/DartParser';
export type { 
  ASTNode, 
  FunctionBounds, 
  ClassBounds, 
  Symbol, 
  ParseResult, 
  ParseError,
  ScopeInfo 
} from './parser/DartParser';

// Sandbox
export { CodeSandbox } from './sandbox/CodeSandbox';
export type { 
  ExecutionResult, 
  VerificationResult, 
  Checkpoint, 
  SandboxStats 
} from './sandbox/CodeSandbox';

// Fix Engine (Phase 2)
export { 
  SurgicalFixEngine, 
} from './fix/SurgicalFixEngine';
export type { 
  FixStrategy, 
  SurgicalFixRequest, 
  SurgicalFixResult 
} from './fix/SurgicalFixEngine';

// AI Agent (Phase 2)
export { 
  AIAgent, 
} from './ai/AIAgent';
export type { 
  IntentType, 
  AIAnalysis, 
  AIActionPlan 
} from './ai/AIAgent';

// Monitor & AutoHealer (Phase 3)
export { AutoHealerService } from './monitor/AutoHealerService';
export type { AutoHealerConfig, HealingSession } from './monitor/AutoHealerService';

export { InteractiveDashboard } from './monitor/InteractiveDashboard';
export type { DashboardEvent, DashboardStats } from './monitor/InteractiveDashboard';

export { MonitorOrchestrator } from './monitor/MonitorOrchestrator';
export type { MonitorConfig } from './monitor/MonitorOrchestrator';
