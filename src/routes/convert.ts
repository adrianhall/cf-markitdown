import { Hono, Context } from 'hono';
import { StructuredLogger } from '../services/logger';
import { convertFileToMarkdown } from '../services/converter';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../constants';
import { ValidationError } from '../errors';

const app = new Hono();

function extractBearerToken(headerValue: string): string | null {
  const match = headerValue.match(/^Bearer\s+(.+)$/);
  return match ? match[1] : null;
}

function extractApiKey(headerValue: string): string | null {
  const match = headerValue.match(/^ApiKey\s+(.+)$/);
  return match ? match[1] : null;
}

app.post('/api/v1/convert', async (c: Context) => {
  const logger = new StructuredLogger(c.env.LOG_LEVEL);
  const requestId = crypto.randomUUID();

  try {
    const authHeader = c.req.header('authorization');
    const contentType = c.req.header('content-type');
    const contentLengthHeader = c.req.header('content-length');

    if (!authHeader) {
      return c.json({ error: 'Missing authorization header' }, 401);
    }

    if (!contentType) {
      return c.json({ error: 'Content-Type header is required' }, 400);
    }

    if (!contentLengthHeader) {
      return c.json({ error: 'Content-Length header is required' }, 411);
    }

    const contentLength = parseInt(contentLengthHeader, 10);
    if (isNaN(contentLength) || contentLength <= 0) {
      return c.json({ error: 'Invalid Content-Length header' }, 411);
    }

    if (contentLength > MAX_FILE_SIZE) {
      return c.json({ error: 'Request payload exceeds maximum allowed size of 500MB' }, 413);
    }

    const mediaType = contentType.split(';')[0]?.trim() || contentType;
    if (!ALLOWED_MIME_TYPES.includes(mediaType as typeof ALLOWED_MIME_TYPES[number])) {
      return c.json(
        { error: `Unsupported media type: ${contentType}. Supported types: DOCX, ODT, PDF` },
        415
      );
    }

    logger.info('Processing conversion request', {
      requestId,
      contentType: mediaType
    });

    const jwtToken = extractBearerToken(authHeader);
    if (jwtToken) {
      const jwtSigningKey = c.env.JWT_SIGNING_KEY;
      if (!jwtSigningKey) {
        return c.json({ error: 'JWT authentication is not configured' }, 401);
      }
      logger.info('JWT authentication started', { requestId });
    } else {
      const apiKeyEncoded = extractApiKey(authHeader);
      if (apiKeyEncoded) {
        let apiKey: string;
        try {
          apiKey = atob(apiKeyEncoded);
        } catch {
          return c.json({ error: 'Invalid API key encoding (must be base64)' }, 401);
        }

        const storedKey = await c.env.API_KEYS_KV.get(apiKey);
        if (!storedKey) {
          return c.json({ error: 'Invalid API key' }, 401);
        }
        logger.info('API key authentication started', { requestId });
      } else {
        return c.json({ error: 'Unsupported authorization method' }, 401);
      }
    }

    const arrayBuffer = await c.req.arrayBuffer();
    const markdown = await convertFileToMarkdown(
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
    logger.error('Conversion request failed', error instanceof Error ? error : new Error('Unknown error'), {
      requestId
    });

    if (error instanceof ValidationError) {
      return c.json({ error: error.message }, error.statusCode ?? 400, {
        'X-Request-Id': requestId
      });
    }

    return c.json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500, {
      'X-Request-Id': requestId
    });
  }
});

export default app;
