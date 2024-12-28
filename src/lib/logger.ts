const isDevelopment = process.env.NODE_ENV === 'development';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private static formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  static debug(message: string, ...args: any[]) {
    if (isDevelopment) {
      console.log(this.formatMessage('debug', message), ...args);
    }
  }

  static info(message: string, ...args: any[]) {
    console.log(this.formatMessage('info', message), ...args);
  }

  static warn(message: string, ...args: any[]) {
    console.warn(this.formatMessage('warn', message), ...args);
  }

  static error(message: string, ...args: any[]) {
    console.error(this.formatMessage('error', message), ...args);
  }
}

export default Logger;
