import type { Logger } from '../types';
import { ValidationError } from '../errors';

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

    const conversionResult = await ai.toMarkdown({
      name: 'document',
      blob: blob
    });

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
