import type { Context } from 'hono';
import { StructuredLogger } from '../services/logger';
import type { Logger } from '../types';
import type { AppBindings } from '../types/bindings';

/**
 * Settings for the error handler
 */
export interface ErrorHandlerSettings {
  logger?: Logger;
}

/**
 * Handles unhandled errors in the application
 * Logs the error and returns a 500 response
 */
export function handleUnhandledError(
  err: Error,
  c: Context<{ Bindings: AppBindings }>,
  settings: ErrorHandlerSettings = {}
): Response {
  const logger = settings.logger ?? new StructuredLogger(c.env.LOG_LEVEL);
  logger.error('Unhandled error', err);
  return c.json({ error: 'Internal server error' }, 500);
}
