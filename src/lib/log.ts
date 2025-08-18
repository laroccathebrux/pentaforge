export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel;

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    this.level = envLevel ? (LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO) : LogLevel.INFO;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  private output(level: LogLevel, levelStr: string, message: string): void {
    if (level >= this.level) {
      const formatted = this.formatMessage(levelStr, message);
      
      if (level === LogLevel.ERROR) {
        console.error(formatted);
      } else if (level === LogLevel.WARN) {
        console.warn(formatted);
      } else {
        console.log(formatted);
      }
    }
  }

  debug(message: string): void {
    this.output(LogLevel.DEBUG, 'DEBUG', message);
  }

  info(message: string): void {
    this.output(LogLevel.INFO, 'INFO', message);
  }

  warn(message: string): void {
    this.output(LogLevel.WARN, 'WARN', message);
  }

  error(message: string): void {
    this.output(LogLevel.ERROR, 'ERROR', message);
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

export const log = new Logger();