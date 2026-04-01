import type { Logger } from '../types';

export class StructuredLogger implements Logger {
  private enabled: boolean;

  constructor(private logLevel = 'info') {
    this.enabled = typeof console !== 'undefined';
  }

  log(level: string, message: string, meta: Record<string, unknown> = {}): void {
    if (!this.enabled) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta
    };

    switch (level) {
      case 'error':
        console.error(JSON.stringify(logEntry));
        break;
      case 'warn':
        console.warn(JSON.stringify(logEntry));
        break;
      case 'debug':
        if (this.logLevel === 'debug') {
          console.debug(JSON.stringify(logEntry));
        }
        break;
      default:
        console.log(JSON.stringify(logEntry));
    }
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
