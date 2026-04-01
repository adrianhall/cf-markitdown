export const MAX_FILE_SIZE = 48 * 1024 * 1024; // 48MB - CloudFlare Worker memory limit

export const SUPPORTED_MIME_TYPES = {
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ODT: 'application/vnd.oasis.opendocument.text',
  PDF: 'application/pdf'
} as const;

export const ALLOWED_MIME_TYPES = [
  SUPPORTED_MIME_TYPES.DOCX,
  SUPPORTED_MIME_TYPES.ODT,
  SUPPORTED_MIME_TYPES.PDF
];
