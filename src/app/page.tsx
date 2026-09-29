"use client";

import useSWR from "swr";

import DocumentCard from "@/components/DocumentCard";
import DocumentUploader from "@/components/DocumentUploader";
import type { DocumentSummary } from "@/lib/types";

async function fetcher(url: string): Promise<DocumentSummary[]> {
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Failed to load documents");
  return body.documents as DocumentSummary[];
}

export default function Home() {
  const { data: documents, error, isLoading, mutate } = useSWR("/api/documents", fetcher);

  function handleUploaded(document: DocumentSummary) {
    mutate((prev) => [document, ...(prev ?? [])], { revalidate: false });
  }

  function handleDeleted(id: string) {
    mutate((prev) => prev?.filter((doc) => doc.id !== id), { revalidate: false });
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold">Doc Summarizer</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Upload a document — it&apos;s stored in Supabase and summarized by an LLM.
        </p>
      </header>

      <DocumentUploader onUploaded={handleUploaded} />

      <section className="mt-10 space-y-4">
        {isLoading && <p className="text-center text-gray-500">Loading documents…</p>}
        {error && (
          <p className="text-center text-sm text-red-600">
            {error instanceof Error ? error.message : "Failed to load documents"}
          </p>
        )}
        {!isLoading && !error && documents?.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400">
            No documents yet — upload one to get started.
          </p>
        )}
        {documents?.map((document) => (
          <DocumentCard key={document.id} document={document} onDeleted={handleDeleted} />
        ))}
      </section>
    </main>
  );
}
