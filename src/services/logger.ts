import type { Logger } from '../types';
import type { LogWriter } from './logWriters';
import { ConsoleWriter } from './logWriters';

export class StructuredLogger implements Logger {
  /**
   * @description Creates a structured logger instance with configurable log level and writer
   * @param {string} [logLevel='info'] - Minimum log level to output (debug, info, warn, error)
   * @param {LogWriter} [writer=new ConsoleWriter()] - Output destination for log entries
   */
  constructor(
    private logLevel = 'info',
    private writer: LogWriter = new ConsoleWriter()
  ) {}

  /**
   * @description Logs a message at the specified level with optional metadata
   * @param {string} level - The log level (debug, info, warn, error)
   * @param {string} message - The primary log message
   * @param {Record<string, unknown>} [meta={}] - Additional contextual data to include
   * @returns {void}
   */
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

  /**
   * @description Logs a debug-level message with optional metadata
   * @param {string} message - The debug message to log
   * @param {Record<string, unknown>} [meta] - Additional contextual data
   * @returns {void}
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  /**
   * @description Logs an info-level message with optional metadata
   * @param {string} message - The informational message to log
   * @param {Record<string, unknown>} [meta] - Additional contextual data
   * @returns {void}
   */
  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  /**
   * @description Logs a warning-level message with optional metadata
   * @param {string} message - The warning message to log
   * @param {Record<string, unknown>} [meta] - Additional contextual data
   * @returns {void}
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  /**
   * @description Logs an error-level message with optional error object and metadata
   * @param {string} message - The error message to log
   * @param {Error} [error] - Optional error object to include details from
   * @param {Record<string, unknown>} [meta={}] - Additional contextual data
   * @returns {void}
   */
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
