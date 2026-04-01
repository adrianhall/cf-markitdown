/// <reference types="@cloudflare/workers-types" />

declare global {
  /**
   * Global environment variables for Cloudflare Workers
   * Available in the global scope of worker scripts
   */
  interface Env {
    /** Cloudflare AI binding for document conversion */
    AI: Ai;
    /** KV namespace for storing API keys */
    API_KEYS_KV: KVNamespace;
    /** JWT signing key for token validation (optional) */
    JWT_SIGNING_KEY?: string;
    /** Log level filter for application logging (optional) */
    LOG_LEVEL?: string;
  }
}

/**
 * Logger interface for structured logging with multiple log levels
 */
export interface Logger {
  /**
   * @description Logs a message at the specified level with optional metadata
   * @param {string} level - The log level (debug, info, warn, error)
   * @param {string} message - The primary log message
   * @param {Record<string, unknown>} [meta] - Additional contextual data
   */
  log(level: string, message: string, meta?: Record<string, unknown>): void;

  /**
   * @description Logs an info-level message with optional metadata
   * @param {string} message - The informational message
   * @param {Record<string, unknown>} [meta] - Additional contextual data
   */
  info(message: string, meta?: Record<string, unknown>): void;

  /**
   * @description Logs a warning-level message with optional metadata
   * @param {string} message - The warning message
   * @param {Record<string, unknown>} [meta] - Additional contextual data
   */
  warn(message: string, meta?: Record<string, unknown>): void;

  /**
   * @description Logs an error-level message with optional error object and metadata
   * @param {string} message - The error message
   * @param {Error} [error] - Optional error object to include details from
   * @param {Record<string, unknown>} [meta] - Additional contextual data
   */
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
}

/**
 * Context object for conversion request processing
 */
export interface ConvertRequestContext {
  /** Global environment variables */
  env: Env;
  /** Logger instance for tracking conversion progress */
  logger: Logger;
  /** Unique identifier for tracking the request */
  requestId: string;
}
