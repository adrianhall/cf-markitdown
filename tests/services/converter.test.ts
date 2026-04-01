import { describe, it, expect, vi } from 'vitest';
import { convertFileToMarkdown } from '../../src/services/converter';
import { StructuredLogger } from '../../src/services/logger';
import { ValidationError } from '../../src/errors';

describe('convertFileToMarkdown', () => {
  const logger = new StructuredLogger();

  it('should successfully convert file using AI service', async () => {
    const mockAi = {
      toMarkdown: vi.fn().mockResolvedValue({ data: '# Converted Markdown\n\nContent here' })
    } as unknown as Ai;

    const fileData = new ArrayBuffer(1024);

    const result = await convertFileToMarkdown(
      mockAi,
      fileData,
      'application/pdf',
      logger,
      'test-123'
    );

    expect(mockAi.toMarkdown).toHaveBeenCalledWith({
      name: 'document',
      blob: expect.any(Blob)
    });
    expect(result).toBe('# Converted Markdown\n\nContent here');
  });

  it('should throw ValidationError on failure', async () => {
    const mockAi = {
      toMarkdown: vi.fn().mockRejectedValue(new Error('AI service error'))
    } as unknown as Ai;

    const fileData = new ArrayBuffer(1024);

    await expect(
      convertFileToMarkdown(
        mockAi,
        fileData,
        'application/pdf',
        logger,
        'test-123'
      )
    ).rejects.toThrow(ValidationError);
  });

  it('should convert ArrayBuffer to Uint8Array for AI service', async () => {
    const mockAi = {
      toMarkdown: vi.fn().mockResolvedValue({ data: '# Markdown' })
    } as unknown as Ai;

    const fileData = new ArrayBuffer(512);
    const view = new Uint8Array(fileData);
    view[0] = 1;
    view[1] = 2;

    await convertFileToMarkdown(mockAi, fileData, 'application/pdf', logger, 'test-123');

    const callArgs = mockAi.toMarkdown.mock.calls[0];
    expect(callArgs).toHaveLength(1);
    
    const arg = callArgs[0] as { name: string; blob: Blob };
    expect(arg.name).toBe('document');
    expect(arg.blob).toBeInstanceOf(Blob);
  });
});
