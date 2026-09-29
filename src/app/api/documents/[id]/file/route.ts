import { NextRequest, NextResponse } from "next/server";

import { DOCUMENTS_BUCKET, getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const SIGNED_URL_TTL_SECONDS = 60;

export async function GET(
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
  const original = entries?.find((entry) => entry.name.startsWith("original-"));
  if (!original) {
    return NextResponse.json({ error: "Original file not found" }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(`${id}/${original.name}`, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not sign URL" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
