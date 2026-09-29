export interface DocumentSummary {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  summary: string;
  keyPoints: string[];
  truncated: boolean;
}
