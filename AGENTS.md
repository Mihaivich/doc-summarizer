<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project overview

Doc Summarizer: upload a document, it's stored in Supabase Storage, and an
LLM generates a summary + key points. Next.js App Router, TypeScript,
Tailwind v4.

- `src/app/page.tsx` — single-page UI (upload form + document list), uses
  SWR for data fetching.
- `src/app/api/documents/route.ts` — `GET` lists documents, `POST` handles
  upload + text extraction + summarization.
- `src/app/api/documents/[id]/route.ts` — `DELETE` a document.
- `src/app/api/documents/[id]/file/route.ts` — redirects to a signed URL to
  download the original file.
- `src/lib/supabase.ts`, `src/lib/gemini.ts`, `src/lib/textExtraction.ts` —
  Supabase admin client, LLM summarization, and PDF/DOCX/text extraction.

## Storage layout (no database)

Each document is a folder in the `SUPABASE_DOCUMENTS_BUCKET` bucket named
after its UUID: `${id}/original-<filename>` (the uploaded file) and
`${id}/summary.json` (metadata + summary, shaped like `DocumentSummary` in
`src/lib/types.ts`). Listing reads `summary.json` from every folder — there
is no separate database.

## LLM

Uses Google's Gemini API via its OpenAI-compatible endpoint (see
`src/lib/gemini.ts`) — `gemini-3.5-flash-lite` was empirically the
fastest/most reliable free-tier model (see the companion NoteTaker project
in this course exercise for the comparison). `GEMINI_API_KEY` /
`GEMINI_MODEL` env vars.

## Secrets and configuration

`.env.local` holds real values (gitignored). `.env.example` must stay in
sync with every env var the app needs, with placeholder values.

## Agent skills

This project has Vercel's official agent skills installed at the
`Exercise 1/.agents/skills/` level (one directory up from this repo):
`vercel-react-best-practices` (performance rules — followed for the SWR data
fetching pattern and Node-runtime route handlers) and `deploy-to-vercel`
(deployment decision flow).

## Testing changes

No automated test suite. After any change, run `npm run lint`, `npx tsc
--noEmit`, and manually exercise the affected API route with `curl` (or the
UI) before committing — especially the PDF/DOCX extraction paths, since
`pdf-parse` needs `serverExternalPackages` in `next.config.ts` and the
`pdf-parse/worker` side-effect import to work under Next.js's server bundle.
