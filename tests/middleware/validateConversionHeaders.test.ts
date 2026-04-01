import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { validateConversionHeaders, extractMediaType } from '../../src/middleware/validateConversionHeaders';
import type { AppBindings } from '../../src/types/bindings';

describe('validateConversionHeaders middleware', () => {
  let mockEnv: AppBindings;
  let app: Hono;

  beforeEach(() => {
    mockEnv = {
      AI: {
        toMarkdown: vi.fn().mockResolvedValue({ data: '# Test' })
      } as any,
      API_KEYS_KV: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        list: vi.fn()
      } as any,
      JWT_SIGNING_KEY: 'test-secret-key',
      LOG_LEVEL: 'info',
      ENVIRONMENT: 'test'
    };

    app = new Hono();
    app.post('/convert', validateConversionHeaders, (c) => {
      const mediaType = c.get('validatedMediaType');
      const contentLength = c.get('validatedContentLength');
      return c.json({ success: true, mediaType, contentLength });
    });
  });

  describe('Content-Length validation', () => {
    it('should return 411 when Content-Length header is missing', async () => {
      const res = await app.fetch(
        new Request('http://localhost/convert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/pdf'
          },
          body: 'test'
        }),
        mockEnv
      );

      expect(res.status).toBe(411);
      const data = await res.json() as { error: string };
      expect(data.error).toContain('Content-Length header is required');
    });

    it('should return 411 when Content-Length is not a number', async () => {
      const res = await app.fetch(
        new Request('http://localhost/convert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Length': 'not-a-number'
          },
          body: 'test'
        }),
        mockEnv
      );

      expect(res.status).toBe(411);
      const data = await res.json() as { error: string };
      expect(data.error).toContain('Invalid Content-Length header');
    });

    it('should return 411 when Content-Length is negative', async () => {
      const res = await app.fetch(
        new Request('http://localhost/convert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Length': '-1'
          },
          body: 'test'
        }),
        mockEnv
      );

      expect(res.status).toBe(411);
      const data = await res.json() as { error: string };
      expect(data.error).toContain('Invalid Content-Length header');
    });

    it('should return 413 when payload exceeds maximum size', async () => {
      const res = await app.fetch(
        new Request('http://localhost/convert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Length': (48 * 1024 * 1024 + 1).toString() // 48MB + 1 byte
          },
          body: 'x'.repeat(1000)
        }),
        mockEnv
      );

      expect(res.status).toBe(413);
      const data = await res.json() as { error: string };
      expect(data.error).toContain('exceeds maximum allowed size');
    });

    it('should store valid Content-Length in context', async () => {
      const res = await app.fetch(
        new Request('http://localhost/convert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Length': '5000'
          },
          body: 'test'
        }),
        mockEnv
      );

      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean; contentLength: number };
      expect(data.success).toBe(true);
      expect(data.contentLength).toBe(5000);
    });
  });

  describe('Content-Type validation', () => {
    it('should return 400 when Content-Type header is missing', async () => {
      const req = new Request('http://localhost/convert', {
        method: 'POST',
        headers: {
          'Content-Length': '1000'
        },
        body: 'test'
      });
      // Remove any auto-set Content-Type header
      req.headers.delete('content-type');

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json() as { error: string };
      expect(data.error).toBe('Content-Type header is required');
    });

    it('should return 415 for unsupported media type', async () => {
      const res = await app.fetch(
        new Request('http://localhost/convert', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            'Content-Length': '1000'
          },
          body: 'test'
        }),
        mockEnv
      );

      expect(res.status).toBe(415);
      const data = await res.json() as { error: string };
      expect(data.error).toContain('Unsupported media type');
    });

    it('should pass for supported DOCX media type', async () => {
      const res = await app.fetch(
        new Request('http://localhost/convert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Length': '1000'
          },
          body: 'test docx'
        }),
        mockEnv
      );

      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean; mediaType: string };
      expect(data.success).toBe(true);
      expect(data.mediaType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should pass for supported ODT media type', async () => {
      const res = await app.fetch(
        new Request('http://localhost/convert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/vnd.oasis.opendocument.text',
            'Content-Length': '1000'
          },
          body: 'test odt'
        }),
        mockEnv
      );

      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean; mediaType: string };
      expect(data.success).toBe(true);
      expect(data.mediaType).toBe('application/vnd.oasis.opendocument.text');
    });

    it('should pass for supported PDF media type', async () => {
      const res = await app.fetch(
        new Request('http://localhost/convert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Length': '1000'
          },
          body: 'test pdf'
        }),
        mockEnv
      );

      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean; mediaType: string };
      expect(data.success).toBe(true);
      expect(data.mediaType).toBe('application/pdf');
    });

    it('should extract media type from complex Content-Type headers', async () => {
      const res = await app.fetch(
        new Request('http://localhost/convert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/pdf; charset=utf-8; boundary=something',
            'Content-Length': '1000'
          },
          body: 'test'
        }),
        mockEnv
      );

      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean; mediaType: string };
      expect(data.mediaType).toBe('application/pdf');
    });

    it('should store validated Content-Type in context', async () => {
      const res = await app.fetch(
        new Request('http://localhost/convert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Length': '1000'
          },
          body: 'test'
        }),
        mockEnv
      );

      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean; mediaType: string };
    expect(data.success).toBe(true);
    expect(data.mediaType).toBe('application/pdf');
  });
});

describe('extractMediaType unit tests', () => {
  it('should extract simple media type without parameters', () => {
    expect(extractMediaType('application/pdf')).toBe('application/pdf');
    expect(extractMediaType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(extractMediaType('text/plain')).toBe('text/plain');
  });

  it('should extract media type with charset parameter', () => {
    expect(extractMediaType('application/pdf; charset=utf-8')).toBe('application/pdf');
    expect(extractMediaType('text/html; charset=iso-8859-1')).toBe('text/html');
  });

  it('should extract media type with multiple parameters', () => {
    expect(extractMediaType('application/pdf; charset=utf-8; boundary=something')).toBe('application/pdf');
    expect(extractMediaType('multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW')).toBe('multipart/form-data');
  });

  it('should handle whitespace around semicolon', () => {
    expect(extractMediaType('application/pdf ;charset=utf-8')).toBe('application/pdf');
    expect(extractMediaType('application/pdf; charset=utf-8')).toBe('application/pdf');
    expect(extractMediaType('application/pdf ; charset=utf-8')).toBe('application/pdf');
    expect(extractMediaType('application/pdf  ;  charset=utf-8')).toBe('application/pdf');
  });

  it('should trim leading and trailing whitespace', () => {
    expect(extractMediaType('  application/pdf  ')).toBe('application/pdf');
    expect(extractMediaType('  application/pdf; charset=utf-8  ')).toBe('application/pdf');
  });

  it('should handle empty string and return it as-is', () => {
    expect(extractMediaType('')).toBe('');
  });

  it('should handle string with only semicolon', () => {
    expect(extractMediaType(';')).toBe(';'); // Split gives ['', ''], trim gives '' which is falsy, so returns original ';'
  });

  it('should handle content type with trailing semicolon', () => {
    expect(extractMediaType('application/pdf;')).toBe('application/pdf');
    expect(extractMediaType('application/pdf;  ')).toBe('application/pdf');
  });

  it('should return original string when first part is whitespace-only', () => {
    // This tests the || contentType fallback in the function
    expect(extractMediaType(' ;charset=utf-8')).toBe(' ;charset=utf-8'); // Trims to empty string, returns original
    expect(extractMediaType('   ')).toBe('   '); // Only whitespace, no semicolon, returns original
  });

  it('should handle edge cases with special characters', () => {
    expect(extractMediaType('application/vnd.api+json')).toBe('application/vnd.api+json');
    expect(extractMediaType('application/vnd.api+json; version=1')).toBe('application/vnd.api+json');
  });

  it('should handle malformed or unusual content types', () => {
    expect(extractMediaType('application')).toBe('application');
    expect(extractMediaType('pdf')).toBe('pdf');
    expect(extractMediaType('application/pdf;charset')).toBe('application/pdf'); // No = sign, still splits at ';'
  });

  it('should handle content type with trailing semicolon', () => {
    expect(extractMediaType('application/pdf;')).toBe('application/pdf');
    expect(extractMediaType('application/pdf;  ')).toBe('application/pdf');
  });

  it('should return original string when first part is whitespace-only', () => {
    // This tests the || contentType fallback in the function
    expect(extractMediaType(' ;charset=utf-8')).toBe(' ;charset=utf-8'); // Trims to empty string, returns original contentType
    expect(extractMediaType('   ')).toBe('   '); // Only whitespace, no semicolon, returns original
  });

  it('should handle edge cases with special characters', () => {
    expect(extractMediaType('application/vnd.api+json')).toBe('application/vnd.api+json');
    expect(extractMediaType('application/vnd.api+json; version=1')).toBe('application/vnd.api+json');
  });

  it('should handle malformed or unusual content types', () => {
    expect(extractMediaType('application')).toBe('application');
    expect(extractMediaType('pdf')).toBe('pdf');
    expect(extractMediaType('application/pdf;charset')).toBe('application/pdf'); // Splits at ';' regardless of content
  });

  it('should handle case-insensitive scenarios', () => {
    expect(extractMediaType('APPLICATION/PDF; CHARSET=UTF-8')).toBe('APPLICATION/PDF');
    expect(extractMediaType('Application/Pdf; Charset=UTF-8')).toBe('Application/Pdf');
  });
});
});