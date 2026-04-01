import type { Logger } from '../types';
import type { LogWriter } from './logWriters';
import { ConsoleWriter } from './logWriters';

export class StructuredLogger implements Logger {
  constructor(
    private logLevel = 'info',
    private writer: LogWriter = new ConsoleWriter()
  ) {}

  log(level: string, message: string, meta: Record<string, unknown> = {}): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta
    };

    if (level === 'debug' && this.logLevel !== 'debug') {
      return; // Skip debug logs when logLevel is not debug
    }

    this.writer.write(level, JSON.stringify(logEntry));
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error, meta: Record<string, unknown> = {}): void {
    this.log('error', message, {
      ...meta,
      ...(error && {
        error: error.message,
        stackTrace: error.stack
      })
    });
  }
}
