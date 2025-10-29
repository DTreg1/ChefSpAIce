/**
 * Logger Service
 * 
 * Centralized logging service for consistent application-wide logging.
 * Provides structured logging with different log levels and contexts.
 * 
 * Features:
 * - Log levels: error, warn, info, debug
 * - Contextual logging with module/service names
 * - Environment-based log level configuration
 * - Structured output for production environments
 * - Human-readable output for development
 * 
 * Usage:
 * ```typescript
 * const logger = new Logger('MyService');
 * logger.info('Service started');
 * logger.error('Failed to process', { error: err, userId });
 * ```
 */

enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogContext {
  [key: string]: any;
}

class Logger {
  private context: string;
  private static globalLogLevel: LogLevel;

  static {
    // Set log level based on environment
    const envLogLevel = process.env.LOG_LEVEL?.toUpperCase();
    Logger.globalLogLevel = LogLevel[envLogLevel as keyof typeof LogLevel] ?? 
      (process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG);
  }

  constructor(context: string) {
    this.context = context;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= Logger.globalLogLevel;
  }

  private formatMessage(level: string, message: string, data?: LogContext): string {
    const timestamp = new Date().toISOString();
    
    if (process.env.NODE_ENV === 'production') {
      // Structured JSON output for production
      return JSON.stringify({
        timestamp,
        level,
        context: this.context,
        message,
        ...data
      });
    }

    // Human-readable output for development
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] [${this.context}] ${message}${dataStr}`;
  }

  error(message: string, data?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message, data));
    }
  }

  warn(message: string, data?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  info(message: string, data?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message, data));
    }
  }

  debug(message: string, data?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message, data));
    }
  }

  /**
   * Log performance metrics
   */
  metric(name: string, value: number, unit: string = 'ms', tags?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.info(`Metric: ${name}`, { value, unit, ...tags });
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: string): Logger {
    return new Logger(`${this.context}:${additionalContext}`);
  }
}

export default Logger;

// Export a factory function for convenience
export function createLogger(context: string): Logger {
  return new Logger(context);
}

// Re-export LogLevel for external configuration
export { LogLevel };