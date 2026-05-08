import { EventEmitter } from 'events';
import { UnifiedLogger, LogContext } from '../logger/UnifiedLogger';

export interface DashboardEvent {
  type: 'healing_started' | 'healing_completed' | 'healing_failed' | 'service_started' | 'service_stopped';
  timestamp: number;
  filePath?: string;
  details?: any;
}

export interface DashboardStats {
  totalFilesWatched: number;
  activeSessions: number;
  successfulHealings: number;
  failedHealings: number;
  averageConfidence: number;
  uptime: number;
}

export class InteractiveDashboard extends EventEmitter {
  private logger: UnifiedLogger;
  private stats: DashboardStats = {
    totalFilesWatched: 0,
    activeSessions: 0,
    successfulHealings: 0,
    failedHealings: 0,
    averageConfidence: 0,
    uptime: 0
  };
  
  private events: DashboardEvent[] = [];
  private startTime: number = Date.now();
  private isRunning: boolean = false;

  constructor() {
    super();
    this.logger = UnifiedLogger.getInstance();
  }

  public start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();
    
    this.logger.info('InteractiveDashboard started', LogContext.SYSTEM);
    
    this.emitEvent({
      type: 'service_started',
      timestamp: Date.now()
    });
  }

  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.stats.uptime = Date.now() - this.startTime;
    
    this.logger.info('InteractiveDashboard stopped', LogContext.SYSTEM);
    
    this.emitEvent({
      type: 'service_stopped',
      timestamp: Date.now(),
      details: { uptime: this.stats.uptime }
    });
  }

  public onHealingStarted(filePath: string): void {
    this.stats.activeSessions++;
    
    this.emitEvent({
      type: 'healing_started',
      timestamp: Date.now(),
      filePath
    });
  }

  public onHealingCompleted(filePath: string, confidence: number): void {
    this.stats.activeSessions--;
    this.stats.successfulHealings++;
    this.updateAverageConfidence(confidence);
    
    this.emitEvent({
      type: 'healing_completed',
      timestamp: Date.now(),
      filePath,
      details: { confidence }
    });
  }

  public onHealingFailed(filePath: string, error: string): void {
    this.stats.activeSessions--;
    this.stats.failedHealings++;
    
    this.emitEvent({
      type: 'healing_failed',
      timestamp: Date.now(),
      filePath,
      details: { error }
    });
  }

  public updateFilesWatched(count: number): void {
    this.stats.totalFilesWatched = count;
  }

  private updateAverageConfidence(newConfidence: number): void {
    const totalConfidence = (this.stats.averageConfidence * (this.stats.successfulHealings - 1)) + newConfidence;
    this.stats.averageConfidence = totalConfidence / this.stats.successfulHealings;
  }

  private emitEvent(event: DashboardEvent): void {
    this.events.push(event);
    
    // Keep only last 100 events
    if (this.events.length > 100) {
      this.events.shift();
    }
    
    this.emit('event', event);
    this.logger.debug(`Dashboard event: ${event.type}`, LogContext.SYSTEM, event);
  }

  public getStats(): DashboardStats {
    return {
      ...this.stats,
      uptime: this.isRunning ? Date.now() - this.startTime : this.stats.uptime
    };
  }

  public getRecentEvents(limit: number = 20): DashboardEvent[] {
    return this.events.slice(-limit);
  }

  public getEventStream(): AsyncIterableIterator<DashboardEvent> {
    return this.createEventStream();
  }

  private async *createEventStream(): AsyncIterableIterator<DashboardEvent> {
    const listeners: ((event: DashboardEvent) => void)[] = [];
    
    const listener = (event: DashboardEvent) => {
      listeners.forEach(cb => cb(event));
    };
    
    this.on('event', listener);
    
    try {
      while (this.isRunning) {
        yield await new Promise<DashboardEvent>(resolve => {
          const handler = (event: DashboardEvent) => {
            this.off('event', handler);
            resolve(event);
          };
          this.once('event', handler);
        });
      }
    } finally {
      this.off('event', listener);
    }
  }

  public generateReport(): string {
    const stats = this.getStats();
    const now = new Date().toISOString();
    
    return `
╔════════════════════════════════════════════════════════╗
║           AUTOHEALER SYSTEM DASHBOARD                  ║
║                    ${now}                     ║
╠════════════════════════════════════════════════════════╣
║  STATUS: ${this.isRunning ? '● RUNNING' : '○ STOPPED'}${' '.repeat(42)}║
╠════════════════════════════════════════════════════════╣
║  STATISTICS:                                           ║
║  • Files Watched:     ${stats.totalFilesWatched.toString().padStart(6)}                      ║
║  • Active Sessions:   ${stats.activeSessions.toString().padStart(6)}                      ║
║  • Successful Fixes:  ${stats.successfulHealings.toString().padStart(6)}                      ║
║  • Failed Fixes:      ${stats.failedHealings.toString().padStart(6)}                      ║
║  • Avg Confidence:    ${(stats.averageConfidence * 100).toFixed(1).padStart(6)}%                   ║
║  • Uptime:            ${this.formatUptime(stats.uptime).padStart(6)}         ║
╠════════════════════════════════════════════════════════╣
║  RECENT EVENTS:                                        ║
`;

    const recentEvents = this.getRecentEvents(5);
    for (const event of recentEvents) {
      const time = new Date(event.timestamp).toLocaleTimeString();
      const icon = this.getEventIcon(event.type);
      const path = event.filePath || '-';
      this.truncateLine(`║  [${time}] ${icon} ${event.type}: ${path}`, 60);
    }
    
    return `
╚════════════════════════════════════════════════════════╝
`;
  }

  private getEventIcon(type: string): string {
    switch (type) {
      case 'healing_started': return '🔍';
      case 'healing_completed': return '✅';
      case 'healing_failed': return '❌';
      case 'service_started': return '▶️';
      case 'service_stopped': return '⏹️';
      default: return '•';
    }
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  private truncateLine(line: string, maxLength: number): string {
    if (line.length <= maxLength) {
      return line.padEnd(maxLength);
    }
    return line.substring(0, maxLength - 3) + '...';
  }
}
