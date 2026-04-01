import { describe, it, expect, beforeEach } from 'vitest';
import { handleUnhandledError } from '../../src/utils/errorHandler';
import { StructuredLogger } from '../../src/services/logger';
import { InMemoryWriter } from '../../src/services/logWriters';
import type { Context } from 'hono';
import type { AppBindings } from '../../src/types/bindings';

describe('handleUnhandledError', () => {
  let memoryWriter: InMemoryWriter;
  let logger: StructuredLogger;
  let mockContext: Context<{ Bindings: AppBindings }>;

  beforeEach(() => {
    memoryWriter = new InMemoryWriter();
    logger = new StructuredLogger('ERROR', memoryWriter);
    memoryWriter.clearLogs();

    mockContext = {
      env: {
        AI: {} as any,
        API_KEYS_KV: {} as any,
        JWT_SIGNING_KEY: 'test-key',
        LOG_LEVEL: 'ERROR'
      },
      json: (body: any, status: number = 200) => {
        return new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } as unknown as Context<{ Bindings: AppBindings }>;
  });

  it('should log the error with correct message and error details', () => {
    const testError = new Error('Test error message');

    handleUnhandledError(testError, mockContext, { logger });

    const logs = memoryWriter.getLogs();
    expect(logs).toHaveLength(1);

    const logEntry = JSON.parse(logs[0].formatted);
    expect(logEntry.level).toBe('error');
    expect(logEntry.message).toBe('Unhandled error');
    expect(logEntry.error).toBe('Test error message');
    expect(logEntry.stackTrace).toBe(testError.stack);
  });

  it('should return a 500 JSON response', async () => {
    const result = handleUnhandledError(new Error('test'), mockContext, { logger });

    expect(result).toBeInstanceOf(Response);
    expect(result.status).toBe(500);
    expect(result.headers.get('Content-Type')).toBe('application/json');

    // Check response body
    const body = await result.json();
    expect(body).toEqual({ error: 'Internal server error' });
  });

  it('should handle different error types and log levels', () => {
    const errorMockContext = {
      ...mockContext,
      env: {
        ...mockContext.env,
        LOG_LEVEL: 'INFO'
      }
    } as unknown as Context<{ Bindings: AppBindings }>;

    const typeError = new TypeError('Type error occurred');

    handleUnhandledError(typeError, errorMockContext, { logger });

    const logs = memoryWriter.getLogs();
    expect(logs).toHaveLength(1);

    const logEntry = JSON.parse(logs[0].formatted);
    expect(logEntry.level).toBe('error');
    expect(logEntry.message).toBe('Unhandled error');
    expect(logEntry.error).toBe('Type error occurred');
  });

  it('should use default logger when settings not provided', async () => {
    const testError = new Error('Test with defaults');
    // Call without settings parameter to test default parameter behavior
    const result = handleUnhandledError(testError, mockContext);

    expect(result).toBeInstanceOf(Response);
    expect(result.status).toBe(500);
    expect(result.headers.get('Content-Type')).toBe('application/json');

    // Verify JSON response structure
    const body = await result.json();
    expect(body).toEqual({ error: 'Internal server error' });
  });
});
