import { AutoHealerService } from './AutoHealerService';
import { InteractiveDashboard } from './InteractiveDashboard';
import { UnifiedLogger, LogContext } from '../logger/UnifiedLogger';
import { errorHandler } from '../error/ErrorHandler';

export interface MonitorConfig {
  autoStart: boolean;
  reportIntervalMs: number;
  enableDashboard: boolean;
}

export class MonitorOrchestrator {
  private logger: UnifiedLogger;
  private healer: AutoHealerService;
  private dashboard: InteractiveDashboard;
  private config: MonitorConfig;
  private reportTimer?: NodeJS.Timeout;

  constructor(
    healer: AutoHealerService,
    dashboard: InteractiveDashboard,
    config: Partial<MonitorConfig> = {}
  ) {
    this.logger = UnifiedLogger.getInstance();
    this.healer = healer;
    this.dashboard = dashboard;
    
    this.config = {
      autoStart: true,
      reportIntervalMs: 30000, // 30 seconds
      enableDashboard: true,
      ...config
    };

    this.setupEventListeners();
    
    this.logger.info('MonitorOrchestrator initialized', LogContext.SYSTEM, {
      config: this.config
    });
  }

  private setupEventListeners(): void {
    // Listen to healer events and update dashboard
    const originalAnalyzeAndHeal = (this.healer as any).analyzeAndHeal?.bind(this.healer);
    if (originalAnalyzeAndHeal) {
      (this.healer as any).analyzeAndHeal = async (filePath: string) => {
        this.dashboard.onHealingStarted(filePath);
        try {
          await originalAnalyzeAndHeal(filePath);
          const session = this.healer.getSessionStatus(filePath);
          if (session?.status === 'completed') {
            this.dashboard.onHealingCompleted(filePath, session.attempts);
          }
        } catch (error) {
          this.dashboard.onHealingFailed(filePath, error instanceof Error ? error.message : String(error));
          // Use error handler for proper logging and notification
          await errorHandler.handleError(error, LogContext.SYSTEM, {
            context: 'Auto-healing failed',
            data: { filePath },
            userMessage: `Failed to auto-heal ${filePath}. Manual intervention may be required.`,
          });
          throw error;
        }
      };
    }
  }

  public async start(): Promise<void> {
    this.logger.info('Starting MonitorOrchestrator', LogContext.SYSTEM);
    
    // Start dashboard
    if (this.config.enableDashboard) {
      this.dashboard.start();
    }
    
    // Start healer
    await this.healer.start();
    
    // Update dashboard with watched files count
    const sessions = this.healer.getAllSessions();
    this.dashboard.updateFilesWatched(sessions.size);
    
    // Start periodic reporting
    if (this.config.reportIntervalMs > 0) {
      this.startPeriodicReporting();
    }
    
    this.logger.info('MonitorOrchestrator started successfully', LogContext.SYSTEM);
  }

  public async stop(): Promise<void> {
    this.logger.info('Stopping MonitorOrchestrator', LogContext.SYSTEM);
    
    // Stop periodic reporting
    if (this.reportTimer) {
      clearTimeout(this.reportTimer);
    }
    
    // Stop healer
    await this.healer.stop();
    
    // Stop dashboard
    if (this.config.enableDashboard) {
      this.dashboard.stop();
    }
    
    this.logger.info('MonitorOrchestrator stopped', LogContext.SYSTEM);
  }

  private startPeriodicReporting(): void {
    const report = () => {
      const reportText = this.dashboard.generateReport();
      this.logger.info('Dashboard Report:\n' + reportText, LogContext.SYSTEM);
      
      if (this.healer.isServiceRunning()) {
        this.reportTimer = setTimeout(report, this.config.reportIntervalMs);
      }
    };
    
    // First report after delay
    this.reportTimer = setTimeout(report, this.config.reportIntervalMs);
  }

  public getDashboard(): InteractiveDashboard {
    return this.dashboard;
  }

  public getHealer(): AutoHealerService {
    return this.healer;
  }

  public getStatus(): {
    orchestratorRunning: boolean;
    healerRunning: boolean;
    dashboardRunning: boolean;
    activeSessions: number;
  } {
    return {
      orchestratorRunning: this.healer.isServiceRunning(),
      healerRunning: this.healer.isServiceRunning(),
      dashboardRunning: this.dashboard['isRunning'],
      activeSessions: this.dashboard.getStats().activeSessions
    };
  }

  public async triggerManualHealing(filePath: string): Promise<void> {
    this.logger.info(`Manual healing triggered for ${filePath}`, LogContext.SYSTEM);
    await this.healer.triggerHealing(filePath);
  }

  public printDashboard(): void {
    console.log(this.dashboard.generateReport());
  }
}
