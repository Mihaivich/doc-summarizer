"use client";

import { useRef, useState } from "react";

import type { DocumentSummary } from "@/lib/types";

interface DocumentUploaderProps {
  onUploaded: (document: DocumentSummary) => void;
}

export default function DocumentUploader({ onUploaded }: DocumentUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/documents", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Upload failed");
      }
      onUploaded(body.document as DocumentSummary);
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileChange}
        disabled={isUploading}
        className="hidden"
        id="document-upload-input"
      />
      <label
        htmlFor="document-upload-input"
        className={`inline-flex cursor-pointer items-center justify-center rounded-lg px-5 py-2.5 font-medium text-white transition-colors ${
          isUploading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {isUploading ? "Summarizing…" : "Choose a document to upload"}
      </label>
      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        Supports .txt, .md, .pdf, .docx — up to 8MB
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
