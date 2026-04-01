import { describe, it, expect, beforeEach, vi } from 'vitest';
import app from '../../src/index';
import * as converter from '../../src/services/converter';

describe('POST /api/v1/convert', () => {
  let mockEnv: any;

  beforeEach(() => {
    mockEnv = {
      AI: {
        toMarkdown: vi.fn().mockResolvedValue({ data: '# Converted\\n\\nContent' })
      },
      API_KEYS_KV: {
        get: vi.fn().mockResolvedValue('valid-key'),
        put: vi.fn(),
        delete: vi.fn(),
        list: vi.fn()
      },
      JWT_SIGNING_KEY: 'test-secret-key'
    };
  });

  const createMockFile = (content: string): ArrayBuffer => {
    const encoder = new TextEncoder();
    return encoder.encode(content).buffer as ArrayBuffer;
  };

it('should convert PDF with valid JWT', async () => {
    const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.JCNAMz0AsT31lKxaGO4R8n9PpZ6ry9ZkWUcS5e3OtP4';

    const res = await app.fetch(
      new Request('http://localhost/api/v1/convert', {
        method: 'POST',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/pdf',
          'Content-Length': '1000'
        },
        body: createMockFile('test pdf content')
      }),
      mockEnv
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toContain('# Converted');
  });

  it('should convert DOCX with valid API key', async () => {
    const apiKey = btoa('valid-key');
    
    const res = await app.fetch(
      new Request('http://localhost/api/v1/convert', {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${apiKey}`,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Length': '1000'
        },
        body: createMockFile('test docx content')
      }),
      mockEnv
    );

    expect(res.status).toBe(200);
    expect(typeof await res.text()).toBe('string');
  });

  it('should return 401 without authorization', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/v1/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': '1000'
        },
        body: createMockFile('test')
      }),
      mockEnv
    );

    expect(res.status).toBe(401);
    const data = await res.json() as { error: string };
    expect(data.error).toContain('authorization');
  });

  it('should return 411 without content-length header', async () => {
    const apiKey = btoa('valid-key');
    
    const res = await app.fetch(
      new Request('http://localhost/api/v1/convert', {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${apiKey}`,
          'Content-Type': 'application/pdf'
        },
        body: createMockFile('test')
      }),
      mockEnv
    );

    expect(res.status).toBe(411);
  });

  it('should return 415 for unsupported content type', async () => {
    const apiKey = btoa('valid-key');
    
    const res = await app.fetch(
      new Request('http://localhost/api/v1/convert', {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${apiKey}`,
          'Content-Type': 'text/plain',
          'Content-Length': '1000'
        },
        body: createMockFile('test')
      }),
      mockEnv
    );

    expect(res.status).toBe(415);
  });

  it('should return 413 for oversized payload', async () => {
    const apiKey = btoa('valid-key');
    const largeContent = 'x'.repeat(501 * 1024 * 1024);

    const res = await app.fetch(
      new Request('http://localhost/api/v1/convert', {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${apiKey}`,
          'Content-Type': 'application/pdf',
          'Content-Length': largeContent.length.toString()
        },
        body: largeContent
      }),
      mockEnv
    );

    expect(res.status).toBe(413);
  });

  it('should return 401 for invalid base64 API key encoding', async () => {
    const invalidBase64 = '!!!invalid-base64!!!';

    const res = await app.fetch(
      new Request('http://localhost/api/v1/convert', {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${invalidBase64}`,
          'Content-Type': 'application/pdf',
          'Content-Length': '1000'
        },
        body: createMockFile('test')
      }),
      mockEnv
    );

expect(res.status).toBe(401);
  const data = await res.json() as { error: string };
  expect(data.error).toBe('Invalid API key encoding');
  });

  it('should return 401 for API key not in KV store', async () => {
    const apiKey = btoa('non-existent-key');
    const envWithMiss = {
      AI: mockEnv.AI,
      API_KEYS_KV: {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn(),
        delete: vi.fn(),
        list: vi.fn()
      },
      JWT_SIGNING_KEY: mockEnv.JWT_SIGNING_KEY
    };

    const res = await app.fetch(
      new Request('http://localhost/api/v1/convert', {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${apiKey}`,
          'Content-Type': 'application/pdf',
          'Content-Length': '1000'
        },
        body: createMockFile('test')
      }),
      envWithMiss
    );

    expect(res.status).toBe(401);
    const data = await res.json() as { error: string };
    expect(data.error).toContain('Invalid API key');
  });

  it('should return 401 when JWT signing key not configured', async () => {
    const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const envWithoutJwtKey = {
      AI: mockEnv.AI,
      API_KEYS_KV: mockEnv.API_KEYS_KV
    };

    const res = await app.fetch(
      new Request('http://localhost/api/v1/convert', {
        method: 'POST',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/pdf',
          'Content-Length': '1000'
        },
        body: createMockFile('test')
      }),
      envWithoutJwtKey
    );

expect(res.status).toBe(401);
  const data = await res.json() as { error: string };
  expect(data.error).toBe('JWT authentication not configured');
  });

  it('should return 401 for unsupported authorization method', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/v1/convert', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic dXNlcjpwYXNz',
          'Content-Type': 'application/pdf',
          'Content-Length': '1000'
        },
        body: createMockFile('test')
      }),
      mockEnv
    );

expect(res.status).toBe(401);
  const data = await res.json() as { error: string };
  expect(data.error).toBe('Unsupported authentication method');
  });

  it('should return 411 for invalid Content-Length header (NaN)', async () => {
    const apiKey = btoa('valid-key');

    const res = await app.fetch(
      new Request('http://localhost/api/v1/convert', {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${apiKey}`,
          'Content-Type': 'application/pdf',
          'Content-Length': 'not-a-number'
        },
        body: createMockFile('test')
      }),
      mockEnv
    );

    expect(res.status).toBe(411);
    const data = await res.json() as { error: string };
    expect(data.error).toContain('Content-Length');
  });

  it('should return 411 for invalid Content-Length header (negative)', async () => {
    const apiKey = btoa('valid-key');

    const res = await app.fetch(
      new Request('http://localhost/api/v1/convert', {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${apiKey}`,
          'Content-Type': 'application/pdf',
          'Content-Length': '-1'
        },
        body: createMockFile('test')
      }),
      mockEnv
    );

    expect(res.status).toBe(411);
    const data = await res.json() as { error: string };
    expect(data.error).toContain('Content-Length');
  });

  it('should return 400 when Content-Type header is missing', async () => {
    const apiKey = btoa('valid-key');
    const res = await app.fetch(
      new Request('http://localhost/api/v1/convert', {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${apiKey}`,
          'Content-Length': '1000'
          // Note: Content-Type header is intentionally missing
        },
        body: createMockFile('test')
      }),
      mockEnv
    );

    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toContain('Content-Type header is required');
  });

  it('should return 400 for conversion errors from AI service', async () => {
    const apiKey = btoa('valid-key');

    const errorMockEnv = {
      ...mockEnv,
      AI: {
        toMarkdown: vi.fn().mockRejectedValue(new Error('AI service error'))
      }
    };

    const res = await app.fetch(
      new Request('http://localhost/api/v1/convert', {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${apiKey}`,
          'Content-Type': 'application/pdf',
          'Content-Length': '1000'
        },
        body: createMockFile('test')
      }),
      errorMockEnv
    );

    // Converter wraps all errors in ValidationError, which returns 400
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toContain('AI service error');
  });

  it('should return 500 for generic errors not wrapped as ValidationError', async () => {
    const apiKey = btoa('valid-key');

    // Mock the conversion service to throw a generic Error that is not a ValidationError
    // This tests the error handling at lines 47-50 in src/routes/convert.ts
    const spy = vi.spyOn(converter, 'convertFileToMarkdown').mockRejectedValue(new Error('Unexpected system error'));

    const res = await app.fetch(
      new Request('http://localhost/api/v1/convert', {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${apiKey}`,
          'Content-Type': 'application/pdf',
          'Content-Length': '1000'
        },
        body: createMockFile('test')
      }),
      mockEnv
    );

    // Generic errors should return 500 status
    expect(res.status).toBe(500);
    const data = await res.json() as { error: string };
    expect(data.error).toContain('Unexpected system error');

    // Restore the original function
    spy.mockRestore();
  });

  it('should return 500 with fallback error message for non-Error throwables', async () => {
    const apiKey = btoa('valid-key');

    // Mock the conversion service to throw a non-Error value (e.g., string)
    // This tests the error handling fallback at lines 47-48 in src/routes/convert.ts
    const spy = vi.spyOn(converter, 'convertFileToMarkdown').mockRejectedValue('String error');

    const res = await app.fetch(
      new Request('http://localhost/api/v1/convert', {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${apiKey}`,
          'Content-Type': 'application/pdf',
          'Content-Length': '1000'
        },
        body: createMockFile('test')
      }),
      mockEnv
    );

    // Non-Error should return 500 status and fallback message
    expect(res.status).toBe(500);
    const data = await res.json() as { error: string };
    expect(data.error).toBe('Internal server error');

    // Restore the original function
    spy.mockRestore();
  });

  it('should return 400 with fallback status code for ValidationError with null statusCode', async () => {
    const apiKey = btoa('valid-key');
    const { ValidationError } = await import('../../src/errors');

    // Mock the conversion service to throw a ValidationError with undefined statusCode
    // This tests the nullish coalescing operator at line 48 in src/routes/convert.ts
    const validationError = new ValidationError('Validation failed');
    validationError.statusCode = null as any; // Force null to test ?? operator
    const spy = vi.spyOn(converter, 'convertFileToMarkdown').mockRejectedValue(validationError);

    const res = await app.fetch(
      new Request('http://localhost/api/v1/convert', {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${apiKey}`,
          'Content-Type': 'application/pdf',
          'Content-Length': '1000'
        },
        body: createMockFile('test')
      }),
      mockEnv
    );

    // ValidationError with null statusCode should return 400 (the ?? fallback)
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toContain('Validation failed');

    // Restore the original function
    spy.mockRestore();
  });
});

describe('GET /health', () => {
  it('should return healthy status', async () => {
    const res = await app.fetch(
      new Request('http://localhost/health'),
      {} as Env
    );

    expect(res.status).toBe(200);
    const data = await res.json() as { status: string };
    expect(data.status).toBe('healthy');
  });
});
