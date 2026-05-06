// UpDraft Gemini wrapper.
//
// Single entry point for every model call UpDraft makes. Handles:
//   - SYS_* prompt loading (via skill-files)
//   - optional Audit voice prepend (PLAN.md §6: voice is loaded on every
//     user-facing AI turn; silent extraction calls skip it)
//   - structured output via response_schema (every [AI] step in the spec
//     produces JSON — schema-enforced reduces parse-retry churn)
//   - token counting from usageMetadata for the quota counters
//   - one retry on malformed JSON with a stricter "JSON only" reminder
//
// Matches the existing /api/ask-beau pattern (raw fetch to the v1beta
// generateContent endpoint, no SDK).

import 'server-only';
import { loadAuditVoice, loadSystemPrompt, type SysPromptName } from './skill-files';
import { GEMINI_RETRY, withRetryResult } from './retry';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export type UpdraftModel = 'gemini-2.0-flash' | 'gemini-2.5-flash' | 'gemini-2.5-pro';

export interface InlineFile {
  /** MIME type Gemini should treat the data as. e.g. 'application/pdf'. */
  mimeType: string;
  /** Base64-encoded file bytes. */
  data: string;
}

export interface CallGeminiArgs {
  /** SYS_* identifier from lib-system-prompts.md, or a raw system instruction string. */
  systemPrompt: SysPromptName | { raw: string };
  /**
   * Whether to prepend the Audit voice spec to the system instruction.
   * Default false — voice is for user-facing AI turns; silent extraction
   * calls (parse, score, lint rewrite) should pass false.
   */
  withAuditVoice?: boolean;
  /** User-side input. Plain text or pre-stringified JSON. */
  userPrompt: string;
  /**
   * Optional inline file attachments — sent as additional parts in the user
   * content. Used for PDF resume input (Gemini reads PDFs natively, no need
   * for a separate text-extraction step).
   */
  inlineFiles?: InlineFile[];
  /**
   * Gemini-flavored JSON Schema for structured output. When set, the
   * response is parsed as JSON and returned in `.json`. When undefined,
   * the response is returned as plain text in `.text`.
   */
  responseSchema?: object;
  /** Defaults to gemini-2.0-flash. */
  model?: UpdraftModel;
  /** Optional generation config overrides. */
  temperature?: number;
}

export interface GeminiSuccess<T> {
  ok: true;
  json: T;
  text: string;
  tokensIn: number;
  tokensOut: number;
  finishReason: string | undefined;
  retried: boolean;
  /** Total HTTP attempts including the first try. 1 = no retry needed. */
  attempts: number;
}

export interface GeminiTextSuccess {
  ok: true;
  json?: undefined;
  text: string;
  tokensIn: number;
  tokensOut: number;
  finishReason: string | undefined;
  retried: false;
  attempts: number;
}

export interface GeminiFailure {
  ok: false;
  text?: string;
  tokensIn: number;
  tokensOut: number;
  error: string;
  finishReason?: string;
  attempts: number;
}

export type GeminiResult<T = unknown> =
  | GeminiSuccess<T>
  | GeminiTextSuccess
  | GeminiFailure;

interface GeminiUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
}

interface GeminiCandidate {
  content?: { parts?: { text?: string }[]; role?: string };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: GeminiUsage;
  promptFeedback?: { blockReason?: string };
}

async function buildSystemInstruction(
  systemPrompt: CallGeminiArgs['systemPrompt'],
  withAuditVoice: boolean,
): Promise<string> {
  let body: string;
  if (typeof systemPrompt === 'object' && 'raw' in systemPrompt) {
    body = systemPrompt.raw;
  } else {
    body = await loadSystemPrompt(systemPrompt);
  }
  if (!withAuditVoice) return body;
  const voice = await loadAuditVoice();
  return `${voice}\n\n---\n\n${body}`;
}

interface PostOnceResult {
  status: number;
  data: GeminiResponse | null;
  rawText: string;
  /** Set when fetch itself threw (network error). Status will be 0. */
  networkError?: string;
}

async function postOnce(url: string, body: unknown): Promise<PostOnceResult> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    return {
      status: 0,
      data: null,
      rawText: '',
      networkError: `network: ${message}`,
    };
  }
  const rawText = await res.text();
  let data: GeminiResponse | null = null;
  try {
    data = JSON.parse(rawText) as GeminiResponse;
  } catch {
    /* leave data null; caller handles */
  }
  return { status: res.status, data, rawText };
}

/**
 * postOnce wrapped with the shared retry policy. Network errors and 5xx /
 * 429 responses retry up to GEMINI_RETRY.maxAttempts times with exponential
 * backoff + jitter. 4xx responses bail immediately — those don't fix
 * themselves with retries.
 */
async function postWithRetry(
  url: string,
  body: unknown,
): Promise<{ result: PostOnceResult; attempts: number }> {
  return withRetryResult<PostOnceResult & { ok: boolean }>(
    async () => {
      const r = await postOnce(url, body);
      // Adapt to the {ok: bool} shape withRetryResult expects. Success =
      // any 2xx; everything else flagged for the transient classifier.
      const ok = r.status >= 200 && r.status < 300;
      return { ...r, ok };
    },
    GEMINI_RETRY,
    (r) => {
      if (r.networkError) return true;
      if (r.status === 0) return true;
      if (r.status === 429) return true;
      if (r.status >= 500 && r.status < 600) return true;
      return false;
    },
  ).then((outcome) => ({
    // Strip the synthetic `ok` we added — not part of the original shape.
    result: {
      status: outcome.result.status,
      data: outcome.result.data,
      rawText: outcome.result.rawText,
      networkError: outcome.result.networkError,
    },
    attempts: outcome.attempts,
  }));
}

/**
 * Make one Gemini call. When `responseSchema` is set, the result is parsed
 * as JSON and one retry is attempted on parse failure.
 */
export async function callGemini<T = unknown>(
  args: CallGeminiArgs,
): Promise<GeminiResult<T>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      tokensIn: 0,
      tokensOut: 0,
      error: 'GEMINI_API_KEY not configured',
      attempts: 0,
    };
  }

  const model = args.model ?? 'gemini-2.0-flash';
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const systemText = await buildSystemInstruction(
    args.systemPrompt,
    Boolean(args.withAuditVoice),
  );

  // Build the user-content parts. Order matters per Gemini's docs: text
  // prompt first establishes intent, then inline_data parts the model can
  // reference. For PDF parsing, the prompt says "extract from this resume",
  // followed by the PDF bytes.
  const userParts: Record<string, unknown>[] = [{ text: args.userPrompt }];
  if (args.inlineFiles && args.inlineFiles.length > 0) {
    for (const file of args.inlineFiles) {
      userParts.push({
        inline_data: { mime_type: file.mimeType, data: file.data },
      });
    }
  }

  const requestBody: Record<string, unknown> = {
    contents: [{ parts: userParts, role: 'user' }],
    systemInstruction: { parts: [{ text: systemText }] },
  };

  const generationConfig: Record<string, unknown> = {};
  if (args.responseSchema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = args.responseSchema;
  }
  if (typeof args.temperature === 'number') {
    generationConfig.temperature = args.temperature;
  }
  if (Object.keys(generationConfig).length > 0) {
    requestBody.generationConfig = generationConfig;
  }

  // First attempt — postWithRetry handles transient network/5xx/429 with
  // backoff. Returns the final HTTP outcome + how many tries it took.
  const firstHop = await postWithRetry(url, requestBody);
  const firstResult = parseGeminiResponse<T>(
    firstHop.result,
    Boolean(args.responseSchema),
    /* isRetry */ false,
    firstHop.attempts,
  );
  if (firstResult.ok) return firstResult;
  if (!args.responseSchema) return firstResult; // no schema, no retry
  if (firstResult.error !== 'malformed-json') return firstResult;

  // Retry once with a stricter JSON-only reminder appended to the system
  // instruction. Per spec failure-modes: "On malformed JSON, retry once
  // with explicit JSON schema reminder; if still failing, surface error."
  // This is the JSON-shape retry — distinct from the transport-level
  // retry above. attempts is the sum across both hops.
  const stricterBody = {
    ...requestBody,
    systemInstruction: {
      parts: [
        {
          text: `${systemText}\n\nIMPORTANT: Return ONLY a JSON object matching the supplied schema. No prose, no explanation, no markdown fences.`,
        },
      ],
    },
  };
  const secondHop = await postWithRetry(url, stricterBody);
  return parseGeminiResponse<T>(
    secondHop.result,
    /* withSchema */ true,
    /* isRetry */ true,
    firstHop.attempts + secondHop.attempts,
  );
}

function parseGeminiResponse<T>(
  result: { status: number; data: GeminiResponse | null; rawText: string; networkError?: string },
  withSchema: boolean,
  isRetry: boolean,
  attempts: number,
): GeminiResult<T> {
  const { status, data, rawText, networkError } = result;

  if (networkError) {
    return {
      ok: false,
      tokensIn: 0,
      tokensOut: 0,
      error: networkError,
      attempts,
    };
  }

  if (status < 200 || status >= 300) {
    return {
      ok: false,
      tokensIn: 0,
      tokensOut: 0,
      error: `Gemini ${status}: ${rawText.slice(0, 500)}`,
      attempts,
    };
  }

  if (!data) {
    return {
      ok: false,
      tokensIn: 0,
      tokensOut: 0,
      error: 'Gemini returned non-JSON envelope',
      attempts,
    };
  }

  if (data.promptFeedback?.blockReason) {
    return {
      ok: false,
      tokensIn: 0,
      tokensOut: 0,
      error: `Gemini blocked: ${data.promptFeedback.blockReason}`,
      attempts,
    };
  }

  const tokensIn = data.usageMetadata?.promptTokenCount ?? 0;
  const tokensOut = data.usageMetadata?.candidatesTokenCount ?? 0;
  const candidate = data.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const text = candidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

  if (!text) {
    return {
      ok: false,
      tokensIn,
      tokensOut,
      finishReason,
      error: 'empty-response',
      attempts,
    };
  }

  if (!withSchema) {
    return {
      ok: true,
      text,
      tokensIn,
      tokensOut,
      finishReason,
      retried: false,
      attempts,
    };
  }

  try {
    const json = JSON.parse(text) as T;
    return {
      ok: true,
      json,
      text,
      tokensIn,
      tokensOut,
      finishReason,
      retried: isRetry,
      attempts,
    };
  } catch {
    return {
      ok: false,
      text,
      tokensIn,
      tokensOut,
      finishReason,
      error: 'malformed-json',
      attempts,
    };
  }
}
