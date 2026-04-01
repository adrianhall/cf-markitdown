import { Hono } from 'hono';
import type { Context } from 'hono';
import { StructuredLogger } from '../services/logger';
import { convertFileToMarkdown } from '../services/converter';
import { ValidationError } from '../errors';
import type { AppBindings, AppVariables } from '../types/bindings';
import { validateAuthorizationHeader } from '../middleware/validateAuthorizationHeader';
import { validateConversionHeaders } from '../middleware/validateConversionHeaders';

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

/**
 * @description Processes file conversion requests by validating input, converting via AI service, and returning markdown
 * Handles authentication logging, file conversion, error handling, and response formatting
 * @param {Context<{ Bindings: AppBindings; Variables: AppVariables }>} c - Hono context with request and environment
 * @returns {Promise<Response | void>} HTTP response with markdown or error
 */
export const conversionProcessor = async (c: Context<{ Bindings: AppBindings; Variables: AppVariables }>): Promise<Response | void> => {
  const logger: StructuredLogger = new StructuredLogger(c.env.LOG_LEVEL);
  const requestId: string = crypto.randomUUID();

  try {
    const mediaType: string = c.get('validatedMediaType');

    logger.info('Processing conversion request', {
      requestId,
      contentType: mediaType
    });

    const authHeader: string | undefined = c.req.header('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      logger.info('JWT authentication started', { requestId });
    } else {
      logger.info('API key authentication started', { requestId });
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
};

app.post('/api/v1/convert', 
  validateAuthorizationHeader,
  validateConversionHeaders, 
  conversionProcessor);

export default app;
