type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  sessionId?: string;
  organization?: string;
  fileName?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

class Logger {
  private static logLevel: LogLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'info';
  private static context: LogContext = {};

  private static readonly LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  static setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  static setContext(context: LogContext) {
    this.context = { ...this.context, ...context };
  }

  static clearContext() {
    this.context = {};
  }

  private static shouldLog(level: LogLevel): boolean {
    return this.LOG_LEVELS[level] >= this.LOG_LEVELS[this.logLevel];
  }

  private static formatError(error: any): LogEntry['error'] {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      };
    }
    if (typeof error === 'object') {
      return {
        message: JSON.stringify(error, null, 2)
      };
    }
    return {
      message: String(error)
    };
  }

  private static stringifyContext(context: any): string {
    if (!context || Object.keys(context).length === 0) return '';
    return Object.entries(context)
      .map(([k, v]) => {
        if (typeof v === 'object' && v !== null) {
          return `${k}=${JSON.stringify(v)}`;
        }
        return `${k}=${v}`;
      })
      .join(', ');
  }

  private static createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: any
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
      ...(error && { error: this.formatError(error) })
    };
  }

  private static log(entry: LogEntry) {
    const { timestamp, level, message, context, error } = entry;
    const contextStr = context ? ` [${this.stringifyContext(context)}]` : '';
    const errorStr = error ? `\n${JSON.stringify(error, null, 2)}` : '';
    
    const logMessage = `[${timestamp}] [${level.toUpperCase()}]${contextStr} ${message}${errorStr}`;
    
    switch (level) {
      case 'debug':
        console.debug(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
        console.error(logMessage);
        break;
    }
  }

  static debug(message: string, context?: LogContext) {
    if (this.shouldLog('debug')) {
      this.log(this.createLogEntry('debug', message, context));
    }
  }

  static info(message: string, context?: LogContext) {
    if (this.shouldLog('info')) {
      this.log(this.createLogEntry('info', message, context));
    }
  }

  static warn(message: string, context?: LogContext, error?: any) {
    if (this.shouldLog('warn')) {
      this.log(this.createLogEntry('warn', message, context, error));
    }
  }

  static error(message: string, error?: any, context?: LogContext) {
    if (this.shouldLog('error')) {
      this.log(this.createLogEntry('error', message, context, error));
    }
  }
}

export default Logger;
