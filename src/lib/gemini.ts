import OpenAI from "openai";

// Google's Gemini API exposes an OpenAI-compatible endpoint, so the standard
// `openai` SDK works unchanged - only base URL, key and model differ.
// https://ai.google.dev/gemini-api/docs/openai
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
// gemini-3.5-flash-lite was empirically the fastest/most reliable free-tier
// model available (see the companion NoteTaker project for the comparison).
const DEFAULT_MODEL = "gemini-3.5-flash-lite";

// Long documents cost more tokens and risk hitting model limits without
// improving the summary much further - truncate before sending.
const MAX_INPUT_CHARS = 20000;

export class LLMError extends Error {}

function getClient(): OpenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new LLMError(
      "GEMINI_API_KEY is not configured. Set it in .env.local (locally) or as an environment variable (in production). Get a free key at https://aistudio.google.com/apikey"
    );
  }
  return new OpenAI({ baseURL: GEMINI_BASE_URL, apiKey });
}

function getModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

function parseJsonResponse(raw: string | null): Record<string, unknown> {
  let cleaned = (raw || "").trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```json?/i, "").replace(/```$/, "").trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch (exc) {
    throw new LLMError(`LLM did not return valid JSON: ${exc}. Raw response: ${raw}`);
  }
}

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  truncated: boolean;
}

const SYSTEM_PROMPT = `You are a precise document summarization assistant. Given the text content of an uploaded document, respond with a single JSON object (no markdown fences) shaped exactly like:
{"summary": "a concise 3-6 sentence summary", "keyPoints": ["key point 1", "key point 2", "..."]}
Provide 3-6 keyPoints. Do not include any text outside the JSON object.`;

export async function summarizeDocument(text: string): Promise<SummaryResult> {
  const truncated = text.length > MAX_INPUT_CHARS;
  const content = truncated ? text.slice(0, MAX_INPUT_CHARS) : text;

  const client = getClient();
  const model = getModel();
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content },
  ];

  let raw: string | null;
  try {
    const completion = await client.chat.completions.create({
      model,
      messages,
      response_format: { type: "json_object" },
    });
    raw = completion.choices[0].message.content;
  } catch {
    // Fall back to a plain call in case response_format isn't honored.
    try {
      const completion = await client.chat.completions.create({ model, messages });
      raw = completion.choices[0].message.content;
    } catch (exc) {
      throw new LLMError(`LLM request failed: ${exc}`);
    }
  }

  const parsed = parseJsonResponse(raw);
  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  if (!summary) {
    throw new LLMError(`LLM response missing a usable summary: ${JSON.stringify(parsed)}`);
  }
  const keyPoints = Array.isArray(parsed.keyPoints)
    ? parsed.keyPoints.map((p) => String(p).trim()).filter(Boolean)
    : [];

  return { summary, keyPoints, truncated };
}
