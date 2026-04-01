import type { Logger } from '../types';
import { ValidationError } from '../errors';

/**
 * @description Converts a file to markdown using the AI service. Takes file data and content type
 * to produce a markdown string through the AI's toMarkdown capability.
 * @param {Ai} ai - The Cloudflare AI binding for conversion operations
 * @param {ArrayBuffer} fileData - The raw binary file data to convert
 * @param {string} contentType - The MIME type of the file
 * @param {Logger} logger - Logger instance for tracking conversion progress
 * @param {string} requestId - Unique identifier for tracking this conversion request
 * @returns {Promise<string>} A promise resolving to the converted markdown string
 * @throws {ValidationError} If conversion fails or returns unexpected format
 */
export async function convertFileToMarkdown(
  ai: Ai,
  fileData: ArrayBuffer,
  contentType: string,
  logger: Logger,
  requestId: string
): Promise<string> {
  logger.info('Starting file conversion', { requestId, contentType });

  try {
    const uint8Array = new Uint8Array(fileData);
    const blob = new Blob([uint8Array], { type: contentType });
    
    const conversionResult = await ai.toMarkdown({ name: 'document', blob });
    logger.info('File conversion completed', { requestId });

    if (typeof conversionResult === 'object' && 'data' in conversionResult) {
      return conversionResult.data;
    }

    if (typeof conversionResult === 'string') {
      return conversionResult;
    }

    throw new ValidationError('Unexpected conversion result format', 400);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown conversion error';
    logger.error(
      'File conversion failed',
      error instanceof Error ? error : new Error(errorMessage),
      {
        requestId,
        contentType
      }
    );
    throw new ValidationError(errorMessage, 400);
  }
}
