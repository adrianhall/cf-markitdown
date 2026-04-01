/**
 * Maximum allowed file size for document conversion (48MB)
 * Constrained by Cloudflare Worker memory limits
 */
export const MAX_FILE_SIZE = 48 * 1024 * 1024; // 48MB

/**
 * Supported MIME type constants for document conversion
 */
export const SUPPORTED_MIME_TYPES = {
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ODT: 'application/vnd.oasis.opendocument.text',
  PDF: 'application/pdf'
} as const;

/**
 * Array of all allowed MIME types for conversion validation
 */
export const ALLOWED_MIME_TYPES = [
  SUPPORTED_MIME_TYPES.DOCX,
  SUPPORTED_MIME_TYPES.ODT,
  SUPPORTED_MIME_TYPES.PDF
];
