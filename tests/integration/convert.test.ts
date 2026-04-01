import { describe, it, expect, beforeEach, vi } from 'vitest';
import app from '../../src/index';

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
    return encoder.encode(content).buffer;
  };

  it('should convert PDF with valid JWT', async () => {
    const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    
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
    const data = await res.json();
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
});

describe('GET /health', () => {
  it('should return healthy status', async () => {
    const res = await app.fetch(
      new Request('http://localhost/health'),
      {} as Env
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('healthy');
  });
});
