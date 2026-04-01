import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertFileToMarkdown } from '../../src/services/converter';
import { StructuredLogger } from '../../src/services/logger';
import { InMemoryWriter } from '../../src/services/logWriters';
import { ValidationError } from '../../src/errors';

describe('convertFileToMarkdown', () => {
  let memoryWriter: InMemoryWriter;
  let logger: StructuredLogger;

  beforeEach(() => {
    memoryWriter = new InMemoryWriter();
    logger = new StructuredLogger('info', memoryWriter);
  });

  it("should successfully convert file using AI service", async () => {
    const toMarkdownSpy = vi.fn().mockResolvedValue({ data: "# Converted Markdown\n\nContent here" });
    const mockAi = {
      toMarkdown: toMarkdownSpy
    } as unknown as Ai;

    const fileData = new ArrayBuffer(1024);

    const result = await convertFileToMarkdown(
      mockAi,
      fileData,
      "application/pdf",
      logger,
      "test-123"
    );

    expect(toMarkdownSpy).toHaveBeenCalledWith({
      name: "document",
      blob: expect.any(Blob)
    });
    expect(result).toBe("# Converted Markdown\n\nContent here");
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
        "application/pdf",
        logger,
        "test-123"
      )
    ).rejects.toThrow(ValidationError);

    expect(mockAi.toMarkdown).toHaveBeenCalledWith({
      name: "document",
      blob: expect.any(Blob)
    });
  });

  it("should convert ArrayBuffer to Uint8Array for AI service", async () => {
    const toMarkdownSpy = vi.fn().mockResolvedValue({ data: "# Markdown" });
    const mockAi = {
      toMarkdown: toMarkdownSpy
    } as unknown as Ai;

    const fileData = new ArrayBuffer(512);
    const view = new Uint8Array(fileData);
    view[0] = 1;
    view[1] = 2;

    await convertFileToMarkdown(mockAi, fileData, "application/pdf", logger, "test-123");

    const callArgs = toMarkdownSpy.mock.calls[0];
    expect(callArgs).toHaveLength(1);
    const arg = callArgs[0] as { name: string; blob: Blob };
    expect(arg.name).toBe("document");
    expect(arg.blob).toBeInstanceOf(Blob);
  });

  it("should handle string return type from AI service", async () => {
    const toMarkdownSpy = vi.fn().mockResolvedValue("# Markdown string");
    const mockAi = {
      toMarkdown: toMarkdownSpy
    } as unknown as Ai;

    const fileData = new ArrayBuffer(1024);

    const result = await convertFileToMarkdown(
      mockAi,
      fileData,
      "application/pdf",
      logger,
      "test-123"
    );

    expect(result).toBe("# Markdown string");
    expect(toMarkdownSpy).toHaveBeenCalledWith({
      name: "document",
      blob: expect.any(Blob)
    });
  });

  it("should handle non-Error exceptions", async () => {
    const mockAi = {
      toMarkdown: vi.fn().mockRejectedValue("String error")
    } as unknown as Ai;

    const fileData = new ArrayBuffer(1024);

    await expect(
      convertFileToMarkdown(
        mockAi,
        fileData,
        "application/pdf",
        logger,
        "test-123"
      )
    ).rejects.toThrow(ValidationError);

    try {
      await convertFileToMarkdown(mockAi, fileData, "application/pdf", logger, "test-123");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      // The code wraps non-Error exceptions with "Unknown conversion error"
      expect((error as ValidationError).message).toBe("Unknown conversion error");
    }
  });

  it("should throw ValidationError when AI returns object without 'data' property", async () => {
    const toMarkdownSpy = vi.fn().mockResolvedValue({ markdown: "# Wrong Property" });
    const mockAi = {
      toMarkdown: toMarkdownSpy
    } as unknown as Ai;

    const fileData = new ArrayBuffer(1024);

    await expect(
      convertFileToMarkdown(
        mockAi,
        fileData,
        "application/pdf",
        logger,
        "test-123"
      )
    ).rejects.toThrow(ValidationError);

    try {
      await convertFileToMarkdown(mockAi, fileData, "application/pdf", logger, "test-123");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).message).toBe("Unexpected conversion result format");
      expect((error as ValidationError).statusCode).toBe(400);
    }
  });
});
