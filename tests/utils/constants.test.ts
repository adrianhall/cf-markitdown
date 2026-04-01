import { describe, it, expect } from 'vitest';
import { SUPPORTED_MIME_TYPES, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../../src/constants';

describe('Constants', () => {
  it('should have correct DOCX MIME type', () => {
    expect(SUPPORTED_MIME_TYPES.DOCX).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });

  it('should have correct ODT MIME type', () => {
    expect(SUPPORTED_MIME_TYPES.ODT).toBe('application/vnd.oasis.opendocument.text');
  });

  it('should have correct PDF MIME type', () => {
    expect(SUPPORTED_MIME_TYPES.PDF).toBe('application/pdf');
  });

  it('should include all supported types in ALLOWED_MIME_TYPES', () => {
    expect(ALLOWED_MIME_TYPES).toHaveLength(3);
    expect(ALLOWED_MIME_TYPES).toContain(SUPPORTED_MIME_TYPES.DOCX);
    expect(ALLOWED_MIME_TYPES).toContain(SUPPORTED_MIME_TYPES.ODT);
    expect(ALLOWED_MIME_TYPES).toContain(SUPPORTED_MIME_TYPES.PDF);
  });

  it('should have correct max file size (48MB)', () => {
    expect(MAX_FILE_SIZE).toBe(48 * 1024 * 1024);
  });
});
