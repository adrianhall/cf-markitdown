import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { validateAuthorizationHeader } from '../../src/middleware/validateAuthorizationHeader';
import type { AppBindings } from '../../src/types/bindings';

describe('validateAuthorizationHeader middleware', () => {
  let mockEnv: AppBindings;
  let app: Hono;

  beforeEach(() => {
    mockEnv = {
      AI: {
        toMarkdown: vi.fn().mockResolvedValue({ data: '# Test' })
      } as any,
      API_KEYS_KV: {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn(),
        delete: vi.fn(),
        list: vi.fn()
      } as any,
      JWT_SIGNING_KEY: 'test-secret-key',
      LOG_LEVEL: 'info',
      ENVIRONMENT: 'test'
    };

    app = new Hono();
    app.use('/convert', validateAuthorizationHeader);
    app.post('/convert', (c) => {
      return c.json({ success: true });
    });
  });

  describe('Missing authorization', () => {
    it('should return 401 when authorization header is missing', async () => {
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

      expect(res.status).toBe(401);
      const data = await res.json() as { error: string };
      expect(data.error).toBe('Missing authorization header');
    });
  });

  describe('Malformed authorization header', () => {
    it('should return 400 when authorization header has invalid format', async () => {
      const res = await app.fetch(
        new Request('http://localhost/convert', {
          method: 'POST',
          headers: {
            'Authorization': 'InvalidFormatNoSpace',
            'Content-Type': 'application/pdf',
            'Content-Length': '1000'
          },
          body: 'test'
        }),
        mockEnv
      );

      expect(res.status).toBe(400);
      const data = await res.json() as { error: string };
      expect(data.error).toBe('Malformed authorization header');
    });
  });

  describe('Unsupported authentication methods', () => {
    it('should return 401 for Basic auth method', async () => {
      const res = await app.fetch(
        new Request('http://localhost/convert', {
          method: 'POST',
          headers: {
            'Authorization': 'Basic dXNlcjpwYXNz',
            'Content-Type': 'application/pdf',
            'Content-Length': '1000'
          },
          body: 'test'
        }),
        mockEnv
      );

      expect(res.status).toBe(401);
      const data = await res.json() as { error: string };
      expect(data.error).toBe('Unsupported authentication method');
    });

    it('should return 401 for Digest auth method', async () => {
      const res = await app.fetch(
        new Request('http://localhost/convert', {
          method: 'POST',
          headers: {
            'Authorization': 'Digest username="user"',
            'Content-Type': 'application/pdf',
            'Content-Length': '1000'
          },
          body: 'test'
        }),
        mockEnv
      );

      expect(res.status).toBe(401);
      const data = await res.json() as { error: string };
      expect(data.error).toBe('Unsupported authentication method');
    });
  });

  describe('JWT authentication', () => {
    it('should pass with valid JWT token', async () => {
      // Valid JWT token with signature: "test-secret-key", payload: {"sub":"1234567890","name":"John Doe","iat":1516239022}
      const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.JCNAMz0AsT31lKxaGO4R8n9PpZ6ry9ZkWUcS5e3OtP4';

      const res = await app.fetch(
        new Request('http://localhost/convert', {
          method: 'POST',
          headers: {
            'Authorization': token,
            'Content-Type': 'application/pdf',
            'Content-Length': '1000'
          },
          body: 'test'
        }),
        mockEnv
      );

      expect(res.status).toBe(200);
    });

    it('should return 401 when JWT signing key is not configured', async () => {
      const envWithoutJwt = {
        ...mockEnv,
        JWT_SIGNING_KEY: undefined
      };

      const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const res = await app.fetch(
        new Request('http://localhost/convert', {
          method: 'POST',
          headers: {
            'Authorization': token,
            'Content-Type': 'application/pdf',
            'Content-Length': '1000'
          },
          body: 'test'
        }),
        envWithoutJwt as any
      );

      expect(res.status).toBe(401);
      const data = await res.json() as { error: string };
      expect(data.error).toBe('JWT authentication not configured');
    });

    it('should return 401 for expired JWT token', async () => {
      // Expired JWT token
      const expiredToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj3UFYzPUVaVF43FmMab6RlaQD8A9V8fF8Lf8ZJU';

      const res = await app.fetch(
        new Request('http://localhost/convert', {
          method: 'POST',
          headers: {
            'Authorization': expiredToken,
            'Content-Type': 'application/pdf',
            'Content-Length': '1000'
          },
          body: 'test'
        }),
        mockEnv
      );

      expect(res.status).toBe(401);
      const data = await res.json() as { error: string };
      expect(data.error).toContain('JWT');
    });

    it('should return 401 for invalid JWT signature', async () => {
      const invalidToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalidsignature';

      const res = await app.fetch(
        new Request('http://localhost/convert', {
          method: 'POST',
          headers: {
            'Authorization': invalidToken,
            'Content-Type': 'application/pdf', 
            'Content-Length': '1000'
          },
          body: 'test'
        }),
        mockEnv
      );

      expect(res.status).toBe(401);
    });
  });

  describe('API key authentication', () => {
    it('should pass with valid API key', async () => {
      const envWithValidKey = {
        ...mockEnv,
        API_KEYS_KV: {
          ...mockEnv.API_KEYS_KV,
          get: vi.fn().mockResolvedValue('valid-key')
        } as any
      };

      const apiKey = btoa('valid-key');
      const res = await app.fetch(
        new Request('http://localhost/convert', {
          method: 'POST',
          headers: {
            'Authorization': `ApiKey ${apiKey}`,
            'Content-Type': 'application/pdf',
            'Content-Length': '1000'
          },
          body: 'test'
        }),
        envWithValidKey
      );

      expect(res.status).toBe(200);
    });

    it('should return 401 for invalid base64 API key encoding', async () => {
      const res = await app.fetch(
        new Request('http://localhost/convert', {
          method: 'POST',
          headers: {
            'Authorization': 'ApiKey !!!invalid-base64!!!',
            'Content-Type': 'application/pdf',
            'Content-Length': '1000'
          },
          body: 'test'
        }),
        mockEnv
      );

      expect(res.status).toBe(401);
      const data = await res.json() as { error: string };
      expect(data.error).toBe('Invalid API key encoding');
    });

    it('should return 401 for API key not found in KV store', async () => {
      const apiKey = btoa('non-existent-key');

      const res = await app.fetch(
        new Request('http://localhost/convert', {
          method: 'POST',
          headers: {
            'Authorization': `ApiKey ${apiKey}`,
            'Content-Type': 'application/pdf',
            'Content-Length': '1000'
          },
          body: 'test'
        }),
        mockEnv
      );

      expect(res.status).toBe(401);
      const data = await res.json() as { error: string };
      expect(data.error).toBe('Invalid API key');
    });
  });
});