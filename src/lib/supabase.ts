import { createClient } from "@supabase/supabase-js";

// Server-only admin client (uses the service role key - never expose this to
// the client). Storage is the only Supabase feature this app uses: each
// uploaded document gets its own folder `${id}/` containing the original
// file plus a `summary.json` metadata file, so no separate database is
// needed.
export const DOCUMENTS_BUCKET = process.env.SUPABASE_DOCUMENTS_BUCKET || "documents";

let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_KEY are not configured. Set them in .env.local (locally) or as environment variables (in production)."
    );
  }

  client = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  return client;
}
