import { Hono } from 'hono';
import type { Context } from 'hono';
import { StructuredLogger } from '../services/logger';
import { convertFileToMarkdown } from '../services/converter';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../constants';
import { ValidationError } from '../errors';
import type { AppBindings } from '../types/bindings';

const app = new Hono<{ Bindings: AppBindings }>();

function extractBearerToken(headerValue: string): string | null {
  const match: RegExpMatchArray | null = headerValue.match(/^Bearer\s+(.+)$/);
  return match ? match[1] : null;
}

function extractApiKey(headerValue: string): string | null {
  const match: RegExpMatchArray | null = headerValue.match(/^ApiKey\s+(.+)$/);
  return match ? match[1] : null;
}

app.post('/api/v1/convert', async (c: Context<{ Bindings: AppBindings }>) => {
  const logger: StructuredLogger = new StructuredLogger(c.env.LOG_LEVEL);
  const requestId: string = crypto.randomUUID();

  try {
    const authHeader: string | undefined = c.req.header('authorization');
    if (!authHeader) {
      return c.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const contentType: string | undefined = c.req.header('content-type');
    if (!contentType) {
      return c.json({ error: 'Content-Type header is required' }, { status: 400 });
    }

    const contentLengthHeader: string | undefined = c.req.header('content-length');
    if (!contentLengthHeader) {
      return c.json({ error: 'Content-Length header is required' }, { status: 411 });
    }

    const contentLength: number = parseInt(contentLengthHeader, 10);
    if (isNaN(contentLength) || contentLength <= 0) {
      return c.json({ error: 'Invalid Content-Length header' }, { status: 411 });
    }

    if (contentLength > MAX_FILE_SIZE) {
      return c.json({ error: 'Request payload exceeds maximum allowed size of 48MB' }, { status: 413 });
    }

    const mediaType: string = contentType.split(';')[0]?.trim() || contentType;
    if (!ALLOWED_MIME_TYPES.includes(mediaType as typeof ALLOWED_MIME_TYPES[number])) {
return c.json(
      { error: `Unsupported media type: ${contentType}. Supported types: DOCX, ODT, PDF` },
      { status: 415 }
    );
    }

    logger.info('Processing conversion request', {
      requestId,
      contentType: mediaType
    });

    const jwtToken: string | null = extractBearerToken(authHeader);
    if (jwtToken) {
      const jwtSigningKey: string = c.env.JWT_SIGNING_KEY;
      if (!jwtSigningKey) {
        return c.json({ error: 'JWT authentication is not configured' }, { status: 401 });
      }
      logger.info('JWT authentication started', { requestId });
    } else {
      const apiKeyEncoded: string | null = extractApiKey(authHeader);
      if (apiKeyEncoded) {
        let apiKey: string;
        try {
          apiKey = atob(apiKeyEncoded);
        } catch {
          return c.json({ error: 'Invalid API key encoding (must be base64)' }, { status: 401 });
        }

        const storedKey: string | null = await c.env.API_KEYS_KV.get(apiKey);
        if (!storedKey) {
          return c.json({ error: 'Invalid API key' }, { status: 401 });
        }
        logger.info('API key authentication started', { requestId });
      } else {
        return c.json({ error: 'Unsupported authorization method' }, { status: 401 });
      }
    }

    const arrayBuffer: ArrayBuffer = await c.req.arrayBuffer();
    const markdown: string = await convertFileToMarkdown(
      c.env.AI,
      arrayBuffer,
      mediaType,
      logger,
      requestId
    );

    logger.info('Conversion successful', { requestId });

    return c.text(markdown, 200, {
      'Content-Type': 'text/markdown',
      'X-Request-Id': requestId
    });
  } catch (error) {
    const errorMessage: string = error instanceof Error ? error.message : 'Internal server error';
    const statusCode: number = error instanceof ValidationError ? (error.statusCode ?? 400) : 500;

    logger.error('Conversion request failed', error instanceof Error ? error : new Error(errorMessage), {
      requestId
    });

    return c.json({ error: errorMessage }, { status: statusCode as 400 | 500, headers: {
      'X-Request-Id': requestId
    } });
  }
});

export default app;
