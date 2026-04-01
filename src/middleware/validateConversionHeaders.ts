import type { Context } from 'hono';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../constants';
import type { AppBindings, AppVariables } from '../types/bindings';

/**
 * @description Extracts the base media type from a content type string, removing parameters
 * @param {string} contentType - Full content type with possible parameters (e.g., "application/pdf; charset=utf-8")
 * @returns {string} The extracted media type (e.g., "application/pdf")
 */
export function extractMediaType(contentType: string): string {
  return contentType.split(';')[0].trim() || contentType;
}

/**
 * @description Express-style middleware that validates conversion request headers
 * Validates Content-Type, Content-Length, and checks against supported MIME types and size limits
 * @param {Context<{ Bindings: AppBindings; Variables: AppVariables }>} c - Hono context with app bindings and variables
 * @param {() => Promise<void>} next - Function to call next middleware in chain
 * @returns {Promise<Response | void>} Response if validation fails, otherwise void to continue processing
 */
export async function validateConversionHeaders(
  c: Context<{ Bindings: AppBindings; Variables: AppVariables }>,
  next: () => Promise<void>
): Promise<Response | void> {

  // Validate Content-Type header
  const contentType: string | undefined = c.req.header('content-type');
  if (!contentType) {
    return c.json({ error: 'Content-Type header is required' }, { status: 400 });
  }

  // Validate Content-Length header
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

  // Validate media type
  const mediaType: string = extractMediaType(contentType);
  if (!ALLOWED_MIME_TYPES.includes(mediaType as typeof ALLOWED_MIME_TYPES[number])) {
    return c.json(
      { error: `Unsupported media type: ${contentType}. Supported types: DOCX, ODT, PDF` },
      { status: 415 }
    );
  }

  // Store validated values in context for use in the next handler
  c.set('validatedMediaType', mediaType);
  c.set('validatedContentLength', contentLength);

  await next();
}
