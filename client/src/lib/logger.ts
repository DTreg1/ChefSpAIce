/**
 * Production-ready logging service
 * 
 * Centralized logging with levels, formatting, and remote error tracking
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: any;
  stack?: string;
  context?: string;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private isDevelopment: boolean;
  private buffer: LogEntry[] = [];
  private maxBufferSize = 100;
  private remoteLoggingEnabled = false;

  private constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;

    // Setup error tracking
    this.setupErrorHandlers();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private setupErrorHandlers() {
    // Track unhandled errors
    window.addEventListener('error', (event) => {
      this.error('Unhandled error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: LogLevel, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    const contextStr = context ? `[${context}]` : '';
    return `[${timestamp}] ${levelStr} ${contextStr} ${message}`;
  }

  private getConsoleMethod(level: LogLevel) {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      default:
        return console.log;
    }
  }

  private async sendToRemote(entry: LogEntry) {
    if (!this.remoteLoggingEnabled || this.isDevelopment) {
      return;
    }

    // Only send warnings and errors to remote
    if (entry.level < LogLevel.WARN) {
      return;
    }

    try {
      const response = await fetch('/api/v1/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...entry,
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });
      // Use response to avoid unused variable warning
      if (!response.ok) {
        // Log failed silently
      }
    } catch (_error) {
      // Silently fail to avoid infinite loop
    }
  }

  private log(level: LogLevel, message: string, data?: any, context?: string) {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      data,
      context,
      stack: level === LogLevel.ERROR ? new Error().stack : undefined
    };

    // Add to buffer
    this.buffer.push(entry);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    // Console output
    const formattedMessage = this.formatMessage(level, message, context);
    const consoleMethod = this.getConsoleMethod(level);

    if (data !== undefined) {
      consoleMethod(formattedMessage, data);
    } else {
      consoleMethod(formattedMessage);
    }

    // Send critical logs to remote
    if (level >= LogLevel.ERROR) {
      this.sendToRemote(entry);
    }
  }

  // Public logging methods
  debug(message: string, data?: any, context?: string) {
    this.log(LogLevel.DEBUG, message, data, context);
  }

  info(message: string, data?: any, context?: string) {
    this.log(LogLevel.INFO, message, data, context);
  }

  warn(message: string, data?: any, context?: string) {
    this.log(LogLevel.WARN, message, data, context);
  }

  error(message: string, data?: any, context?: string) {
    this.log(LogLevel.ERROR, message, data, context);
  }

  // Configuration methods
  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  enableRemoteLogging(enabled: boolean = true) {
    this.remoteLoggingEnabled = enabled;
  }

  // Utility methods
  getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  clearBuffer() {
    this.buffer = [];
  }

  // Create a child logger with context
  createContext(context: string) {
    return {
      debug: (message: string, data?: any) => this.debug(message, data, context),
      info: (message: string, data?: any) => this.info(message, data, context),
      warn: (message: string, data?: any) => this.warn(message, data, context),
      error: (message: string, data?: any) => this.error(message, data, context)
    };
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience methods
export const createLogger = (context: string) => logger.createContext(context);

// Make available globally for debugging
if (import.meta.env.DEV) {
  (window as any).logger = logger;
  (window as any).LogLevel = LogLevel;
}

export default logger;