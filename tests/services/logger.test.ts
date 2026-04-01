import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StructuredLogger } from '../../src/services/logger';

describe('StructuredLogger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log info messages with timestamp and level', () => {
    const logger = new StructuredLogger();
    logger.info('test message');

    expect(consoleLogSpy).toHaveBeenCalled();
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output.level).toBe('info');
    expect(output.message).toBe('test message');
    expect(output.timestamp).toBeDefined();
  });

  it('should log error messages with error details', () => {
    const logger = new StructuredLogger();
    const error = new Error('test error');
    logger.error('operation failed', error, { requestId: '123' });

    expect(consoleErrorSpy).toHaveBeenCalled();
    const output = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
    expect(output.level).toBe('error');
    expect(output.message).toBe('operation failed');
    expect(output.error).toBe('test error');
    expect(output.stackTrace).toBeDefined();
    expect(output.requestId).toBe('123');
  });

  it('should respect log level for debug messages', () => {
    const debugLogger = new StructuredLogger('debug');
    const infoLogger = new StructuredLogger('info');

    debugLogger.debug('debug message');
    expect(consoleDebugSpy).toHaveBeenCalledTimes(1);

    consoleDebugSpy.mockClear();
    infoLogger.debug('debug message');
    expect(consoleDebugSpy).not.toHaveBeenCalled();
  });

  it('should include metadata in log entries', () => {
    const logger = new StructuredLogger();
    logger.warn('warning', { userId: '456', action: 'convert' });

    expect(consoleWarnSpy).toHaveBeenCalled();
    const output = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
    expect(output.userId).toBe('456');
    expect(output.action).toBe('convert');
  });
});
