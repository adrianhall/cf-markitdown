import { describe, it, expect } from 'vitest';
import { ValidationError } from '../../src/errors';

describe('Error classes', () => {
  it('should create ValidationError with correct name and default status code', () => {
    const error = new ValidationError('test message');
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('test message');
    expect(error.statusCode).toBe(400);
    expect(error).toBeInstanceOf(Error);
  });

  it('should create ValidationError with custom status code', () => {
    const error = new ValidationError('validation failed', 422);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('validation failed');
    expect(error.statusCode).toBe(422);
  });
});
