import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { summarizeDocument, LLMError } from "@/lib/gemini";
import { DOCUMENTS_BUCKET, getSupabaseAdmin } from "@/lib/supabase";
import { extractText, UnsupportedFileTypeError } from "@/lib/textExtraction";
import type { DocumentSummary } from "@/lib/types";

// pdf-parse/mammoth need Node's Buffer/fs APIs, not available on the edge runtime.
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data: folders, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .list("", { limit: 1000, sortBy: { column: "name", order: "desc" } });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const documents = (
    await Promise.all(
      (folders ?? [])
        .filter((entry) => entry.id === null) // folders have no file id
        .map(async (folder) => {
          const { data, error: downloadError } = await supabase.storage
            .from(DOCUMENTS_BUCKET)
            .download(`${folder.name}/summary.json`);
          if (downloadError || !data) return null;
          try {
            return JSON.parse(await data.text()) as DocumentSummary;
          } catch {
            return null;
          }
        })
    )
  ).filter((doc): doc is DocumentSummary => doc !== null);

  documents.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json({ documents });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const id = randomUUID();
  const supabase = getSupabaseAdmin();

  let text: string;
  try {
    text = await extractText(buffer, file.name, file.type);
  } catch (exc) {
    if (exc instanceof UnsupportedFileTypeError) {
      return NextResponse.json({ error: exc.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: `Could not read document: ${exc instanceof Error ? exc.message : exc}` },
      { status: 400 }
    );
  }
  if (!text.trim()) {
    return NextResponse.json(
      { error: "No extractable text found in this document" },
      { status: 400 }
    );
  }

  let summaryResult;
  try {
    summaryResult = await summarizeDocument(text);
  } catch (exc) {
    const message = exc instanceof LLMError ? exc.message : `Summarization failed: ${exc}`;
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const document: DocumentSummary = {
    id,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    createdAt: new Date().toISOString(),
    summary: summaryResult.summary,
    keyPoints: summaryResult.keyPoints,
    truncated: summaryResult.truncated,
  };

  const [originalUpload, summaryUpload] = await Promise.all([
    supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(`${id}/original-${file.name}`, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      }),
    supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(`${id}/summary.json`, JSON.stringify(document), {
        contentType: "application/json",
        upsert: false,
      }),
  ]);

  if (originalUpload.error || summaryUpload.error) {
    return NextResponse.json(
      { error: originalUpload.error?.message || summaryUpload.error?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ document }, { status: 201 });
}
