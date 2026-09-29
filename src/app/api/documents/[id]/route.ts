import { NextRequest, NextResponse } from "next/server";

import { DOCUMENTS_BUCKET, getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: entries, error: listError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .list(id);
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }
  if (!entries || entries.length === 0) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const { error: removeError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove(entries.map((entry) => `${id}/${entry.name}`));
  if (removeError) {
    return NextResponse.json({ error: removeError.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
