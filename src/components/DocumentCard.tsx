"use client";

import { useState } from "react";

import type { DocumentSummary } from "@/lib/types";

interface DocumentCardProps {
  document: DocumentSummary;
  onDeleted: (id: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentCard({ document, onDeleted }: DocumentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${document.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Delete failed");
      }
      onDeleted(document.id);
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Delete failed");
      setIsDeleting(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{document.filename}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatSize(document.size)} · {new Date(document.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <a
            href={`/api/documents/${document.id}/file`}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            Download
          </a>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950 disabled:opacity-50"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed">{document.summary}</p>

      {document.keyPoints.length > 0 && (
        <ul className="mt-3 list-disc pl-5 text-sm space-y-1 text-gray-700 dark:text-gray-300">
          {document.keyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}

      {document.truncated && (
        <p className="mt-3 text-xs text-amber-600">
          Document was long — summary is based on the first portion of the text.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
