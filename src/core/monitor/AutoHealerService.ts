import { FileSystemService } from '../filesystem/FileSystemService';
import { DartParser } from '../parser/DartParser';
import { SurgicalFixEngine } from '../fix/SurgicalFixEngine';
import { AIAgent } from '../ai/AIAgent';
import { UnifiedLogger, LogContext, LogLevel } from '../logger/UnifiedLogger';
import { CodeSandbox } from '../sandbox/CodeSandbox';
import { errorHandler } from '../error/ErrorHandler';

export interface AutoHealerConfig {
  watchPatterns: string[];
  ignorePatterns: string[];
  maxRetries: number;
  debounceMs: number;
  autoApprove: boolean;
  confidenceThreshold: number;
}

export interface HealingSession {
  filePath: string;
  errorCount: number;
  lastErrorTime: number;
  status: 'idle' | 'analyzing' | 'fixing' | 'verifying' | 'completed' | 'failed';
  attempts: number;
  lastError?: string;
}

export class AutoHealerService {
  private logger: UnifiedLogger;
  private fileSystem: FileSystemService;
  private parser: DartParser;
  private sandbox: CodeSandbox;
  private fixEngine: SurgicalFixEngine;
  private aiAgent: AIAgent;
  
  private config: AutoHealerConfig;
  private sessions: Map<string, HealingSession> = new Map();
  private watchTimers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  constructor(
    fileSystem: FileSystemService,
    parser: DartParser,
    sandbox: CodeSandbox,
    fixEngine: SurgicalFixEngine,
    aiAgent: AIAgent,
    config: Partial<AutoHealerConfig> = {}
  ) {
    this.logger = UnifiedLogger.getInstance();
    this.fileSystem = fileSystem;
    this.parser = parser;
    this.sandbox = sandbox;
    this.fixEngine = fixEngine;
    this.aiAgent = aiAgent;
    
    this.config = {
      watchPatterns: ['**/*.ts', '**/*.js', '**/*.dart'],
      ignorePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.test.*'],
      maxRetries: 3,
      debounceMs: 1000,
      autoApprove: false,
      confidenceThreshold: 0.7,
      ...config
    };
    
    this.logger.info('AutoHealerService initialized', LogContext.SYSTEM, {
      config: this.config
    });
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('AutoHealerService is already running', LogContext.SYSTEM);
      return;
    }

    this.isRunning = true;
    this.logger.info('AutoHealerService started', LogContext.SYSTEM);
    
    // Start watching all configured patterns
    for (const pattern of this.config.watchPatterns) {
      await this.startWatchingPattern(pattern);
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    // Clear all timers
    for (const [path, timer] of this.watchTimers.entries()) {
      clearTimeout(timer);
    }
    this.watchTimers.clear();
    
    this.logger.info('AutoHealerService stopped', LogContext.SYSTEM);
  }

  private async startWatchingPattern(pattern: string): Promise<void> {
    this.logger.debug(`Starting to watch pattern: ${pattern}`, LogContext.FILE_SYSTEM);
    
    // In a real implementation, this would use chokidar or similar
    // For now, we'll simulate watching by checking periodically
    const files = await this.fileSystem.glob(pattern);
    
    for (const file of files) {
      if (this.shouldIgnore(file)) {
        continue;
      }
      
      this.setupFileWatcher(file);
    }
  }

  private shouldIgnore(filePath: string): boolean {
    return this.config.ignorePatterns.some(pattern => 
      filePath.includes(pattern.replace(/\*\*/g, '').replace(/\*/g, ''))
    );
  }

  private setupFileWatcher(filePath: string): void {
    // Debounced file change handler
    const handleChange = async () => {
      if (!this.isRunning) return;
      
      this.logger.debug(`File changed: ${filePath}`, LogContext.FILE_SYSTEM);
      
      // Clear existing timer
      if (this.watchTimers.has(filePath)) {
        clearTimeout(this.watchTimers.get(filePath));
      }
      
      // Set new timer
      const timer = setTimeout(async () => {
        try {
          await this.analyzeAndHeal(filePath);
        } catch (error) {
          await errorHandler.handleError(error, LogContext.SYSTEM, {
            context: 'Auto-healing process failed',
            data: { filePath },
            userMessage: `Failed to auto-heal file: ${filePath}`,
          });
        }
      }, this.config.debounceMs);
      
      this.watchTimers.set(filePath, timer);
    };

    // In real implementation, attach to file system events
    // For now, we expose this method to be called externally when changes occur
    this.fileSystem.onFileChange(filePath, handleChange);
  }

  private async analyzeAndHeal(filePath: string): Promise<void> {
    const session = this.getOrCreateSession(filePath);
    
    if (session.status === 'fixing' || session.status === 'verifying') {
      this.logger.debug(`Skipping ${filePath}, already being processed`, LogContext.SYSTEM);
      return;
    }

    session.status = 'analyzing';
    session.attempts++;
    
    this.logger.info(`Starting analysis for ${filePath}`, LogContext.SYSTEM, {
      attempt: session.attempts
    });

    try {
      // Read file content
      const content = await this.fileSystem.readFile(filePath);
      
      // Parse and detect errors
      const parseResult = await this.parser.parseFile(filePath, content);
      
      if (!parseResult.hasErrors) {
        this.logger.info(`No errors found in ${filePath}`, LogContext.SYSTEM);
        session.status = 'completed';
        return;
      }

      session.errorCount = parseResult.errors.length;
      session.lastErrorTime = Date.now();
      session.lastError = parseResult.errors[0].message;

      this.logger.warn(`Found ${parseResult.errors.length} errors in ${filePath}`, LogContext.ERROR, {
        errors: parseResult.errors
      });

      // Attempt to heal
      session.status = 'fixing';
      await this.attemptHealing(filePath, content, parseResult.errors);

    } catch (error) {
      session.status = 'failed';
      session.lastError = error instanceof Error ? error.message : String(error);

      await errorHandler.handleError(error, LogContext.SYSTEM, {
        context: 'File analysis failed',
        data: { filePath, attempts: session.attempts },
        userMessage: `Failed to analyze file: ${filePath}`,
      });

      if (session.attempts >= this.config.maxRetries) {
        await errorHandler.handleCriticalError(
          `Max retries reached for ${filePath}, giving up`,
          LogContext.SYSTEM,
          {
            context: 'Auto-healing exhausted',
            data: { filePath, maxRetries: this.config.maxRetries },
            userMessage: `Unable to fix errors in ${filePath} after ${this.config.maxRetries} attempts.`,
          }
        );
        this.sessions.delete(filePath);
      }
    }
  }

  private async attemptHealing(
    filePath: string,
    content: string,
    errors: any[]
  ): Promise<void> {
    const session = this.sessions.get(filePath);
    if (!session) return;

    // Use AI Agent to generate fix plan
    const plan = await this.aiAgent.analyzeAndPlan({
      filePath,
      content,
      errors: errors.map(e => ({ message: e.message, line: e.loc?.start?.line })),
      intent: 'fix_errors'
    });

    this.logger.info(`AI generated fix plan for ${filePath}`, LogContext.AI, {
      actions: plan.actions.length
    });

    // Execute fix through SurgicalFixEngine
    session.status = 'fixing';
    
    const fixResult = await this.fixEngine.executeFix({
      filePath,
      originalContent: content,
      errors: errors,
      fixStrategy: plan.actions[0]?.type || 'replace_block',
      suggestedFix: plan.actions[0]?.code
    });

    if (!fixResult.success) {
      throw new Error(fixResult.error || 'Fix execution failed');
    }

    // Verify the fix
    session.status = 'verifying';
    
    const verification = await this.sandbox.validateSyntax(fixResult.newContent!);
    
    if (!verification.isValid) {
      throw new Error(`Fix verification failed: ${verification.errors?.join(', ')}`);
    }

    // Apply the fix atomically
    await this.fileSystem.writeFileAtomic(filePath, fixResult.newContent!);
    
    session.status = 'completed';
    session.attempts = 0; // Reset on success
    
    this.logger.success(`Successfully healed ${filePath}`, LogContext.SYSTEM, {
      confidence: fixResult.confidence,
      backupPath: fixResult.backupPath
    });
  }

  private getOrCreateSession(filePath: string): HealingSession {
    if (!this.sessions.has(filePath)) {
      this.sessions.set(filePath, {
        filePath,
        errorCount: 0,
        lastErrorTime: 0,
        status: 'idle',
        attempts: 0
      });
    }
    return this.sessions.get(filePath)!;
  }

  public getSessionStatus(filePath: string): HealingSession | undefined {
    return this.sessions.get(filePath);
  }

  public getAllSessions(): Map<string, HealingSession> {
    return new Map(this.sessions);
  }

  public async triggerHealing(filePath: string): Promise<void> {
    if (!this.isRunning) {
      throw new Error('AutoHealerService is not running');
    }
    
    await this.analyzeAndHeal(filePath);
  }

  public isServiceRunning(): boolean {
    return this.isRunning;
  }
}
