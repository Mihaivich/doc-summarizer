import mammoth from "mammoth";
// Registers pdf-parse's worker script before use - required so PDFParse can
// resolve it in Next.js's server bundle instead of failing with
// "Setting up fake worker failed".
import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";

export class UnsupportedFileTypeError extends Error {}

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function extractText(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  if (mimeType === "application/pdf" || ext === "pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (mimeType === DOCX_MIME || ext === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (mimeType.startsWith("text/") || ext === "txt" || ext === "md") {
    return buffer.toString("utf-8");
  }

  throw new UnsupportedFileTypeError(
    `Unsupported file type "${mimeType || ext}". Supported: .txt, .md, .pdf, .docx`
  );
}
